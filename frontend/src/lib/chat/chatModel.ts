/**
 * Chat mejorado (documentacion/62): logica pura del cliente web (sin React). El servidor decide permisos y estados;
 * aqui solo se ordena, se fusiona sin duplicar (id y clientId), se calculan los checks y se limita "escribiendo…".
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
  sender?: { id: number; firstName: string; lastName: string; storeName?: string | null } | null;
  /** Solo en el cliente: envio optimista en curso o fallido. */
  localStatus?: 'pending' | 'failed';
  /** Solo en el cliente: vista previa local de la imagen mientras se sube. */
  localUrl?: string;
}

export const DELETE_FOR_ALL_MINUTES = 60;

export function newClientId(): string {
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return `c${Date.now().toString(36)}${rnd}`.slice(0, 48);
}

const sortKey = (m: ChatMessage) => (m.id > 0 ? m.id : Number.MAX_SAFE_INTEGER);

/** Fusiona sin duplicar: por id del servidor y por clientId (la respuesta reemplaza al mensaje optimista). */
export function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map<number, ChatMessage>();
  const pendingByClient = new Map<string, ChatMessage>();
  for (const m of prev) {
    if (m.id > 0) byId.set(m.id, m);
    else if (m.clientId) pendingByClient.set(m.clientId, m);
  }
  for (const m of incoming) {
    if (m.id > 0) {
      const old = byId.get(m.id);
      // Si el mensaje ya estaba con un estado mas avanzado (leido) no se retrocede.
      byId.set(m.id, old ? { ...m, readAt: m.readAt ?? old.readAt, deliveredAt: m.deliveredAt ?? old.deliveredAt } : m);
      if (m.clientId) pendingByClient.delete(m.clientId);
    } else if (m.clientId) {
      pendingByClient.set(m.clientId, m);
    }
  }
  const pend = [...pendingByClient.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
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

export function canDeleteForAll(m: ChatMessage, myId: number | undefined, now = Date.now(), windowMinutes = DELETE_FOR_ALL_MINUTES): boolean {
  if (m.senderId !== myId || m.id <= 0 || m.deleted) return false;
  if (m.kind === 'SYSTEM' || m.kind === 'PAYMENT_PROOF') return false;
  return now - new Date(m.createdAt).getTime() <= windowMinutes * 60_000;
}

export type Row = { type: 'day'; key: string; date: string } | { type: 'msg'; key: string; msg: ChatMessage };

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** Filas para pintar: un separador antes del primer mensaje de cada dia. */
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

/** 'today' | 'yesterday' | null (otra fecha) */
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

/** "Escribiendo…": avisa como maximo cada `interval` ms y manda "dejo de escribir" tras `idle` ms sin teclear. */
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

/** Tamaño destino conservando proporcion (nunca agranda). */
export function targetSize(w: number, h: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(w, h));
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_PDF_BYTES = 3 * 1024 * 1024;
