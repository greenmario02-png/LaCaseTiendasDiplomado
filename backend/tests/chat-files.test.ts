/**
 * Chat · pruebas UNITARIAS de seguridad de adjuntos: tipo real por magic bytes, quitado de EXIF/XMP,
 * dimensiones, PDF sin contenido activo y URL firmada por usuario. No usan base de datos (jest.unitarias.config.js).
 */
import { detectChatFile, stripImageMetadata, imageSize, pdfLooksActive, sanitizeDisplayName, inspectChatUpload } from '../src/services/chat/fileSafety';
import { signFileUrl, verifyFileSignature } from '../src/services/chat/fileSign';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-2026-9f2c4a1b7e3d8c';

import { jpeg, png, webpVp8x } from './chat-helpers';

describe('Chat · tipo real del archivo (magic bytes)', () => {
  it('reconoce jpeg, png, webp y pdf por su contenido', () => {
    expect(detectChatFile(jpeg())).toBe('image/jpeg');
    expect(detectChatFile(png())).toBe('image/png');
    expect(detectChatFile(webpVp8x())).toBe('image/webp');
    expect(detectChatFile(Buffer.from('%PDF-1.7\n1 0 obj\n'))).toBe('application/pdf');
  });

  it('rechaza SVG, HTML, GIF y basura aunque digan ser imagen', () => {
    expect(detectChatFile(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toBeNull();
    expect(detectChatFile(Buffer.from('<!doctype html><script>alert(1)</script>'))).toBeNull();
    expect(detectChatFile(Buffer.from('GIF89a......'))).toBeNull();
    expect(detectChatFile(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(detectChatFile(Buffer.alloc(0))).toBeNull();
  });
});

describe('Chat · metadatos y dimensiones', () => {
  it('JPEG: quita EXIF (APP1) y comentarios, conserva JFIF y los datos de imagen', () => {
    const src = jpeg(640, 480);
    const out = stripImageMetadata(src, 'image/jpeg');
    expect(out.includes(Buffer.from('Exif'))).toBe(false);
    expect(out.includes(Buffer.from('GPSLatitude'))).toBe(false);
    expect(out.includes(Buffer.from('secret comment'))).toBe(false);
    expect(out.includes(Buffer.from('JFIF'))).toBe(true);
    expect(out.subarray(-2).equals(Buffer.from([0xff, 0xd9]))).toBe(true);
    expect(imageSize(out, 'image/jpeg')).toEqual({ width: 640, height: 480 });
  });

  it('PNG: quita tEXt y eXIf, conserva IHDR/IDAT/IEND', () => {
    const out = stripImageMetadata(png(100, 50), 'image/png');
    expect(out.includes(Buffer.from('tEXt'))).toBe(false);
    expect(out.includes(Buffer.from('eXIf'))).toBe(false);
    expect(out.includes(Buffer.from('IDAT'))).toBe(true);
    expect(imageSize(out, 'image/png')).toEqual({ width: 100, height: 50 });
  });

  it('WebP: quita EXIF/XMP, apaga sus banderas en VP8X y recalcula el tamaño RIFF', () => {
    const out = stripImageMetadata(webpVp8x(300, 200), 'image/webp');
    expect(out.includes(Buffer.from('EXIF'))).toBe(false);
    expect(out.includes(Buffer.from('xmpmeta'))).toBe(false);
    expect(out.readUInt32LE(4)).toBe(out.length - 8);
    const flags = out[20];
    expect(flags & 0x0c).toBe(0);
    expect(imageSize(out, 'image/webp')).toEqual({ width: 300, height: 200 });
  });

  it('JPEG truncado o malformado: error (no se guarda)', () => {
    expect(() => stripImageMetadata(Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff]), 'image/jpeg')).toThrow();
  });
});

describe('Chat · PDF', () => {
  it('detecta contenido activo (JavaScript, Launch, archivos embebidos), incluso escrito con #xx', () => {
    expect(pdfLooksActive(Buffer.from('%PDF-1.4 /OpenAction << /S /JavaScript /JS (app.alert(1)) >>'))).toBe(true);
    expect(pdfLooksActive(Buffer.from('%PDF-1.4 /J#61vaScript'))).toBe(true);
    expect(pdfLooksActive(Buffer.from('%PDF-1.4 /Launch /F (cmd.exe)'))).toBe(true);
    expect(pdfLooksActive(Buffer.from('%PDF-1.4 /EmbeddedFile'))).toBe(true);
    expect(pdfLooksActive(Buffer.from('%PDF-1.4 /Type /Catalog /Pages 2 0 R'))).toBe(false);
  });
});

describe('Chat · inspección completa de una subida', () => {
  it('imagen válida: mime real, extensión y dimensiones; sin EXIF', () => {
    const r = inspectChatUpload(jpeg(800, 600));
    expect(r.mime).toBe('image/jpeg');
    expect(r.ext).toBe('.jpg');
    expect(r.width).toBe(800);
    expect(r.buffer.includes(Buffer.from('Exif'))).toBe(false);
  });

  it('rechaza imágenes gigantes (bomba de descompresión para quien la abre)', () => {
    expect(() => inspectChatUpload(png(20000, 20000))).toThrow(/dimensiones/i);
  });

  it('rechaza PDF activo y archivos de otro tipo', () => {
    expect(() => inspectChatUpload(Buffer.from('%PDF-1.4 /JS (x)'))).toThrow();
    expect(() => inspectChatUpload(Buffer.from('<html></html>'))).toThrow();
  });

  it('nombre visible saneado: sin rutas, controles ni marcado', () => {
    expect(sanitizeDisplayName('../../etc/<b>passwd</b>\u0000.pdf')).toBe('etc-bpasswd-b.pdf');
    expect(sanitizeDisplayName('Comprobante pago marzo.pdf')).toBe('Comprobante pago marzo.pdf');
    expect(sanitizeDisplayName('')).toBe('documento.pdf');
    expect(sanitizeDisplayName('x'.repeat(300)).length).toBeLessThanOrEqual(100);
  });
});

describe('Chat · URL firmada', () => {
  it('válida solo para el mismo adjunto, usuario y antes de vencer', () => {
    const now = Date.UTC(2026, 9, 15, 12, 10);
    const url = signFileUrl(42, 7, now);
    const q = new URL(`http://x${url}`).searchParams;
    const e = Number(q.get('e'));
    const s = q.get('s')!;
    expect(url.startsWith('/api/chat/files/42?')).toBe(true);
    expect(verifyFileSignature(42, 7, e, s, now)).toBe(true);
    expect(verifyFileSignature(43, 7, e, s, now)).toBe(false);
    expect(verifyFileSignature(42, 8, e, s, now)).toBe(false);
    expect(verifyFileSignature(42, 7, e, s + 'x', now)).toBe(false);
    expect(verifyFileSignature(42, 7, e, s, e * 1000 + 1)).toBe(false);
  });

  it('la URL es estable dentro de la misma hora (el navegador puede reutilizar la caché)', () => {
    const a = signFileUrl(1, 2, Date.UTC(2026, 9, 15, 12, 1));
    const b = signFileUrl(1, 2, Date.UTC(2026, 9, 15, 12, 50));
    expect(a).toBe(b);
  });
});
