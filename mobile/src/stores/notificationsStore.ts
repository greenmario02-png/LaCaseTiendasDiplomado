import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { api, tokenStore } from '../services/api';
import { SOCKET_URL } from '../config/env';

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  refType?: string | null;
  refId?: number | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsState {
  items: AppNotification[];
  unread: number;
  loading: boolean;
  socket: Socket | null;
  load: () => Promise<void>;
  refreshUnread: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  addLive: (n: AppNotification) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  reset: () => void;
}

let socketRef: Socket | null = null;

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  unread: 0,
  loading: false,
  socket: null,

  async load() {
    set({ loading: true });
    try {
      const res = await api.get('/notifications', { params: { limit: 30 } });
      const data = res.data?.data ?? [];
      const unread = res.data?.meta?.unread ?? 0;
      set({ items: data, unread });
    } catch (e) {
      console.warn('notifications load', e);
    } finally {
      set({ loading: false });
    }
  },

  async refreshUnread() {
    try {
      const res = await api.get('/notifications/unread-count');
      set({ unread: res.data?.data?.count ?? 0 });
    } catch {
      /* silencioso */
    }
  },

  async markRead(id: number) {
    try {
      await api.patch(`/notifications/${id}/read`);
      set((s) => ({
        items: s.items.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        unread: Math.max(0, s.unread - 1),
      }));
    } catch {
      /* silencioso */
    }
  },

  async markAllRead() {
    try {
      await api.post('/notifications/read-all');
      set((s) => ({ items: s.items.map((n) => ({ ...n, isRead: true })), unread: 0 }));
    } catch {
      /* silencioso */
    }
  },

  addLive(n: AppNotification) {
    set((s) => ({
      items: [n, ...s.items.filter((x) => x.id !== n.id)].slice(0, 50),
      unread: n.isRead ? s.unread : s.unread + 1,
    }));
  },

  async connect() {
    const token = await tokenStore.get();
    if (!token || socketRef) return;
    const s = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    s.on('notification:new', (payload: any) => {
      if (payload?.notification) get().addLive(payload.notification);
    });
    s.on('connect', () => get().refreshUnread());
    socketRef = s;
    set({ socket: s });
  },

  disconnect() {
    socketRef?.disconnect();
    socketRef = null;
    set({ socket: null });
  },

  reset() {
    socketRef?.disconnect();
    socketRef = null;
    set({ items: [], unread: 0, socket: null });
  },
}));
