/**
 * Chat: seguridad de adjuntos, sin dependencias nativas (no hay sharp en el proyecto).
 *  - El tipo real sale de los primeros bytes (magic bytes), nunca de la extension ni del Content-Type del cliente.
 *  - Solo JPEG, PNG, WebP y PDF. SVG, HTML, GIF y cualquier otra cosa se rechazan.
 *  - Se quitan los metadatos que pueden delatar a la persona (EXIF con GPS, XMP, IPTC, comentarios, textos PNG).
 *  - Se leen las dimensiones de la cabecera para rechazar imagenes desmesuradas y para que el cliente reserve el espacio.
 *  - PDF: se rechaza si declara contenido activo (JavaScript, Launch, archivos embebidos, formularios XFA).
 */
import { ApiError } from '../../utils/errors';
import { chatLimits } from '../../config/chat';

export type ChatMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

const EXT: Record<ChatMime, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };

export function detectChatFile(buf: Buffer): ChatMime | null {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.toString('latin1', 0, 5) === '%PDF-') return 'application/pdf';
  return null;
}

const bad = (msg = 'La imagen está dañada o no es válida.') => ApiError.badRequest(msg);

// ── JPEG ────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Recorre los segmentos hasta SOS. Devuelve el JPEG sin APP1 (EXIF/XMP), APP12/APP13 (IPTC/Photoshop) ni COM. */
function stripJpeg(buf: Buffer): Buffer {
  const parts: Buffer[] = [buf.subarray(0, 2)];
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw bad();
    let marker = buf[i + 1];
    // Relleno 0xFF permitido entre segmentos
    while (marker === 0xff && i + 2 < buf.length) {
      i += 1;
      marker = buf[i + 1];
    }
    if (marker === undefined) throw bad();
    if (marker === 0xd9) {
      parts.push(buf.subarray(i, i + 2));
      return Buffer.concat(parts);
    }
    // Marcadores sin longitud (RSTn, TEM)
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      parts.push(buf.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 4 > buf.length) throw bad();
    const len = buf.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > buf.length) throw bad();
    const seg = buf.subarray(i, i + 2 + len);
    if (marker === 0xda) {
      // Inicio de los datos comprimidos: lo demas se copia tal cual.
      parts.push(buf.subarray(i));
      return Buffer.concat(parts);
    }
    const drop = marker === 0xe1 || marker === 0xec || marker === 0xed || marker === 0xfe;
    if (!drop) parts.push(seg);
    i += 2 + len;
  }
  throw bad();
}

function jpegSize(buf: Buffer): { width: number; height: number } | null {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    if (marker === 0xd9 || marker === 0xda) return null;
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xff) {
      i += marker === 0xff ? 1 : 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}

// ── PNG ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const PNG_DROP = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

function stripPng(buf: Buffer): Buffer {
  const parts: Buffer[] = [buf.subarray(0, 8)];
  let i = 8;
  let sawEnd = false;
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    const end = i + 12 + len;
    if (end > buf.length) throw bad();
    if (!PNG_DROP.has(type)) parts.push(buf.subarray(i, end));
    i = end;
    if (type === 'IEND') {
      sawEnd = true;
      break;
    }
  }
  if (!sawEnd) throw bad();
  return Buffer.concat(parts);
}

function pngSize(buf: Buffer) {
  if (buf.length < 24 || buf.toString('latin1', 12, 16) !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// ── WebP ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function stripWebp(buf: Buffer): Buffer {
  const chunks: Buffer[] = [];
  let i = 12;
  while (i + 8 <= buf.length) {
    const type = buf.toString('latin1', i, i + 4);
    const len = buf.readUInt32LE(i + 4);
    const end = i + 8 + len + (len % 2);
    if (i + 8 + len > buf.length) throw bad();
    if (type !== 'EXIF' && type !== 'XMP ') {
      const chunk = Buffer.from(buf.subarray(i, Math.min(end, buf.length)));
      if (type === 'VP8X' && chunk.length > 8) chunk[8] &= ~0x0c; // banderas EXIF (0x08) y XMP (0x04)
      chunks.push(chunk);
    }
    i = end;
  }
  if (!chunks.length) throw bad();
  const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), ...chunks]);
  const header = Buffer.alloc(8);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}

function webpSize(buf: Buffer) {
  const type = buf.toString('latin1', 12, 16);
  const p = 20;
  if (type === 'VP8X' && buf.length >= p + 10) {
    return { width: 1 + buf.readUIntLE(p + 4, 3), height: 1 + buf.readUIntLE(p + 7, 3) };
  }
  if (type === 'VP8 ' && buf.length >= p + 10) {
    return { width: buf.readUInt16LE(p + 6) & 0x3fff, height: buf.readUInt16LE(p + 8) & 0x3fff };
  }
  if (type === 'VP8L' && buf.length >= p + 5 && buf[p] === 0x2f) {
    const bits = buf.readUInt32LE(p + 1);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

// ── API ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function stripImageMetadata(buf: Buffer, mime: ChatMime): Buffer {
  if (mime === 'image/jpeg') return stripJpeg(buf);
  if (mime === 'image/png') return stripPng(buf);
  if (mime === 'image/webp') return stripWebp(buf);
  return buf;
}

export function imageSize(buf: Buffer, mime: ChatMime): { width: number; height: number } | null {
  if (mime === 'image/jpeg') return jpegSize(buf);
  if (mime === 'image/png') return pngSize(buf);
  if (mime === 'image/webp') return webpSize(buf);
  return null;
}

const PDF_ACTIVE = /\/(JavaScript|JS|Launch|EmbeddedFile|EmbeddedFiles|RichMedia|XFA|SubmitForm|ImportData)\b/;

/** Busca nombres PDF de contenido activo; decodifica antes los escapes #xx que se usan para esconderlos. */
export function pdfLooksActive(buf: Buffer): boolean {
  const text = buf.toString('latin1').replace(/#([0-9a-fA-F]{2})/g, (_m, h: string) => String.fromCharCode(parseInt(h, 16)));
  return PDF_ACTIVE.test(text);
}

/** Nombre para mostrar (solo PDF): sin rutas, controles ni marcado; maximo 100 caracteres y terminado en .pdf. */
export function sanitizeDisplayName(raw: string | null | undefined): string {
  let s = String(raw ?? '')
    .normalize('NFC')
    .replace(/\p{Cc}/gu, '')
    .replace(/[\\/]/g, '-')
    .replace(/[^\p{L}\p{N} ._()-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\- ]+/, '');
  if (!s) s = 'documento.pdf';
  if (!/\.pdf$/i.test(s)) s = `${s.slice(0, 96)}.pdf`;
  if (s.length > 100) s = `${s.slice(0, 96)}.pdf`;
  return s;
}

export interface InspectedUpload {
  mime: ChatMime;
  ext: string;
  buffer: Buffer;
  width: number | null;
  height: number | null;
}

/** Valida y limpia una subida del chat. Lanza ApiError 400 con un mensaje claro si no se acepta. */
export function inspectChatUpload(raw: Buffer): InspectedUpload {
  const mime = detectChatFile(raw);
  if (!mime) throw ApiError.badRequest('Formato no permitido. Usa una foto JPG, PNG o WebP, o un PDF.');
  if (mime === 'application/pdf') {
    if (raw.length > chatLimits.maxPdfBytes()) throw ApiError.badRequest('El PDF es demasiado grande.');
    if (pdfLooksActive(raw)) throw ApiError.badRequest('El PDF contiene contenido activo y no se puede enviar.');
    return { mime, ext: EXT[mime], buffer: raw, width: null, height: null };
  }
  if (raw.length > chatLimits.maxImageBytes()) throw ApiError.badRequest('La imagen es demasiado grande.');
  const size = imageSize(raw, mime);
  if (!size || !size.width || !size.height) throw bad();
  if (size.width > chatLimits.maxImageSide() || size.height > chatLimits.maxImageSide() || size.width * size.height > chatLimits.maxImagePixels()) {
    throw ApiError.badRequest('La imagen tiene dimensiones demasiado grandes.');
  }
  const buffer = stripImageMetadata(raw, mime);
  return { mime, ext: EXT[mime], buffer, width: size.width, height: size.height };
}
