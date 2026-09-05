import { create } from 'zustand';
import * as api from '../services/forum.api';
import type { ForumProfile, ForumPost, ForumCity, ForumGeoSession } from '../services/forum.api';

interface ForumStore {
  profile: ForumProfile | null;
  posts: ForumPost[];
  page: number;
  totalPages: number;
  loading: boolean;
  activeMode: string;
  activeCity: string;
  activeCategory: string;
  geo: ForumGeoSession | null;
  cities: ForumCity[];
  geoLoaded: boolean;

  fetchProfile: () => Promise<void>;
  fetchPosts: (opts?: { reset?: boolean; mode?: string; city?: string; category?: string; q?: string }) => Promise<void>;
  loadMorePosts: () => Promise<void>;
  votePost: (postId: number, value: 1 | -1) => Promise<void>;
  redeemKarma: (amount: number) => Promise<{ coinsEarned: number }>;
  setMode: (mode: string) => void;
  setCity: (city: string) => void;
  setCategory: (slug: string) => void;
  setProfile: (p: ForumProfile | null) => void;
  fetchGeoSession: () => Promise<void>;
  updateGeo: (payload: { cityId?: number; latitude?: number; longitude?: number; radioKm?: number }) => Promise<void>;
}

export const useForumStore = create<ForumStore>((set, get) => ({
  profile: null,
  posts: [],
  page: 1,
  totalPages: 1,
  loading: false,
  activeMode: 'RECIENTE',
  activeCity: '',
  activeCategory: '',
  geo: null,
  cities: [],
  geoLoaded: false,

  fetchProfile: async () => {
    try {
      const data = await api.getMyForumProfile();
      set({ profile: data });
    } catch {
      set({ profile: null });
    }
  },

  fetchPosts: async (opts = {}) => {
    const { reset = true, mode, city, category, q } = opts;
    const s = get();
    const newMode = mode ?? s.activeMode;
    const newCity = city ?? s.activeCity;
    const newCat = category ?? s.activeCategory;

    if (reset) set({ posts: [], page: 1, loading: true });
    else set({ loading: true });

    try {
      const res = await api.listPosts({
        page: reset ? 1 : s.page,
        limit: 20,
        mode: newMode,
        city: newCity || undefined,
        category: newCat || undefined,
        q: q || undefined,
      });
      set((st) => ({
        posts: reset ? res.data : [...st.posts, ...res.data],
        page: (reset ? 1 : st.page) + 1,
        totalPages: res.meta?.totalPages ?? 1,
        activeMode: newMode,
        activeCity: newCity,
        activeCategory: newCat,
        loading: false,
      }));
    } catch {
      set({ loading: false });
    }
  },

  loadMorePosts: async () => {
    const s = get();
    if (s.loading || s.page > s.totalPages) return;
    await get().fetchPosts({ reset: false });
  },

  votePost: async (postId, value) => {
    try {
      const res = await api.votePost(postId, value);
      set((s) => ({
        posts: s.posts.map((p) =>
          p.id === postId
            ? { ...p, score: res.newScore, upvotes: res.upvotes, downvotes: res.downvotes, userVote: res.userVote }
            : p
        ),
      }));
    } catch {
      // error ya mostrado por el interceptor / caller
    }
  },

  redeemKarma: async (amount) => {
    const res = await api.redeemKarma(amount);
    set((s) => ({ profile: s.profile ? { ...s.profile, karmaSpent: s.profile.karmaSpent + amount } : s.profile }));
    return res;
  },

  setMode: (mode) => {
    set({ activeMode: mode });
    get().fetchPosts({ reset: true, mode });
  },
  setCity: (city) => {
    set({ activeCity: city });
    get().fetchPosts({ reset: true, city });
  },
  setCategory: (slug) => {
    set({ activeCategory: slug });
    get().fetchPosts({ reset: true, category: slug });
  },
  setProfile: (p) => set({ profile: p }),

  fetchGeoSession: async () => {
    try {
      const geo = await api.fetchGeoSession();
      set({ geo, geoLoaded: true });
      if (geo?.cityId) get().fetchPosts({ reset: true, city: geo.city ?? '' });
    } catch {
      set({ geo: null, geoLoaded: true });
    }
  },

  updateGeo: async (payload) => {
    try {
      const { profile } = await api.updateMyGeo(payload);
      set({ geo: profile });
      if (profile?.cityId) get().fetchPosts({ reset: true, city: profile.city ?? '' });
    } catch {
      // error ya mostrado por el caller
    }
  },
}));
