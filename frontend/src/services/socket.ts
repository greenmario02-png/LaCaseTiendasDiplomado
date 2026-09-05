import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
});

// Conteo de referencias: varios consumidores (Navbar, ChatPage, FloatingChat)
// pueden conectar/desconectar el socket singleton sin cortarlo entre sí.
let refCount = 0;

export function connectSocket(token: string | null) {
  refCount += 1;
  if (socket.connected) return socket;
  socket.auth = { token };
  socket.connect();
  return socket;
}

export function disconnectSocket() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0) socket.disconnect();
}

export function getSocket(): Socket {
  return socket;
}

export function joinChat(conversationId: number) {
  socket.emit('chat:join', { conversationId });
}

export function leaveChat(conversationId: number) {
  socket.emit('chat:leave', { conversationId });
}

export function sendTyping(conversationId: number, isTyping: boolean) {
  socket.emit('chat:typing', { conversationId, isTyping });
}

export function joinAuction(auctionId: number) {
  socket.emit('auction:join', { auctionId });
}

export function leaveAuction(auctionId: number) {
  socket.emit('auction:leave', { auctionId });
}

export function joinForum(postId: number) {
  socket.emit('forum:join', postId);
}

export function leaveForum(postId: number) {
  socket.emit('forum:leave', postId);
}
