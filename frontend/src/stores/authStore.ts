import { create } from 'zustand';
import { api } from '../services/api';
import { useRbacStore } from './rbacStore';

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'SELLER' | 'CUSTOMER';
  storeName?: string | null;
  isApproved?: boolean;
  gamerCoins?: number;
  storeRole?: 'OWNER' | 'ADMIN' | 'EMPLOYEE' | null;
  storeOwnerId?: number | null;
  forumProfile?: {
    id: number;
    forumUsername: string;
    karma: number;
    karmaSpent?: number;
    tag: string;
    city: string;
  } | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  booted: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<void>;
  registerSeller: (data: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => void;
  fetchMe: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  // Indica que la sesión ya se restauró desde localStorage (evita redirigir a /login
  // en el primer render de rutas protegidas antes de que termine fetchMe).
  booted: false,

  loadFromStorage: () => {
    const token = localStorage.getItem('accessToken');
    if (token && !isTokenExpired(token)) {
      set({ token });
      get()
        .fetchMe()
        .then(() => useRbacStore.getState().loadRbac())
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({ user: null, token: null });
        })
        .finally(() => set({ booted: true }));
    } else {
      if (token) {
        // Token expirado: limpiar sin llamar a la API (evita ruido 401)
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, token: null });
      }
      useRbacStore.getState().reset();
      set({ booted: true });
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      set({ user: data.data.user, token: data.data.accessToken, booted: true });
      useRbacStore.getState().loadRbac();
    } finally {
      set({ loading: false });
    }
  },

  register: async (payload) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/register', payload);
      set({ loading: false });
      return data.data;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  registerSeller: async (payload) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/sellers/register', payload);
      set({ loading: false });
      return data.data;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch {
        // ignorar
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('sellerReauth');
    useRbacStore.getState().reset();
    set({ user: null, token: null, booted: true });
  },

  fetchMe: async () => {
    const { data } = await api.get('/auth/me');
    set({ user: data.data });
  },

  setUser: (user) => set({ user }),
}));
