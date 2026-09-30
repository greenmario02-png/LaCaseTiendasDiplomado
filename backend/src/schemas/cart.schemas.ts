import { z } from 'zod';

export const addCartItemSchema = z.object({
  body: z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive().max(9999).optional(),
    variantId: z.number().int().positive().optional(),
  }),
});

export const updateCartItemSchema = z.object({
  body: z.object({
    quantity: z.number().int().positive().max(9999),
  }),
});
