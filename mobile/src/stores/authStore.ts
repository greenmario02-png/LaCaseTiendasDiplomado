import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, tokenStore, refreshTokenStore, getErrorMessage, onAuthExpired } from '../services/api';
import { useRbacStore } from './rbacStore';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
  storeName?: string | null;
  storeDescription?: string | null;
  storeLogo?: string | null;
  storeCategory?: string | null;
  profileImage?: string | null;
  phone?: string | null;
  bio?: string | null;
  country?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  whatsappPhone?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  youtubeUrl?: string | null;
  freeShippingThreshold?: string | number | null;
  isApproved?: boolean;
  isVerified?: boolean;
  storeRole?: 'OWNER' | 'ADMIN' | 'EMPLOYEE' | string | null;
  storeOwnerId?: number | null;
  gamerCoins?: number | null;
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
  loading: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const USER_KEY = 'authUser';

// Cuando el access token expira y el refresh falla, el interceptor de api.ts
// dispara este callback para forzar el deslogueo en toda la app (evita que la
// app siga "logueada" pero con todas las llamadas autenticadas fallando).
onAuthExpired(async () => {
  await AsyncStorage.removeItem(USER_KEY);
  useAuthStore.setState({ user: null });
});

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  init: async () => {
    try {
      const raw = await AsyncStorage.getItem(USER_KEY);
      if (raw) set({ user: JSON.parse(raw) });
      const token = await tokenStore.get();
      if (token && !get().user) {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.data });
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.data));
          useRbacStore.getState().loadRbac();
        } catch {
          await tokenStore.clear();
        }
      }
    } catch {
      // ignora
    } finally {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await tokenStore.set(data.data.accessToken);
    if (data.data.refreshToken) await refreshTokenStore.set(data.data.refreshToken);
    set({ user: data.data.user });
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
    // El login no incluye storeRole/storeOwnerId; refrescar con /auth/me
    // para tener el perfil completo (necesario para los paneles de gestión).
    try {
      const me = await api.get('/auth/me');
      set({ user: me.data.data });
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(me.data.data));
      useRbacStore.getState().loadRbac();
    } catch {
      // si falla el refresh del perfil, queda el user del login
    }
  },

  register: async (payload) => {
    const isSeller = payload.role === 'SELLER';
    const url = isSeller ? '/auth/sellers/register' : '/auth/register';
    const { data } = await api.post(url, payload);
    if (data.data?.accessToken) {
      await tokenStore.set(data.data.accessToken);
      if (data.data.refreshToken) await refreshTokenStore.set(data.data.refreshToken);
      set({ user: data.data.user });
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout').catch(() => {});
    } catch {}
    await tokenStore.clear();
    await refreshTokenStore.clear();
    await AsyncStorage.removeItem(USER_KEY);
    useRbacStore.getState().reset();
    set({ user: null });
  },

  refreshUser: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data });
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.data));
      useRbacStore.getState().loadRbac();
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
}));
