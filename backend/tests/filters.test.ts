import request from 'supertest';
import { app, getSessionId, registerUser } from './helpers';

describe('Filtros avanzados de productos (integración)', () => {
  it('GET /api/products?deliveryType=DELIVERY — filtra por entrega', async () => {
    const res = await request(app).get('/api/products').query({ deliveryType: 'DELIVERY', limit: 10 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) {
      expect(p.deliveryTypes).toContain('DELIVERY');
    }
  });

  it('GET /api/products?deliveryType=PERMUTA — filtra por permuta', async () => {
    const res = await request(app).get('/api/products').query({ deliveryType: 'PERMUTA', limit: 10 });
    expect(res.status).toBe(200);
  });

  it('GET /api/products?acceptsTrade=true — filtra por acepta permuta', async () => {
    const res = await request(app).get('/api/products').query({ acceptsTrade: 'true', limit: 10 });
    expect(res.status).toBe(200);
    for (const p of res.body.data) {
      expect(p.acceptsTrade).toBe(true);
    }
  });

  it('GET /api/products?brand=Samsung — filtra por marca', async () => {
    const res = await request(app).get('/api/products').query({ brand: 'Samsung', limit: 10 });
    expect(res.status).toBe(200);
    for (const p of res.body.data) {
      expect(p.brand?.toLowerCase()).toContain('samsung');
    }
  });

  it('GET /api/products?state=La Paz — filtra por departamento', async () => {
    const res = await request(app).get('/api/products').query({ state: 'La Paz', limit: 10 });
    expect(res.status).toBe(200);
  });

  it('GET /api/products?categoryIds=1,2 — filtra por múltiples categorías', async () => {
    const res = await request(app).get('/api/products').query({ categoryIds: '1,2', limit: 10 });
    expect(res.status).toBe(200);
  });

  it('GET /api/products — deliveryType inválido → 400', async () => {
    const res = await request(app).get('/api/products').query({ deliveryType: 'BOGUS' });
    expect(res.status).toBe(400);
  });

  it('GET /api/brands — lista marcas únicas', async () => {
    const res = await request(app).get('/api/brands');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/delivery-types — lista tipos de entrega', async () => {
    const res = await request(app).get('/api/delivery-types');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(5);
  });

  it('GET /api/sellers/search?q= — busca vendedores', async () => {
    const res = await request(app).get('/api/sellers/search').query({ q: 'Group' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('Tracking API (integración)', () => {
  const sessionId = getSessionId('track');

  it('POST /api/tracking/search — registra búsqueda', async () => {
    const res = await request(app)
      .post('/api/tracking/search')
      .set('X-Session-Id', sessionId)
      .send({ term: 'RTX 4090' });
    expect(res.status).toBe(201);
    expect(res.body.data.recorded).toBe(true);
  });

  it('POST /api/tracking/search — term vacío → 400', async () => {
    const res = await request(app)
      .post('/api/tracking/search')
      .set('X-Session-Id', sessionId)
      .send({ term: '  ' });
    expect(res.status).toBe(400);
  });

  it('POST /api/tracking/products/:id/view — registra vista', async () => {
    const products = await request(app).get('/api/products').query({ limit: 1 });
    const productId = products.body.data[0].id;
    const res = await request(app)
      .post(`/api/tracking/products/${productId}/view`)
      .set('X-Session-Id', sessionId);
    expect(res.status).toBe(201);
  });

  it('POST /api/tracking/products/:id/view — producto inexistente → 404', async () => {
    const res = await request(app).post('/api/tracking/products/999999/view').set('X-Session-Id', sessionId);
    expect(res.status).toBe(404);
  });

  it('GET /api/tracking/me/recent-views — devuelve productos vistos', async () => {
    const res = await request(app).get('/api/tracking/me/recent-views').set('X-Session-Id', sessionId);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/tracking/me/recommended — devuelve recomendaciones', async () => {
    const res = await request(app).get('/api/tracking/me/recommended').set('X-Session-Id', sessionId);
    expect(res.status).toBe(200);
    expect(res.body.data.recommendations).toBeDefined();
  });

  it('GET /api/tracking/me/search-history — devuelve historial', async () => {
    const res = await request(app).get('/api/tracking/me/search-history').set('X-Session-Id', sessionId);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
