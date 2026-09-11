/**
 * Caché offline para la app móvil (AsyncStorage).
 *
 * Guarda respuestas GET de catálogo y una cola de escrituras pendientes
 * (añadir al carrito, etc.) para que la app siga funcionando cuando el
 * backend está caído o sin conexión, reenviando los cambios al volver.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'offline:cache:';
const QUEUE_KEY = 'offline:queue';
const CART_KEY = 'offline:cart';

const CACHEABLE_PREFIXES = [
  '/products/categories',
  '/products/featured',
  '/products?',
  '/products/',
  '/banners',
  '/promotions',
  '/currencies',
  '/tracking/feed',
  '/orders/recent-sales',
  '/forum/posts',
  '/forum/categories',
  '/forum/cities',
  '/forum/trending',
  '/forum/top-users',
  '/sellers/',
  '/auctions',
  '/account/addresses',
];

export function isCacheable(url: string): boolean {
  if (url.startsWith('http://') || url.startsWith('https://')) return false;
  return CACHEABLE_PREFIXES.some((p) => url.startsWith(p));
}

function cacheKey(url: string): string {
  return `${CACHE_PREFIX}${url}`;
}

export interface CachedEntry {
  ts: number;
  data: unknown;
}

export async function cacheSet(url: string, data: unknown): Promise<void> {
  try {
    const entry: CachedEntry = { ts: Date.now(), data };
    await AsyncStorage.setItem(cacheKey(url), JSON.stringify(entry));
  } catch {
    /* ignore */
  }
}

export async function cacheGet<T = unknown>(url: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(url));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry;
    return (entry.data as T) ?? null;
  } catch {
    return null;
  }
}

export interface OfflineOp {
  id: string;
  method: 'post' | 'put' | 'delete';
  url: string;
  data?: unknown;
  ts: number;
}

export async function queuePush(op: Omit<OfflineOp, 'id' | 'ts'>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const q: OfflineOp[] = raw ? (JSON.parse(raw) as OfflineOp[]) : [];
    q.push({ ...op, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ts: Date.now() });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-50)));
  } catch {
    /* ignore */
  }
}

export async function queueList(): Promise<OfflineOp[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineOp[]) : [];
  } catch {
    return [];
  }
}

export async function queueRemove(id: string): Promise<void> {
  try {
    const q = (await queueList()).filter((op) => op.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
}

export async function cartCacheSet(cart: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    /* ignore */
  }
}

export async function cartCacheGet<T = unknown>(): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
