/**
 * Validación de imágenes subidas por FIRMA real del archivo (magic bytes) y limpieza de metadatos.
 * Nunca se confía en la extensión ni en el Content-Type que manda el cliente. SVG/HTML/GIF quedan fuera.
 *  - JPEG: se quitan los segmentos APP1..APP15 (EXIF/GPS/XMP/ICC) y COM; APP0 (JFIF) se conserva.
 *  - PNG: se quitan los chunks de texto y metadatos (tEXt, zTXt, iTXt, eXIf, tIME).
 *  - WebP: se quitan los chunks EXIF y XMP y se apagan sus banderas en VP8X.
 */
export type SafeImageType = 'jpeg' | 'png' | 'webp';

export const SAFE_IMAGE_EXT: Record<SafeImageType, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' };

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function sniffImage(buf: Buffer | null | undefined): SafeImageType | null {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.subarray(0, 8).equals(PNG_SIG)) return 'png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

function stripJpeg(buf: Buffer): Buffer {
  const parts: Buffer[] = [buf.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    if (marker === 0xda) break; // inicio de los datos de imagen
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xff) {
      parts.push(buf.subarray(i, i + 2));
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > buf.length) break;
    const keep = !((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe);
    if (keep) parts.push(buf.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  parts.push(buf.subarray(i));
  return Buffer.concat(parts);
}

const PNG_DROP = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);
function stripPng(buf: Buffer): Buffer {
  const parts: Buffer[] = [buf.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.subarray(i + 4, i + 8).toString('latin1');
    const end = i + 12 + len;
    if (end > buf.length) break;
    if (!PNG_DROP.has(type)) parts.push(buf.subarray(i, end));
    i = end;
    if (type === 'IEND') break;
  }
  return Buffer.concat(parts);
}

function stripWebp(buf: Buffer): Buffer {
  const chunks: Buffer[] = [];
  let i = 12;
  while (i + 8 <= buf.length) {
    const type = buf.subarray(i, i + 4).toString('latin1');
    const size = buf.readUInt32LE(i + 4);
    const end = i + 8 + size + (size % 2);
    if (i + 8 + size > buf.length) break;
    if (type !== 'EXIF' && type !== 'XMP ') {
      const chunk = Buffer.from(buf.subarray(i, Math.min(end, buf.length)));
      if (type === 'VP8X' && chunk.length > 8) chunk[8] &= ~(0x08 | 0x04); // sin banderas EXIF (0x08) ni XMP (0x04)
      chunks.push(chunk);
    }
    i = end;
  }
  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(body.length + 4, 4);
  header.write('WEBP', 8, 'latin1');
  return Buffer.concat([header, body]);
}

/** Devuelve una copia sin metadatos (EXIF/GPS/texto). Si el tipo no coincide con la firma, devuelve el buffer tal cual. */
export function stripImageMetadata(buf: Buffer, type: SafeImageType): Buffer {
  if (sniffImage(buf) !== type) return buf;
  if (type === 'jpeg') return stripJpeg(buf);
  if (type === 'png') return stripPng(buf);
  return stripWebp(buf);
}

/**
 * Base pública del almacenamiento propio (Supabase Storage) si está configurado, p. ej.
 * `https://<proyecto>.supabase.co/storage/v1/object/public/<bucket>/`. Sin credenciales (desarrollo) las imágenes viven en
 * `/uploads/...`. Se lee del entorno en cada llamada para poder probarlo.
 */
export function storagePublicBase(): string | null {
  const url = (process.env.SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
  if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY || !/^https:\/\/[A-Za-z0-9.-]+$/.test(url)) return null;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'lacase-uploads';
  if (!/^[A-Za-z0-9._-]+$/.test(bucket)) return null;
  return `${url}/storage/v1/object/public/${bucket}/`;
}

/** Ruta pública de un QR de cobro subido por un usuario (nombre aleatorio con el id del dueño como prefijo). */
export const PAYMENT_QR_PREFIX = '/uploads/payment-qr/';
export const PAYMENT_QR_NAME_RE = /^q(\d+)-([a-f0-9]{32})\.(jpg|png|webp)$/;

/**
 * Nombre de archivo de un QR de cobro si `url` apunta a uno subido con el endpoint propio: `/uploads/payment-qr/<nombre>`
 * en disco local o `<base del almacenamiento propio>payment-qr/<nombre>` en producción. Cualquier otra URL devuelve null.
 */
export function paymentQrName(url: unknown): { ownerId: number; name: string; remote: boolean } | null {
  if (typeof url !== 'string' || url.length > 300) return null;
  let name: string | null = null;
  let remote = false;
  if (url.startsWith(PAYMENT_QR_PREFIX)) name = url.slice(PAYMENT_QR_PREFIX.length);
  else {
    const base = storagePublicBase();
    if (base && url.startsWith(`${base}payment-qr/`)) {
      name = url.slice(`${base}payment-qr/`.length);
      remote = true;
    }
  }
  const m = name ? PAYMENT_QR_NAME_RE.exec(name) : null;
  return m ? { ownerId: Number(m[1]), name: name!, remote } : null;
}

/** true si `url` es un QR de cobro subido a la plataforma (de cualquier dueño); nunca una URL externa. */
export function isPaymentQrUrl(url: unknown): boolean {
  return paymentQrName(url) !== null;
}

/** true si `url` es un QR de cobro subido por `ownerId` a través del endpoint propio (nunca una URL externa). */
export function isOwnPaymentQrPath(url: unknown, ownerId: number): boolean {
  const q = paymentQrName(url);
  return !!q && q.ownerId === ownerId;
}

/** Imagen interna de la plataforma (subida a /uploads, al almacenamiento propio o recurso del seed): nunca una URL externa. */
export function isInternalImagePath(url: unknown): boolean {
  if (typeof url !== 'string' || url.length > 500) return false;
  const base = storagePublicBase();
  if (base && url.startsWith(base)) {
    const rest = url.slice(base.length);
    return !rest.includes('..') && !rest.includes('//') && /^[A-Za-z0-9._\-/]+\.(jpe?g|png|webp|gif)$/i.test(rest);
  }
  if (url.includes('..') || url.includes('\\') || url.includes('//')) return false;
  return /^\/(uploads|seed-assets)\/[A-Za-z0-9._\-/]+\.(jpe?g|png|webp|gif)$/i.test(url);
}

const isGif = (b: Buffer) => b.length >= 6 && ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('latin1'));

/**
 * Verifica una imagen recibida en memoria por su FIRMA real (la extensión y el Content-Type los elige el cliente) y le quita
 * los metadatos (EXIF/GPS). Acepta JPEG, PNG, WebP y GIF (este último sin limpiar). Devuelve null si no es una imagen válida.
 */
export function cleanUploadedImage(buf: Buffer | null | undefined): { buffer: Buffer; type: SafeImageType | 'gif' } | null {
  if (!buf || !buf.length) return null;
  const type = sniffImage(buf);
  if (type) return { buffer: stripImageMetadata(buf, type), type };
  if (isGif(buf)) return { buffer: buf, type: 'gif' };
  return null;
}
