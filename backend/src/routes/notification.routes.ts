import { Router } from 'express';

import * as notificationController from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(notificationController.list));
router.get('/unread-count', asyncHandler(notificationController.unreadCount));
router.patch('/:id/read', asyncHandler(notificationController.markRead));
router.post('/read-all', asyncHandler(notificationController.markAllRead));

export default router;
