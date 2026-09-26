// Cliente API de memes y torneo (/api/cono/*).
import { api } from './api';

export type ConoThemeType = 'MEME' | 'TOURNAMENT';

export interface ConoTheme {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  type: ConoThemeType;
  createdBy?: { forumUsername: string };
  _count?: { entries: number };
}

export interface ConoEntry {
  id: number;
  themeId: number;
  label: string;
  imageUrl: string;
  positiveCount: number;
  negativeCount: number;
  windowScore?: number;
  createdAt: string;
  submittedBy?: { forumUsername: string; avatarUrl?: string | null; tag?: string };
  theme?: { id: number; slug: string; title: string; type: ConoThemeType };
}

export interface ConoMatch {
  id: number;
  themeId: number;
  round: number;
  votesA: number;
  votesB: number;
  status: 'PENDING' | 'ACTIVE' | 'RESOLVED';
  winnerId: number | null;
  votingDate: string;
  entryA: { id: number; label: string; imageUrl: string };
  entryB: { id: number; label: string; imageUrl: string };
  winner?: { id: number; label: string } | null;
}

export const listConoThemes = (type?: ConoThemeType) =>
  api.get('/cono/themes', { params: type ? { type } : {} }).then((r) => r.data.data as ConoTheme[]);

export const createConoTheme = (data: { slug: string; title: string; description?: string; type: ConoThemeType }) =>
  api.post('/cono/themes', data).then((r) => r.data.data as ConoTheme);

export const getConoTheme = (slug: string) =>
  api.get(`/cono/themes/${slug}`).then((r) => r.data.data as ConoTheme);

export const listConoEntries = (themeId: number, window?: 'daily' | 'weekly' | 'monthly') =>
  api.get(`/cono/themes/${themeId}/entries`, { params: window ? { window } : {} }).then((r) => r.data.data as ConoEntry[]);

export const createConoEntry = (themeId: number, data: { label: string; imageUrl: string }) =>
  api.post(`/cono/themes/${themeId}/entries`, data).then((r) => r.data.data as ConoEntry);

export const getConoEntry = (id: number) =>
  api.get(`/cono/entries/${id}`).then((r) => r.data.data as ConoEntry);

export const voteConoEntry = (id: number, value: 'POSITIVE' | 'NEGATIVE') =>
  api.post(`/cono/entries/${id}/vote`, { value }).then((r) => r.data.data as { positiveCount: number; negativeCount: number });

export const listConoMatches = (themeId: number) =>
  api.get(`/cono/themes/${themeId}/matches`).then((r) => r.data.data as ConoMatch[]);

export const createConoMatch = (data: { themeId: number; round?: number; entryAId: number; entryBId: number; votingDate: string }) =>
  api.post('/cono/matches', data).then((r) => r.data.data as ConoMatch);

export const voteConoMatch = (id: number, choice: 'A' | 'B') =>
  api.post(`/cono/matches/${id}/vote`, { choice }).then((r) => r.data.data as { votesA: number; votesB: number });

export const uploadConoImage = (file: File) => {
  const form = new FormData();
  form.append('image', file);
  return api.post('/cono/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data.data as { url: string });
};
