/**
 * Caché offline para la tienda web.
 *
 * Guarda en localStorage las respuestas GET de catálogo (productos, categorías,
 * banners, promos, cotizaciones, feed, foro...) para que la aplicación siga
 * mostrando contenido cuando el backend está caído o sin conexión a internet.
 * También mantiene una cola de escrituras pendientes (añadir al carrito, etc.)
 * que se reenvían automáticamente cuando vuelve la conexión.
 */

const CACHE_PREFIX = 'offline:cache:';
const QUEUE_KEY = 'offline:queue';
const CART_KEY = 'offline:cart';

/** Prefijos de URL de GET que conviene cachear (catálogo público). */
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

export function cacheSet(url: string, data: unknown): void {
  try {
    const entry: CachedEntry = { ts: Date.now(), data };
    localStorage.setItem(cacheKey(url), JSON.stringify(entry));
  } catch {
    /* cuota llena / modo privado: ignorar */
  }
}

export function cacheGet<T = unknown>(url: string): T | null {
  try {
    const raw = localStorage.getItem(cacheKey(url));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry;
    return (entry.data as T) ?? null;
  } catch {
    return null;
  }
}

export function cacheRemove(url: string): void {
  try {
    localStorage.removeItem(cacheKey(url));
  } catch {
    /* ignore */
  }
}

/* ─── Cola de escrituras offline ─────────────────────────────────────── */

export interface OfflineOp {
  id: string;
  method: 'post' | 'put' | 'delete';
  url: string;
  data?: unknown;
  ts: number;
}

export function queuePush(op: Omit<OfflineOp, 'id' | 'ts'>): void {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const q: OfflineOp[] = raw ? (JSON.parse(raw) as OfflineOp[]) : [];
    q.push({ ...op, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ts: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-50)));
  } catch {
    /* ignore */
  }
}

export function queueList(): OfflineOp[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineOp[]) : [];
  } catch {
    return [];
  }
}

export function queueRemove(id: string): void {
  try {
    const q = queueList().filter((op) => op.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
}

export function queueClear(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    /* ignore */
  }
}

/* ─── Carrito offline ────────────────────────────────────────────────── */

export function cartCacheSet(cart: unknown): void {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    /* ignore */
  }
}

export function cartCacheGet<T = unknown>(): T | null {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
