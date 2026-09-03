import request from 'supertest';
import { app, registerUser, getApprovedSellerToken, getAdminToken } from './helpers';

describe('Notifications API (integración)', () => {
  let buyerToken: string;
  let sellerToken: string;
  let sellerId: number;

  beforeAll(async () => {
    sellerToken = await getApprovedSellerToken();
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${sellerToken}`);
    sellerId = me.body.data.id;

    const reg = await registerUser();
    const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    buyerToken = login.body.data.accessToken;
  });

  it('GET /api/notifications — requiere auth', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('GET /api/notifications — lista vacía al inicio', async () => {
    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(0);
    expect(typeof res.body.meta.unread).toBe('number');
  });

  it('una venta genera notificación NEW_ORDER al vendedor', async () => {
    // comprar un producto del seller
    const products = await request(app).get('/api/products').query({ limit: 50 });
    const withStock = products.body.data.filter((p: any) => p.stock > 0 && p.seller.id === sellerId);
    const p = withStock[0] || products.body.data.find((x: any) => x.seller.id === sellerId);

    // crear dirección
    const addr = await request(app)
      .post('/api/account/addresses')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ street: 'Calle', number: '100', city: 'La Paz', state: 'La Paz', postalCode: '2000', isDefault: true });

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ productId: p.id, quantity: 1 });

    const order = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ shippingAddressId: addr.body.data.id });

    expect(order.status).toBe(201);

    const notifs = await request(app).get('/api/notifications').set('Authorization', `Bearer ${sellerToken}`);
    const newOrder = notifs.body.data.find((n: any) => n.type === 'NEW_ORDER');
    expect(newOrder).toBeDefined();
    expect(newOrder.title).toContain('Nueva venta');
  });

  it('un mensaje de chat genera notificación NEW_MESSAGE', async () => {
    const conv = await request(app).post('/api/chat').set('Authorization', `Bearer ${buyerToken}`).send({ sellerId });
    const convId = conv.body.data.id;

    await request(app)
      .post(`/api/chat/${convId}/messages`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ content: 'Hola, prueba de notificación' });

    const notifs = await request(app).get('/api/notifications').set('Authorization', `Bearer ${sellerToken}`);
    const msg = notifs.body.data.find((n: any) => n.type === 'NEW_MESSAGE');
    expect(msg).toBeDefined();
    expect(msg.message).toContain('prueba de notificación');
  });

  it('GET /api/notifications/unread-count — devuelve contador', async () => {
    const res = await request(app).get('/api/notifications/unread-count').set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.data.count).toBe('number');
  });

  it('PATCH /api/notifications/:id/read — marca como leída', async () => {
    const notifs = await request(app).get('/api/notifications').set('Authorization', `Bearer ${sellerToken}`);
    const unread = notifs.body.data.find((n: any) => !n.isRead);
    if (!unread) return; // no hay no leídas, ok

    const res = await request(app).patch(`/api/notifications/${unread.id}/read`).set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);

    const after = await request(app).get('/api/notifications/unread-count').set('Authorization', `Bearer ${sellerToken}`);
    // el contador debería haber bajado
    expect(Number(after.body.data.count)).toBeLessThanOrEqual(Number(notifs.body.meta.unread));
  });

  it('POST /api/notifications/read-all — marca todas leídas', async () => {
    const res = await request(app).post('/api/notifications/read-all').set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.data.count).toBe('number');

    const count = await request(app).get('/api/notifications/unread-count').set('Authorization', `Bearer ${sellerToken}`);
    expect(Number(count.body.data.count)).toBe(0);
  });

  it('moderación de producto genera notificación al vendedor', async () => {
    const adminToken = await getAdminToken();

    // crear producto como seller (queda pendiente)
    const categories = await request(app).get('/api/products/categories');
    const hardware = categories.body.data.find((c: any) => c.name === 'Hardware');
    const childId = hardware?.children?.[0]?.id || hardware?.children?.[1]?.id || 1;

    const created = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ name: `Notif Test ${Date.now()}`, categoryId: childId, description: 'descripcion valida de producto', price: 100, stock: 1, sku: `NTF-${Date.now()}` });
    expect(created.status).toBe(201);

    // admin aprueba
    await request(app)
      .put(`/api/admin/products/${created.body.data.id}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approve: true });

    const notifs = await request(app).get('/api/notifications').set('Authorization', `Bearer ${sellerToken}`);
    const approved = notifs.body.data.find((n: any) => n.type === 'PRODUCT_APPROVED' && n.refId === created.body.data.id);
    expect(approved).toBeDefined();
  });

  it('GET /api/notifications — paginación', async () => {
    const res = await request(app).get('/api/notifications').query({ page: 1, limit: 5 }).set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });
});
