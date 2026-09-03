import { NextFunction, Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import { ok } from '../utils/response';
import * as notificationService from '../services/notification.service';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 30));
    const unreadOnly = req.query.unread === 'true' || req.query.unread === '1';
    const result = await notificationService.listNotifications(req.user!.id, page, limit, unreadOnly);
    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function unreadCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const count = await notificationService.getUnreadCount(req.user!.id);
    return ok(res, { count });
  } catch (error) {
    next(error);
  }
}

export async function markRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await notificationService.markRead(req.user!.id, Number(req.params.id));
    return ok(res, { message: 'Marcada como leída' });
  } catch (error) {
    next(error);
  }
}

export async function markAllRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const count = await notificationService.markAllRead(req.user!.id);
    return ok(res, { message: `${count} notificaciones marcadas como leídas`, count });
  } catch (error) {
    next(error);
  }
}
