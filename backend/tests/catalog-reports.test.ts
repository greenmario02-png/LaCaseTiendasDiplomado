/** Denuncias del catálogo (vendedor, tienda o producto) desde la ficha del producto. */
import request from 'supertest';

import { app } from './helpers';
import { initCategory, mkProduct, mkUser, tk } from './factories';
import { prisma } from '../src/config/database';

let buyer: Awaited<ReturnType<typeof mkUser>>;
let seller: Awaited<ReturnType<typeof mkUser>>;
let productId: number;

beforeAll(async () => {
  await initCategory();
  buyer = await mkUser('CUSTOMER');
  seller = await mkUser('SELLER');
  productId = (await mkProduct(seller.id)).id;
});

const send = (u: { id: number; role: string }, body: Record<string, unknown>) => request(app).post('/api/catalog-reports').set('Authorization', tk(u)).send(body);

describe('POST /api/catalog-reports', () => {
  it('401 sin sesión', async () => {
    const res = await request(app).post('/api/catalog-reports').send({ targetType: 'PRODUCT', targetId: productId, reason: 'PRODUCTO_INADECUADO' });
    expect(res.status).toBe(401);
  });

  it('201: denuncia de producto queda abierta con su detalle', async () => {
    const res = await send(buyer, { targetType: 'PRODUCT', targetId: productId, reason: 'PRODUCTO_INADECUADO', detail: '  Fotos engañosas ' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ targetType: 'PRODUCT', targetId: productId, status: 'OPEN', detail: 'Fotos engañosas', reporterId: buyer.id });
  });

  it('201: denuncia de vendedor y de tienda', async () => {
    expect((await send(buyer, { targetType: 'SELLER', targetId: seller.id, reason: 'VENDEDOR_SOSPECHOSO' })).status).toBe(201);
    expect((await send(buyer, { targetType: 'STORE', targetId: seller.id, reason: 'TIENDA_SOSPECHOSA' })).status).toBe(201);
  });

  it('404 si el objetivo no existe o no es una tienda', async () => {
    expect((await send(buyer, { targetType: 'PRODUCT', targetId: 99999999, reason: 'OTRO' })).status).toBe(404);
    expect((await send(buyer, { targetType: 'STORE', targetId: buyer.id, reason: 'OTRO' })).status).toBe(404);
  });

  it('400 con tipo, motivo o campos extra inválidos', async () => {
    expect((await send(buyer, { targetType: 'BOGUS', targetId: productId, reason: 'OTRO' })).status).toBe(400);
    expect((await send(buyer, { targetType: 'PRODUCT', targetId: productId, reason: 'BOGUS' })).status).toBe(400);
    expect((await send(buyer, { targetType: 'PRODUCT', targetId: productId, reason: 'OTRO', status: 'REVIEWED' })).status).toBe(400);
  });

  it('límite diario: el reporte que excede CATALOG_REPORTS_PER_DAY responde 429', async () => {
    const prev = process.env.CATALOG_REPORTS_PER_DAY;
    process.env.CATALOG_REPORTS_PER_DAY = '2';
    try {
      const u = await mkUser('CUSTOMER');
      expect((await send(u, { targetType: 'STORE', targetId: seller.id, reason: 'TIENDA_SOSPECHOSA' })).status).toBe(201);
      expect((await send(u, { targetType: 'PRODUCT', targetId: productId, reason: 'OTRO' })).status).toBe(201);
      const third = await send(u, { targetType: 'SELLER', targetId: seller.id, reason: 'OTRO' });
      expect(third.status).toBe(429);
      expect(third.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(await prisma.catalogReport.count({ where: { reporterId: u.id } })).toBe(2);
    } finally {
      if (prev === undefined) delete process.env.CATALOG_REPORTS_PER_DAY;
      else process.env.CATALOG_REPORTS_PER_DAY = prev;
    }
  });
});
