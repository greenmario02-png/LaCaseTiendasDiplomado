import crypto from 'crypto';
import fs from 'fs';

import multer from 'multer';

import { ApiError } from '../utils/errors';
import { SAFE_IMAGE_EXT, paymentQrName, sniffImage, stripImageMetadata } from '../utils/imageSafety';
import { localUploadPath, uploadNamedBuffer } from '../utils/storage';

/**
 * QR de cobro de la tienda. El QR es público (lo ve el comprador para pagar), pero el archivo se valida igual: solo
 * JPEG/PNG/WebP por firma real, máx. 2 MB, sin EXIF/GPS, nombre aleatorio con el id del dueño como prefijo.
 * NUNCA se acepta una URL externa: la tienda solo puede apuntar a un archivo subido por su propio dueño.
 */
export const PAYMENT_QR_MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MIME_OF: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export const paymentQrUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PAYMENT_QR_MAX_BYTES, files: 1, fields: 4 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) return cb(new ApiError(400, 'IMAGE_TYPE_NOT_ALLOWED', 'Formato no permitido: usa una imagen JPG, PNG o WebP'));
    cb(null, true);
  },
});

export async function savePaymentQr(ownerId: number, buf: Buffer | undefined) {
  if (!buf || buf.length === 0) throw new ApiError(400, 'NO_FILE', 'No se recibió ninguna imagen');
  if (buf.length > PAYMENT_QR_MAX_BYTES) throw new ApiError(400, 'IMAGE_TOO_LARGE', 'La imagen pesa demasiado (máximo 2 MB)');
  const type = sniffImage(buf);
  if (!type) throw new ApiError(400, 'IMAGE_TYPE_NOT_ALLOWED', 'El archivo no es una imagen JPG, PNG o WebP válida');
  const clean = stripImageMetadata(buf, type);
  const name = `q${ownerId}-${crypto.randomBytes(16).toString('hex')}.${SAFE_IMAGE_EXT[type]}`;
  const url = await uploadNamedBuffer(clean, 'payment-qr', name, MIME_OF[type]);
  return { url, size: clean.length, type };
}

/**
 * Valida que `url` sea un QR subido por `ownerId` (y, en disco local, que el archivo exista). Lanza 400 en cualquier otro
 * caso (p. ej. una URL https ajena o el QR de otra tienda).
 */
export function assertOwnPaymentQr(url: unknown, ownerId: number): string {
  const q = paymentQrName(url);
  if (!q || q.ownerId !== ownerId) {
    throw new ApiError(400, 'PAYMENT_QR_UPLOAD_REQUIRED', 'Sube la imagen del QR con el botón «Subir imagen»: no se aceptan enlaces.');
  }
  if (!q.remote && !fs.existsSync(localUploadPath('payment-qr', q.name))) {
    throw new ApiError(400, 'PAYMENT_QR_UPLOAD_REQUIRED', 'No encontramos la imagen del QR. Vuelve a subirla.');
  }
  return url as string;
}
