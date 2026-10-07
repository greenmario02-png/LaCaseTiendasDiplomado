import axios from 'axios';
import { cacheGet, cacheSet, isCacheable } from './offlineCache';
import { esReintentable, esperaDeReintento } from './warmup';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Comparte una sola petición entre GETs idénticos simultáneos (StrictMode, varios componentes
// pidiendo lo mismo al montar). Se libera al terminar, así que no cachea nada.
const inFlightGets = new Map<string, Promise<unknown>>();
const rawGet = api.get.bind(api);
api.get = ((url: string, config?: Parameters<typeof rawGet>[1]) => {
  const key = `${localStorage.getItem('accessToken') ?? ''}|${url}|${JSON.stringify(config?.params ?? {})}`;
  const pending = inFlightGets.get(key);
  if (pending) return pending;
  const request = rawGet(url, config).finally(() => inFlightGets.delete(key));
  inFlightGets.set(key, request);
  return request;
}) as typeof api.get;

function ensureSessionId(): string {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const sessionId = ensureSessionId();
  config.headers['X-Session-Id'] = sessionId;
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Cachear GET de catálogo para funcionar offline
    if (response.config.method?.toLowerCase() === 'get' && isCacheable(response.config.url ?? '')) {
      cacheSet(response.config.url ?? '', response.data);
    }
    return response;
  },
  async (error) => {
    const original = error.config;
    // Arranque en frío del servidor (sin respuesta o 502/503/504): repetir la lectura unas veces antes de rendirse
    if (esReintentable(error)) {
      original.__intentos = (original.__intentos ?? 0) + 1;
      await esperaDeReintento(original.__intentos);
      return api(original);
    }
    // Sin conexión o backend caído: devolver caché de GET si existe
    if (
      (!error.response || error.response?.status >= 500) &&
      original?.method?.toLowerCase() === 'get' &&
      isCacheable(original.url ?? '')
    ) {
      const cached = cacheGet(original.url ?? '');
      if (cached !== null) {
        return { data: cached, status: 200, statusText: 'OK (desde caché offline)', headers: {}, config: original };
      }
    }
    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        original._retry = true;
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.data.accessToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError<ApiError>(err)) {
    const data = err.response?.data;
    if (data?.error?.message) return data.error.message;
    if (data?.error?.details?.length) {
      return data.error.details.map((d) => d.message).join(', ');
    }
    return 'Error de conexión con el servidor';
  }
  return 'Error inesperado';
}

/**
 * Resuelve rutas relativas de imágenes (`/uploads/...`) a URLs absolutas del backend.
 * Las URLs externas (http/https) se devuelven tal cual.
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads/')) {
    const apiUrl: string = import.meta.env.VITE_API_URL || '';
    return `${apiUrl.replace(/\/api\/?$/, '')}${url}`;
  }
  return url;
}
