/** Chat: constructores de archivos minimos para las pruebas (JPEG con EXIF, PNG con textos, WebP con XMP). */
function u16be(n: number) { return [(n >> 8) & 0xff, n & 0xff]; }
function u32be(n: number) { return [(n >>> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]; }
function u32le(n: number) { return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff]; }
export const ascii = (s: string) => Array.from(Buffer.from(s, 'latin1'));

/** JPEG minimo: SOI, APP0 JFIF, APP1 Exif (con "GPS"), COM, SOF0 (w x h), SOS + datos, EOI. */
export function jpeg(w = 640, h = 480) {
  const app0 = [0xff, 0xe0, ...u16be(16), ...ascii('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const exifPayload = [...ascii('Exif\0\0'), ...ascii('GPSLatitude-16.5')];
  const app1 = [0xff, 0xe1, ...u16be(exifPayload.length + 2), ...exifPayload];
  const comPayload = ascii('secret comment');
  const com = [0xff, 0xfe, ...u16be(comPayload.length + 2), ...comPayload];
  const sof = [0xff, 0xc0, ...u16be(17), 8, ...u16be(h), ...u16be(w), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  const sos = [0xff, 0xda, ...u16be(12), 3, 1, 0, 2, 0x11, 3, 0x11, 0, 0x3f, 0, 0x12, 0x34, 0x56];
  return Buffer.from([0xff, 0xd8, ...app0, ...app1, ...com, ...sof, ...sos, 0xff, 0xd9]);
}

function pngChunk(type: string, data: number[]) {
  return [...u32be(data.length), ...ascii(type), ...data, 0, 0, 0, 0];
}
export function png(w = 100, h = 50) {
  const ihdr = pngChunk('IHDR', [...u32be(w), ...u32be(h), 8, 6, 0, 0, 0]);
  const text = pngChunk('tEXt', ascii('Author\0Juan'));
  const exif = pngChunk('eXIf', ascii('MM\0*GPS'));
  const idat = pngChunk('IDAT', [1, 2, 3]);
  const iend = pngChunk('IEND', []);
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...ihdr, ...text, ...exif, ...idat, ...iend]);
}

function webpChunk(type: string, data: number[]) {
  const pad = data.length % 2 ? [0] : [];
  return [...ascii(type), ...u32le(data.length), ...data, ...pad];
}
export function webpVp8x(w = 300, h = 200) {
  const flags = 0x08 | 0x04; // EXIF + XMP
  const vp8x = webpChunk('VP8X', [flags, 0, 0, 0, (w - 1) & 0xff, ((w - 1) >> 8) & 0xff, 0, (h - 1) & 0xff, ((h - 1) >> 8) & 0xff, 0]);
  const vp8l = webpChunk('VP8L', [0x2f, 0, 0, 0, 0]);
  const exif = webpChunk('EXIF', ascii('GPS!'));
  const xmp = webpChunk('XMP ', ascii('<x:xmpmeta/>'));
  const body = [...ascii('WEBP'), ...vp8x, ...vp8l, ...exif, ...xmp];
  return Buffer.from([...ascii('RIFF'), ...u32le(body.length), ...body]);
}

