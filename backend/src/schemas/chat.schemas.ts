import { z } from 'zod';

export const createConversationSchema = z.object({
  body: z.object({
    sellerId: z.number().int().positive('sellerId obligatorio'),
    productId: z.number().int().positive().optional(),
  }),
});

export const sendMessageSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    content: z.string().min(1, 'Escribí un mensaje').max(2000, 'Mensaje demasiado largo'),
  }),
});

export const getConversationSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});
