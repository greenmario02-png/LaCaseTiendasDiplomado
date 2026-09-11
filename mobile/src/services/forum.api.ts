import { api } from './api';

export interface ForumCategory {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  icon: string;
  color: string;
  parentId?: number | null;
  isActive: boolean;
  sortOrder: number;
  _count?: { posts: number };
}

export interface ForumAuthor {
  forumUsername: string;
  avatarUrl?: string | null;
  tag: string;
  karma: number;
  city?: string | null;
}

export interface ForumReply {
  id: number;
  postId: number;
  authorId?: number | null;
  author?: ForumAuthor | null;
  body: string;
  images: string[];
  isBotReply: boolean;
  isAccepted: boolean;
  upvotes: number;
  downvotes: number;
  score: number;
  createdAt: string;
  userVote?: 1 | -1 | 0;
}

export interface ForumPost {
  id: number;
  title: string;
  body: string;
  images: string[];
  tags: string[];
  city: string;
  type: string;
  status: string;
  score: number;
  upvotes: number;
  downvotes: number;
  replyCount: number;
  viewCount: number;
  createdAt: string;
  category: { id: number; slug: string; name: string; icon: string; color: string };
  author?: ForumAuthor | null;
  userVote?: 1 | -1 | 0;
  replies?: ForumReply[];
}

export interface ForumProfile {
  id: number;
  userId: number;
  forumUsername: string;
  avatarUrl?: string | null;
  city: string;
  cityVerified: boolean;
  karma: number;
  karmaSpent: number;
  tag: string;
  reputationScore: number;
  streakDays: number;
  signatureText?: string | null;
  isBanned: boolean;
  createdAt: string;
  _count?: { posts: number; replies: number };
}

export interface KarmaTx {
  id: number;
  amount: number;
  type: string;
  refType?: string | null;
  refId?: number | null;
  note?: string | null;
  createdAt: string;
}

export interface KarmaHistory {
  profile: ForumProfile;
  transactions: KarmaTx[];
}

export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// ── Perfil ─────────────────────────────────────────────
export const getMyForumProfile = (): Promise<ForumProfile> =>
  api.get('/forum/profile/me').then((r) => r.data.data);
export const updateMyProfile = (payload: Record<string, unknown>): Promise<ForumProfile> =>
  api.put('/forum/profile/me', payload).then((r) => r.data.data);
export const getPublicProfile = (username: string): Promise<ForumProfile> =>
  api.get(`/forum/profile/${encodeURIComponent(username)}`).then((r) => r.data.data);
export const getProfilePosts = (username: string, page = 1): Promise<Page<ForumPost>> =>
  api.get(`/forum/profile/${encodeURIComponent(username)}/posts`, { params: { page, limit: 20 } }).then((r) => r.data);
export const getKarmaHistory = (): Promise<KarmaHistory> =>
  api.get('/forum/karma').then((r) => r.data.data);
export const addReputation = (username: string, payload: { value: 1 | -1; comment?: string }): Promise<unknown> =>
  api.post(`/forum/profile/${encodeURIComponent(username)}/reputation`, payload).then((r) => r.data.data);

// ── Categorías ─────────────────────────────────────────
export const listCategories = (): Promise<ForumCategory[]> =>
  api.get('/forum/categories').then((r) => r.data.data);

// ── Posts ──────────────────────────────────────────────
export const listPosts = (params: Record<string, unknown>): Promise<Page<ForumPost>> =>
  api.get('/forum/posts', { params }).then((r) => r.data);
export const getPost = (id: number): Promise<ForumPost> =>
  api.get(`/forum/posts/${id}`).then((r) => r.data.data);
export const createPost = (payload: Record<string, unknown>): Promise<ForumPost> =>
  api.post('/forum/posts', payload).then((r) => r.data.data);
export const votePost = (id: number, value: 1 | -1): Promise<{ newScore: number; upvotes: number; downvotes: number; userVote: 1 | -1 | 0 }> =>
  api.post(`/forum/posts/${id}/vote`, { value }).then((r) => r.data.data);
export const reportPost = (id: number, payload: Record<string, unknown>): Promise<unknown> =>
  api.post(`/forum/posts/${id}/report`, payload).then((r) => r.data.data);
export const uploadPostImages = async (id: number, uris: string[]): Promise<string[]> => {
  const form = new FormData();
  for (let i = 0; i < uris.length; i++) {
    const blob = await fetch(uris[i]).then((r) => r.blob());
    form.append('images', blob as unknown as Blob, `foto-${i + 1}.jpg`);
  }
  return api
    .post(`/forum/posts/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data.data?.urls ?? []);
};

// ── Replies ────────────────────────────────────────────
export const createReply = (postId: number, payload: Record<string, unknown>): Promise<ForumReply> =>
  api.post(`/forum/posts/${postId}/replies`, payload).then((r) => r.data.data);
export const voteReply = (id: number, value: 1 | -1): Promise<{ newScore: number; upvotes: number; downvotes: number; userVote: 1 | -1 | 0 }> =>
  api.post(`/forum/replies/${id}/vote`, { value }).then((r) => r.data.data);
export const acceptReply = (id: number): Promise<{ replyId: number; postId: number; postStatus: string; karmaAwarded: number; coinsAwarded: number }> =>
  api.post(`/forum/replies/${id}/accept`).then((r) => r.data.data);

// ── Karma ──────────────────────────────────────────────
export const redeemKarma = (karmaAmount: number): Promise<{ karmaRedeemed: number; coinsEarned: number; newGamerCoins: number; karmaBalance: number; karmaSpent: number }> =>
  api.post('/forum/karma/redeem', { karmaAmount }).then((r) => r.data.data);

// ── Discovery ──────────────────────────────────────────
export const getTrending = (): Promise<string[]> =>
  api.get('/forum/trending').then((r) => r.data.data);
export const getCitiesStats = (): Promise<{ city: string; count: number }[]> =>
  api.get('/forum/cities/stats').then((r) => r.data.data);
export const getTopUsers = (): Promise<unknown[]> =>
  api.get('/forum/top-users').then((r) => r.data.data);

// ── Geolocalización (09-spec G2/G6) ────────────────────
export interface ForumCity {
  id: number;
  name: string;
  department: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  isActive: boolean;
  sortOrder: number;
  categories?: {
    categoryId: number;
    category?: { id: number; name: string; slug: string };
  }[];
}

export interface ForumGeoSession {
  cityId?: number | null;
  city?: string | null;
  department?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radioKm?: number;
  cityVerified?: boolean;
}

export const fetchGeoSession = (): Promise<ForumGeoSession> =>
  api.get('/forum/geo/session').then((r) => r.data.data);
export const fetchMyGeo = (): Promise<{ profile: ForumGeoSession; cities: ForumCity[] }> =>
  api.get('/forum/geo/me').then((r) => r.data.data);
export const updateMyGeo = (payload: {
  cityId?: number;
  latitude?: number;
  longitude?: number;
  radioKm?: number;
}): Promise<{ profile: ForumGeoSession; city?: ForumCity }> =>
  api.put('/forum/geo', payload).then((r) => r.data.data);
export const resolveGeo = (
  latitude: number,
  longitude: number,
): Promise<{ cityId: number; city: string; department: string; distanceKm: number; within: boolean }> =>
  api.post('/forum/geo/resolve', { latitude, longitude }).then((r) => r.data.data);
export const listCities = (department?: string): Promise<ForumCity[]> =>
  api
    .get('/forum/cities', { params: department ? { department } : undefined })
    .then((r) => r.data.data);

// ── GIFs (09-spec G4) ──────────────────────────────────────────────

export interface GifResult { id: string; url: string; previewUrl: string; title: string; }

export const searchGifs = (q: string, limit = 12): Promise<GifResult[]> =>
  api.get('/forum/gifs/search', { params: { q, limit } }).then((r) => r.data.data ?? []);
