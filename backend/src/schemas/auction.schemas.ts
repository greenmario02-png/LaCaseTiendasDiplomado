import { z } from 'zod';

export const createAuctionSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'El título es obligatorio').max(200),
    description: z.string().max(5000).optional(),
    categoryId: z.number().int().positive().optional(),
    imageUrl: z.string().url('URL de imagen inválida').optional().or(z.string().max(0).optional()),
    startingPrice: z.number().positive('Precio inicial inválido'),
    reservePrice: z.number().positive('Precio de reserva inválido').optional(),
    buyNowPrice: z.number().positive('Precio de compra directa inválido').optional(),
    minIncrement: z.number().positive().optional(),
    maxIncrement: z.number().positive().optional(),
    incrementType: z.enum(['fixed', 'dynamic']).optional(),
    extensionMinutes: z.number().int().min(0).max(60).optional(),
    endDate: z.coerce.date({ invalid_type_error: 'Fecha de fin inválida' }),
    productId: z.number().int().positive().optional(),
  }),
});

export const placeBidSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    bidAmount: z.number().positive('Monto de oferta inválido'),
  }),
});

export const auctionParamSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});
