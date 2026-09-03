import request from 'supertest';
import { app, registerUser, getAdminToken, getApprovedSellerToken } from './helpers';

describe('Admin Stats & Detail API (integración)', () => {
  let adminToken: string;
  let sellerToken: string;

  beforeAll(async () => {
    adminToken = await getAdminToken();
    sellerToken = await getApprovedSellerToken();
  });

  it('GET /api/admin/stats — requiere admin', async () => {
    const reg = await registerUser();
    const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/admin/stats — devuelve analytics completos', async () => {
    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.salesByDay).toBeDefined();
    expect(res.body.data.salesByDay.length).toBe(30);
    expect(Array.isArray(res.body.data.topProducts)).toBe(true);
    expect(Array.isArray(res.body.data.topSellers)).toBe(true);
    expect(Array.isArray(res.body.data.salesByCategory)).toBe(true);
    expect(Array.isArray(res.body.data.ordersByStatus)).toBe(true);
    expect(Array.isArray(res.body.data.usersByRole)).toBe(true);
    expect(res.body.data.auctions).toBeDefined();
    expect(typeof res.body.data.weekGrowth).toBe('number');
  });

  it('GET /api/admin/stats — topSellers tiene ingresos y pedidos', async () => {
    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${adminToken}`);
    if (res.body.data.topSellers.length > 0) {
      expect(res.body.data.topSellers[0].storeName).toBeDefined();
      expect(res.body.data.topSellers[0].revenue).toBeDefined();
      expect(res.body.data.topSellers[0].orders).toBeDefined();
    }
  });

  it('GET /api/admin/sellers/:id — detalle de tienda', async () => {
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${sellerToken}`);
    const sellerId = me.body.data.id;

    const res = await request(app).get(`/api/admin/sellers/${sellerId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.seller.storeName).toBeDefined();
    expect(res.body.data.metrics).toBeDefined();
    expect(typeof res.body.data.metrics.productCount).toBe('number');
    expect(Array.isArray(res.body.data.recentOrders)).toBe(true);
    expect(Array.isArray(res.body.data.reviews)).toBe(true);
  });

  it('GET /api/admin/sellers/:id — inexistente → 404', async () => {
    const res = await request(app).get('/api/admin/sellers/999999').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('POST /api/admin/users — crea usuario admin', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: `creado.admin.${Date.now()}@mail.com`, password: 'password123', firstName: 'Creado', lastName: 'PorAdmin', role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('ADMIN');
  });

  it('POST /api/admin/users — email duplicado → 409', async () => {
    const reg = await registerUser();
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: reg.body.data.email, password: 'password123', firstName: 'X', lastName: 'Y' });
    expect(res.status).toBe(409);
  });

  it('POST /api/admin/users — campos faltantes → 400', async () => {
    const res = await request(app).post('/api/admin/users').set('Authorization', `Bearer ${adminToken}`).send({ email: 'x@mail.com' });
    expect(res.status).toBe(400);
  });

  it('GET /api/admin/users/:id — detalle de usuario con pedidos', async () => {
    const reg = await registerUser();
    const res = await request(app).get(`/api/admin/users/${reg.body.data.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(reg.body.data.email);
    expect(Array.isArray(res.body.data.orders)).toBe(true);
    expect(Array.isArray(res.body.data.addresses)).toBe(true);
    expect(typeof res.body.data.totalSpent).toBe('number');
  });

  it('GET /api/admin/users/:id — inexistente → 404', async () => {
    const res = await request(app).get('/api/admin/users/999999').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/admin/users/:id — requiere admin', async () => {
    const res = await request(app).get('/api/admin/users/1');
    expect(res.status).toBe(401);
  });
});
