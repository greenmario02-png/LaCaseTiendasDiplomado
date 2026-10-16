import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { authenticate, AuthRequest } from '../middlewares/auth';
import { requireStoreAdmin } from '../middlewares/roles';
import { PAYMENT_QR_MAX_BYTES, paymentQrUpload, savePaymentQr } from '../services/paymentQr.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/errors';
import { created } from '../utils/response';

/**
 * Imagen del QR de cobro de la tienda: archivo, nunca URL. Se valida por firma, se le quitan los metadatos y se renombra
 * al azar con el id del dueño. Después se guarda en la tienda con `PUT /api/seller/profile { paymentQrUrl }`, que solo
 * acepta un QR subido por el mismo usuario. Montado en /api/payout-account.
 */
const router = Router();
const isTest = process.env.NODE_ENV === 'test';
const qrLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: isTest ? 100000 : 10,
  message: { error: { code: 'RATE_LIMIT', message: 'Subiste demasiadas imágenes. Espera unos minutos.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/qr-image',
  qrLimiter,
  authenticate,
  requireStoreAdmin,
  (req, res, next) =>
    paymentQrUpload.single('image')(req, res, (err: unknown) => {
      const code = (err as { code?: string })?.code;
      if (code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'IMAGE_TOO_LARGE', `La imagen pesa demasiado (máximo ${PAYMENT_QR_MAX_BYTES / 1024 / 1024} MB)`));
      if (code === 'LIMIT_UNEXPECTED_FILE' || code === 'LIMIT_FILE_COUNT') return next(new ApiError(400, 'NO_FILE', 'Envía una sola imagen en el campo «image»'));
      return next(err as Error | undefined);
    }),
  asyncHandler(async (req: AuthRequest, res) => created(res, await savePaymentQr(req.user!.id, req.file?.buffer))),
);

export default router;
