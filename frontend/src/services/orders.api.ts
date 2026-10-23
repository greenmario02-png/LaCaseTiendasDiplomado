import { api } from './api';

/** Pedidos (lado vendedor): llamadas REST compartidas entre SellerOrders.tsx y la accion rapida del chat. */

export type SellerOrderPaymentStatus = 'PENDING' | 'PROOF_SUBMITTED' | 'VERIFIED' | 'REJECTED';

export const ordersApi = {
  updateSellerPaymentStatus: (orderId: number, paymentStatus: SellerOrderPaymentStatus) =>
    api.put(`/orders/seller/${orderId}/payment-status`, { paymentStatus }).then((r) => r.data.data),
};
