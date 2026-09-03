import { NotificationType } from '@prisma/client';

import { prisma } from '../config/database';
import { emitToUser } from '../config/socket';

export interface NotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  refType?: string;
  refId?: number;
}

/**
 * Envía una notificación push (Expo Push Service) si el usuario tiene token registrado.
 * Los tokens nativos de expo-notifications empiezan con "ExponentPushToken[...]".
 * Nunca debe romper el flujo principal (try/catch + timeout).
 */
export async function sendPush(input: NotificationInput, pushToken?: string | null): Promise<void> {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) return;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title: input.title,
        body: input.message,
        sound: 'default',
        data: { refType: input.refType ?? null, refId: input.refId ?? null },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch (error) {
    console.error('[notifications] push send error:', (error as Error).message);
  }
}

/**
 * Crea una notificación persistente, la emite por socket al usuario (evento notification:new)
 * y dispara un push de Expo cuando hay token registrado.
 * Se usa como disparador único desde cualquier punto del sistema.
 */
export async function createNotification(input: NotificationInput): Promise<void> {
  try {
    const [notification, user] = await Promise.all([
      prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          refType: input.refType,
          refId: input.refId,
        },
      }),
      prisma.user.findUnique({
        where: { id: input.userId },
        select: { pushToken: true },
      }),
    ]);

    emitToUser(input.userId, 'notification:new', {
      notification,
      unreadCount: await getUnreadCount(input.userId),
    });

    // Push en segundo plano (no bloquea; los tokens se registran desde la app móvil)
    void sendPush(input, user?.pushToken);
  } catch (error) {
    // Las notificaciones nunca deben romper el flujo principal
    console.error('[notifications] error creating:', (error as Error).message);
  }
}

export async function getUnreadCount(userId: number): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function listNotifications(userId: number, page = 1, limit = 30, unreadOnly = false) {
  const where = unreadOnly ? { userId, isRead: false } : { userId };
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    data: notifications,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit), unread: await getUnreadCount(userId) },
  };
}

export async function markRead(userId: number, notificationId: number): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

export async function markAllRead(userId: number): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return result.count;
}
