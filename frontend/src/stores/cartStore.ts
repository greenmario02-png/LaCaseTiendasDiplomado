import { create } from 'zustand';
import { api } from '../services/api';
import { cartCacheGet, cartCacheSet, queuePush, queueRemove, queueList } from '../services/offlineCache';

export interface CartProduct {
  id: number;
  name: string;
  price: string;
  stock: number;
  seller: { id: number; storeName: string; rating: number; locationCity: string };
  images: Array<{ url: string; isPrimary: boolean }>;
  category?: { id: number; name: string; slug: string };
}

export interface CartItem {
  id: number;
  quantity: number;
  unitPrice: string;
  lineTotal: number;
  product: CartProduct;
  variant?: { id: number; sku: string } | null;
}

export interface SellerGroup {
  seller: { id: number; storeName: string; rating: number; locationCity: string };
  items: CartItem[];
  subtotal: number;
}

export interface CartData {
  cartId: number;
  items: CartItem[];
  groupedBySeller: SellerGroup[];
  subtotal: number;
  itemCount: number;
}

interface CartState {
  cart: CartData | null;
  loading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (productId: number, quantity?: number, variantId?: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clear: () => Promise<void>;
  merge: (sessionId: string) => Promise<void>;
  reset: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  loading: false,

  fetchCart: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/cart');
      set({ cart: data.data });
      cartCacheSet(data.data);
      // Reintentar escrituras pendientes que quedaron offline
      const pending = queueList();
      for (const op of pending) {
        try {
          await api({ method: op.method, url: op.url, data: op.data });
          queueRemove(op.id);
        } catch {
          /* sigue pendiente */
        }
      }
      // Refrescar carrito tras sincronizar cola
      if (pending.length > 0) {
        const fresh = await api.get('/cart');
        set({ cart: fresh.data.data });
        cartCacheSet(fresh.data.data);
      }
    } catch {
      // Offline: usar el carrito guardado en caché
      const cached = cartCacheGet<CartData>();
      if (cached) set({ cart: cached });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (productId, quantity = 1, variantId) => {
    try {
      await api.post('/cart/items', { productId, quantity, variantId });
    } catch {
      // Sin conexión: encolar para reintento cuando vuelva
      queuePush({ method: 'post', url: '/cart/items', data: { productId, quantity, variantId } });
    }
    await get().fetchCart();
  },

  updateQuantity: async (itemId, quantity) => {
    try {
      await api.put(`/cart/items/${itemId}`, { quantity });
    } catch {
      queuePush({ method: 'put', url: `/cart/items/${itemId}`, data: { quantity } });
    }
    await get().fetchCart();
  },

  removeItem: async (itemId) => {
    try {
      await api.delete(`/cart/items/${itemId}`);
    } catch {
      queuePush({ method: 'delete', url: `/cart/items/${itemId}` });
    }
    await get().fetchCart();
  },

  clear: async () => {
    await api.delete('/cart');
    set({ cart: null });
  },

  merge: async (sessionId) => {
    await api.post('/cart/merge', { sessionId });
    await get().fetchCart();
  },

  reset: () => set({ cart: null }),
}));

export function ensureSessionId(): string {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}
