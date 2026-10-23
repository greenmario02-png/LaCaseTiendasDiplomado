import { Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { api, tokenStore } from './api';
import { API_URL, SOCKET_URL } from '../config/env';

/**
 * Chat mejorado en la app: logica pura (igual que la web: fusion idempotente por id/clientId, checks,
 * separadores de fecha, "escribiendo" con limite), llamadas REST y un socket compartido con reconexion.
 * El servidor decide permisos; aqui no se confia en nada del cliente.
 */

export type MessageKind = 'TEXT' | 'IMAGE' | 'FILE' | 'PAYMENT_QR' | 'PAYMENT_PROOF' | 'SYSTEM';
export type MsgStatus = 'pending' | 'failed' | 'sent' | 'delivered' | 'read';

export interface ChatAttachment {
  id: number;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  name: string | null;
  url: string | null;
  hidden: boolean;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  kind: MessageKind;
  content: string;
  createdAt: string;
  clientId?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  deleted?: boolean;
  orderId?: number | null;
  meta?: { qrUrl?: string | null; event?: string; orderId?: number | null; status?: string | null } | null;
  attachment?: ChatAttachment | null;
  replyTo?: { id: number; senderId: number; kind: MessageKind; preview: string; deleted: boolean; hasImage: boolean } | null;
  localStatus?: 'pending' | 'failed';
  localUri?: string;
}

export interface OrderSummary {
  id: number;
  status: string;
  paymentStatus: string;
  total: number;
  items: Array<{ productId: number | null; name: string; quantity: number; unitPrice: number; image: string | null }>;
}

/** Estados que el vendedor puede fijar a mano (PENDING es el inicial, lo pone el sistema). */
export type SellerPaymentStatus = 'VERIFIED' | 'REJECTED';

export interface Presence {
  visible: boolean;
  online: boolean;
  lastSeenAt: string | null;
}

export const DELETE_FOR_ALL_MINUTES = 60;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_PDF_BYTES = 3 * 1024 * 1024;

// ── logica pura ─────────────────────────────────────────────────────────────────────────────────────────────────────

export function newClientId(): string {
  return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`;
}

const sortKey = (m: ChatMessage) => (m.id > 0 ? m.id : Number.MAX_SAFE_INTEGER);

export function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map<number, ChatMessage>();
  const pending = new Map<string, ChatMessage>();
  for (const m of prev) {
    if (m.id > 0) byId.set(m.id, m);
    else if (m.clientId) pending.set(m.clientId, m);
  }
  for (const m of incoming) {
    if (m.id > 0) {
      const old = byId.get(m.id);
      byId.set(m.id, old ? { ...m, readAt: m.readAt ?? old.readAt, deliveredAt: m.deliveredAt ?? old.deliveredAt } : m);
      if (m.clientId) pending.delete(m.clientId);
    } else if (m.clientId) pending.set(m.clientId, m);
  }
  const pend = [...pending.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return [...[...byId.values()].sort((a, b) => sortKey(a) - sortKey(b)), ...pend];
}

export function statusOf(m: ChatMessage, myId: number | undefined): MsgStatus | null {
  if (m.senderId !== myId || m.kind === 'SYSTEM') return null;
  if (m.localStatus) return m.localStatus;
  if (m.readAt) return 'read';
  if (m.deliveredAt) return 'delivered';
  return 'sent';
}

export function applyStatus(list: ChatMessage[], ev: { status: 'delivered' | 'read'; upToId: number; at: string }, myId: number | undefined): ChatMessage[] {
  return list.map((m) => {
    if (m.senderId !== myId || m.id <= 0 || m.id > ev.upToId) return m;
    if (ev.status === 'read') return m.readAt ? m : { ...m, readAt: ev.at, deliveredAt: m.deliveredAt ?? ev.at };
    return m.deliveredAt ? m : { ...m, deliveredAt: ev.at };
  });
}

export function markDeleted(list: ChatMessage[], messageId: number): ChatMessage[] {
  return list.map((m) => (m.id === messageId ? { ...m, deleted: true, content: '', attachment: null, meta: null } : m));
}

export function canDeleteForAll(m: ChatMessage, myId: number | undefined, now = Date.now()): boolean {
  if (m.senderId !== myId || m.id <= 0 || m.deleted || m.kind === 'SYSTEM' || m.kind === 'PAYMENT_PROOF') return false;
  return now - new Date(m.createdAt).getTime() <= DELETE_FOR_ALL_MINUTES * 60_000;
}

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export type Row = { type: 'day'; key: string; date: string } | { type: 'msg'; key: string; msg: ChatMessage };

export function withDaySeparators(list: ChatMessage[]): Row[] {
  const rows: Row[] = [];
  let last = '';
  for (const m of list) {
    const k = dayKey(m.createdAt);
    if (k !== last) {
      rows.push({ type: 'day', key: `d-${k}`, date: m.createdAt });
      last = k;
    }
    rows.push({ type: 'msg', key: m.id > 0 ? `m-${m.id}` : `p-${m.clientId}`, msg: m });
  }
  return rows;
}

export function relativeDay(iso: string, now = new Date()): 'today' | 'yesterday' | null {
  const k = dayKey(iso);
  if (k === dayKey(now.toISOString())) return 'today';
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return k === dayKey(y.toISOString()) ? 'yesterday' : null;
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function filterConversations<T>(list: T[], q: string, textsOf: (c: T) => string[]): T[] {
  const needle = fold(q.trim());
  if (!needle) return list;
  return list.filter((c) => textsOf(c).some((t) => fold(t ?? '').includes(needle)));
}

export function createTypingEmitter(send: (isTyping: boolean) => void, opts: { interval?: number; idle?: number } = {}) {
  const interval = opts.interval ?? 2500;
  const idle = opts.idle ?? 3000;
  let lastSent = 0;
  let typing = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const stop = () => {
    clear();
    if (typing) {
      typing = false;
      lastSent = 0;
      send(false);
    }
  };
  return {
    onInput(text: string) {
      if (!text.trim()) return stop();
      const now = Date.now();
      if (!typing || now - lastSent >= interval) {
        typing = true;
        lastSent = now;
        send(true);
      }
      clear();
      timer = setTimeout(stop, idle);
    },
    stop,
  };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** URL absoluta de un adjunto firmado (`/api/chat/files/...`). */
export function fileUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (!path.startsWith('/api/')) return undefined;
  return `${API_URL.replace(/\/api\/?$/, '')}${path}`;
}

// ── API ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface LocalFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
  width?: number;
  height?: number;
  isImage: boolean;
  kind: 'IMAGE' | 'FILE' | 'PAYMENT_PROOF';
}

export const chatApi = {
  list: () => api.get('/chat').then((r) => r.data.data as any[]),
  page: (id: number, before?: number) => api.get(`/chat/${id}`, { params: { ...(before ? { before } : {}), limit: 30 } }).then((r) => r.data.data),
  sendText: (id: number, body: { content: string; clientId: string; replyToId?: number | null }) => api.post(`/chat/${id}/messages`, body).then((r) => r.data.data as ChatMessage),
  sendFile: async (id: number, f: LocalFile, fields: { clientId: string; caption?: string; replyToId?: number | null; orderId?: number | null }) => {
    const form = new FormData();
    if (Platform.OS === 'web') {
      const blob = await (await fetch(f.uri)).blob();
      form.append('file', blob, f.name);
    } else {
      form.append('file', { uri: f.uri, name: f.name, type: f.type } as unknown as Blob);
    }
    form.append('clientId', fields.clientId);
    if (fields.caption) form.append('caption', fields.caption);
    if (fields.replyToId) form.append('replyToId', String(fields.replyToId));
    if (f.kind === 'PAYMENT_PROOF') {
      form.append('kind', 'PAYMENT_PROOF');
      if (fields.orderId) form.append('orderId', String(fields.orderId));
    }
    const { data } = await api.post(`/chat/${id}/attachments`, form, { headers: { 'Content-Type': 'multipart/form-data' }, transformRequest: (b) => b, timeout: 60000 });
    return data.data as ChatMessage;
  },
  sendQr: (id: number, clientId: string) => api.post(`/chat/${id}/payment-qr`, { clientId }).then((r) => r.data.data as ChatMessage),
  /**
   * El vendedor marca el pago como verificado o rechaza el comprobante que mandó el comprador
   * (`PUT /orders/seller/:id/payment-status`, ya existe en el backend -- ver order.controller.ts/order.service.ts).
   * orderId es el pedido de la conversación, no el id del mensaje.
   */
  updatePaymentStatus: (orderId: number, paymentStatus: SellerPaymentStatus) =>
    api.put(`/orders/seller/${orderId}/payment-status`, { paymentStatus }).then((r) => r.data.data as { id: number; status: string; paymentStatus: string }),
  read: (id: number) => api.post(`/chat/${id}/read`),
  remove: (id: number, messageId: number, scope: 'me' | 'all') => api.delete(`/chat/${id}/messages/${messageId}`, { params: { scope } }),
  mute: (id: number, muted: boolean) => api.put(`/chat/${id}/mute`, { muted }),
  report: (id: number, body: { reason: string; details?: string; block?: boolean }) => api.post(`/chat/${id}/report`, body),
  block: (userId: number) => api.post(`/chat/blocks/${userId}`),
  unblock: (userId: number) => api.delete(`/chat/blocks/${userId}`),
  blocks: () => api.get('/chat/blocks').then((r) => r.data.data as Array<{ userId: number; user: { firstName: string; lastName: string; storeName: string | null } | null }>),
  settings: () => api.get('/chat/settings').then((r) => r.data.data as { hideLastSeen: boolean }),
  saveSettings: (hideLastSeen: boolean) => api.put('/chat/settings', { hideLastSeen }).then((r) => r.data.data as { hideLastSeen: boolean }),
  openOrder: (orderId: number) => api.post(`/chat/order/${orderId}/open`).then((r) => r.data.data as { id: number }),
};

// ── socket compartido ───────────────────────────────────────────────────────────────────────────────────────────────

let shared: Socket | null = null;
let refs = 0;

/**
 * Un solo socket para la lista y la conversacion (antes cada pantalla abria el suyo y usaba un evento equivocado).
 * Reconexion automatica de socket.io; si el token vencio, se refresca con /auth/me y se reintenta.
 */
let opening: Promise<Socket | null> | null = null;

export async function acquireChatSocket(): Promise<Socket | null> {
  refs += 1;
  if (shared) return shared;
  if (!opening) opening = openSocket().finally(() => (opening = null));
  const s = await opening;
  if (!s) refs = Math.max(0, refs - 1);
  return s;
}

async function openSocket(): Promise<Socket | null> {
  const token = await tokenStore.get();
  if (!token) return null;
  const s = io(SOCKET_URL, { auth: { token }, transports: ['websocket'], reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 10000 });
  s.on('connect_error', async () => {
    try {
      await api.get('/auth/me');
      const fresh = await tokenStore.get();
      if (fresh && shared === s) {
        s.auth = { token: fresh };
        if (!s.connected) s.connect();
      }
    } catch {
      /* sin sesion: el interceptor ya cerro la sesion */
    }
  });
  shared = s;
  return s;
}


export function releaseChatSocket() {
  refs = Math.max(0, refs - 1);
  if (refs === 0 && shared) {
    shared.disconnect();
    shared = null;
  }
}

/** Solo pruebas. */
export function __resetChatSocket() {
  shared = null;
  refs = 0;
}
