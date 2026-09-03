import { NextFunction, Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { ok, created } from '../utils/response';
import { ApiError } from '../utils/errors';
import { getIO, emitToUser } from '../config/socket';
import { Role } from '@prisma/client';
import { createNotification } from '../services/notification.service';
import { getIcebreakers, getNoSaleReplies, getFollowUps, getRegionName } from '../data/bolivianismos';

const CONVERSATION_INCLUDE = {
  buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
  seller: { select: { id: true, storeName: true, firstName: true, lastName: true } },
  product: {
    select: { id: true, name: true, price: true, images: { take: 1, select: { url: true } } },
  },
  _count: { select: { messages: true } },
} as const;

function isParticipant(userId: number, conv: { buyerId: number; sellerId: number }): boolean {
  return conv.buyerId === userId || conv.sellerId === userId;
}

/**
 * Crea o reutiliza una conversación entre comprador y vendedor.
 * Si se asocia a un producto, la conversación es única por (buyer, seller, product).
 * Si no, se usa la conversación general (productId = null).
 */
export async function createOrGetConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { sellerId, productId } = req.body;
    const userId = req.user!.id;
    if (!sellerId) throw ApiError.badRequest('sellerId obligatorio');
    if (sellerId === userId) throw ApiError.badRequest('No podés chatear con tu propia tienda');

    const seller = await prisma.user.findFirst({ where: { id: sellerId, isActive: true } });
    if (!seller) throw ApiError.notFound('Usuario no encontrado');

    let product = null;
    if (productId) {
      product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) throw ApiError.notFound('Producto no encontrado');
      if (product.sellerId !== sellerId) throw ApiError.badRequest('El producto no pertenece a ese vendedor');
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        buyerId: userId,
        sellerId,
        ...(productId ? { productId } : { productId: null }),
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { buyerId: userId, sellerId, productId: productId || null },
      });
    }

    const conversationWithDetails = await prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: CONVERSATION_INCLUDE,
    });

    return ok(res, conversationWithDetails);
  } catch (error) {
    next(error);
  }
}

export async function listConversations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: { updatedAt: 'desc' },
      include: {
        ...CONVERSATION_INCLUDE,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, content: true, senderId: true, createdAt: true, readAt: true },
        },
      },
    });
    return ok(res, conversations);
  } catch (error) {
    next(error);
  }
}

export async function getConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversationId = Number(req.params.id);
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: CONVERSATION_INCLUDE,
    });
    if (!conversation) throw ApiError.notFound('Conversación no encontrada');
    if (!isParticipant(req.user!.id, conversation)) throw ApiError.forbidden('No participás en esta conversación');

    // marcar mensajes como leídos
    await prisma.message.updateMany({
      where: { conversationId, senderId: { not: req.user!.id }, readAt: null },
      data: { readAt: new Date() },
    });

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, firstName: true, lastName: true, storeName: true } } },
    });

    return ok(res, { ...conversation, messages });
  } catch (error) {
    next(error);
  }
}

export async function sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversationId = Number(req.params.id);
    const { content } = req.body;
    if (!content || !content.trim()) throw ApiError.badRequest('Escribí un mensaje');

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw ApiError.notFound('Conversación no encontrada');
    if (!isParticipant(req.user!.id, conversation)) throw ApiError.forbidden('No participás en esta conversación');

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: req.user!.id,
        content: content.trim().slice(0, 2000),
      },
    });

    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

    // Emitir en tiempo real a la room de la conversación
    const io = getIO();
    const messageWithSender = await prisma.message.findUnique({
      where: { id: message.id },
      include: { sender: { select: { id: true, firstName: true, lastName: true, storeName: true } } },
    });
    if (io) {
      io.to(`chat:${conversationId}`).emit('chat:message', { conversationId, message: messageWithSender });
    }

    // Notificar al otro participante (badge unread + notificación persistente)
    const otherId = conversation.buyerId === req.user!.id ? conversation.sellerId : conversation.buyerId;
    emitToUser(otherId, 'chat:unread', { conversationId, count: 1 });

    const senderName = messageWithSender?.sender?.storeName
      ? messageWithSender.sender.storeName
      : `${messageWithSender?.sender?.firstName ?? 'Usuario'} ${messageWithSender?.sender?.lastName ?? ''}`.trim();
    await createNotification({
      userId: otherId,
      type: 'NEW_MESSAGE',
      title: `Nuevo mensaje de ${senderName}`,
      message: content.trim().slice(0, 120),
      refType: 'chat',
      refId: conversationId,
    });

    return created(res, messageWithSender);
  } catch (error) {
    next(error);
  }
}

export async function unreadCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      select: { id: true },
    });
    const ids = conversations.map((c) => c.id);

    const count = ids.length
      ? await prisma.message.count({
          where: { conversationId: { in: ids }, senderId: { not: userId }, readAt: null },
        })
      : 0;

    return ok(res, { count });
  } catch (error) {
    next(error);
  }
}

/**
 * Frases para iniciar una conversación con un vendedor, según la región del comprador.
 * GET /api/chat/icebreakers
 */
export async function getChatIcebreakers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const city = user?.locationCity ?? user?.locationState ?? null;
    return ok(res, {
      region: getRegionName(city),
      icebreakers: getIcebreakers(city),
      noSaleReplies: getNoSaleReplies(city),
      followUps: getFollowUps(city),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Sugerencias de seguimiento / cierre para una conversación con inactividad.
 * Si el último mensaje tiene más de `inactivityMinutes` (default 10), devuelve
 * `inactive: true` con frases de seguimiento (followUps) para "despertar" la conversación,
 * y siempre devuelve `noSaleReplies` para cerrar sin compra.
 * GET /api/chat/:id/suggestions
 */
export async function getChatSuggestions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversationId = Number(req.params.id);
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        buyer: { select: { id: true, locationCity: true, locationState: true } },
        seller: { select: { id: true, storeName: true, locationCity: true, locationState: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
    });
    if (!conversation) throw ApiError.notFound('Conversación no encontrada');
    if (!isParticipant(req.user!.id, conversation)) throw ApiError.forbidden('No participás en esta conversación');

    const inactivityMinutes = Number(req.query.inactivityMinutes ?? 10);
    const lastMessage = conversation.messages[0];
    const lastAt = lastMessage ? lastMessage.createdAt.getTime() : Date.now();
    const elapsedMinutes = Math.max(0, (Date.now() - lastAt) / 60000);
    const inactive = elapsedMinutes >= inactivityMinutes;

    // Región del OTRO participante (si soy comprador → región del vendedor; si soy vendedor → región del comprador)
    const isBuyer = conversation.buyerId === req.user!.id;
    const otherCity = isBuyer
      ? conversation.seller.locationCity ?? conversation.seller.locationState
      : conversation.buyer.locationCity ?? conversation.buyer.locationState;

    return ok(res, {
      region: getRegionName(otherCity),
      inactive,
      elapsedMinutes: Math.round(elapsedMinutes),
      followUps: getFollowUps(otherCity),
      noSaleReplies: getNoSaleReplies(otherCity),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Exporta una conversación a CSV (atención al cliente / tickets).
 * Cualquier participante de la conversación (o un empleado de la tienda del vendedor)
 * puede exportarla.
 */export async function exportConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversationId = Number(req.params.id);
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
        seller: { select: { id: true, storeName: true, email: true, storeOwnerId: true } },
        product: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
        },
      },
    });
    if (!conversation) throw ApiError.notFound('Conversación no encontrada');

    // Permiso: participante, o empleado/admin de la tienda del vendedor, o admin global
    const isParticipant = conversation.buyerId === req.user!.id || conversation.sellerId === req.user!.id;
    const isGlobalAdmin = req.user!.role === Role.ADMIN;
    const isTeamMember =
      (req.user!.role === Role.SELLER || req.user!.role === Role.SELLER) &&
      (req.user!.id === conversation.sellerId || req.user!.storeOwnerId === conversation.sellerId);
    if (!isParticipant && !isGlobalAdmin && !isTeamMember) {
      throw ApiError.forbidden('No tenés permiso para exportar esta conversación');
    }

    const senderName = (m: any) =>
      m.sender ? `${m.sender.firstName ?? ''} ${m.sender.lastName ?? ''}`.trim() || m.sender.email : 'desconocido';
    const rows = [
      'fecha,remitente,rol,contenido',
      ...conversation.messages.map(
        (m: any) =>
          `"${new Date(m.createdAt).toISOString()}","${senderName(m).replaceAll('"', '""')}","${m.sender?.role ?? ''}","${(m.content ?? '').replaceAll('"', '""')}"`,
      ),
    ];

    const csv = rows.join('\r\n');
    const filename = `conversacion-${conversationId}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(Buffer.from('\uFEFF' + csv, 'utf8'));
  } catch (error) {
    next(error);
  }
}
