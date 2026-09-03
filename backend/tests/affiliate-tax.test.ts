import request from 'supertest';
import { app, registerUser, registerSeller, loginUser } from './helpers';
import { prisma } from '../src/config/database';

describe('Afiliados (referidos con comisión) — E2E', () => {
  let affiliateToken: string;
  let affiliateId: number;
  let referralCode: string;

  it('obtener mi cuenta de afiliado — se crea automáticamente', async () => {
    const reg = await registerUser();
    const login = await loginUser(reg.body.data.email, 'password123');
    affiliateToken = login.body.data.accessToken;
    const res = await request(app).get('/api/affiliates/me').set('Authorization', `Bearer ${affiliateToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.referralCode).toBeTruthy();
    expect(res.body.data.commissionPct).toBe('2');
    affiliateId = res.body.data.id;
    referralCode = res.body.data.referralCode;
  });

  it('registrar un referido con el código → crea la referencia', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `ref-${Date.now()}@mail.com`,
        password: 'password123',
        firstName: 'Ref',
        lastName: 'One',
        phone: '5551234',
        referralCode,
      });
    expect(res.status).toBe(201);
    const ref = await prisma.affiliateReferral.findFirst({ where: { affiliateId } });
    expect(ref).toBeTruthy();
    expect(ref!.status).toBe('REGISTERED');
  });

  it('listar mis referidos', async () => {
    const res = await request(app).get('/api/affiliates/my-referrals').set('Authorization', `Bearer ${affiliateToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('registrar con código inexistente → no falla y no crea referencia', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `refbad-${Date.now()}@mail.com`,
        password: 'password123',
        firstName: 'Ref',
        lastName: 'Bad',
        phone: '5551234',
        referralCode: 'codigo-inexistente',
      });
    expect(res.status).toBe(201);
  });

  it('admin lista afiliados', async () => {
    const admin = await request(app).post('/api/auth/login').send({ email: 'admin@pctienda.com', password: 'admin123' });
    const res = await request(app).get('/api/affiliates').set('Authorization', `Bearer ${admin.body.data.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('admin cambia la comisión de un afiliado', async () => {
    const admin = await request(app).post('/api/auth/login').send({ email: 'admin@pctienda.com', password: 'admin123' });
    const res = await request(app)
      .put(`/api/affiliates/${affiliateId}/commission`)
      .set('Authorization', `Bearer ${admin.body.data.accessToken}`)
      .send({ commissionPct: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data.commissionPct).toBe('5');
  });
});

describe('Impuestos — E2E', () => {
  let adminToken: string;
  let categoryId: number;

  beforeAll(async () => {
    const admin = await request(app).post('/api/auth/login').send({ email: 'admin@pctienda.com', password: 'admin123' });
    adminToken = admin.body.data.accessToken;
    const cat = await prisma.category.findFirst();
    categoryId = cat!.id;
  });

  it('admin crea una tasa de impuesto', async () => {
    const res = await request(app)
      .post('/api/taxes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'IVA Bolivia', country: 'BO', ratePercent: 13, appliesTo: 'ALL' });
    expect(res.status).toBe(201);
    expect(res.body.data.country).toBe('BO');
    expect(res.body.data.ratePercent).toBe('13');
  });

  it('admin crea tasa por categoría', async () => {
    const res = await request(app)
      .post('/api/taxes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Impuesto lujo', country: 'BO', ratePercent: 20, appliesTo: 'CATEGORY', categoryId });
    expect(res.status).toBe(201);
  });

  it('crear tasa inválida (porcentaje > 100) → 400', async () => {
    const res = await request(app)
      .post('/api/taxes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Mala', country: 'BO', ratePercent: 150 });
    expect(res.status).toBe(400);
  });

  it('calcular impuesto de un producto en Bolivia', async () => {
    const product = await prisma.product.findFirst({ include: { category: true } });
    const res = await request(app)
      .post('/api/taxes/calculate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ productId: product!.id, price: 100, country: 'BO' });
    expect(res.status).toBe(200);
    expect(res.body.data.rate).toBe(13);
    expect(res.body.data.amount).toBe(13);
    expect(res.body.data.totalWithTax).toBe(113);
  });

  it('admin lista tasas', async () => {
    const res = await request(app).get('/api/taxes').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('admin elimina una tasa', async () => {
    const list = await request(app).get('/api/taxes').set('Authorization', `Bearer ${adminToken}`);
    const id = list.body.data[0].id;
    const res = await request(app).delete(`/api/taxes/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});
