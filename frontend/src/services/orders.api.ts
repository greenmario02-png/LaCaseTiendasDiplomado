import { api } from './api';

/** Pedidos (lado vendedor): llamadas REST compartidas entre SellerOrders.tsx y la accion rapida del chat. */

export type SellerOrderPaymentStatus = 'PENDING' | 'PROOF_SUBMITTED' | 'VERIFIED' | 'REJECTED';

export interface BuyerReview {
  id: number;
  orderId: number;
  sellerId: number;
  buyerId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  avgRating: number;
  totalReviews: number;
}

export const ordersApi = {
  updateSellerPaymentStatus: (orderId: number, paymentStatus: SellerOrderPaymentStatus) =>
    api.put(`/orders/seller/${orderId}/payment-status`, { paymentStatus }).then((r) => r.data.data),
  /** El vendedor califica al comprador del pedido (POST /orders/:id/buyer-review). */
  addBuyerReview: (orderId: number, body: { rating: number; comment?: string }) =>
    api.post(`/orders/${orderId}/buyer-review`, body).then((r) => r.data.data as BuyerReview),
};
