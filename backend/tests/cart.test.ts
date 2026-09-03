import request from 'supertest';
import { app, registerUser, getSessionId } from './helpers';

async function getTwoProductsFromDifferentSellers(minStock = 2) {
  const all = await request(app).get('/api/products').query({ limit: 100 });
  const withStock = all.body.data.filter((p: any) => p.stock >= minStock);
  const products = withStock.length > 1 ? withStock : all.body.data.filter((p: any) => p.stock >= minStock);
  let p1 = products[0];
  let p2 = products.find((p: any) => p.seller.id !== p1.seller.id);
  if (!p2) {
    // buscar un segundo producto del mismo seller con stock si no hay otro seller
    p2 = products[1] || products[0];
  }
  return { p1, p2 };
}

describe('Cart API (integración)', () => {
  let sessionId: string;

  beforeEach(() => {
    sessionId = getSessionId('cart');
  });

  it('guest — agrega producto al carrito', async () => {
    const { p1 } = await getTwoProductsFromDifferentSellers();
    const res = await request(app)
      .post('/api/cart/items')
      .set('X-Session-Id', sessionId)
      .send({ productId: p1.id, quantity: 2 });
    expect(res.status).toBe(201);
    expect(res.body.data.itemCount).toBe(2);
    expect(res.body.data.subtotal).toBeCloseTo(Number(p1.price) * 2, 0);
  });

  it('guest — agrupa items de distintos sellers', async () => {
    const { p1, p2 } = await getTwoProductsFromDifferentSellers();
    await request(app).post('/api/cart/items').set('X-Session-Id', sessionId).send({ productId: p1.id, quantity: 1 });
    await request(app).post('/api/cart/items').set('X-Session-Id', sessionId).send({ productId: p2.id, quantity: 1 });

    const res = await request(app).get('/api/cart').set('X-Session-Id', sessionId);
    expect(res.status).toBe(200);
    expect(res.body.data.groupedBySeller.length).toBe(2);
    expect(res.body.data.itemCount).toBe(2);
  });

  it('guest — producto inexistente → 404', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('X-Session-Id', sessionId)
      .send({ productId: 999999, quantity: 1 });
    expect(res.status).toBe(404);
  });

  it('guest — actualiza cantidad de item', async () => {
    const { p1 } = await getTwoProductsFromDifferentSellers();
    await request(app).post('/api/cart/items').set('X-Session-Id', sessionId).send({ productId: p1.id, quantity: 1 });
    const cart = await request(app).get('/api/cart').set('X-Session-Id', sessionId);
    const itemId = cart.body.data.items[0].id;

    const res = await request(app)
      .put(`/api/cart/items/${itemId}`)
      .set('X-Session-Id', sessionId)
      .send({ quantity: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data.itemCount).toBe(5);
  });

  it('guest — elimina item', async () => {
    const { p1 } = await getTwoProductsFromDifferentSellers();
    await request(app).post('/api/cart/items').set('X-Session-Id', sessionId).send({ productId: p1.id, quantity: 1 });
    const cart = await request(app).get('/api/cart').set('X-Session-Id', sessionId);
    const itemId = cart.body.data.items[0].id;

    const res = await request(app).delete(`/api/cart/items/${itemId}`).set('X-Session-Id', sessionId);
    expect(res.status).toBe(200);
    expect(res.body.data.itemCount).toBe(0);
  });

  it('guest — item de otro carrito → 404', async () => {
    const otherSession = getSessionId('other');
    const { p1 } = await getTwoProductsFromDifferentSellers();
    await request(app).post('/api/cart/items').set('X-Session-Id', otherSession).send({ productId: p1.id, quantity: 1 });
    const otherCart = await request(app).get('/api/cart').set('X-Session-Id', otherSession);
    const otherItemId = otherCart.body.data.items[0].id;

    const res = await request(app).delete(`/api/cart/items/${otherItemId}`).set('X-Session-Id', sessionId);
    expect(res.status).toBe(404);
  });

  it('usuario — merge del carrito guest tras login', async () => {
    const reg = await registerUser();
    const email = reg.body.data.email;

    const { p1 } = await getTwoProductsFromDifferentSellers();
    await request(app).post('/api/cart/items').set('X-Session-Id', sessionId).send({ productId: p1.id, quantity: 2 });

    const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    const token = login.body.data.accessToken;

    const res = await request(app)
      .post('/api/cart/merge')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId });
    expect(res.status).toBe(200);
    expect(res.body.data.itemCount).toBe(2);
  });
});
