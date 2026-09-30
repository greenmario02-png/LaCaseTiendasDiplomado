import { z } from 'zod';

// Dominios cerrados (coinciden con los enums OrderStatus y PaymentStatus de Prisma).
export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
export const PAYMENT_STATUSES = ['PENDING', 'PROOF_SUBMITTED', 'VERIFIED', 'REJECTED'] as const;

export const updateOrderStatusSchema = z.object({
  body: z.object({ status: z.enum(ORDER_STATUSES, { errorMap: () => ({ message: 'Estado de orden inválido' }) }) }),
});

export const updatePaymentStatusSchema = z.object({
  body: z.object({
    paymentStatus: z.enum(PAYMENT_STATUSES, { errorMap: () => ({ message: 'Estado de pago inválido' }) }),
  }),
});

// Comprobante: ruta propia (/uploads/...) o URL http(s).
export const proofUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .refine((v) => (/^\/uploads\/[\w\-./]+$/.test(v) && !v.includes('..')) || /^https?:\/\/[^\s]+$/i.test(v), {
    message: 'URL de comprobante inválida',
  });

export const paymentProofSchema = z.object({
  body: z.object({ proofUrl: proofUrlSchema }),
});

export const createOrderSchema = z.object({
  body: z.object({
    shippingAddressId: z.number().int().positive().optional(),
    notes: z.string().trim().max(1000).optional(),
    paymentQrUrl: z.string().trim().max(2000).optional(),
    couponCode: z.string().trim().max(50).optional(),
    fulfillmentType: z.enum(['SHIPPING', 'PICKUP']).optional(),
    pickupAddress: z.string().trim().max(500).optional(),
  }),
});
