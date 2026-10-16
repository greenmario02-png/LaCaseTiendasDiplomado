import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

import request from 'supertest';

import { app } from './helpers';
import { prisma } from '../src/config/database';
import { signAccessToken } from '../src/utils/jwt';
import { isInternalImagePath, isOwnPaymentQrPath, isPaymentQrUrl, sniffImage, stripImageMetadata, cleanUploadedImage } from '../src/utils/imageSafety';
import { abbreviateHolder, safeQrUrl } from '../src/services/storePayment.service';
import { pickSelectedItems } from '../src/services/cart.service';

/** Pagos: QR de cobro como archivo, datos de pago visibles, pagar solo lo seleccionado y contador de pendientes. */

const QR_DIR = path.resolve(__dirname, '..', 'uploads', 'payment-qr');
const sfx = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
let seq = 0;
let categoryId = 0;

async function mkUser(role: 'CUSTOMER' | 'SELLER' | 'ADMIN' = 'CUSTOMER', extra: Record<string, unknown> = {}) {
  const n = ++seq;
  return prisma.user.create({
    data: {
      email: `pg-${role.toLowerCase()}-${n}-${sfx}@t.com`,
      passwordHash: 'x',
      firstName: 'Pg',
      lastName: `U${n}`,
      role,
      isApproved: true,
      isActive: true,
      storeName: role === 'SELLER' ? `Tienda PG${n}` : null,
      storeRole: 'OWNER',
      locationCity: role === 'SELLER' ? 'Tarija' : null,
      locationPostalCode: '0001',
      ...extra,
    } as any,
  });
}
const tk = (u: { id: number; role: string }) => `Bearer ${signAccessToken({ userId: u.id, role: u.role } as any)}`;

async function mkProduct(sellerId: number, price = 100, stock = 50) {
  const n = ++seq;
  return prisma.product.create({
    data: { sellerId, categoryId, name: `Prod PG ${n}`, slug: `pg-prod-${n}-${sfx}`, sku: `PG-${n}-${sfx}`, description: 'x', price, stock, isActive: true, isApproved: true, condition: 'NEW' } as any,
  });
}
async function fillCart(userId: number, items: { productId: number; quantity?: number }[]) {
  const cart = (await prisma.cart.findFirst({ where: { userId } })) ?? (await prisma.cart.create({ data: { userId } }));
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  for (const i of items) await prisma.cartItem.create({ data: { cartId: cart.id, productId: i.productId, quantity: i.quantity ?? 1 } });
  return cart;
}

// PNG real mínimo (4x4) sin dependencias: firma + IHDR + IDAT (zlib) + IEND con CRC.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(b: Buffer) {
  let c = 0xffffffff;
  for (const x of b) c = CRC_TABLE[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function realPng(textChunk?: string): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(4, 0);
  ihdr.writeUInt32BE(4, 4);
  ihdr[8] = 8; // profundidad
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc(4 * (1 + 4 * 3), 200);
  for (let y = 0; y < 4; y++) raw[y * 13] = 0; // filtro 0 por fila
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    ...(textChunk ? [chunk('tEXt', Buffer.from(textChunk, 'latin1'))] : []),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
/** JPEG mínimo con un segmento APP1 (EXIF) que debe eliminarse. */
function jpegWithExif(): Buffer {
  const exif = Buffer.from('Exif\0\0GPS-SECRETO-456', 'latin1');
  const app1 = Buffer.alloc(4 + exif.length);
  app1[0] = 0xff; app1[1] = 0xe1; app1.writeUInt16BE(exif.length + 2, 2); exif.copy(app1, 4);
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, app1, Buffer.from([0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0x33, 0xff, 0xd9])]);
}

const uploadQr = (u: { id: number; role: string }, buf: Buffer, name = 'qr.png', type = 'image/png') =>
  request(app).post('/api/payout-account/qr-image').set('Authorization', tk(u)).attach('image', buf, { filename: name, contentType: type });

beforeAll(async () => {
  categoryId = (await prisma.category.findFirstOrThrow()).id;
});

describe('Firma y metadatos de imágenes (utilidad)', () => {
  it('reconoce JPEG/PNG/WebP por firma y rechaza SVG, HTML, GIF y vacíos', () => {
    expect(sniffImage(realPng())).toBe('png');
    expect(sniffImage(jpegWithExif())).toBe('jpeg');
    expect(sniffImage(Buffer.from('RIFF\x10\x00\x00\x00WEBPVP8 ', 'latin1'))).toBe('webp');
    expect(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(sniffImage(Buffer.from('<html><script>alert(1)</script></html>'))).toBeNull();
    expect(sniffImage(Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00', 'latin1'))).toBeNull();
    expect(sniffImage(Buffer.alloc(0))).toBeNull();
  });

  it('quita EXIF del JPEG y tEXt del PNG sin romper la firma', () => {
    const j = stripImageMetadata(jpegWithExif(), 'jpeg');
    expect(j.toString('latin1')).not.toContain('GPS-SECRETO');
    expect(sniffImage(j)).toBe('jpeg');
    const p = stripImageMetadata(realPng('Comment\0GPS-SECRETO-123'), 'png');
    expect(p.toString('latin1')).not.toContain('GPS-SECRETO');
    expect(p.equals(realPng())).toBe(true); // queda el mismo PNG sin el chunk de texto
  });

  it('cleanUploadedImage: acepta GIF tal cual y rechaza lo que no es imagen', () => {
    expect(cleanUploadedImage(Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00', 'latin1'))?.type).toBe('gif');
    expect(cleanUploadedImage(Buffer.from('<svg/>'))).toBeNull();
    expect(cleanUploadedImage(jpegWithExif())!.buffer.toString('latin1')).not.toContain('GPS-SECRETO');
  });

  it('solo acepta rutas internas; nunca URLs externas ni rutas con ..', () => {
    expect(isOwnPaymentQrPath(`/uploads/payment-qr/q7-${'a'.repeat(32)}.png`, 7)).toBe(true);
    expect(isOwnPaymentQrPath(`/uploads/payment-qr/q8-${'a'.repeat(32)}.png`, 7)).toBe(false); // de otro dueño
    expect(isOwnPaymentQrPath('https://evil.example/qr.png', 7)).toBe(false);
    expect(isOwnPaymentQrPath(`/uploads/payment-qr/q7-${'a'.repeat(32)}.svg`, 7)).toBe(false);
    expect(isInternalImagePath('/uploads/logo.png')).toBe(true);
    expect(isInternalImagePath('https://cdn.example.com/logo.png')).toBe(false);
    expect(isInternalImagePath('/uploads/../.env.png')).toBe(false);
    expect(isInternalImagePath('//evil.example/x.png')).toBe(false);
    expect(safeQrUrl('https://evil.example/qr.png')).toBeNull();
    expect(abbreviateHolder('Juan Pérez Rojas')).toBe('Juan P. R.');
  });

  it('con almacenamiento remoto configurado acepta solo URLs del propio bucket', () => {
    const prev = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY, bucket: process.env.SUPABASE_STORAGE_BUCKET };
    process.env.SUPABASE_URL = 'https://proyecto.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';
    process.env.SUPABASE_STORAGE_BUCKET = 'lacase-uploads';
    try {
      const base = 'https://proyecto.supabase.co/storage/v1/object/public/lacase-uploads/';
      expect(isOwnPaymentQrPath(`${base}payment-qr/q7-${'b'.repeat(32)}.webp`, 7)).toBe(true);
      expect(isPaymentQrUrl(`https://otro.supabase.co/storage/v1/object/public/lacase-uploads/payment-qr/q7-${'b'.repeat(32)}.webp`)).toBe(false);
      expect(isPaymentQrUrl(`${base}general/q7-${'b'.repeat(32)}.webp`)).toBe(false);
      expect(isInternalImagePath(`${base}general/123-456.jpg`)).toBe(true);
      expect(isInternalImagePath(`${base}../x.jpg`)).toBe(false);
    } finally {
      process.env.SUPABASE_URL = prev.url;
      process.env.SUPABASE_SERVICE_ROLE_KEY = prev.key;
      process.env.SUPABASE_STORAGE_BUCKET = prev.bucket;
      if (prev.url === undefined) delete process.env.SUPABASE_URL;
      if (prev.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (prev.bucket === undefined) delete process.env.SUPABASE_STORAGE_BUCKET;
    }
  });

  it('pickSelectedItems: sin selección devuelve todo; un id ajeno da 409', () => {
    const items = [{ id: 1 }, { id: 2 }];
    expect(pickSelectedItems(items)).toEqual(items);
    expect(pickSelectedItems(items, [2])).toEqual([{ id: 2 }]);
    expect(() => pickSelectedItems(items, [2, 99])).toThrow(expect.objectContaining({ statusCode: 409, code: 'CART_SELECTION_STALE' }));
  });
});

describe('POST /api/payout-account/qr-image', () => {
  it('sube un PNG, lo renombra al azar con el id del dueño y le quita los metadatos', async () => {
    const u = await mkUser('SELLER');
    const r = await uploadQr(u, realPng('Comment\0GPS-SECRETO-123'), 'mi qr <script>.png');
    expect(r.status).toBe(201);
    expect(r.body.data.url).toMatch(new RegExp(`^/uploads/payment-qr/q${u.id}-[a-f0-9]{32}\\.png$`));
    const onDisk = fs.readFileSync(path.join(QR_DIR, path.basename(r.body.data.url)));
    expect(onDisk.toString('latin1')).not.toContain('GPS-SECRETO');
  });

  it('rechaza SVG, HTML disfrazado de PNG y archivos de más de 2 MB', async () => {
    const u = await mkUser('SELLER');
    const svg = await uploadQr(u, Buffer.from('<svg onload="alert(1)"/>'), 'x.svg', 'image/svg+xml');
    expect(svg.status).toBe(400);
    const fake = await uploadQr(u, Buffer.from('<html><script>alert(1)</script></html> relleno'), 'x.png', 'image/png');
    expect(fake.status).toBe(400);
    expect(fake.body.error.code).toBe('IMAGE_TYPE_NOT_ALLOWED');
    const big = Buffer.concat([realPng(), Buffer.alloc(2 * 1024 * 1024 + 10)]);
    const tooBig = await uploadQr(u, big);
    expect(tooBig.status).toBe(400);
    expect(tooBig.body.error.code).toBe('IMAGE_TOO_LARGE');
  });

  it('exige sesión y ser administrador de una tienda', async () => {
    const r = await request(app).post('/api/payout-account/qr-image').attach('image', realPng(), { filename: 'a.png', contentType: 'image/png' });
    expect(r.status).toBe(401);
    const buyer = await mkUser('CUSTOMER');
    expect((await uploadQr(buyer, realPng())).status).toBe(403);
    const employee = await mkUser('SELLER', { storeRole: 'EMPLOYEE' });
    expect((await uploadQr(employee, realPng())).status).toBe(403);
  });
});

describe('QR de cobro en la tienda (validación directa, sin aprobación)', () => {
  it('rechaza una URL externa como QR (400) y no la guarda', async () => {
    const u = await mkUser('SELLER', { paymentQrUrl: null });
    const r = await request(app).put('/api/seller/profile').set('Authorization', tk(u)).send({ paymentQrUrl: 'https://evil.example/qr.png' });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('PAYMENT_QR_UPLOAD_REQUIRED');
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).paymentQrUrl).toBeNull();
  });

  it('rechaza el QR subido por OTRO usuario y uno inexistente', async () => {
    const other = await mkUser('SELLER');
    const up = await uploadQr(other, realPng());
    const u = await mkUser('SELLER');
    const r = await request(app).put('/api/seller/profile').set('Authorization', tk(u)).send({ paymentQrUrl: up.body.data.url });
    expect(r.status).toBe(400);
    const ghost = await request(app).put('/api/seller/profile').set('Authorization', tk(u)).send({ paymentQrUrl: `/uploads/payment-qr/q${u.id}-${'c'.repeat(32)}.png` });
    expect(ghost.status).toBe(400);
  });

  it('guarda el QR propio, avisa al dueño y permite quitarlo', async () => {
    const u = await mkUser('SELLER', { paymentQrUrl: null });
    const up = await uploadQr(u, realPng());
    const r = await request(app).put('/api/seller/profile').set('Authorization', tk(u)).send({ paymentQrUrl: up.body.data.url });
    expect(r.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).paymentQrUrl).toBe(up.body.data.url);
    expect(await prisma.notification.count({ where: { userId: u.id, title: 'QR de cobro actualizado' } })).toBe(1);
    // Reenviar el mismo valor no cuenta como cambio
    await request(app).put('/api/seller/profile').set('Authorization', tk(u)).send({ paymentQrUrl: up.body.data.url });
    expect(await prisma.notification.count({ where: { userId: u.id, title: 'QR de cobro actualizado' } })).toBe(1);
    const del = await request(app).put('/api/seller/profile').set('Authorization', tk(u)).send({ paymentQrUrl: null });
    expect(del.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).paymentQrUrl).toBeNull();
  });

  it('rechaza logos por URL externa; acepta imágenes subidas y un valor heredado sin cambios', async () => {
    const u = await mkUser('SELLER', { storeBanner: 'https://cdn.example.com/heredado.png' });
    const logo = await request(app).put('/api/seller/profile').set('Authorization', tk(u)).send({ storeLogo: 'https://cdn.example.com/logo.png' });
    expect(logo.status).toBe(400);
    expect(logo.body.error.code).toBe('IMAGE_URL_NOT_ALLOWED');
    const okLogo = await request(app).put('/api/seller/profile').set('Authorization', tk(u)).send({ storeLogo: '/uploads/general/logo-1.png', storeBanner: 'https://cdn.example.com/heredado.png', paymentQrUrl: '' });
    expect(okLogo.status).toBe(200);
  });

  it('POST /orders rechaza un paymentQrUrl externo', async () => {
    const b = await mkUser('CUSTOMER');
    const r = await request(app).post('/api/orders').set('Authorization', tk(b)).send({ paymentQrUrl: 'https://evil.example/qr.png' });
    expect(r.status).toBe(400);
  });

  it('las subidas generales verifican la firma real de la imagen', async () => {
    const s = await mkUser('SELLER');
    const fake = await request(app).post('/api/seller/upload').set('Authorization', tk(s)).attach('image', Buffer.from('<html><script>alert(1)</script></html>'), { filename: 'x.png', contentType: 'image/png' });
    expect(fake.status).toBe(400);
    expect(fake.body.error.code).toBe('IMAGE_TYPE_NOT_ALLOWED');
    const ok = await request(app).post('/api/seller/upload').set('Authorization', tk(s)).attach('image', jpegWithExif(), { filename: 'f.jpg', contentType: 'image/jpeg' });
    expect(ok.status).toBe(201);
    const stored = fs.readFileSync(path.resolve(__dirname, '..', ok.body.data.url.replace(/^\//, '')));
    expect(stored.toString('latin1')).not.toContain('GPS-SECRETO');
  });
});

describe('GET /api/stores/:id/payment-info', () => {
  async function storeWithAccount() {
    const s = await mkUser('SELLER', { firstName: 'Luis', lastName: 'Mamani Cruz' });
    const up = await uploadQr(s, realPng());
    await request(app).put('/api/seller/profile').set('Authorization', tk(s)).send({ paymentQrUrl: up.body.data.url });
    await prisma.payoutAccount.create({ data: { sellerId: s.id, method: 'BANK', accountHolder: 'Luis Mamani Cruz', accountNumber: '4455667788', bankName: 'Banco Union' } });
    const p = await mkProduct(s.id, 80);
    return { s, p, qr: up.body.data.url as string };
  }

  it('anónimo: QR y datos enmascarados; nunca el número completo', async () => {
    const { s, qr } = await storeWithAccount();
    const r = await request(app).get(`/api/stores/${s.id}/payment-info`);
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ available: true, approved: true, full: false, qrUrl: qr, bankName: 'Banco Union', accountHolder: 'Luis M. C.' });
    expect(r.body.data.accountNumber).toMatch(/•+7788$/);
    expect(JSON.stringify(r.body)).not.toContain('4455667788');
    expect(r.headers['cache-control']).toContain('no-store');
  });

  it('un usuario sin relación con la tienda tampoco ve el número completo (IDOR)', async () => {
    const { s } = await storeWithAccount();
    const stranger = await mkUser('CUSTOMER');
    const r = await request(app).get(`/api/stores/${s.id}/payment-info`).set('Authorization', tk(stranger));
    expect(r.body.data.full).toBe(false);
    expect(JSON.stringify(r.body)).not.toContain('4455667788');
  });

  it('con productos de la tienda en el carrito o un pedido: titular y número completos', async () => {
    const { s, p } = await storeWithAccount();
    const buyer = await mkUser('CUSTOMER');
    await fillCart(buyer.id, [{ productId: p.id }]);
    const r = await request(app).get(`/api/stores/${s.id}/payment-info`).set('Authorization', tk(buyer));
    expect(r.body.data).toMatchObject({ full: true, accountNumber: '4455667788', accountHolder: 'Luis Mamani Cruz' });
    const b2 = await mkUser('CUSTOMER');
    await prisma.order.create({ data: { buyerId: b2.id, sellerId: s.id, subtotal: 10, total: 10 } as any });
    expect((await request(app).get(`/api/stores/${s.id}/payment-info`).set('Authorization', tk(b2))).body.data.full).toBe(true);
  });

  it('un QR heredado por URL externa no se muestra; sin cuenta ni QR no hay datos', async () => {
    const s = await mkUser('SELLER', { paymentQrUrl: 'https://evil.example/qr.png' });
    const r = await request(app).get(`/api/stores/${s.id}/payment-info`);
    expect(r.body.data).toMatchObject({ available: false, approved: false, accountNumber: null, qrUrl: null });
  });

  it('id inválido o que no es tienda: 400/404', async () => {
    expect((await request(app).get('/api/stores/abc/payment-info')).status).toBe(400);
    const c = await mkUser('CUSTOMER');
    expect((await request(app).get(`/api/stores/${c.id}/payment-info`)).status).toBe(404);
  });
});

describe('Pagar solo lo seleccionado del carrito', () => {
  async function setup() {
    const s1 = await mkUser('SELLER');
    const s2 = await mkUser('SELLER');
    const p1 = await mkProduct(s1.id, 40);
    const p2 = await mkProduct(s2.id, 70);
    const buyer = await mkUser('CUSTOMER');
    const cart = await fillCart(buyer.id, [{ productId: p1.id, quantity: 2 }, { productId: p2.id }]);
    const items = await prisma.cartItem.findMany({ where: { cartId: cart.id }, orderBy: { id: 'asc' } });
    return { buyer, items, p1, p2, s1 };
  }

  it('crea el pedido solo con lo seleccionado y deja el resto en el carrito', async () => {
    const { buyer, items, p1, s1 } = await setup();
    const r = await request(app).post('/api/orders').set('Authorization', tk(buyer)).send({ fulfillmentType: 'PICKUP', pickupAddress: 'En tienda', cartItemIds: [items[0].id] });
    expect(r.status).toBe(201);
    expect(r.body.data).toHaveLength(1);
    expect(r.body.data[0].sellerId).toBe(s1.id);
    expect(Number(r.body.data[0].subtotal)).toBe(80);
    const left = await prisma.cartItem.findMany({ where: { cartId: items[0].cartId } });
    expect(left.map((i) => i.id)).toEqual([items[1].id]);
    expect((await prisma.product.findUnique({ where: { id: p1.id } }))!.stock).toBe(48);
  });

  it('calcula el envío solo de lo seleccionado', async () => {
    const { buyer, items } = await setup();
    const r = await request(app).post('/api/orders/calculate-shipping').set('Authorization', tk(buyer)).send({ buyerPostalCode: '0001', cartItemIds: [items[1].id] });
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(1);
    expect(r.body.data[0].subtotal).toBe(70);
  });

  it('un id que no es del carrito propio (de otro usuario) da 409 y no compra nada', async () => {
    const { buyer, items } = await setup();
    const other = await setup();
    const r = await request(app).post('/api/orders').set('Authorization', tk(buyer)).send({ fulfillmentType: 'PICKUP', pickupAddress: 'En tienda', cartItemIds: [items[0].id, other.items[0].id] });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('CART_SELECTION_STALE');
    expect(await prisma.order.count({ where: { buyerId: buyer.id } })).toBe(0);
    expect(await prisma.cartItem.count({ where: { cartId: other.items[0].cartId } })).toBe(2);
  });

  it('valida la selección con Zod (vacía, repetidos, no enteros)', async () => {
    const { buyer, items } = await setup();
    for (const cartItemIds of [[], [items[0].id, items[0].id], ['1'], [-3]]) {
      const r = await request(app).post('/api/orders').set('Authorization', tk(buyer)).send({ fulfillmentType: 'PICKUP', pickupAddress: 'x', cartItemIds });
      expect(r.status).toBe(400);
    }
    const ship = await request(app).post('/api/orders/calculate-shipping').set('Authorization', tk(buyer)).send({ buyerPostalCode: '0001', cartItemIds: [] });
    expect(ship.status).toBe(400);
  });

  it('sin selección compra todo el carrito (compatibilidad con clientes anteriores)', async () => {
    const { buyer, items } = await setup();
    const r = await request(app).post('/api/orders').set('Authorization', tk(buyer)).send({ fulfillmentType: 'PICKUP', pickupAddress: 'En tienda' });
    expect(r.status).toBe(201);
    expect(r.body.data).toHaveLength(2);
    expect(await prisma.cartItem.count({ where: { cartId: items[0].cartId } })).toBe(0);
  });
});

describe('Pedidos pendientes de pago', () => {
  it('cuenta solo los propios, no pagados y no cancelados; y filtra la lista', async () => {
    const s = await mkUser('SELLER');
    const b = await mkUser('CUSTOMER');
    const other = await mkUser('CUSTOMER');
    const mk = (buyerId: number, data: Record<string, unknown>) =>
      prisma.order.create({ data: { buyerId, sellerId: s.id, subtotal: 10, shippingCost: 0, total: 10, status: 'PENDING', paymentStatus: 'PENDING', paymentMethod: 'QR', ...data } as any });
    await mk(b.id, {});
    await mk(b.id, { paymentStatus: 'REJECTED' });
    await mk(b.id, { paymentStatus: 'VERIFIED' });
    await mk(b.id, { paymentStatus: 'PROOF_SUBMITTED' });
    await mk(b.id, { status: 'CANCELLED' });
    await mk(other.id, {});
    const c = await request(app).get('/api/orders/buyer/pending-payment-count').set('Authorization', tk(b));
    expect(c.status).toBe(200);
    expect(c.body.data.count).toBe(2);
    expect(c.headers['cache-control']).toContain('no-store');
    const list = await request(app).get('/api/orders/buyer?payment=pending').set('Authorization', tk(b));
    expect(list.body.meta.total).toBe(2);
    const all = await request(app).get('/api/orders/buyer').set('Authorization', tk(b));
    expect(all.body.meta.total).toBe(5);
    expect((await request(app).get('/api/orders/buyer/pending-payment-count')).status).toBe(401);
  });
});
