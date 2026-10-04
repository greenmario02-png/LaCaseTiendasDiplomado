import request from 'supertest';
import { app, getApprovedSellerToken } from './helpers';

/**
 * Regresión (hallada en la prueba de producción, caso CP-32): con SKU de otro formato en el catálogo
 * (p. ej. "PRO-90-1" del seed) el SKU automático se repetía y el segundo producto fallaba con 409.
 */
describe('SKU automático al publicar productos', () => {
  let token = '';
  let categoryId = 0;
  let prefix = '';

  const publicar = (name: string, extra: Record<string, unknown> = {}) =>
    request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, categoryId, condition: 'NEW', price: 10, stock: 1, ...extra });

  beforeAll(async () => {
    token = await getApprovedSellerToken();
    const cats = await request(app).get('/api/products/categories');
    const hojas = (nodos: any[]): any[] => nodos.flatMap((n) => (n.children?.length ? hojas(n.children) : [n]));
    const hoja = hojas(cats.body.data)[0];
    categoryId = hoja.id;
    prefix = String(hoja.name).substring(0, 3).toUpperCase();
  });

  it('dos productos seguidos, con un SKU de formato distinto ya existente, reciben SKU distintos (201)', async () => {
    const previo = await publicar(`Producto con SKU de seed ${Date.now()}`, { sku: `${prefix}-90-1` });
    expect(previo.status).toBe(201);

    const a = await publicar(`Producto automático A ${Date.now()}`);
    const b = await publicar(`Producto automático B ${Date.now()}`);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.data.sku).toMatch(new RegExp(`^${prefix}-\\d{4}$`));
    expect(b.body.data.sku).toMatch(new RegExp(`^${prefix}-\\d{4}$`));
    expect(a.body.data.sku).not.toBe(b.body.data.sku);
  });

  it('dos publicaciones simultáneas no chocan (reintento ante SKU repetido)', async () => {
    const [x, y] = await Promise.all([publicar(`Simultáneo X ${Date.now()}`), publicar(`Simultáneo Y ${Date.now()}`)]);
    expect(x.status).toBe(201);
    expect(y.status).toBe(201);
    expect(x.body.data.sku).not.toBe(y.body.data.sku);
  });
});
