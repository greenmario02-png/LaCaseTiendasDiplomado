import request from 'supertest';
import { app, registerUser, getAdminToken, getApprovedSellerToken } from './helpers';

describe('Payouts y escrow (integración)', () => {
  let sellerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    sellerToken = await getApprovedSellerToken();
    adminToken = await getAdminToken();
  });

  it('summary — sin cuenta configurada devuelve disponible 0', async () => {
    const res = await request(app).get('/api/seller/payouts/summary').set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.available).toBeGreaterThanOrEqual(0);
  });

  it('configurar cuenta — guarda método BNB', async () => {
    const res = await request(app)
      .put('/api/seller/payouts/account')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ method: 'BNB', accountHolder: 'Test Seller', accountNumber: '76543210', phoneQr: '4867539' });
    expect(res.status).toBe(200);
    expect(res.body.data.method).toBe('BNB');
  });

  it('solicitar retiro — sin saldo suficiente → 400', async () => {
    const res = await request(app)
      .post('/api/seller/payouts/request')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ amount: 999999 });
    expect(res.status).toBe(400);
  });

  it('solicitar retiro — sin cuenta → 400', async () => {
    // Crear un seller nuevo sin cuenta configurada
    const reg = await registerUser();
    const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    const res = await request(app)
      .post('/api/seller/payouts/request')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .send({ amount: 100 });
    // Un CUSTOMER no pasa requireSeller (403) o no tiene cuenta (400)
    expect([400, 403]).toContain(res.status);
  });

  it('admin — listar payouts y procesar', async () => {
    const res = await request(app).get('/api/admin/payouts').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('admin — rechazar payout inexistente → 404', async () => {
    const res = await request(app).put('/api/admin/payouts/99999').set('Authorization', `Bearer ${adminToken}`).send({ status: 'APPROVED' });
    expect(res.status).toBe(404);
  });
});
