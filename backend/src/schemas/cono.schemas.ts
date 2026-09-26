import { z } from 'zod';

export const createThemeSchema = z.object({
  body: z.object({
    slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
    title: z.string().min(5).max(150),
    description: z.string().max(1000).optional(),
    type: z.enum(['MEME', 'TOURNAMENT']),
  }),
});

export const listThemesSchema = z.object({
  query: z.object({
    type: z.enum(['MEME', 'TOURNAMENT']).optional(),
  }),
});

export const createEntrySchema = z.object({
  params: z.object({ themeId: z.coerce.number().int().positive() }),
  body: z.object({
    label: z.string().min(2).max(120),
    imageUrl: z.string().min(1).max(500),
  }),
});

export const listEntriesSchema = z.object({
  params: z.object({ themeId: z.coerce.number().int().positive() }),
  query: z.object({
    window: z.enum(['daily', 'weekly', 'monthly']).optional(),
  }),
});

export const voteEntrySchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({ value: z.enum(['POSITIVE', 'NEGATIVE']) }),
});

export const createMatchSchema = z.object({
  body: z.object({
    themeId: z.number().int().positive(),
    round: z.number().int().positive().default(1),
    entryAId: z.number().int().positive(),
    entryBId: z.number().int().positive(),
    votingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha esperado: YYYY-MM-DD'),
  }),
});

export const voteMatchSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({ choice: z.enum(['A', 'B']) }),
});
