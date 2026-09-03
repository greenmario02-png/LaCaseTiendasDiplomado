import { Router } from 'express';

import * as chatController from '../controllers/chat.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { createConversationSchema, sendMessageSchema, getConversationSchema } from '../schemas/chat.schemas';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(chatController.listConversations));
router.get('/icebreakers', asyncHandler(chatController.getChatIcebreakers));
router.post('/', validate(createConversationSchema), asyncHandler(chatController.createOrGetConversation));
router.get('/unread', asyncHandler(chatController.unreadCount));
router.get('/:id/export', asyncHandler(chatController.exportConversation));
router.get('/:id/suggestions', asyncHandler(chatController.getChatSuggestions));
router.get('/:id', validate(getConversationSchema), asyncHandler(chatController.getConversation));
router.post('/:id/messages', validate(sendMessageSchema), asyncHandler(chatController.sendMessage));

export default router;
