import { Server as HttpServer } from 'http';

import { Server } from 'socket.io';

import { verifyAccessToken } from '../utils/jwt';
import { hidesLastSeen, markConnected, markDisconnected, presenceFor, recordLastSeen } from '../services/chat/presence';

import { prisma } from './database';
import { corsOrigin } from './cors';

let io: Server | null = null;

const socketUserMap = new Map<string, number>();

/**
 * Verifica el JWT del socket Y que la cuenta siga activa (igual que `authenticate` en REST): sin esto, un usuario
 * bloqueado conservaba tiempo real y notificaciones mientras su access token no caducara.
 */
export async function authenticateSocketToken(token: string): Promise<number> {
  const payload = verifyAccessToken(token);
  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { isActive: true } });
  if (!user || !user.isActive) throw new Error('Usuario no activo');
  return payload.userId;
}

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Token no provisto'));
      const userId = await authenticateSocketToken(token);
      (socket as any).userId = userId;
      socketUserMap.set(socket.id, userId);
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId;

    // Sala personal: aqui llegan los mensajes nuevos de todas sus conversaciones, con la vista propia de cada
    // participante (URL firmada por usuario).
    socket.join(`user:${userId}`);
    markConnected(userId);

    // Sala de una conversacion: solo participantes (mismo criterio que el REST). Sin esta comprobacion cualquier socket
    // con un JWT valido podia unirse a `chat:<id>`. La sala solo transporta "escribiendo..." y presencia; responde (ack)
    // con la presencia del otro participante.
    socket.on('chat:join', async (payload: unknown, ack?: unknown) => {
      try {
        const id = Number((payload as { conversationId?: unknown })?.conversationId);
        if (!Number.isInteger(id) || id <= 0) return;
        const conv = await prisma.conversation.findUnique({ where: { id }, select: { buyerId: true, sellerId: true } });
        if (!conv || (conv.buyerId !== userId && conv.sellerId !== userId)) return;
        socket.join(`chat:${id}`);
        const otherId = conv.buyerId === userId ? conv.sellerId : conv.buyerId;
        if (!(await hidesLastSeen(userId))) socket.to(`chat:${id}`).emit('chat:presence', { conversationId: id, userId, online: true, lastSeenAt: null });
        if (typeof ack === 'function') ack(await presenceFor(userId, otherId));
      } catch {
        /* sin permiso o error: no se une */
      }
    });

    socket.on('chat:leave', (payload: unknown) => {
      const id = Number((payload as { conversationId?: unknown })?.conversationId);
      if (Number.isInteger(id)) socket.leave(`chat:${id}`);
    });

    // "Escribiendo..." solo dentro de una sala a la que el socket entro con permiso, y con limite
    // (un "escribiendo" cada 800 ms por socket; el "dejo de escribir" siempre pasa).
    let lastTypingAt = 0;
    socket.on('chat:typing', (payload: unknown) => {
      const p = (payload ?? {}) as { conversationId?: unknown; isTyping?: unknown };
      const id = Number(p.conversationId);
      const room = `chat:${id}`;
      if (!Number.isInteger(id) || !socket.rooms.has(room)) return;
      const isTyping = p.isTyping === true;
      const now = Date.now();
      if (isTyping && now - lastTypingAt < 800) return;
      if (isTyping) lastTypingAt = now;
      socket.to(room).emit('chat:typing', { conversationId: id, userId, isTyping });
    });

    // Al cerrar el ultimo socket: "ultima vez" y aviso a las salas de chat abiertas (si no la oculta).
    socket.on('disconnecting', () => {
      const chatRooms = [...socket.rooms].filter((r) => r.startsWith('chat:'));
      if (!markDisconnected(userId)) return;
      const at = new Date();
      void (async () => {
        try {
          await recordLastSeen(userId, at);
          if (await hidesLastSeen(userId)) return;
          for (const r of chatRooms) {
            io?.to(r).emit('chat:presence', { conversationId: Number(r.slice(5)), userId, online: false, lastSeenAt: at.toISOString() });
          }
        } catch {
          /* presencia: mejor esfuerzo */
        }
      })();
    });

    // Unirse a room de subasta
    socket.on('auction:join', ({ auctionId }) => {
      socket.join(`auction:${auctionId}`);
    });

    socket.on('auction:leave', ({ auctionId }) => {
      socket.leave(`auction:${auctionId}`);
    });

    // Foro: unirse/salir de la room de un post (tiempo real de replies/votos)
    socket.on('forum:join', (postId: number) => {
      socket.join(`forum:${postId}`);
    });

    socket.on('forum:leave', (postId: number) => {
      socket.leave(`forum:${postId}`);
    });

    socket.on('disconnect', () => {
      socketUserMap.delete(socket.id);
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

/** Emite a todos los sockets de un usuario (para notificaciones en vivo) */
export function emitToUser(userId: number, event: string, payload: unknown) {
  if (!io) return;
  for (const [socketId, uid] of socketUserMap.entries()) {
    if (uid === userId) {
      io.to(socketId).emit(event, payload);
    }
  }
}
