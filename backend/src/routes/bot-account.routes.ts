import { Router } from 'express';

import * as C from '../controllers/bot-account.controller';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/roles';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import * as S from '../schemas/bot-account.schemas';

const router = Router();

// ── Admin (solo bots operados por el equipo de LaCase en esta fase) ──
router.post('/admin/bots', authenticate, requireRole('ADMIN'), validate(S.adminCreateBotSchema), asyncHandler(C.adminCreateBot));
router.post('/admin/bots/:id/sanction', authenticate, requireRole('ADMIN'), validate(S.adminSanctionBotSchema), asyncHandler(C.adminSanctionBot));

// ── Usuario autenticado ──────────────────────────────────────────────
router.get('/bots', authenticate, asyncHandler(C.listBots));
router.post('/bots/:id/conversations', authenticate, validate(S.startConversationSchema), asyncHandler(C.startConversation));
router.post('/bots/conversations/:conversationId/messages', authenticate, validate(S.sendMessageSchema), asyncHandler(C.sendMessage));
router.post('/bots/conversations/:conversationId/end', authenticate, validate(S.endConversationSchema), asyncHandler(C.endConversation));

export default router;
