import request from 'supertest';
import { app } from './helpers';

describe('Products API (integración)', () => {
  it('GET /api/products — lista paginada', async () => {
    const res = await request(app).get('/api/products').query({ limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBe(5);
    expect(res.body.meta.total).toBeGreaterThan(0);
    expect(res.body.meta.page).toBe(1);
  });

  it('GET /api/products — valida limit máximo', async () => {
    const res = await request(app).get('/api/products').query({ limit: 9999 });
    expect(res.status).toBe(400); // Zod limita a max 100
  });

  it('GET /api/products — búsqueda por texto', async () => {
    const res = await request(app).get('/api/products').query({ search: 'Ryzen', limit: 20 });
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBeGreaterThan(0);
  });

  it('GET /api/products — filtro por precio', async () => {
    const res = await request(app).get('/api/products').query({ minPrice: 1000000, maxPrice: 1500000, limit: 50 });
    expect(res.status).toBe(200);
    for (const p of res.body.data) {
      expect(Number(p.price)).toBeGreaterThanOrEqual(1000000);
      expect(Number(p.price)).toBeLessThanOrEqual(1500000);
    }
  });

  it('GET /api/products — orden por precio asc', async () => {
    const res = await request(app).get('/api/products').query({ sort: 'price_asc', limit: 10 });
    expect(res.status).toBe(200);
    const prices = res.body.data.map((p: any) => Number(p.price));
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  it('GET /api/products — cursor pagination (infinite scroll)', async () => {
    const page1 = await request(app).get('/api/products').query({ limit: 3 });
    expect(page1.body.meta.hasMore).toBe(true);
    expect(page1.body.meta.nextCursor).toBeTruthy();

    const cursor = page1.body.meta.nextCursor;
    const page2 = await request(app).get('/api/products').query({ limit: 3, cursor });
    expect(page2.status).toBe(200);
    expect(page2.body.data.length).toBe(3);
    // No repite productos
    const ids1 = page1.body.data.map((p: any) => p.id);
    const ids2 = page2.body.data.map((p: any) => p.id);
    for (const id of ids2) {
      expect(ids1).not.toContain(id);
    }
  });

  it('GET /api/products/:id — detalle completo', async () => {
    const list = await request(app).get('/api/products').query({ limit: 1 });
    const id = list.body.data[0].id;
    const res = await request(app).get(`/api/products/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
    expect(res.body.data.seller).toBeDefined();
    expect(res.body.data.category).toBeDefined();
    expect(Array.isArray(res.body.data.images)).toBe(true);
  });

  it('GET /api/products/:id — 404 para inexistente', async () => {
    const res = await request(app).get('/api/products/999999');
    expect(res.status).toBe(404);
  });

  it('GET /api/products/categories — árbol de categorías', async () => {
    const res = await request(app).get('/api/products/categories');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].children).toBeDefined();

    const parentWithKids = res.body.data.find((c: any) => c.children && c.children.length > 0);
    if (parentWithKids) {
      const childrenSum = parentWithKids.children.reduce((s: number, c: any) => s + c.productCount, 0);
      expect(parentWithKids.productCount).toBeGreaterThanOrEqual(childrenSum);
    }
  });

  it('GET /api/products/categories/:id/attributes — atributos de categoría', async () => {
    const cats = await request(app).get('/api/products/categories');
    const parent = cats.body.data.find((c: any) => c.children && c.children.length > 0);
    const childId = parent.children[0].id;
    const res = await request(app).get(`/api/products/categories/${childId}/attributes`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/products/featured — destacados', async () => {
    const res = await request(app).get('/api/products/featured');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
