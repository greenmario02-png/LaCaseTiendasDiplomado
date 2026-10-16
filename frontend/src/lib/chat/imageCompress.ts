import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_PDF_BYTES, targetSize } from './chatModel';

/**
 * Chat mejorado (doc 62): compresion en el navegador antes de subir (ahorra datos). Redimensiona al lado maximo y
 * re-codifica en WebP (o JPEG si el navegador no lo soporta); la re-codificacion tambien descarta el EXIF.
 * Si algo falla se envia el original: el servidor valida y limpia igual.
 */
export interface PreparedFile {
  file: Blob;
  name: string;
  type: string;
  isImage: boolean;
  width?: number;
  height?: number;
}

export class ChatFileError extends Error {
  constructor(public code: 'TYPE' | 'SIZE') {
    super(code);
  }
}

const MAX_SIDE = 1600;
const QUALITY = 0.8;
/** Por debajo de este peso y sin necesidad de redimensionar no se re-codifica (ahorra bateria). */
const SKIP_BELOW = 350 * 1024;

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode();
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

export async function prepareChatFile(file: File): Promise<PreparedFile> {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) throw new ChatFileError('SIZE');
    return { file, name: file.name, type: file.type, isImage: false };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new ChatFileError('TYPE');
  try {
    const img = await decode(file);
    try {
      const size = targetSize(img.width, img.height, MAX_SIDE);
      if (file.size <= SKIP_BELOW && size.width === img.width) {
        return { file, name: file.name, type: file.type, isImage: true, ...size };
      }
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      canvas.getContext('2d')?.drawImage(img.source, 0, 0, size.width, size.height);
      const out = (await toBlob(canvas, 'image/webp')) ?? (await toBlob(canvas, 'image/jpeg'));
      if (out && out.size < file.size && ALLOWED_IMAGE_TYPES.includes(out.type)) {
        const ext = out.type === 'image/webp' ? 'webp' : 'jpg';
        return { file: out, name: `foto.${ext}`, type: out.type, isImage: true, ...size };
      }
    } finally {
      img.close();
    }
  } catch {
    /* sin compresion: se intenta con el original */
  }
  if (file.size > MAX_IMAGE_BYTES) throw new ChatFileError('SIZE');
  return { file, name: file.name, type: file.type, isImage: true };
}
