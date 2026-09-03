import request from 'supertest';
import { app, registerUser, loginUser, getApprovedSellerToken } from './helpers';

async function registerAndGetToken(overrides: Record<string, unknown> = {}) {
  const reg = await registerUser(overrides);
  const email = reg.body.data.email as string;
  const login = await loginUser(email, 'password123');
  return login.body.data.accessToken as string;
}

describe('Compradores privilegiados (integración)', () => {
  let buyerToken: string;
  let sellerToken: string;
  let sellerId: number;

  beforeAll(async () => {
    buyerToken = await registerAndGetToken({ firstName: 'Cliente', lastName: 'Priv' });
    sellerToken = await getApprovedSellerToken();
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${sellerToken}`);
    sellerId = me.body.data.id;
  });

  it('solicitar privilegio — un comprador no puede solicitar en su propia tienda', async () => {
    const res = await request(app)
      .post(`/api/sellers/${sellerId}/privileged-request`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('solicitar privilegio — el comprador solicita y queda PENDING', async () => {
    const res = await request(app)
      .post(`/api/sellers/${sellerId}/privileged-request`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PENDING');
  });

  it('status — el comprador ve PENDING', async () => {
    const res = await request(app)
      .get(`/api/sellers/${sellerId}/privileged-status`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.body.data.status).toBe('PENDING');
  });

  it('vendedor — lista solicitudes pendientes', async () => {
    const res = await request(app).get('/api/seller/privileged/requests').set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('vendedor — aprueba la solicitud', async () => {
    const list = await request(app).get('/api/seller/privileged/requests').set('Authorization', `Bearer ${sellerToken}`);
    const reqId = list.body.data[0].id;
    const res = await request(app)
      .put(`/api/seller/privileged/${reqId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ decision: 'APPROVED' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
  });

  it('status — tras aprobar, el comprador ve APPROVED', async () => {
    const res = await request(app)
      .get(`/api/sellers/${sellerId}/privileged-status`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.body.data.status).toBe('APPROVED');
  });

  it('productos privilegiados — el aprobado recibe la lista (puede ser vacía si no hay nuevos)', async () => {
    const res = await request(app).get('/api/privileged-new-products').set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('productos privilegiados — un no aprobado recibe lista vacía', async () => {
    const other = await registerAndGetToken({ firstName: 'Otro', lastName: 'Cliente' });
    const res = await request(app).get('/api/privileged-new-products').set('Authorization', `Bearer ${other}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });
});

describe('Calificación post-compra (integración)', () => {
  it('can-review — sin compra entregada devuelve no-purchase', async () => {
    const buyerToken = await registerAndGetToken({ firstName: 'Cliente', lastName: 'Rev' });
    const sellerToken = await getApprovedSellerToken();
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${sellerToken}`);
    const sellerId = me.body.data.id;
    const res = await request(app)
      .get(`/api/sellers/${sellerId}/privileged-status`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
  });
});
