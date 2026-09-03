import request from 'supertest';
import { app, registerUser, registerSeller, loginUser, createOrderForTest } from './helpers';
import { prisma } from '../src/config/database';

describe('Devoluciones (returns) — E2E', () => {
  let buyerToken: string;
  let sellerToken: string;
  let orderItemId: number;
  let returnId: number;

  beforeAll(async () => {
    const buyer = await registerUser({ role: 'CUSTOMER' });
    const buyerId = buyer.body.data.id;
    const buyerLogin = await loginUser(buyer.body.data.email, 'password123');
    buyerToken = buyerLogin.body.data.accessToken;

    const seller = await registerSeller();
    const sellerEmail = seller.body.data.email;
    const sellerLogin = await loginUser(sellerEmail, 'password123');
    sellerToken = sellerLogin.body.data.accessToken;
    const sellerId = sellerLogin.body.data.user.id;
    await prisma.user.update({ where: { id: sellerId }, data: { isApproved: true } });

    const { orderItemId: oid } = await createOrderForTest({ id: buyerId }, { id: sellerId }, buyerToken);
    orderItemId = oid;
  });

  it('crear devolución — sin motivo válido → 400', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ orderItemId, reason: 'MOTIVO_INVENTADO' });
    expect(res.status).toBe(400);
  });

  it('crear devolución — item de otra persona → 404', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ orderItemId: 999999, reason: 'PRODUCTO_DEFECTUOSO' });
    expect(res.status).toBe(404);
  });

  it('crear devolución válida → 201 y estado PENDING', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ orderItemId, reason: 'PRODUCTO_DEFECTUOSO', details: 'Llegó roto' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    returnId = res.body.data.id;
  });

  it('crear duplicada activa → 400', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ orderItemId, reason: 'OTRO' });
    expect(res.status).toBe(400);
  });

  it('listar mis devoluciones → incluye la creada', async () => {
    const res = await request(app).get('/api/returns/mine').set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('vendedor ve la solicitud', async () => {
    const res = await request(app).get('/api/returns/seller').set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('vendedor aprueba con reembolso → APPROVED', async () => {
    const res = await request(app)
      .post(`/api/returns/${returnId}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ decision: 'APPROVED', refundAmount: 100 });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
  });

  it('comprador cancela una devolución ya respondida → 404', async () => {
    const res = await request(app).post(`/api/returns/${returnId}/cancel`).set('Authorization', `Bearer ${buyerToken}`);
    expect([400, 404]).toContain(res.status);
  });

  it('admin lista devoluciones', async () => {
    const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@pctienda.com', password: 'admin123' });
    const adminToken = adminRes.body.data.accessToken;
    const res = await request(app).get('/api/returns/admin').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('admin resuelve a COMPLETED', async () => {
    const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@pctienda.com', password: 'admin123' });
    const adminToken = adminRes.body.data.accessToken;
    const res = await request(app)
      .put(`/api/returns/admin/${returnId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'COMPLETED', refundAmount: 100, adminNote: 'Procesado' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('COMPLETED');
  });

  it('responder devolución ya respondida → 400', async () => {
    const res = await request(app)
      .post(`/api/returns/${returnId}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ decision: 'REJECTED' });
    expect(res.status).toBe(400);
  });
});
