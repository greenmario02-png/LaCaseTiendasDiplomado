/** El vendedor califica al comprador de un pedido entregado y pagado (la otra mitad de la calificación mutua). */
import request from 'supertest';

import { app } from './helpers';
import { mkUser, tk } from './factories';
import { prisma } from '../src/config/database';

const DAY = 24 * 3600000;

async function setup(order: Record<string, unknown> = {}) {
  const seller = await mkUser('SELLER');
  const buyer = await mkUser('CUSTOMER');
  const o = await prisma.order.create({
    data: {
      buyerId: buyer.id,
      sellerId: seller.id,
      subtotal: 100,
      total: 100,
      status: 'DELIVERED',
      paymentStatus: 'VERIFIED',
      deliveredAt: new Date(Date.now() - 4 * DAY),
      ...order,
    } as any,
  });
  return { seller, buyer, orderId: o.id };
}

const rate = (u: { id: number; role: string }, orderId: number, body: Record<string, unknown>) =>
  request(app).post(`/api/orders/${orderId}/buyer-review`).set('Authorization', tk(u)).send(body);

describe('POST /api/orders/:id/buyer-review', () => {
  it('crea la calificación y recalcula el promedio del comprador', async () => {
    const { seller, buyer, orderId } = await setup();
    const res = await rate(seller, orderId, { rating: 5, comment: '  Puntual y amable ' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ orderId, sellerId: seller.id, buyerId: buyer.id, rating: 5, comment: 'Puntual y amable', totalReviews: 1 });

    // Un segundo pedido del mismo comprador con otra tienda: el promedio baja a 4.
    const other = await mkUser('SELLER');
    const o2 = await prisma.order.create({
      data: { buyerId: buyer.id, sellerId: other.id, subtotal: 50, total: 50, status: 'DELIVERED', paymentStatus: 'VERIFIED', deliveredAt: new Date(Date.now() - 5 * DAY) } as any,
    });
    expect((await rate(other, o2.id, { rating: 3 })).status).toBe(201);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: buyer.id } });
    expect(u.buyerRating).toBe(4);
    expect(u.buyerRatingsCount).toBe(2);
  });

  it('una sola vez por pedido (409)', async () => {
    const { seller, orderId } = await setup();
    expect((await rate(seller, orderId, { rating: 4 })).status).toBe(201);
    expect((await rate(seller, orderId, { rating: 1 })).status).toBe(409);
    expect(await prisma.buyerReview.count({ where: { orderId } })).toBe(1);
  });

  it('otro vendedor no puede calificar ese pedido (404); un comprador no es vendedor (403)', async () => {
    const { buyer, orderId } = await setup();
    const stranger = await mkUser('SELLER');
    expect((await rate(stranger, orderId, { rating: 4 })).status).toBe(404);
    expect((await rate(buyer, orderId, { rating: 4 })).status).toBe(403);
  });

  it('403 si el pedido no está entregado o el pago no está verificado', async () => {
    const a = await setup({ status: 'SHIPPED', deliveredAt: null });
    expect((await rate(a.seller, a.orderId, { rating: 4 })).status).toBe(403);
    const b = await setup({ paymentStatus: 'PROOF_SUBMITTED' });
    expect((await rate(b.seller, b.orderId, { rating: 4 })).status).toBe(403);
  });

  it('respeta la ventana de 3 a 7 días desde la entrega', async () => {
    const early = await setup({ deliveredAt: new Date(Date.now() - 1 * DAY) });
    expect((await rate(early.seller, early.orderId, { rating: 4 })).status).toBe(403);
    const late = await setup({ deliveredAt: new Date(Date.now() - 10 * DAY) });
    expect((await rate(late.seller, late.orderId, { rating: 4 })).status).toBe(403);
  });

  it('400 con calificación fuera de 1 a 5; 401 sin sesión', async () => {
    const { seller, orderId } = await setup();
    expect((await rate(seller, orderId, { rating: 0 })).status).toBe(400);
    expect((await rate(seller, orderId, { rating: 6 })).status).toBe(400);
    expect((await rate(seller, orderId, { rating: 4.5 })).status).toBe(400);
    expect((await request(app).post(`/api/orders/${orderId}/buyer-review`).send({ rating: 4 })).status).toBe(401);
  });
});

describe('GET /api/users/:id/buyer-reviews', () => {
  it('el propio comprador y un ADMIN la ven, con la tienda que calificó; otro usuario no', async () => {
    const { seller, buyer, orderId } = await setup();
    await rate(seller, orderId, { rating: 5 });
    const own = await request(app).get(`/api/users/${buyer.id}/buyer-reviews`).set('Authorization', tk(buyer));
    expect(own.status).toBe(200);
    expect(own.body.data).toMatchObject({ totalReviews: 1, avgRating: 5 });
    expect(own.body.data.reviews[0].seller).toMatchObject({ id: seller.id, storeName: seller.storeName });
    expect(own.headers['cache-control']).toContain('no-store');

    const admin = await mkUser('ADMIN');
    expect((await request(app).get(`/api/users/${buyer.id}/buyer-reviews`).set('Authorization', tk(admin))).status).toBe(200);
    expect((await request(app).get(`/api/users/${buyer.id}/buyer-reviews`).set('Authorization', tk(seller))).status).toBe(403);
    expect((await request(app).get(`/api/users/${buyer.id}/buyer-reviews`)).status).toBe(401);
  });
});
