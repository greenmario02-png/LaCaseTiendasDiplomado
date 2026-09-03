import request from 'supertest';
import { app, registerUser } from './helpers';

async function loginBuyer() {
  const reg = await registerUser();
  const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
  return login.body.data.accessToken as string;
}

describe('Builds API (integración)', () => {
  let token: string;

  beforeAll(async () => {
    token = await loginBuyer();
  });

  it('GET /api/builds/slot-products?slotType=CPU — lista CPUs', async () => {
    const res = await request(app).get('/api/builds/slot-products').query({ slotType: 'CPU' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/builds/slot-products — slotType inválido → 400', async () => {
    const res = await request(app).get('/api/builds/slot-products').query({ slotType: 'BOGUS' });
    expect(res.status).toBe(400);
  });

  it('GET /api/builds/compatibility — valida categoría del slot', async () => {
    const cpus = await request(app).get('/api/builds/slot-products').query({ slotType: 'CPU' });
    const cpuId = cpus.body.data[0].id;

    const ok = await request(app).get('/api/builds/compatibility').query({ productId: cpuId, slotType: 'CPU' });
    expect(ok.body.data.compatible).toBe(true);

    const bad = await request(app).get('/api/builds/compatibility').query({ productId: cpuId, slotType: 'GPU' });
    expect(bad.body.data.compatible).toBe(false);
  });

  it('POST /api/builds — crea build con componentes válidos', async () => {
    const cpus = await request(app).get('/api/builds/slot-products').query({ slotType: 'CPU' });
    const mbs = await request(app).get('/api/builds/slot-products').query({ slotType: 'MOTHERBOARD' });
    const rams = await request(app).get('/api/builds/slot-products').query({ slotType: 'RAM' });

    const res = await request(app)
      .post('/api/builds')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'PC Test',
        components: [
          { productId: cpus.body.data[0].id, slotType: 'CPU' },
          { productId: mbs.body.data[0].id, slotType: 'MOTHERBOARD' },
          { productId: rams.body.data[0].id, slotType: 'RAM' },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.components.length).toBe(3);
    expect(Number(res.body.data.totalPrice)).toBeGreaterThan(0);
  });

  it('POST /api/builds — rechaza componente en slot incorrecto', async () => {
    const cpus = await request(app).get('/api/builds/slot-products').query({ slotType: 'CPU' });
    const res = await request(app)
      .post('/api/builds')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'PC Invalida',
        components: [{ productId: cpus.body.data[0].id, slotType: 'GPU' }],
      });
    expect(res.status).toBe(400);
  });

  it('GET /api/builds — lista builds del usuario', async () => {
    const res = await request(app).get('/api/builds').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('DELETE /api/builds/:id — elimina build', async () => {
    const cpus = await request(app).get('/api/builds/slot-products').query({ slotType: 'CPU' });
    const created = await request(app)
      .post('/api/builds')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'PC a eliminar', components: [{ productId: cpus.body.data[0].id, slotType: 'CPU' }] });
    const buildId = created.body.data.id;

    const res = await request(app).delete(`/api/builds/${buildId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe('Reviews & Wishlist API (integración)', () => {
  it('POST /api/products/:id/reviews — requiere auth', async () => {
    const products = await request(app).get('/api/products').query({ limit: 1 });
    const id = products.body.data[0].id;
    const res = await request(app).post(`/api/products/${id}/reviews`).send({ rating: 5 });
    expect(res.status).toBe(401);
  });

  it('POST reviews — sin compra previa → 403 (solo post-venta)', async () => {
    const token = await loginBuyer();
    const products = await request(app).get('/api/products').query({ limit: 1 });
    const product = products.body.data[0];
    const res = await request(app)
      .post(`/api/products/${product.id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 4, comment: 'Muy buen producto' });
    expect(res.status).toBe(403);
  });

  it('POST + GET reviews de producto — tras compra entregada', async () => {
    // 1) Registro y compra completa
    const reg = await registerUser();
    const email = reg.body.data.email;
    const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    const token = login.body.data.accessToken;

    const products = await request(app).get('/api/products').query({ limit: 100 });
    const withStock = products.body.data.filter((p: any) => p.stock >= 1);
    const p = withStock[0];

    const addr = await request(app)
      .post('/api/account/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({ street: 'Av. Libertador', number: '1500', city: 'Buenos Aires', state: 'CABA', postalCode: '1000', isDefault: true });
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${token}`).send({ productId: p.id, quantity: 1 });
    const orders = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({ shippingAddressId: addr.body.data.id });
    const order = orders.body.data.find((o: any) => o.items?.some((i: any) => i.productId === p.id)) || orders.body.data[0];

    // 2) Marcar la orden como entregada y pago verificado (setup directo con Prisma)
    const { prisma } = await import('../src/config/database');
    await prisma.order.update({ where: { id: order.id }, data: { status: 'DELIVERED', paymentStatus: 'VERIFIED' } });

    // 3) Ahora sí puede reseñar
    const res = await request(app)
      .post(`/api/products/${p.id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 4, comment: 'Muy buen producto' });
    expect(res.status).toBe(201);

    const list = await request(app).get(`/api/products/${p.id}/reviews`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThan(0);
  });

  it('wishlist — agregar, listar, eliminar', async () => {
    const token = await loginBuyer();
    const products = await request(app).get('/api/products').query({ limit: 1 });
    const productId = products.body.data[0].id;
    const auth = { Authorization: `Bearer ${token}` };

    const add = await request(app).post(`/api/wishlist/${productId}`).set(auth);
    expect(add.status).toBe(201);

    const list = await request(app).get('/api/wishlist').set(auth);
    expect(list.body.data.length).toBe(1);

    const del = await request(app).delete(`/api/wishlist/${productId}`).set(auth);
    expect(del.status).toBe(200);

    const list2 = await request(app).get('/api/wishlist').set(auth);
    expect(list2.body.data.length).toBe(0);
  });
});
