// Cliente API del foro LaCASE (/api/forum/*). Usa la instancia axios existente (con auth + refresh).
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
  city?: string;
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
  userVote: 1 | -1 | 0;
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
  userVote: 1 | -1 | 0;
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

export const getMyForumProfile = () => api.get('/forum/profile/me').then((r) => r.data.data as ForumProfile);
export const updateMyProfile = (data: Record<string, unknown>) => api.put('/forum/profile/me', data).then((r) => r.data.data as ForumProfile);
export const getPublicProfile = (username: string) => api.get(`/forum/profile/${encodeURIComponent(username)}`).then((r) => r.data.data as ForumProfile & { posts?: unknown });
export const getProfilePosts = (username: string, page = 1) =>
  api.get(`/forum/profile/${encodeURIComponent(username)}/posts`, { params: { page, limit: 10 } }).then((r) => r.data);
export const getKarmaHistory = () => api.get('/forum/karma').then((r) => r.data.data as { karma: number; available: number; karmaSpent: number; transactions: KarmaTx[] });
export const addReputation = (username: string, data: { value: 1 | -1; comment?: string }) =>
  api.post(`/forum/profile/${encodeURIComponent(username)}/reputation`, data).then((r) => r.data.data);

export const listCategories = () => api.get('/forum/categories').then((r) => r.data.data as ForumCategory[]);
export const adminListCategories = () => api.get('/forum/admin/categories').then((r) => r.data.data as ForumCategory[]);
export const createCategory = (data: Partial<ForumCategory>) =>
  api.post('/forum/categories', data).then((r) => r.data.data as ForumCategory);
export const updateCategory = (id: number, data: Partial<ForumCategory>) =>
  api.put(`/forum/categories/${id}`, data).then((r) => r.data.data as ForumCategory);
export const deleteCategory = (id: number) => api.delete(`/forum/categories/${id}`).then((r) => r.data.data);
export const listPosts = (params: Record<string, unknown>) => api.get('/forum/posts', { params }).then((r) => r.data);
export const getPost = (id: number) => api.get(`/forum/posts/${id}`).then((r) => r.data.data as ForumPost);
export const createPost = (data: Record<string, unknown>) => api.post('/forum/posts', data).then((r) => r.data.data);
export const votePost = (id: number, value: 1 | -1) =>
  api.post(`/forum/posts/${id}/vote`, { value }).then((r) => r.data.data as { newScore: number; upvotes: number; downvotes: number; userVote: 1 | -1 | 0 });
export const reportPost = (id: number, data: { reason: string; detail?: string }) => api.post(`/forum/posts/${id}/report`, data).then((r) => r.data.data);
export const uploadPostImages = (id: number, files: File[]) => {
  const form = new FormData();
  files.forEach((f) => form.append('images', f));
  return api.post(`/forum/posts/${id}/images`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data as { urls: string[] });
};

export const createReply = (postId: number, data: { body: string }) =>
  api.post(`/forum/posts/${postId}/replies`, data).then((r) => r.data.data as ForumReply);
export const voteReply = (id: number, value: 1 | -1) =>
  api.post(`/forum/replies/${id}/vote`, { value }).then((r) => r.data.data as { newScore: number; upvotes: number; downvotes: number; userVote: 1 | -1 | 0 });
export const acceptReply = (id: number) => api.post(`/forum/replies/${id}/accept`).then((r) => r.data.data);
export const reportReply = (id: number, data: { reason: string; detail?: string }) => api.post(`/forum/replies/${id}/report`, data).then((r) => r.data.data);

export const redeemKarma = (karmaAmount: number) =>
  api.post('/forum/karma/redeem', { karmaAmount }).then((r) => r.data.data as { karmaRedeemed: number; coinsEarned: number; newGamerCoins: number; karmaBalance: number; karmaSpent: number });

export const getTrending = () => api.get('/forum/trending').then((r) => r.data.data as { tag: string; count: number }[]);
export const getCitiesStats = () => api.get('/forum/cities/stats').then((r) => r.data.data as { city: string; count: number }[]);
export const getTopUsers = () => api.get('/forum/top-users').then((r) => r.data.data);
export const getForumAdminStats = () => api.get('/forum/admin/stats').then((r) => r.data.data);
export const listReports = (params: Record<string, unknown> = {}) => api.get('/forum/reports', { params }).then((r) => r.data);
export const resolveReport = (id: number, resolution?: string) => api.put(`/forum/reports/${id}/resolve`, { resolution }).then((r) => r.data.data);
export const rejectReport = (id: number, resolution?: string) => api.put(`/forum/reports/${id}/reject`, { resolution }).then((r) => r.data.data);

// ─── Geolocalización del foro (09-spec G2/G5) ───

export interface ForumCity {
  id: number;
  name: string;
  department: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  isActive: boolean;
  sortOrder: number;
  categories?: { categoryId: number; category?: { id: number; name: string; slug: string } }[];
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

export const fetchGeoSession = () => api.get('/forum/geo/session').then((r) => r.data.data as ForumGeoSession);
export const fetchMyGeo = () => api.get('/forum/geo/me').then((r) => r.data.data as { profile: ForumGeoSession; cities: ForumCity[] });
export const updateMyGeo = (data: { cityId?: number; latitude?: number; longitude?: number; radioKm?: number }) =>
  api.put('/forum/geo', data).then((r) => r.data.data as { profile: ForumGeoSession; city?: ForumCity });
export const resolveGeo = (latitude: number, longitude: number) =>
  api.post('/forum/geo/resolve', { latitude, longitude }).then((r) => r.data.data as { cityId: number; city: string; department: string; distanceKm: number; within: boolean });
export const listCities = (department?: string) =>
  api.get('/forum/cities', { params: department ? { department } : {} }).then((r) => r.data.data as ForumCity[]);

// ─── Admin: reglas, ciudades y moderadores (09-spec G3) ───

export interface ForumRule {
  id: number;
  title: string;
  body: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ForumModerator {
  id: number;
  forumUsername: string;
  city: string;
  department: string | null;
  cityVerified: boolean;
  user: { id: number; email: string; firstName: string; lastName: string };
}

export const listRules = () => api.get('/forum/rules').then((r) => r.data.data as ForumRule[]);
export const adminCreateRule = (data: { title: string; body: string; sortOrder?: number }) =>
  api.post('/forum/admin/rules', data).then((r) => r.data.data as ForumRule);
export const adminUpdateRule = (id: number, data: Partial<{ title: string; body: string; sortOrder: number; isActive: boolean }>) =>
  api.put(`/forum/admin/rules/${id}`, data).then((r) => r.data.data as ForumRule);
export const adminDeleteRule = (id: number) => api.delete(`/forum/admin/rules/${id}`).then((r) => r.data.data);

export const adminListCities = () =>
  api.get('/forum/admin/cities').then((r) => r.data.data as (ForumCity & { categories: { categoryId: number; category: { id: number; name: string; slug: string } }[] })[]);
export const adminCreateCity = (data: { name: string; department: string; latitude: number; longitude: number; radiusKm?: number }) =>
  api.post('/forum/admin/cities', data).then((r) => r.data.data as ForumCity);
export const adminUpdateCity = (id: number, data: Partial<{ name: string; department: string; latitude: number; longitude: number; radiusKm: number; isActive: boolean; sortOrder: number }>) =>
  api.put(`/forum/admin/cities/${id}`, data).then((r) => r.data.data as ForumCity);
export const adminDeleteCity = (id: number) => api.delete(`/forum/admin/cities/${id}`).then((r) => r.data.data);
export const adminSetCityCategories = (id: number, categoryIds: number[]) =>
  api.put(`/forum/admin/cities/${id}/categories`, { categoryIds }).then((r) => r.data.data);
export const adminGenerateCitySubforos = (id: number) =>
  api.post(`/forum/admin/cities/${id}/subforos`).then((r) => r.data.data);
export const adminGenerateAllCitySubforos = () =>
  api.post('/forum/admin/cities/subforos/all').then((r) => r.data.data);

export const adminListModerators = (department?: string) =>
  api.get('/forum/admin/moderators', { params: department ? { department } : {} }).then((r) => r.data.data as ForumModerator[]);

// ── GIFs (09-spec G4) ──────────────────────────────────────────────

export interface GifResult { id: string; url: string; previewUrl: string; title: string; }

export const searchGifs = (q: string, limit = 12) =>
  api.get('/forum/gifs/search', { params: { q, limit } }).then((r) => r.data.data as GifResult[]);
