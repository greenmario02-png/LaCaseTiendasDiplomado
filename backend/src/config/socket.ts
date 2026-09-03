import { Server as HttpServer } from 'http';

import { Server } from 'socket.io';

import { verifyAccessToken } from '../utils/jwt';
import { corsOrigin } from './cors';

let io: Server | null = null;

const socketUserMap = new Map<string, number>();

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Token no provisto'));
      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      socketUserMap.set(socket.id, payload.userId);
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId;

    // Unirse a rooms de conversaciones donde el usuario participa
    socket.on('chat:join', ({ conversationId }) => {
      socket.join(`chat:${conversationId}`);
    });

    socket.on('chat:leave', ({ conversationId }) => {
      socket.leave(`chat:${conversationId}`);
    });

    // Indicador de "escribiendo..." — broadcast a la conversación (excluyendo al emisor)
    socket.on('chat:typing', ({ conversationId, isTyping }) => {
      socket.to(`chat:${conversationId}`).emit('chat:typing', {
        conversationId,
        userId,
        isTyping: Boolean(isTyping),
      });
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
