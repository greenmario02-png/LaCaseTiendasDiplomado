/**
 * Chat comprador <-> tienda: adjuntos privados, tipos de mensaje, estados y conversacion por pedido.
 *
 * Reglas de seguridad (todas en el servidor, el cliente no decide nada):
 *  - Cada operacion comprueba que quien llama participa en la conversacion (IDOR). Solo el personal de moderacion
 *    (ADMIN o la asignacion RBAC de moderacion, ver `isChatStaff`) ve una conversacion ajena, y solo si tiene un reporte.
 *  - PAYMENT_QR y SYSTEM los crea solo el servidor: el QR sale de los datos de pago de la tienda (User.paymentQrUrl).
 *  - Adjuntos privados: archivo con nombre aleatorio en private-uploads/chat y URL firmada para cada usuario.
 *  - Bloqueo en cualquier sentido impide enviar.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { Prisma } from '@prisma/client';

import { prisma } from '../../config/database';
import { getIO } from '../../config/socket';
import { CHAT_FILES_DIR, chatLimits } from '../../config/chat';
import { ApiError } from '../../utils/errors';
import { isForumModerator } from '../../middlewares/roles';
import { createNotification } from '../notification.service';

import { inspectChatUpload, sanitizeDisplayName } from './fileSafety';
import { signFileUrl } from './fileSign';
import { isOnline } from './presence';

export const MESSAGE_KINDS = ['TEXT', 'IMAGE', 'FILE', 'PAYMENT_QR', 'PAYMENT_PROOF', 'SYSTEM'] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];
export const REPORT_REASONS = ['SPAM', 'FRAUD', 'ABUSE', 'INAPPROPRIATE', 'OTHER'] as const;

/**
 * Personal que revisa reportes del chat. En el modelo de 3 roles la moderacion no es un rol propio: es el ADMIN o un
 * usuario con la asignacion RBAC de moderacion (`MODERADOR_FORO`, misma fuente de verdad que el foro).
 */
export async function isChatStaff(user: { id: number; role: string; isActive?: boolean } | null | undefined): Promise<boolean> {
  if (!user || user.isActive === false) return false;
  if (user.role === 'ADMIN') return true;
  return isForumModerator(user.id);
}

export const CONVERSATION_INCLUDE = {
  buyer: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
  seller: { select: { id: true, storeName: true, firstName: true, lastName: true, storeLogo: true } },
  product: {
    select: { id: true, name: true, price: true, sellerId: true, images: { take: 1, select: { url: true } } },
  },
  _count: { select: { messages: true } },
} as const;

const MESSAGE_INCLUDE = {
  sender: { select: { id: true, firstName: true, lastName: true, storeName: true } },
  attachments: { select: { id: true, mime: true, size: true, width: true, height: true, displayName: true }, take: 1 },
  replyTo: {
    select: { id: true, senderId: true, kind: true, content: true, deletedForAllAt: true, attachments: { select: { mime: true }, take: 1 } },
  },
} satisfies Prisma.MessageInclude;

type MessageRow = Prisma.MessageGetPayload<{ include: typeof MESSAGE_INCLUDE }>;
type ConversationRow = Prisma.ConversationGetPayload<{ include: typeof CONVERSATION_INCLUDE }>;

// ── utilidades ─────────────────────────────────────────────────────────────────────────────────────────────────────

const userRoom = (userId: number) => `user:${userId}`;
function emitTo(userId: number, event: string, payload: unknown) {
  getIO()?.to(userRoom(userId)).emit(event, payload);
}

export function isParticipant(userId: number, conv: { buyerId: number; sellerId: number }): boolean {
  return conv.buyerId === userId || conv.sellerId === userId;
}
const otherOf = (conv: { buyerId: number; sellerId: number }, userId: number) => (conv.buyerId === userId ? conv.sellerId : conv.buyerId);

/** Texto plano corto para avisos y listas (el cliente traduce por `kind`; esto es el respaldo en espanol). */
export function previewText(m: { kind: string; content: string; deletedForAllAt?: Date | null; meta?: unknown }): string {
  if (m.deletedForAllAt) return 'Mensaje eliminado';
  const caption = (m.content ?? '').trim();
  switch (m.kind) {
    case 'IMAGE':
      return caption ? `Foto: ${caption}` : 'Foto';
    case 'FILE':
      return caption ? `Documento: ${caption}` : 'Documento PDF';
    case 'PAYMENT_QR':
      return 'QR de pago';
    case 'PAYMENT_PROOF':
      return 'Comprobante de pago';
    default:
      return caption;
  }
}

/** URL del QR de la tienda aceptable para mostrar: archivo propio (/uploads/...) o http(s) sin caracteres raros. */
export function safeQrUrl(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim();
  if (!s || s.length > 2000 || /[\s"'<>`\\]/.test(s)) return null;
  if (s.startsWith('/uploads/')) return s.includes('..') ? null : s;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function sanitizeMeta(kind: string, meta: unknown): Record<string, unknown> | null {
  if (!meta || typeof meta !== 'object') return null;
  const m = meta as Record<string, unknown>;
  if (kind === 'PAYMENT_QR') return { qrUrl: safeQrUrl(String(m.qrUrl ?? '')), orderId: typeof m.orderId === 'number' ? m.orderId : null };
  if (kind === 'SYSTEM') return { event: String(m.event ?? ''), orderId: typeof m.orderId === 'number' ? m.orderId : null, status: typeof m.status === 'string' ? m.status : null };
  return null;
}

export interface MessageDto {
  id: number;
  conversationId: number;
  senderId: number;
  sender: { id: number; firstName: string; lastName: string; storeName: string | null } | null;
  kind: string;
  contentType: string;
  content: string;
  clientId: string | null;
  createdAt: Date;
  deliveredAt: Date | null;
  readAt: Date | null;
  orderId: number | null;
  deleted: boolean;
  meta: Record<string, unknown> | null;
  attachment: { id: number; mime: string; size: number; width: number | null; height: number | null; name: string | null; url: string | null; hidden: boolean } | null;
  replyTo: { id: number; senderId: number; kind: string; preview: string; deleted: boolean; hasImage: boolean } | null;
}

export function toMessageDto(m: MessageRow, viewerId: number): MessageDto {
  const deleted = !!m.deletedForAllAt;
  const att = m.attachments?.[0];
  const hidden = false;
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    sender: m.sender ?? null,
    kind: m.kind,
    contentType: m.contentType,
    content: deleted ? '' : m.content,
    clientId: m.clientId,
    createdAt: m.createdAt,
    deliveredAt: m.deliveredAt,
    readAt: m.readAt,
    orderId: m.orderId,
    deleted,
    meta: deleted ? null : sanitizeMeta(m.kind, m.meta),
    attachment:
      deleted || !att
        ? null
        : { id: att.id, mime: att.mime, size: att.size, width: att.width, height: att.height, name: att.displayName, url: hidden ? null : signFileUrl(att.id, viewerId), hidden },
    replyTo: m.replyTo
      ? {
          id: m.replyTo.id,
          senderId: m.replyTo.senderId,
          kind: m.replyTo.kind,
          preview: previewText({ kind: m.replyTo.kind, content: m.replyTo.content, deletedForAllAt: m.replyTo.deletedForAllAt }).slice(0, 140),
          deleted: !!m.replyTo.deletedForAllAt,
          hasImage: !m.replyTo.deletedForAllAt && !!m.replyTo.attachments?.[0]?.mime.startsWith('image/'),
        }
      : null,
  };
}

// ── acceso ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export async function loadConversationFor(userId: number, conversationId: number): Promise<ConversationRow> {
  if (!Number.isInteger(conversationId) || conversationId <= 0) throw ApiError.badRequest('ID inválido');
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, include: CONVERSATION_INCLUDE });
  if (!conv) throw ApiError.notFound('Conversación no encontrada');
  if (!isParticipant(userId, conv)) throw ApiError.forbidden('No participas en esta conversación');
  return conv;
}

export async function blockBetween(a: number, b: number): Promise<{ byMe: boolean; byOther: boolean }> {
  const rows = await prisma.chatBlock.findMany({ where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] } });
  return { byMe: rows.some((r) => r.blockerId === a), byOther: rows.some((r) => r.blockerId === b) };
}

async function assertCanSend(userId: number, conv: { buyerId: number; sellerId: number }) {
  const blk = await blockBetween(userId, otherOf(conv, userId));
  if (blk.byMe || blk.byOther) throw new ApiError(403, 'CHAT_BLOCKED', 'No puedes enviar mensajes en esta conversación.');
}

// ── pedido ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export async function orderSummary(orderId: number) {
  const o = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true, status: true, paymentStatus: true, paymentMethod: true, total: true, subtotal: true, shippingCost: true, createdAt: true, sellerId: true,
      items: { select: { productId: true, quantity: true, unitPrice: true, product: { select: { name: true, images: { take: 1, select: { url: true } } } } }, take: 20 },
    },
  });
  if (!o) return null;
  return {
    id: o.id,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    total: Number(o.total),
    subtotal: Number(o.subtotal),
    shippingCost: o.shippingCost == null ? null : Number(o.shippingCost),
    createdAt: o.createdAt,
    items: o.items.map((it) => ({
      productId: it.productId,
      name: it.product.name,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      image: it.product.images[0]?.url ?? null,
    })),
  };
}

// ── lista ──────────────────────────────────────────────────────────────────────────────────────────────────────────

export async function listConversations(userId: number) {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    orderBy: { updatedAt: 'desc' },
    take: 300,
    include: {
      ...CONVERSATION_INCLUDE,
      messages: {
        where: { hiddenFor: { none: { userId } } },
        orderBy: { id: 'desc' },
        take: 1,
        select: { id: true, content: true, kind: true, senderId: true, createdAt: true, readAt: true, deliveredAt: true, deletedForAllAt: true, attachments: { select: { mime: true }, take: 1 } },
      },
    },
  });
  const ids = conversations.map((c) => c.id);
  if (!ids.length) return [];

  await markDelivered(userId, ids);

  const [unread, prefs, orders] = await Promise.all([
    prisma.message.groupBy({ by: ['conversationId'], where: { conversationId: { in: ids }, senderId: { not: userId }, readAt: null, deletedForAllAt: null, hiddenFor: { none: { userId } } }, _count: { _all: true } }),
    prisma.chatConversationPref.findMany({ where: { userId, conversationId: { in: ids } } }),
    prisma.order.findMany({ where: { id: { in: conversations.map((c) => c.orderId).filter((x): x is number => !!x) } }, select: { id: true, status: true, paymentStatus: true, total: true } }),
  ]);
  const unreadBy = new Map(unread.map((u) => [u.conversationId, u._count._all]));
  const mutedBy = new Map(prefs.map((p) => [p.conversationId, p.muted]));
  const orderBy = new Map(orders.map((o) => [o.id, { ...o, total: Number(o.total) }]));

  return conversations.map((c) => {
    const last = c.messages[0];
    const lastMessage = last
      ? {
          id: last.id,
          kind: last.kind,
          content: last.deletedForAllAt ? '' : last.content,
          senderId: last.senderId,
          createdAt: last.createdAt,
          readAt: last.readAt,
          deliveredAt: last.deliveredAt,
          deleted: !!last.deletedForAllAt,
          hasImage: !last.deletedForAllAt && !!last.attachments[0]?.mime.startsWith('image/'),
        }
      : null;
    return {
      ...c,
      // Compatibilidad con clientes anteriores: `messages[0]` sigue siendo el ultimo mensaje.
      messages: lastMessage ? [{ ...lastMessage }] : [],
      lastMessage,
      unreadCount: unreadBy.get(c.id) ?? 0,
      muted: mutedBy.get(c.id) ?? false,
      order: c.orderId ? orderBy.get(c.orderId) ?? null : null,
    };
  });
}

/** Marca como entregados los mensajes recibidos y avisa a cada remitente (doble check gris). */
async function markDelivered(userId: number, conversationIds: number[]) {
  const pending = await prisma.message.groupBy({
    by: ['conversationId', 'senderId'],
    where: { conversationId: { in: conversationIds }, senderId: { not: userId }, deliveredAt: null },
    _max: { id: true },
  });
  if (!pending.length) return;
  const at = new Date();
  await prisma.message.updateMany({ where: { conversationId: { in: pending.map((p) => p.conversationId) }, senderId: { not: userId }, deliveredAt: null }, data: { deliveredAt: at } });
  for (const p of pending) emitTo(p.senderId, 'chat:status', { conversationId: p.conversationId, status: 'delivered', upToId: p._max.id, at });
}

// ── conversacion (pagina hacia atras) ──────────────────────────────────────────────────────────────────────────────

export async function getConversationPage(userId: number, conversationId: number, opts: { before?: number; limit?: number }) {
  const conv = await loadConversationFor(userId, conversationId);
  const limit = Math.min(Math.max(opts.limit ?? chatLimits.pageSize(), 1), 100);

  if (!opts.before) await markRead(userId, conv);

  const rows = await prisma.message.findMany({
    where: { conversationId, hiddenFor: { none: { userId } }, ...(opts.before ? { id: { lt: opts.before } } : {}) },
    orderBy: { id: 'desc' },
    take: limit + 1,
    include: MESSAGE_INCLUDE,
  });
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit).reverse();
  const otherId = otherOf(conv, userId);
  const [pref, blk, order] = await Promise.all([
    prisma.chatConversationPref.findUnique({ where: { conversationId_userId: { conversationId, userId } } }),
    blockBetween(userId, otherId),
    conv.orderId ? orderSummary(conv.orderId) : Promise.resolve(null),
  ]);
  return {
    ...conv,
    role: conv.buyerId === userId ? 'BUYER' : 'SELLER',
    messages: page.map((m) => toMessageDto(m, userId)),
    hasMore,
    muted: pref?.muted ?? false,
    blockedByMe: blk.byMe,
    canSend: !blk.byMe && !blk.byOther,
    adultImagesHidden: false,
    order,
  };
}

/** Lectura: marca leidos y entregados los mensajes recibidos y avisa al remitente (doble check de color). */
export async function markRead(userId: number, conv: { id: number; buyerId: number; sellerId: number }) {
  const last = await prisma.message.findFirst({ where: { conversationId: conv.id, senderId: { not: userId }, readAt: null }, orderBy: { id: 'desc' }, select: { id: true } });
  if (!last) return { updated: 0 };
  const at = new Date();
  await prisma.message.updateMany({ where: { conversationId: conv.id, senderId: { not: userId }, deliveredAt: null }, data: { deliveredAt: at } });
  const r = await prisma.message.updateMany({ where: { conversationId: conv.id, senderId: { not: userId }, readAt: null }, data: { readAt: at } });
  emitTo(otherOf(conv, userId), 'chat:status', { conversationId: conv.id, status: 'read', upToId: last.id, at });
  return { updated: r.count };
}

export async function markReadById(userId: number, conversationId: number) {
  const conv = await loadConversationFor(userId, conversationId);
  return markRead(userId, conv);
}

// ── envio ──────────────────────────────────────────────────────────────────────────────────────────────────────────

interface NewMessage {
  kind: MessageKind;
  content: string;
  clientId?: string | null;
  replyToId?: number | null;
  orderId?: number | null;
  meta?: Prisma.InputJsonValue;
  attachment?: { storageKey: string; mime: string; size: number; width: number | null; height: number | null; displayName: string | null };
}

async function findByClientId(conversationId: number, senderId: number, clientId: string | null | undefined) {
  if (!clientId) return null;
  return prisma.message.findUnique({ where: { conversationId_senderId_clientId: { conversationId, senderId, clientId } }, include: MESSAGE_INCLUDE });
}

async function assertReply(conversationId: number, replyToId: number | null | undefined) {
  if (!replyToId) return;
  const r = await prisma.message.findUnique({ where: { id: replyToId }, select: { conversationId: true } });
  if (!r || r.conversationId !== conversationId) throw ApiError.badRequest('El mensaje citado no pertenece a esta conversación.');
}

/**
 * Crea el mensaje (y su adjunto) y lo reparte por socket a cada participante con su propia vista (URL firmada por usuario,
 * filtro +18). Idempotente por (conversacion, remitente, clientId): un reintento devuelve el mismo mensaje.
 */
async function createAndBroadcast(conv: ConversationRow, senderId: number, data: NewMessage): Promise<{ message: MessageDto; created: boolean }> {
  const existing = await findByClientId(conv.id, senderId, data.clientId);
  if (existing) return { message: toMessageDto(existing, senderId), created: false };

  const otherId = otherOf(conv, senderId);
  const deliveredAt = isOnline(otherId) ? new Date() : null;
  let row: MessageRow;
  try {
    row = await prisma.$transaction(async (tx) => {
      const m = await tx.message.create({
        data: {
          conversationId: conv.id,
          senderId,
          kind: data.kind,
          content: data.content,
          clientId: data.clientId ?? null,
          replyToId: data.replyToId ?? null,
          orderId: data.orderId ?? null,
          meta: data.meta,
          deliveredAt,
        },
      });
      if (data.attachment) {
        await tx.chatAttachment.create({ data: { ...data.attachment, messageId: m.id, conversationId: conv.id, uploaderId: senderId } });
      }
      await tx.conversation.update({ where: { id: conv.id }, data: { updatedAt: new Date() } });
      return tx.message.findUniqueOrThrow({ where: { id: m.id }, include: MESSAGE_INCLUDE });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const again = await findByClientId(conv.id, senderId, data.clientId);
      if (again) return { message: toMessageDto(again, senderId), created: false };
    }
    throw e;
  }

  // Vista de cada participante (la URL firmada depende de quien mira).
  const senderDto = toMessageDto(row, senderId);
  const otherDto = toMessageDto(row, otherId);
  emitTo(senderId, 'chat:message', { conversationId: conv.id, message: senderDto });
  emitTo(otherId, 'chat:message', { conversationId: conv.id, message: otherDto });
  emitTo(otherId, 'chat:unread', { conversationId: conv.id, count: 1 });
  if (deliveredAt) emitTo(senderId, 'chat:status', { conversationId: conv.id, status: 'delivered', upToId: row.id, at: deliveredAt });

  const pref = await prisma.chatConversationPref.findUnique({ where: { conversationId_userId: { conversationId: conv.id, userId: otherId } } });
  if (!pref?.muted && data.kind !== 'SYSTEM') {
    const s = row.sender;
    const senderName = s?.storeName && senderId === conv.sellerId ? s.storeName : `${s?.firstName ?? 'Usuario'} ${s?.lastName ?? ''}`.trim();
    await createNotification({
      userId: otherId,
      type: 'NEW_MESSAGE',
      title: `Nuevo mensaje de ${senderName}`,
      message: previewText(row).slice(0, 120),
      refType: 'chat',
      refId: conv.id,
    });
  }
  return { message: senderDto, created: true };
}

export async function sendText(userId: number, conversationId: number, body: { content: string; clientId?: string | null; replyToId?: number | null }) {
  const conv = await loadConversationFor(userId, conversationId);
  const content = (body.content ?? '').trim().slice(0, 2000);
  if (!content) throw ApiError.badRequest('Escribe un mensaje');
  const dup = await findByClientId(conv.id, userId, body.clientId);
  if (dup) return { message: toMessageDto(dup, userId), created: false };
  await assertCanSend(userId, conv);
  await assertReply(conv.id, body.replyToId);
  return createAndBroadcast(conv, userId, { kind: 'TEXT', content, clientId: body.clientId, replyToId: body.replyToId });
}

/** Pedido valido para un comprobante: el de la conversacion o uno del mismo comprador con esa tienda. */
async function proofOrderId(userId: number, conv: { buyerId: number; sellerId: number; orderId: number | null }, requested?: number | null): Promise<number> {
  if (conv.buyerId !== userId) throw ApiError.forbidden('Solo el comprador envía el comprobante de pago.');
  const id = conv.orderId ?? requested ?? null;
  if (!id) throw ApiError.badRequest('El comprobante se envía desde el chat de un pedido.');
  if (conv.orderId && requested && requested !== conv.orderId) throw ApiError.badRequest('El pedido no corresponde a esta conversación.');
  const o = await prisma.order.findUnique({ where: { id }, select: { buyerId: true, sellerId: true } });
  if (!o || o.buyerId !== userId || o.sellerId !== conv.sellerId) throw ApiError.notFound('Pedido no encontrado');
  return id;
}

export async function sendAttachment(
  userId: number,
  conversationId: number,
  file: { buffer: Buffer; originalname?: string } | undefined,
  body: { kind?: 'IMAGE' | 'FILE' | 'PAYMENT_PROOF'; caption?: string | null; clientId?: string | null; replyToId?: number | null; orderId?: number | null },
) {
  const conv = await loadConversationFor(userId, conversationId);
  const dup = await findByClientId(conv.id, userId, body.clientId);
  if (dup) return { message: toMessageDto(dup, userId), created: false };
  if (!file?.buffer?.length) throw ApiError.badRequest('No se recibió ningún archivo');
  await assertCanSend(userId, conv);
  await assertReply(conv.id, body.replyToId);
  const orderId = body.kind === 'PAYMENT_PROOF' ? await proofOrderId(userId, conv, body.orderId) : null;

  const info = inspectChatUpload(file.buffer);
  const isPdf = info.mime === 'application/pdf';
  const kind: MessageKind = body.kind === 'PAYMENT_PROOF' ? 'PAYMENT_PROOF' : isPdf ? 'FILE' : 'IMAGE';
  const storageKey = `${crypto.randomBytes(16).toString('hex')}${info.ext}`;
  fs.mkdirSync(CHAT_FILES_DIR, { recursive: true });
  const filePath = path.join(CHAT_FILES_DIR, storageKey);
  fs.writeFileSync(filePath, info.buffer, { mode: 0o600 });
  try {
    const result = await createAndBroadcast(conv, userId, {
      kind,
      content: (body.caption ?? '').trim().slice(0, 1000),
      clientId: body.clientId,
      replyToId: body.replyToId,
      orderId,
      attachment: {
        storageKey,
        mime: info.mime,
        size: info.buffer.length,
        width: info.width,
        height: info.height,
        displayName: isPdf ? sanitizeDisplayName(file.originalname) : null,
      },
    });
    if (!result.created) fs.rmSync(filePath, { force: true });
    if (result.created && kind === 'PAYMENT_PROOF') await runHooks('paymentProof', { conversationId: conv.id, orderId: orderId!, messageId: result.message.id, buyerId: userId });
    return result;
  } catch (e) {
    fs.rmSync(filePath, { force: true });
    throw e;
  }
}

/** QR de cobro: solo la tienda de la conversacion y siempre el QR configurado en sus datos de pago (no se acepta otra imagen). */
export async function sendPaymentQr(userId: number, conversationId: number, body: { clientId?: string | null }) {
  const conv = await loadConversationFor(userId, conversationId);
  if (conv.sellerId !== userId) throw ApiError.forbidden('Solo la tienda envía su QR de cobro.');
  const dup = await findByClientId(conv.id, userId, body.clientId);
  if (dup) return { message: toMessageDto(dup, userId), created: false };
  await assertCanSend(userId, conv);
  const store = await prisma.user.findUnique({ where: { id: userId }, select: { paymentQrUrl: true } });
  const qrUrl = safeQrUrl(store?.paymentQrUrl);
  if (!qrUrl) throw new ApiError(409, 'QR_REQUIRED', 'Configura el QR de cobro de tu tienda para enviarlo.');
  return createAndBroadcast(conv, userId, {
    kind: 'PAYMENT_QR',
    content: 'QR de pago',
    clientId: body.clientId,
    orderId: conv.orderId,
    meta: { qrUrl, orderId: conv.orderId },
  });
}

// ── eliminar ───────────────────────────────────────────────────────────────────────────────────────────────────────

async function removeAttachmentFiles(messageId: number) {
  const atts = await prisma.chatAttachment.findMany({ where: { messageId } });
  for (const a of atts) fs.rmSync(path.join(CHAT_FILES_DIR, path.basename(a.storageKey)), { force: true });
  await prisma.chatAttachment.deleteMany({ where: { messageId } });
}

export async function deleteMessage(userId: number, conversationId: number, messageId: number, scope: 'me' | 'all') {
  const conv = await loadConversationFor(userId, conversationId);
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg || msg.conversationId !== conv.id) throw ApiError.notFound('Mensaje no encontrado');

  if (scope === 'me') {
    await prisma.chatMessageHidden.upsert({ where: { messageId_userId: { messageId, userId } }, create: { messageId, userId }, update: {} });
    return { messageId, scope };
  }
  if (msg.senderId !== userId) throw ApiError.forbidden('Solo puedes eliminar para todos tus propios mensajes.');
  if (msg.kind === 'SYSTEM' || msg.kind === 'PAYMENT_PROOF') throw ApiError.badRequest('Este mensaje no se puede eliminar para todos.');
  if (msg.deletedForAllAt) return { messageId, scope };
  const windowMs = chatLimits.deleteForAllMinutes() * 60_000;
  if (Date.now() - msg.createdAt.getTime() > windowMs) {
    throw new ApiError(409, 'DELETE_WINDOW_EXPIRED', 'Ya pasó el tiempo para eliminar este mensaje para todos.');
  }
  await prisma.message.update({ where: { id: messageId }, data: { content: '', meta: Prisma.DbNull, deletedForAllAt: new Date() } });
  await removeAttachmentFiles(messageId);
  for (const uid of [conv.buyerId, conv.sellerId]) emitTo(uid, 'chat:deleted', { conversationId: conv.id, messageId });
  return { messageId, scope };
}

// ── preferencias, bloqueo, reporte ─────────────────────────────────────────────────────────────────────────────────

export async function setMuted(userId: number, conversationId: number, muted: boolean) {
  await loadConversationFor(userId, conversationId);
  await prisma.chatConversationPref.upsert({
    where: { conversationId_userId: { conversationId, userId } },
    create: { conversationId, userId, muted },
    update: { muted },
  });
  return { conversationId, muted };
}

export async function blockUser(userId: number, targetId: number) {
  if (targetId === userId) throw ApiError.badRequest('No puedes bloquearte a ti mismo.');
  // Solo se puede bloquear a alguien con quien se comparte una conversacion (no sirve para sondear ids).
  const shared = await prisma.conversation.findFirst({ where: { OR: [{ buyerId: userId, sellerId: targetId }, { buyerId: targetId, sellerId: userId }] }, select: { id: true } });
  if (!shared) throw ApiError.notFound('Usuario no encontrado');
  await prisma.chatBlock.upsert({ where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } }, create: { blockerId: userId, blockedId: targetId }, update: {} });
  return { blocked: true, userId: targetId };
}

export async function unblockUser(userId: number, targetId: number) {
  await prisma.chatBlock.deleteMany({ where: { blockerId: userId, blockedId: targetId } });
  return { blocked: false, userId: targetId };
}

export async function listBlocks(userId: number) {
  const rows = await prisma.chatBlock.findMany({ where: { blockerId: userId }, orderBy: { createdAt: 'desc' } });
  const users = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.blockedId) } }, select: { id: true, firstName: true, lastName: true, storeName: true } });
  return rows.map((r) => ({ userId: r.blockedId, createdAt: r.createdAt, user: users.find((u) => u.id === r.blockedId) ?? null }));
}

export async function reportConversation(userId: number, conversationId: number, body: { reason: string; details?: string | null; block?: boolean }) {
  const conv = await loadConversationFor(userId, conversationId);
  const reportedId = otherOf(conv, userId);
  const open = await prisma.chatReport.findFirst({ where: { conversationId, reporterId: userId, status: 'OPEN' } });
  const report = open
    ? await prisma.chatReport.update({ where: { id: open.id }, data: { reason: body.reason, details: body.details ?? null } })
    : await prisma.chatReport.create({ data: { conversationId, reporterId: userId, reportedId, reason: body.reason, details: body.details ?? null } });
  if (body.block) await prisma.chatBlock.upsert({ where: { blockerId_blockedId: { blockerId: userId, blockedId: reportedId } }, create: { blockerId: userId, blockedId: reportedId }, update: {} });
  return { id: report.id, status: report.status };
}

export async function getSettings(userId: number) {
  const s = await prisma.chatUserSetting.findUnique({ where: { userId } });
  return { hideLastSeen: s?.hideLastSeen ?? false };
}

export async function updateSettings(userId: number, body: { hideLastSeen: boolean }) {
  const s = await prisma.chatUserSetting.upsert({ where: { userId }, create: { userId, hideLastSeen: body.hideLastSeen }, update: { hideLastSeen: body.hideLastSeen } });
  return { hideLastSeen: s.hideLastSeen };
}

// ── pedidos ────────────────────────────────────────────────────────────────────────────────────────────────────────

type ChatHook = (p: { conversationId: number; orderId: number; messageId: number; buyerId: number }) => Promise<void> | void;
const hooks: Record<string, ChatHook[]> = {};
/** Punto de extension para otros modulos (p. ej. pagos): `onChatEvent('paymentProof', fn)`. Un error en un hook no rompe el chat. */
export function onChatEvent(event: 'paymentProof', fn: ChatHook) {
  (hooks[event] ??= []).push(fn);
}
async function runHooks(event: string, payload: Parameters<ChatHook>[0]) {
  for (const fn of hooks[event] ?? []) {
    try {
      await fn(payload);
    } catch {
      /* el hook es ajeno al chat */
    }
  }
}

async function findOrCreateOrderConversation(order: { id: number; buyerId: number; sellerId: number }) {
  const existing = await prisma.conversation.findUnique({ where: { orderId: order.id } });
  if (existing) return { conv: existing, created: false };
  try {
    const conv = await prisma.$transaction(async (tx) => {
      const c = await tx.conversation.create({ data: { buyerId: order.buyerId, sellerId: order.sellerId, orderId: order.id, productId: null } });
      await tx.message.create({
        data: { conversationId: c.id, senderId: order.sellerId, kind: 'SYSTEM', content: `Pedido #${order.id}`, meta: { event: 'ORDER_LINKED', orderId: order.id }, deliveredAt: new Date(), readAt: null },
      });
      return c;
    });
    return { conv, created: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const again = await prisma.conversation.findUnique({ where: { orderId: order.id } });
      if (again) return { conv: again, created: false };
    }
    throw e;
  }
}

/**
 * POST /api/chat/order/:orderId/open — solo el comprador o la tienda del pedido. Abre (o crea) la conversacion del pedido.
 * Un pedido ajeno responde 404 igual que uno inexistente (no confirma que exista).
 */
export async function openOrderConversation(userId: number, orderId: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, buyerId: true, sellerId: true } });
  if (!order || (order.buyerId !== userId && order.sellerId !== userId)) throw ApiError.notFound('Pedido no encontrado');
  if (order.buyerId === order.sellerId) throw ApiError.badRequest('Pedido inválido');
  const { conv } = await findOrCreateOrderConversation(order);
  const full = await prisma.conversation.findUniqueOrThrow({ where: { id: conv.id }, include: CONVERSATION_INCLUDE });
  return { ...full, order: await orderSummary(order.id) };
}

/**
 * Evento del pedido como mensaje SYSTEM en su conversacion (la crea si hace falta). Para otros modulos (pagos, entregas):
 * `postOrderSystemEvent(orderId, 'PAYMENT_VERIFIED')`. El texto en espanol es el respaldo; los clientes traducen por `event`.
 */
export async function postOrderSystemEvent(orderId: number, event: string, extra: { status?: string; text?: string } = {}) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, buyerId: true, sellerId: true } });
  if (!order || order.buyerId === order.sellerId) return null;
  const { conv } = await findOrCreateOrderConversation(order);
  const full = await prisma.conversation.findUniqueOrThrow({ where: { id: conv.id }, include: CONVERSATION_INCLUDE });
  const r = await createAndBroadcast(full, order.sellerId, {
    kind: 'SYSTEM',
    content: (extra.text ?? `Pedido #${order.id}: ${event}`).slice(0, 300),
    orderId: order.id,
    meta: { event: event.slice(0, 40), orderId: order.id, ...(extra.status ? { status: extra.status.slice(0, 30) } : {}) },
  });
  return r.message;
}

// ── moderacion (personal de moderacion, solo conversaciones reportadas) ──────────────────────────────────────────────────

export async function listReports(status: string | undefined, page: number, limit: number) {
  const where = status ? { status } : {};
  const [rows, total] = await Promise.all([
    prisma.chatReport.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.chatReport.count({ where }),
  ]);
  const userIds = [...new Set(rows.flatMap((r) => [r.reporterId, r.reportedId]))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true, storeName: true } });
  const u = (id: number) => users.find((x) => x.id === id) ?? null;
  return { rows: rows.map((r) => ({ ...r, reporter: u(r.reporterId), reported: u(r.reportedId) })), total };
}

export async function staffConversation(staffId: number, reportId: number, before?: number) {
  const report = await prisma.chatReport.findUnique({ where: { id: reportId } });
  if (!report) throw ApiError.notFound('Reporte no encontrado');
  const conv = await prisma.conversation.findUnique({ where: { id: report.conversationId }, include: CONVERSATION_INCLUDE });
  if (!conv) throw ApiError.notFound('Conversación no encontrada');
  const rows = await prisma.message.findMany({
    where: { conversationId: conv.id, ...(before ? { id: { lt: before } } : {}) },
    orderBy: { id: 'desc' },
    take: 101,
    include: MESSAGE_INCLUDE,
  });
  return {
    report,
    conversation: { id: conv.id, buyer: conv.buyer, seller: conv.seller, product: conv.product, orderId: conv.orderId },
    // El personal ve todo (incluidos los mensajes que alguien oculto "para si"); los borrados para todos quedan marcados.
    messages: rows.slice(0, 100).reverse().map((m) => toMessageDto(m, staffId)),
    hasMore: rows.length > 100,
  };
}

export async function resolveReport(staffId: number, reportId: number, status: 'REVIEWED' | 'DISMISSED') {
  const r = await prisma.chatReport.findUnique({ where: { id: reportId } });
  if (!r) throw ApiError.notFound('Reporte no encontrado');
  return prisma.chatReport.update({ where: { id: reportId }, data: { status, resolvedById: staffId, resolvedAt: new Date() } });
}

// ── archivos ───────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Resuelve el archivo de una URL firmada. La firma ya ata el adjunto al usuario; aun asi se vuelve a comprobar que siga
 * siendo participante (o personal con un reporte de esa conversacion) y que el mensaje no se haya borrado.
 */
export async function resolveFile(attachmentId: number, userId: number) {
  const att = await prisma.chatAttachment.findUnique({ where: { id: attachmentId }, include: { message: { select: { deletedForAllAt: true } } } });
  if (!att || att.message.deletedForAllAt) throw ApiError.notFound('Archivo no encontrado');
  const conv = await prisma.conversation.findUnique({ where: { id: att.conversationId }, select: { buyerId: true, sellerId: true } });
  if (!conv) throw ApiError.notFound('Archivo no encontrado');
  if (!isParticipant(userId, conv)) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } });
    const reported = await prisma.chatReport.findFirst({ where: { conversationId: att.conversationId }, select: { id: true } });
    if (!user || !(await isChatStaff({ id: userId, ...user })) || !reported) throw ApiError.notFound('Archivo no encontrado');
  }
  const file = path.join(CHAT_FILES_DIR, path.basename(att.storageKey));
  if (!fs.existsSync(file)) throw ApiError.notFound('Archivo no encontrado');
  return { file, mime: att.mime, name: att.displayName };
}
