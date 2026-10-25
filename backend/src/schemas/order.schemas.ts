import { z } from 'zod';

import { isPaymentQrUrl } from '../utils/imageSafety';

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

/** Selección de líneas del carrito a pagar: ids únicos, positivos, como mucho 200. Sin el campo = todo el carrito. */
export const cartItemIdsField = z
  .array(z.number().int().positive().max(2_147_483_647))
  .min(1, 'Selecciona al menos un producto')
  .max(200)
  .refine((a) => new Set(a).size === a.length, 'Productos repetidos en la selección')
  .optional();

export const createOrderSchema = z.object({
  body: z.object({
    shippingAddressId: z.number().int().positive().optional(),
    notes: z.string().trim().max(1000).optional(),
    // Nunca una URL externa: solo un QR subido a la plataforma. Los clientes actuales no lo envían.
    paymentQrUrl: z.string().trim().max(300).refine(isPaymentQrUrl, 'QR inválido: no se aceptan enlaces').optional(),
    // Pagar solo lo seleccionado en el carrito: ids de cart_items del propio carrito; lo demás se queda en el carrito.
    cartItemIds: cartItemIdsField,
    couponCode: z.string().trim().max(50).optional(),
    fulfillmentType: z.enum(['SHIPPING', 'PICKUP']).optional(),
    // Solo por compatibilidad con clientes anteriores: se ignora. El retiro en tienda usa siempre la
    // dirección real de cada tienda (storeAddress), nunca un texto escrito por el comprador.
    pickupAddress: z.string().trim().max(500).optional(),
  }),
});

export const calculateShippingSchema = z.object({
  // Opcional: en Bolivia no hay código postal; sin él se cotiza el costo base, igual que al crear la orden.
  body: z.object({ buyerPostalCode: z.union([z.string().trim().max(20), z.null()]).optional(), cartItemIds: cartItemIdsField }),
});

/** El vendedor califica al comprador del pedido: 1 a 5 y comentario opcional. */
export const buyerReviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).nullish(),
  }),
});
