import { z } from 'zod';

export const adminCreateBotSchema = z.object({
  body: z.object({
    displayName: z.string().min(2).max(80),
    declaredStance: z.string().min(10).max(2000),
  }),
});

export const adminSanctionBotSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    severity: z.enum(['SUSPENDED', 'BANNED']),
    reason: z.string().min(5).max(500),
  }),
});

export const startConversationSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});

export const sendMessageSchema = z.object({
  params: z.object({ conversationId: z.coerce.number().int().positive() }),
  body: z.object({
    body: z.string().min(1).max(1000),
  }),
});

export const endConversationSchema = z.object({
  params: z.object({ conversationId: z.coerce.number().int().positive() }),
});
