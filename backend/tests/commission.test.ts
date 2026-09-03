import request from 'supertest';
import { app, getAdminToken, registerUser } from './helpers';
import { calculateCommission, sellerNet } from '../src/services/commission.service';

describe('Unit — Commission', () => {
  const config = { enabled: true, percentage: 5, minimum: 2, fixed: 0, onShipping: false };

  it('5% sobre subtotal', () => {
    expect(calculateCommission(1000, 0, config)).toBe(50);
  });

  it('respeta el mínimo', () => {
    expect(calculateCommission(10, 0, config)).toBe(2);
  });

  it('comisión deshabilitada → 0', () => {
    expect(calculateCommission(1000, 0, { ...config, enabled: false })).toBe(0);
  });

  it('monto fijo cuando fixed > 0', () => {
    expect(calculateCommission(1000, 0, { ...config, fixed: 150 })).toBe(150);
  });

  it('onShipping incluye el envío en la base', () => {
    expect(calculateCommission(1000, 500, { ...config, onShipping: true })).toBe(75);
  });

  it('onShipping false excluye el envío', () => {
    expect(calculateCommission(1000, 500, { ...config, onShipping: false })).toBe(50);
  });

  it('sellerNet = subtotal + envío - comisión', () => {
    expect(sellerNet(1000, 100, 55)).toBe(1045);
  });

  it('redondea a 2 decimales', () => {
    const c = calculateCommission(333.33, 0, config);
    expect(c).toBeCloseTo(16.67, 2);
  });
});

describe('Commission & Reports API (integración)', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  it('GET /api/admin/commission — requiere admin', async () => {
    const res = await request(app).get('/api/admin/commission');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/commission — devuelve configuración', async () => {
    const res = await request(app).get('/api/admin/commission').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.data.enabled).toBe('boolean');
    expect(typeof res.body.data.percentage).toBe('number');
  });

  it('PUT /api/admin/commission — actualiza configuración', async () => {
    const res = await request(app)
      .put('/api/admin/commission')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: true, percentage: 7, minimum: 3, fixed: 0, onShipping: false });
    expect(res.status).toBe(200);
  });

  it('GET /api/admin/reports/sales — devuelve resumen y por día', async () => {
    const res = await request(app)
      .get('/api/admin/reports/sales')
      .query({ from: '2026-01-01', to: '2026-12-31' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBeDefined();
    expect(typeof res.body.data.summary.sales).toBe('number');
    expect(Array.isArray(res.body.data.byDay)).toBe(true);
  });

  it('GET /api/admin/reports/commissions — resumen de comisiones', async () => {
    const res = await request(app)
      .get('/api/admin/reports/commissions')
      .query({ from: '2026-01-01', to: '2026-12-31' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.data.totalCommission).toBe('number');
    expect(typeof res.body.data.totalNet).toBe('number');
  });

  it('GET /api/admin/reports/sellers — ventas por tienda', async () => {
    const res = await request(app)
      .get('/api/admin/reports/sellers')
      .query({ from: '2026-01-01', to: '2026-12-31' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.sellers)).toBe(true);
    if (res.body.data.sellers.length > 0) {
      expect(res.body.data.sellers[0].storeName).toBeDefined();
    }
  });

  it('GET /api/admin/reports/categories — ventas por categoría', async () => {
    const res = await request(app)
      .get('/api/admin/reports/categories')
      .query({ from: '2026-01-01', to: '2026-12-31' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.categories)).toBe(true);
  });

  it('reportes — cliente no puede acceder (403)', async () => {
    const reg = await registerUser();
    const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    const res = await request(app).get('/api/admin/reports/sales').set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(res.status).toBe(403);
  });
});
