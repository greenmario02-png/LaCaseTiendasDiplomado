import { create } from 'zustand';

interface WishlistState {
  wishlist: number[];
  loading: boolean;
  fetchWishlist: () => Promise<void>;
  toggle: (productId: number) => Promise<void>;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  wishlist: [],
  loading: false,

  fetchWishlist: async () => {
    set({ loading: true });
    try {
      const { data } = await (await import('../services/api')).api.get('/wishlist');
      set({ wishlist: data.data.map((w: { productId: number }) => w.productId) });
    } finally {
      set({ loading: false });
    }
  },

  toggle: async (productId) => {
    const exists = get().wishlist.includes(productId);
    const api = (await import('../services/api')).api;
    if (exists) {
      await api.delete(`/wishlist/${productId}`);
      set({ wishlist: get().wishlist.filter((id) => id !== productId) });
    } else {
      await api.post(`/wishlist/${productId}`);
      set({ wishlist: [...get().wishlist, productId] });
    }
  },
}));
