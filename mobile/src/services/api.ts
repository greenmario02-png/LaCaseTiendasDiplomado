import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/env';
import { cacheGet, cacheSet, isCacheable } from './offlineCache';

const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const SESSION_KEY = 'sessionId';
const USER_KEY = 'authUser';

/** Callback que se dispara cuando la sesión expiró y no se pudo renovar. */
type AuthExpiredHandler = () => void;
let authExpiredHandler: AuthExpiredHandler | null = null;
export function onAuthExpired(fn: AuthExpiredHandler) {
  authExpiredHandler = fn;
}
function emitAuthExpired() {
  authExpiredHandler?.();
}

export const tokenStore = {
  async get(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async set(token: string) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },
  async clear() {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
};

export const refreshTokenStore = {
  async get(): Promise<string | null> {
    return AsyncStorage.getItem(REFRESH_KEY);
  },
  async set(token: string) {
    await AsyncStorage.setItem(REFRESH_KEY, token);
  },
  async clear() {
    await AsyncStorage.removeItem(REFRESH_KEY);
  },
};

/** Session ID persistente para el carrito guest (como el web). */
export async function getSessionId(): Promise<string> {
  let sid = await AsyncStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Session-Id'] = await getSessionId();
  return config;
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => {
    // Cachear GET de catálogo para funcionar offline
    if (res.config.method?.toLowerCase() === 'get' && isCacheable(res.config.url ?? '')) {
      void cacheSet(res.config.url ?? '', res.data);
    }
    return res;
  },
  async (error) => {
    const original = error.config;
    // Sin conexión o backend caído: devolver caché de GET si existe
    if (
      (!error.response || error.response?.status >= 500) &&
      original?.method?.toLowerCase() === 'get' &&
      isCacheable(original.url ?? '')
    ) {
      const cached = await cacheGet(original.url ?? '');
      if (cached !== null) {
        return { data: cached, status: 200, statusText: 'OK (desde caché offline)', headers: {}, config: original };
      }
    }
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = await refreshTokenStore.get();
      if (!refresh) {
        await tokenStore.clear();
        await AsyncStorage.removeItem(USER_KEY);
        emitAuthExpired();
        return Promise.reject(error);
      }
      if (!refreshing) {
        refreshing = axios
          .post(`${API_URL}/auth/refresh`, { refreshToken: refresh })
          .then(async (res) => {
            const { accessToken, refreshToken: newRefresh } = res.data.data;
            await tokenStore.set(accessToken);
            if (newRefresh) await refreshTokenStore.set(newRefresh);
            return accessToken;
          })
          .catch(async () => {
            await tokenStore.clear();
            await refreshTokenStore.clear();
            await AsyncStorage.removeItem(USER_KEY);
            return null;
          })
          .finally(() => {
            refreshing = null;
          });
      }
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      emitAuthExpired();
    }
    return Promise.reject(error);
  }
);

/** Extrae el mensaje de error del backend ({ error: { message } }). */
export function getErrorMessage(err: unknown): string {
  const e = err as any;
  if (e?.response?.data?.error?.message) return e.response.data.error.message;
  if (e?.response?.data?.error?.details) {
    const d = e.response.data.error.details;
    if (Array.isArray(d)) return d.map((x: any) => x.message).join('. ');
    if (typeof d === 'object') return Object.values(d).join('. ');
  }
  if (e?.message) return e.message;
  return 'Error inesperado';
}

/**
 * Resuelve una URL de imagen a través del proxy del backend local.
 * - `/uploads/...` → URL absoluta del backend
 * - URLs http(s) externas → proxeadas por /api/img (evita redirects que RN no sigue)
 */
export function resolveImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/uploads/')) {
    return `${API_URL.replace(/\/api$/, '')}${url}`;
  }
  if (/^https?:\/\//.test(url)) {
    return `${API_URL}/img/${encodeURIComponent(url)}`;
  }
  return url;
}
