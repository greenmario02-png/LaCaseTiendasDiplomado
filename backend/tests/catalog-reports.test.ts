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

describe('Cola de revisión /api/admin/catalog-reports', () => {
  let admin: Awaited<ReturnType<typeof mkUser>>;
  let moderator: Awaited<ReturnType<typeof mkUser>>;
  let reporter: Awaited<ReturnType<typeof mkUser>>;

  beforeAll(async () => {
    admin = await mkUser('ADMIN');
    reporter = await mkUser('CUSTOMER');
    // Moderador: un CUSTOMER con la asignación RBAC MODERADOR_FORO (no un rol primario).
    moderator = await mkUser('CUSTOMER');
    const role = await prisma.rbacRole.findUniqueOrThrow({ where: { code: 'MODERADOR_FORO' } });
    await prisma.userRole.create({ data: { userId: moderator.id, roleId: role.id } });
  });

  const mkReport = async (data: Record<string, unknown> = {}) =>
    prisma.catalogReport.create({ data: { reporterId: reporter.id, targetType: 'PRODUCT', targetId: productId, reason: 'PRODUCTO_INADECUADO', ...data } as any });

  it('el seed da el permiso catalog.reports.moderate al rol MODERADOR_FORO', async () => {
    const link = await prisma.rolePermission.findFirst({ where: { role: { code: 'MODERADOR_FORO' }, permission: { code: 'catalog.reports.moderate' } } });
    expect(link).not.toBeNull();
  });

  it('401 sin sesión; 403 para comprador o vendedor sin asignación de moderador', async () => {
    expect((await request(app).get('/api/admin/catalog-reports')).status).toBe(401);
    expect((await request(app).get('/api/admin/catalog-reports').set('Authorization', tk(reporter))).status).toBe(403);
    expect((await request(app).get('/api/admin/catalog-reports').set('Authorization', tk(seller))).status).toBe(403);
    const r = await mkReport();
    expect((await request(app).put(`/api/admin/catalog-reports/${r.id}`).set('Authorization', tk(seller)).send({ status: 'REVIEWED' })).status).toBe(403);
    expect((await prisma.catalogReport.findUnique({ where: { id: r.id } }))!.status).toBe('OPEN');
  });

  it('admin lista las abiertas con denunciante y objetivo', async () => {
    const r = await mkReport({ detail: 'Precio falso' });
    const res = await request(app).get('/api/admin/catalog-reports').set('Authorization', tk(admin)).query({ limit: 100 });
    expect(res.status).toBe(200);
    const row = res.body.data.find((x: any) => x.id === r.id);
    expect(row).toMatchObject({ status: 'OPEN', detail: 'Precio falso', target: { type: 'PRODUCT', id: productId, sellerId: seller.id } });
    expect(row.reporter.id).toBe(reporter.id);
    expect(row.target.name).toBeTruthy();
    expect(res.body.meta).toMatchObject({ page: 1, limit: 100 });
    expect(res.body.data.every((x: any) => x.status === 'OPEN')).toBe(true);
  });

  it('el moderador asignado también lista y procesa; filtra por tipo y estado', async () => {
    const r = await prisma.catalogReport.create({ data: { reporterId: reporter.id, targetType: 'STORE', targetId: seller.id, reason: 'TIENDA_SOSPECHOSA' } });
    const list = await request(app).get('/api/admin/catalog-reports').set('Authorization', tk(moderator)).query({ targetType: 'STORE', limit: 100 });
    expect(list.status).toBe(200);
    expect(list.body.data.every((x: any) => x.targetType === 'STORE')).toBe(true);
    const row = list.body.data.find((x: any) => x.id === r.id);
    expect(row.target).toMatchObject({ type: 'STORE', id: seller.id, name: seller.storeName });

    const put = await request(app).put(`/api/admin/catalog-reports/${r.id}`).set('Authorization', tk(moderator)).send({ status: 'DISCARDED', note: ' Sin evidencia ' });
    expect(put.status).toBe(200);
    expect(put.body.data).toMatchObject({ status: 'DISCARDED', reviewedBy: moderator.id, adminNote: 'Sin evidencia' });

    const discarded = await request(app).get('/api/admin/catalog-reports').set('Authorization', tk(admin)).query({ status: 'DISCARDED', limit: 100 });
    const d = discarded.body.data.find((x: any) => x.id === r.id);
    expect(d.reviewer.id).toBe(moderator.id);
  });

  it('409 si la denuncia ya fue procesada (no pisa el resultado); 404 si no existe', async () => {
    const r = await mkReport();
    expect((await request(app).put(`/api/admin/catalog-reports/${r.id}`).set('Authorization', tk(admin)).send({ status: 'REVIEWED' })).status).toBe(200);
    const again = await request(app).put(`/api/admin/catalog-reports/${r.id}`).set('Authorization', tk(moderator)).send({ status: 'DISCARDED' });
    expect(again.status).toBe(409);
    const row = await prisma.catalogReport.findUniqueOrThrow({ where: { id: r.id } });
    expect(row).toMatchObject({ status: 'REVIEWED', reviewedBy: admin.id });
    expect((await request(app).put('/api/admin/catalog-reports/99999999').set('Authorization', tk(admin)).send({ status: 'REVIEWED' })).status).toBe(404);
  });

  it('400 con estado inválido o volviendo a OPEN', async () => {
    const r = await mkReport();
    expect((await request(app).put(`/api/admin/catalog-reports/${r.id}`).set('Authorization', tk(admin)).send({ status: 'OPEN' })).status).toBe(400);
    expect((await request(app).get('/api/admin/catalog-reports').set('Authorization', tk(admin)).query({ status: 'BOGUS' })).status).toBe(400);
  });
});
