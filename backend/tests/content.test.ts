import request from 'supertest';
import { app, getSessionId } from './helpers';

describe('Content API (integración)', () => {
  it('GET /api/banners — lista activos', async () => {
    const res = await request(app).get('/api/banners');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/promotions — lista activas', async () => {
    const res = await request(app).get('/api/promotions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/faqs — lista ordenada', async () => {
    const res = await request(app).get('/api/faqs');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/warranties — garantías', async () => {
    const res = await request(app).get('/api/warranties');
    expect(res.status).toBe(200);
  });

  it('GET /api/reaches — alcances', async () => {
    const res = await request(app).get('/api/reaches');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/health — health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/ruta-inexistente — 404 JSON', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('cart guest — requiere X-Session-Id', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(400);
  });

  it('cart guest — funciona con session id', async () => {
    const res = await request(app).get('/api/cart').set('X-Session-Id', getSessionId());
    expect(res.status).toBe(200);
    expect(res.body.data.subtotal).toBe(0);
  });
});
