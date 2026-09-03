import request from 'supertest';
import { app, registerUser, registerSeller, loginUser, createOrderForTest } from './helpers';
import { prisma } from '../src/config/database';

describe('Audit trail de productos — E2E', () => {
  let sellerToken: string;
  let sellerId: number;
  let productId: number;
  let buyerToken: string;
  let buyerId: number;

  beforeAll(async () => {
    const seller = await registerSeller();
    const sellerLogin = await loginUser(seller.body.data.email, 'password123');
    sellerToken = sellerLogin.body.data.accessToken;
    sellerId = sellerLogin.body.data.user.id;
    await prisma.user.update({ where: { id: sellerId }, data: { isApproved: true } });

    const buyer = await registerUser();
    buyerToken = buyer.body.data.accessToken;
    buyerId = buyer.body.data.id;
  });

  it('crear producto → registra audit CREATED', async () => {
    const cat = await prisma.category.findFirst();
    const res = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Producto Audit',
        description: 'Producto para test de auditoría',
        price: 100,
        stock: 5,
        categoryId: cat!.id,
        condition: 'NEW',
      });
    expect(res.status).toBe(201);
    productId = res.body.data.id;

    const audit = await prisma.productAudit.findFirst({ where: { productId } });
    expect(audit).toBeTruthy();
    expect(audit!.action).toBe('CREATED');
    expect(audit!.actorId).toBe(sellerId);
  });

  it('editar producto → registra audit UPDATED', async () => {
    await request(app)
      .put(`/api/seller/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ price: 120 });
    const audit = await prisma.productAudit.findFirst({ where: { productId, action: 'UPDATED' } });
    expect(audit).toBeTruthy();
  });

  it('moderar producto (admin) → registra audit MODERATED', async () => {
    const admin = await request(app).post('/api/auth/login').send({ email: 'admin@pctienda.com', password: 'admin123' });
    const res = await request(app)
      .put(`/api/admin/products/${productId}/moderate`)
      .set('Authorization', `Bearer ${admin.body.data.accessToken}`)
      .send({ approve: true });
    expect(res.status).toBe(200);
    const audit = await prisma.productAudit.findFirst({ where: { productId, action: 'MODERATED' } });
    expect(audit).toBeTruthy();
    expect(audit!.note).toContain('aprobado');
  });

  it('listar historial del producto → incluye las acciones', async () => {
    const res = await request(app).get(`/api/audits/product/${productId}`).set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
    const actions = res.body.data.map((a: any) => a.action);
    expect(actions).toContain('CREATED');
    expect(actions).toContain('UPDATED');
    expect(actions).toContain('MODERATED');
  });

  it('un tercero NO puede ver el historial → 403', async () => {
    const other = await registerUser();
    const otherLogin = await loginUser(other.body.data.email, 'password123');
    const res = await request(app).get(`/api/audits/product/${productId}`).set('Authorization', `Bearer ${otherLogin.body.data.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('soft delete → registra audit DELETED', async () => {
    await request(app).delete(`/api/seller/products/${productId}`).set('Authorization', `Bearer ${sellerToken}`);
    const audit = await prisma.productAudit.findFirst({ where: { productId, action: 'DELETED' } });
    expect(audit).toBeTruthy();
  });
});

describe('Confirmación de entrega (escrow release) — E2E', () => {
  let buyerToken: string;
  let sellerToken: string;
  let orderId: number;

  beforeAll(async () => {
    const buyer = await registerUser();
    const buyerLogin = await loginUser(buyer.body.data.email, 'password123');
    buyerToken = buyerLogin.body.data.accessToken;
    const buyerId = buyerLogin.body.data.user.id;

    const seller = await registerSeller();
    const sellerLogin = await loginUser(seller.body.data.email, 'password123');
    sellerToken = sellerLogin.body.data.accessToken;
    const sellerId = sellerLogin.body.data.user.id;
    await prisma.user.update({ where: { id: sellerId }, data: { isApproved: true } });

    const res = await createOrderForTest({ id: buyerId }, { id: sellerId }, buyerToken);
    orderId = res.orderId;
  });

  it('el vendedor NO puede confirmar la entrega (solo el comprador) → 404', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/confirm-delivery`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(404);
  });

  it('el comprador confirma la entrega → CONFIRMED', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/confirm-delivery`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONFIRMED');
  });

  it('confirmar de nuevo → 400', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/confirm-delivery`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(400);
  });
});
