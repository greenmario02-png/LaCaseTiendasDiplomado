import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';

import * as chatController from '../controllers/chat.controller';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/errors';
import { ok, created } from '../utils/response';
import { chatLimits } from '../config/chat';
import * as chat from '../services/chat/chat.service';
import { verifyFileSignature } from '../services/chat/fileSign';
import { presenceFor } from '../services/chat/presence';
import * as s from '../schemas/chat.schemas';

const router = Router();
const isTest = process.env.NODE_ENV === 'test';
const uid = (req: Request) => (req as AuthRequest).user!.id;
const num = (v: unknown) => Number(v);

// ── limites de tasa por usuario ──
const byUser = (req: Request) => `chat-u:${(req as AuthRequest).user?.id ?? 'anon'}`;
const limiter = (windowMs: number, max: () => number, message: string) =>
  rateLimit({ windowMs, limit: () => (isTest ? 100000 : max()), keyGenerator: byUser, standardHeaders: true, legacyHeaders: false, message: { error: { code: 'RATE_LIMIT', message } } });
const messageLimiter = limiter(60_000, chatLimits.messagesPerMinute, 'Estás enviando mensajes muy rápido. Espera un momento.');
const uploadMinuteLimiter = limiter(60_000, chatLimits.uploadsPerMinute, 'Demasiados archivos seguidos. Espera un momento.');
const uploadDayLimiter = limiter(24 * 3_600_000, chatLimits.uploadsPerDay, 'Llegaste al límite diario de archivos del chat.');
const reportLimiter = limiter(24 * 3_600_000, chatLimits.reportsPerDay, 'Llegaste al límite diario de reportes.');

// Subida en memoria: se valida por magic bytes, se quita EXIF y recien entonces se escribe con nombre aleatorio.
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Math.max(chatLimits.maxImageBytes(), chatLimits.maxPdfBytes()), files: 1, fields: 8, fieldSize: 4096, parts: 10 },
});
function singleFile(req: Request, res: Response, next: NextFunction) {
  memoryUpload.single('file')(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return next(ApiError.badRequest(err.code === 'LIMIT_FILE_SIZE' ? 'El archivo es demasiado grande.' : 'No se pudo procesar el archivo.'));
    }
    next(err);
  });
}

// ── archivo por URL firmada (sin cabecera Authorization: sirve para <img src>) ──
router.get(
  '/files/:attachmentId',
  validate(s.fileSchema),
  asyncHandler(async (req, res) => {
    const id = num(req.params.attachmentId);
    const q = req.query as unknown as { u: number; e: number; s: string };
    if (!verifyFileSignature(id, q.u, q.e, q.s)) throw ApiError.notFound('Archivo no encontrado');
    const f = await chat.resolveFile(id, q.u);
    res.set({
      'Content-Type': f.mime,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=3600',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Content-Disposition': f.mime === 'application/pdf' ? `attachment; filename="documento.pdf"; filename*=UTF-8''${encodeURIComponent(f.name ?? 'documento.pdf')}` : 'inline',
    });
    return res.sendFile(f.file);
  }),
);

router.use(authenticate);

router.get('/', asyncHandler(chatController.listConversations));
router.get('/icebreakers', asyncHandler(chatController.getChatIcebreakers));
router.post('/', validate(s.createConversationSchema), asyncHandler(chatController.createOrGetConversation));
router.get('/unread', asyncHandler(chatController.unreadCount));

// Privacidad (ultima vez / en linea)
router.get('/settings', asyncHandler(async (req, res) => ok(res, await chat.getSettings(uid(req)))));
router.put('/settings', validate(s.settingsSchema), asyncHandler(async (req, res) => ok(res, await chat.updateSettings(uid(req), req.body))));

// Bloqueos
router.get('/blocks', asyncHandler(async (req, res) => ok(res, await chat.listBlocks(uid(req)))));
router.post('/blocks/:userId', validate(s.userIdSchema), asyncHandler(async (req, res) => ok(res, await chat.blockUser(uid(req), num(req.params.userId)))));
router.delete('/blocks/:userId', validate(s.userIdSchema), asyncHandler(async (req, res) => ok(res, await chat.unblockUser(uid(req), num(req.params.userId)))));

// Conversacion de un pedido (la llama el flujo de pago; solo comprador o tienda del pedido)
router.post('/order/:orderId/open', messageLimiter, validate(s.orderOpenSchema), asyncHandler(async (req, res) => ok(res, await chat.openOrderConversation(uid(req), num(req.params.orderId)))));

// Moderacion: ADMIN o asignacion RBAC de moderacion (no hay un rol MODERATOR), solo conversaciones con reporte
async function staff(req: Request, _res: Response, next: NextFunction) {
  try {
    const u = (req as AuthRequest).user;
    if (u && (await chat.isChatStaff(u))) return next();
    return next(ApiError.forbidden('Solo el personal de moderación puede revisar reportes del chat'));
  } catch (error) {
    return next(error);
  }
}
router.get(
  '/moderation/reports',
  staff,
  validate(s.reportListSchema),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as { status?: string; page: number; limit: number };
    const r = await chat.listReports(q.status, q.page, q.limit);
    return res.json({ data: r.rows, meta: { page: q.page, limit: q.limit, total: r.total, totalPages: Math.ceil(r.total / q.limit) } });
  }),
);
router.get('/moderation/reports/:reportId', staff, validate(s.reportIdSchema), asyncHandler(async (req, res) => ok(res, await chat.staffConversation(uid(req), num(req.params.reportId), (req.query as { before?: number }).before))));
router.put('/moderation/reports/:reportId', staff, validate(s.resolveReportSchema), asyncHandler(async (req, res) => ok(res, await chat.resolveReport(uid(req), num(req.params.reportId), req.body.status))));

router.get('/:id/export', asyncHandler(chatController.exportConversation));
router.get('/:id/suggestions', asyncHandler(chatController.getChatSuggestions));
router.get('/:id/presence', validate(s.conversationIdSchema), asyncHandler(async (req, res) => {
  const conv = await chat.loadConversationFor(uid(req), num(req.params.id));
  return ok(res, await presenceFor(uid(req), conv.buyerId === uid(req) ? conv.sellerId : conv.buyerId));
}));
router.get('/:id', validate(s.getConversationSchema), asyncHandler(chatController.getConversation));
router.post('/:id/messages', messageLimiter, validate(s.sendMessageSchema), asyncHandler(chatController.sendMessage));
router.post(
  '/:id/attachments',
  uploadMinuteLimiter,
  uploadDayLimiter,
  singleFile,
  validate(s.attachmentSchema),
  asyncHandler(async (req, res) => {
    const r = await chat.sendAttachment(uid(req), num(req.params.id), req.file, req.body);
    return r.created ? created(res, r.message) : ok(res, r.message);
  }),
);
router.post('/:id/payment-qr', messageLimiter, validate(s.paymentQrSchema), asyncHandler(async (req, res) => {
  const r = await chat.sendPaymentQr(uid(req), num(req.params.id), req.body ?? {});
  return r.created ? created(res, r.message) : ok(res, r.message);
}));
router.post('/:id/read', validate(s.conversationIdSchema), asyncHandler(async (req, res) => ok(res, await chat.markReadById(uid(req), num(req.params.id)))));
router.put('/:id/mute', validate(s.muteSchema), asyncHandler(async (req, res) => ok(res, await chat.setMuted(uid(req), num(req.params.id), req.body.muted))));
router.post('/:id/report', reportLimiter, validate(s.reportSchema), asyncHandler(async (req, res) => created(res, await chat.reportConversation(uid(req), num(req.params.id), req.body))));
router.delete('/:id/messages/:messageId', validate(s.deleteMessageSchema), asyncHandler(async (req, res) => {
  const scope = (req.query as { scope?: 'me' | 'all' }).scope ?? 'me';
  return ok(res, await chat.deleteMessage(uid(req), num(req.params.id), num(req.params.messageId), scope));
}));

export default router;
