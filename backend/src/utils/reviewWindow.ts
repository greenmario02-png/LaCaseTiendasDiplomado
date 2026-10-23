import { ApiError } from './errors';

/**
 * Ventana para calificar: entre 3 y 7 días después de la entrega (si el pedido tiene fecha de entrega).
 * Se usa en ambos sentidos: el comprador califica a la tienda y el vendedor califica al comprador.
 */
export function assertReviewWindow(deliveredAt: Date | null | undefined) {
  if (!deliveredAt) return; // órdenes viejas sin fecha de entrega: se permite
  const now = Date.now();
  const min = deliveredAt.getTime() + 3 * 24 * 3600000; // +3 días
  const max = deliveredAt.getTime() + 7 * 24 * 3600000; // +7 días
  if (now < min) {
    throw ApiError.forbidden('Todavía no puedes calificar. Puedes hacerlo entre 3 y 7 días después de recibir tu compra.');
  }
  if (now > max) {
    throw ApiError.forbidden('El período para calificar (3 a 7 días después de recibir tu compra) ya venció.');
  }
}
