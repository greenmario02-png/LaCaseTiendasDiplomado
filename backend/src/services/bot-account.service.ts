import crypto from 'crypto';

import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';

/**
 * Chat para Bots. Cuentas de bot DECLARADAS (Lectura B —
 * nunca se hacen pasar por humanas), operadas en esta primera fase solo por el equipo de LaCase
 *. Cubre aquí: conversación bot↔usuario ("comprenderlos mejor").
 * `BotDebateSession`/turnos de debate en Zona de Debate quedan para más adelante, una vez
 * que la categoría de Zona de Debate esté probada por separado.
 */

const RAW_MESSAGE_RETENTION_DAYS = 30; // se guarda resumen, no transcripción cruda indefinida

export async function createBotAccount(params: {
  operatedByUserId: number;
  displayName: string;
  declaredStance: string;
}) {
  const slug = params.displayName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const email = `bot.${slug}.${Date.now()}@bots.lacase.internal`;

  // Los bots no inician sesión por contraseña — un hash aleatorio no usable, consistente con que
  // `User` sigue siendo la infraestructura de identidad compartida (mismo patrón que ForumProfile).
  const unusablePasswordHash = crypto.randomBytes(32).toString('hex');

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: unusablePasswordHash,
      firstName: params.displayName,
      lastName: 'Bot',
      isActive: true,
    },
  });

  return prisma.botAccount.create({
    data: {
      userId: user.id,
      displayName: params.displayName,
      declaredStance: params.declaredStance,
      operatedByUserId: params.operatedByUserId,
    },
  });
}

export async function listBotAccounts() {
  return prisma.botAccount.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, displayName: true, declaredStance: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

async function assertBotActive(botAccountId: number) {
  const bot = await prisma.botAccount.findUnique({ where: { id: botAccountId } });
  if (!bot) throw ApiError.notFound('Bot no encontrado.');
  if (bot.status !== 'ACTIVE') throw new ApiError(403, 'BOT_NOT_ACTIVE', 'Este bot no está disponible en este momento.');
  return bot;
}

/**
 * Genera la respuesta del bot. Placeholder deliberado: la decisión de producto  es que
 * el chat lo conduzca un LLM, pero conectar un proveedor real queda fuera de este alcance — aquí
 * queda el punto de extensión único donde enchufar esa llamada más adelante, sin tener que tocar
 * el resto del servicio (transacciones, purga, límites).
 */
function generateBotReply(bot: { displayName: string; declaredStance: string }, userMessage: string): string {
  return (
    `[Respuesta de ${bot.displayName} — placeholder, todavía sin LLM conectado] ` +
    `Tu mensaje fue: "${userMessage.slice(0, 200)}". Mi postura declarada es: ${bot.declaredStance}`
  );
}

/** Devuelve la conversación abierta del usuario con este bot, o crea una nueva. */
export async function getOrStartConversation(botAccountId: number, userId: number) {
  await assertBotActive(botAccountId);

  const open = await prisma.botConversation.findFirst({
    where: { botAccountId, userId, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });
  if (open) return open;

  const rawExpiresAt = new Date(Date.now() + RAW_MESSAGE_RETENTION_DAYS * 24 * 3600 * 1000);
  return prisma.botConversation.create({
    data: { botAccountId, userId, rawExpiresAt },
  });
}

export async function sendMessage(params: { conversationId: number; userId: number; body: string }) {
  const conversation = await prisma.botConversation.findUnique({
    where: { id: params.conversationId },
    include: { botAccount: true },
  });
  if (!conversation) throw ApiError.notFound('Conversación no encontrada.');
  if (conversation.userId !== params.userId) throw new ApiError(403, 'NOT_CONVERSATION_OWNER', 'Esta conversación no te pertenece.');
  if (conversation.endedAt) throw new ApiError(400, 'CONVERSATION_ENDED', 'Esta conversación ya terminó.');
  await assertBotActive(conversation.botAccountId);

  const botReplyBody = generateBotReply(conversation.botAccount, params.body);

  const [userMsg, botMsg] = await prisma.$transaction([
    prisma.botConversationMessage.create({
      data: { conversationId: conversation.id, sender: 'USER', body: params.body },
    }),
    prisma.botConversationMessage.create({
      data: { conversationId: conversation.id, sender: 'BOT', body: botReplyBody },
    }),
  ]);

  return { userMessage: userMsg, botMessage: botMsg };
}

/**
 * Cierra la conversación y genera el resumen  — aquí también con un resumen simple por
 * truncado/concatenación como placeholder; el mismo punto de extensión que `generateBotReply`
 * puede pasar a usar un LLM para resumir de verdad sin cambiar la forma del resto del servicio.
 */
export async function endConversation(conversationId: number, userId: number) {
  const conversation = await prisma.botConversation.findUnique({ where: { id: conversationId } });
  if (!conversation) throw ApiError.notFound('Conversación no encontrada.');
  if (conversation.userId !== userId) throw new ApiError(403, 'NOT_CONVERSATION_OWNER', 'Esta conversación no te pertenece.');
  if (conversation.endedAt) return conversation;

  const messages = await prisma.botConversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
  const summary = messages.map((m) => `${m.sender}: ${m.body}`).join('\n').slice(0, 2000);

  return prisma.botConversation.update({
    where: { id: conversationId },
    data: { endedAt: new Date(), summary },
  });
}

/**
 * Job de purga : borra los mensajes crudos de conversaciones vencidas, dejando solo el
 * `summary`. Pensado para correr como cron, mismo patrón que los jobs de `backend/src/server.ts`
 * — no se engancha aquí todavía (fuera de alcance conectar el scheduler).
 */
export async function purgeExpiredRawMessages(now: Date = new Date()) {
  const expired = await prisma.botConversation.findMany({
    where: { rawExpiresAt: { lte: now } },
    select: { id: true },
  });
  if (!expired.length) return 0;
  const { count } = await prisma.botConversationMessage.deleteMany({
    where: { conversationId: { in: expired.map((c) => c.id) } },
  });
  return count;
}

/** Suspende o banea un bot por incumplimiento — reusa UserStrike/BlacklistEntry . */
export async function sanctionBotAccount(params: {
  botAccountId: number;
  issuedByUserId: number;
  severity: 'SUSPENDED' | 'BANNED';
  reason: string;
}) {
  const bot = await prisma.botAccount.findUnique({ where: { id: params.botAccountId } });
  if (!bot) throw ApiError.notFound('Bot no encontrado.');

  const [updatedBot] = await prisma.$transaction([
    prisma.botAccount.update({ where: { id: bot.id }, data: { status: params.severity } }),
    prisma.userStrike.create({
      data: {
        userId: bot.userId,
        severity: params.severity === 'BANNED' ? 'BAN' : 'MINOR',
        reason: params.reason,
        relatedType: 'BOT_ACCOUNT',
        relatedId: bot.id,
        issuedByUserId: params.issuedByUserId,
      },
    }),
  ]);

  if (params.severity === 'BANNED') {
    await prisma.blacklistEntry.create({
      data: {
        type: 'USER',
        value: String(bot.userId),
        reason: params.reason,
        addedByUserId: params.issuedByUserId,
      },
    }).catch(() => undefined); // idempotente si ya estaba en la lista negra (@@unique([type, value]))
  }

  return updatedBot;
}
