import { z } from 'zod';

export const recordSearchSchema = z.object({
  body: z.object({
    term: z.string().min(1, 'term obligatorio').max(100),
  }),
});

export const viewProductSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});
