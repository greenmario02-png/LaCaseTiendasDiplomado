import request from 'supertest';
import { app, registerUser, registerSeller, getAdminToken, getApprovedSellerToken } from './helpers';

describe('Admin API (integración)', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  it('endpoints admin — rechazan sin token (401)', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
  });

  it('endpoints admin — rechazan a cliente (403)', async () => {
    const reg = await registerUser();
    const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/admin/dashboard — KPIs', async () => {
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.kpis.totalProducts).toBeGreaterThan(0);
    expect(res.body.data.kpis.totalSellers).toBeGreaterThan(0);
    expect(res.body.data.kpis.totalUsers).toBeGreaterThan(0);
    expect(Number(res.body.data.kpis.totalRevenue)).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/admin/users — lista usuarios', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/admin/users?role=SELLER — filtra por rol', async () => {
    const res = await request(app).get('/api/admin/users').query({ role: 'SELLER' }).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    for (const u of res.body.data) {
      expect(u.role).toBe('SELLER');
    }
  });

  it('PUT /api/admin/users/:id — cambia estado de usuario', async () => {
    const reg = await registerUser();
    const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    const userId = login.body.data.user.id;

    const res = await request(app)
      .put(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('GET /api/admin/orders — lista órdenes', async () => {
    const res = await request(app).get('/api/admin/orders').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/admin/categories — lista categorías admin', async () => {
    const res = await request(app).get('/api/admin/categories').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('POST /api/admin/categories — crea categoría', async () => {
    const res = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Categoría Test ${Date.now()}` });
    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBeDefined();
  });

  it('POST /api/admin/banners — crea banner', async () => {
    const res = await request(app)
      .post('/api/admin/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Banner Test',
        imageDesktop: 'https://img.example.com/banner.jpg',
        startDate: '2026-08-01T00:00:00Z',
        endDate: '2026-09-01T00:00:00Z',
      });
    expect(res.status).toBe(201);
  });

  it('POST /api/admin/tags — crea tag', async () => {
    const res = await request(app)
      .post('/api/admin/tags')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Tag ${Date.now()}` });
    expect(res.status).toBe(201);
  });

  it('POST /api/admin/promotions — crea promoción', async () => {
    const res = await request(app)
      .post('/api/admin/promotions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Promo Test',
        discountType: 'PERCENTAGE',
        discountValue: 15,
        startDate: '2026-08-01T00:00:00Z',
        endDate: '2026-09-01T00:00:00Z',
      });
    expect(res.status).toBe(201);
  });
  it('POST /api/admin/users — crea usuario con rol USER normalizado a CUSTOMER', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `mapuser.${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'Mapa',
        lastName: 'Rol',
        role: 'USER',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('CUSTOMER');
  });

  it('POST /api/admin/users — crea vendedor con isApproved true', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `mapseller.${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'Mapa',
        lastName: 'Seller',
        role: 'SELLER',
        storeName: 'Tienda de Test',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('SELLER');
    expect(res.body.data.isApproved).toBe(true);
  });
});

describe('Seller workflow — E2E (onboarding + moderación)', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  it('seller pendiente no puede publicar (403)', async () => {
    const reg = await registerSeller();
    const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    const res = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .send({ name: 'Producto Sin Aprobar', categoryId: 1, price: 100, stock: 1, sku: 'X1' });
    expect(res.status).toBe(403);
  });

  it('admin aprueba seller → puede publicar → admin modera producto', async () => {
    // 1. Registrar seller
    const reg = await registerSeller();
    const email = reg.body.data.email;
    const sellerId = reg.body.data.id;

    // 2. Admin lo aprueba
    const approve = await request(app)
      .put(`/api/admin/users/${sellerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isApproved: true });
    expect(approve.status).toBe(200);
    expect(approve.body.data.isApproved).toBe(true);

    // 3. Seller publica producto (queda pendiente de moderación)
    const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    const sellerToken = login.body.data.accessToken;

    const categories = await request(app).get('/api/products/categories');
    const hardware = categories.body.data.find((c: any) => c.name === 'Hardware');
    const childId = hardware.children[0].id;

    const createRes = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: `Producto a Moderar ${Date.now()}`,
        categoryId: childId,
        description: 'Descripción válida de producto de prueba',
        price: 250000,
        stock: 5,
        sku: `MOD-${Date.now()}`,
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.isApproved).toBe(false);

    // 4. Producto NO visible en catálogo público
    const search = await request(app).get('/api/products').query({ search: createRes.body.data.name });
    expect(search.body.meta.total).toBe(0);

    // 5. Admin ve pendientes y lo aprueba
    const pending = await request(app).get('/api/admin/products/pending').set('Authorization', `Bearer ${adminToken}`);
    const found = pending.body.data.find((p: any) => p.id === createRes.body.data.id);
    expect(found).toBeDefined();

    const moderate = await request(app)
      .put(`/api/admin/products/${createRes.body.data.id}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approve: true });
    expect(moderate.status).toBe(200);
    expect(moderate.body.data.isApproved).toBe(true);

    // 6. Producto visible en catálogo
    const search2 = await request(app).get('/api/products').query({ search: createRes.body.data.name });
    expect(search2.body.meta.total).toBe(1);
  });
});

describe('Seller panel API (integración)', () => {
  it('seller aprobado — CRUD productos y dashboard', async () => {
    const sellerToken = await getApprovedSellerToken();

    // Crear producto
    const categories = await request(app).get('/api/products/categories');
    const hardware = categories.body.data.find((c: any) => c.name === 'Hardware');
    const childId = hardware.children[0].id;

    const created = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: `Producto Seller ${Date.now()}`,
        categoryId: childId,
        description: 'Descripción de producto del vendedor',
        price: 120000,
        stock: 3,
        sku: `SEL-${Date.now()}`,
      });
    expect(created.status).toBe(201);
    const productId = created.body.data.id;

    // Listar
    const list = await request(app).get('/api/seller/products').set('Authorization', `Bearer ${sellerToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThan(0);

    // Actualizar
    const updated = await request(app)
      .put(`/api/seller/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ price: 135000 });
    expect(updated.status).toBe(200);
    expect(Number(updated.body.data.price)).toBe(135000);

    // Eliminar (soft)
    const deleted = await request(app).delete(`/api/seller/products/${productId}`).set('Authorization', `Bearer ${sellerToken}`);
    expect(deleted.status).toBe(200);

    // Dashboard
    const dash = await request(app).get('/api/seller/dashboard').set('Authorization', `Bearer ${sellerToken}`);
    expect(dash.status).toBe(200);
    expect(dash.body.data.totalProducts).toBeGreaterThanOrEqual(0);
  });
});
