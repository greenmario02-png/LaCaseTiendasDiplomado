import { api } from './api';
import type { ChatMessage } from '../lib/chat/chatModel';

/** Chat mejorado : llamadas REST. El servidor valida todo (participante, tipos, limites). */

export interface OrderSummary {
  id: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  total: number;
  subtotal: number;
  shippingCost: number | null;
  createdAt: string;
  items: Array<{ productId: number | null; name: string; quantity: number; unitPrice: number; image: string | null }>;
}

export interface ConversationPage {
  id: number;
  buyerId: number;
  sellerId: number;
  orderId: number | null;
  product?: { id: number | null; name: string; images?: Array<{ url: string }> } | null;
  seller?: { id: number; storeName: string; storeLogo?: string | null } | null;
  buyer?: { id: number; firstName: string; lastName: string; profileImage?: string | null } | null;
  role: 'BUYER' | 'SELLER';
  messages: ChatMessage[];
  hasMore: boolean;
  muted: boolean;
  blockedByMe: boolean;
  canSend: boolean;
  /** Sin filtro de contenido +18 en esta versión: el servidor lo envía siempre en false (o no lo envía). */
  adultImagesHidden?: boolean;
  order: OrderSummary | null;
  updatedAt: string;
}

export interface Presence {
  visible: boolean;
  online: boolean;
  lastSeenAt: string | null;
}

export const chatApi = {
  page: (id: number, before?: number, limit = 30) =>
    api.get(`/chat/${id}`, { params: { ...(before ? { before } : {}), limit } }).then((r) => r.data.data as ConversationPage),
  sendText: (id: number, body: { content: string; clientId: string; replyToId?: number | null }) =>
    api.post(`/chat/${id}/messages`, body).then((r) => r.data.data as ChatMessage),
  sendFile: (id: number, file: Blob, name: string, fields: { clientId: string; caption?: string; replyToId?: number | null; kind?: 'IMAGE' | 'FILE' | 'PAYMENT_PROOF'; orderId?: number | null }) => {
    const form = new FormData();
    form.append('file', file, name);
    form.append('clientId', fields.clientId);
    if (fields.caption) form.append('caption', fields.caption);
    if (fields.replyToId) form.append('replyToId', String(fields.replyToId));
    if (fields.kind) form.append('kind', fields.kind);
    if (fields.orderId) form.append('orderId', String(fields.orderId));
    return api.post(`/chat/${id}/attachments`, form, { timeout: 60000 }).then((r) => r.data.data as ChatMessage);
  },
  sendQr: (id: number, clientId: string) => api.post(`/chat/${id}/payment-qr`, { clientId }).then((r) => r.data.data as ChatMessage),
  read: (id: number) => api.post(`/chat/${id}/read`),
  remove: (id: number, messageId: number, scope: 'me' | 'all') => api.delete(`/chat/${id}/messages/${messageId}`, { params: { scope } }),
  mute: (id: number, muted: boolean) => api.put(`/chat/${id}/mute`, { muted }),
  presence: (id: number) => api.get(`/chat/${id}/presence`).then((r) => r.data.data as Presence),
  report: (id: number, body: { reason: string; details?: string; block?: boolean }) => api.post(`/chat/${id}/report`, body),
  block: (userId: number) => api.post(`/chat/blocks/${userId}`),
  unblock: (userId: number) => api.delete(`/chat/blocks/${userId}`),
  blocks: () => api.get('/chat/blocks').then((r) => r.data.data as Array<{ userId: number; user: { firstName: string; lastName: string; storeName: string | null } | null }>),
  settings: () => api.get('/chat/settings').then((r) => r.data.data as { hideLastSeen: boolean }),
  saveSettings: (hideLastSeen: boolean) => api.put('/chat/settings', { hideLastSeen }).then((r) => r.data.data as { hideLastSeen: boolean }),
  openOrder: (orderId: number) => api.post(`/chat/order/${orderId}/open`).then((r) => r.data.data as { id: number }),
};

/** URL absoluta de un adjunto firmado (en desarrollo el proxy de Vite atiende /api; en produccion va al host del API). */
export function fileUrl(path: string | null | undefined): string {
  if (!path) return '';
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/+$/, '');
  return path.startsWith('/api/') && base ? `${base}${path}` : path;
}
