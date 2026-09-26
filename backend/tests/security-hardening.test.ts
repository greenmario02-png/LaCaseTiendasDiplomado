import request from 'supertest';

import { app, registerUser, loginUser, getAdminToken, getApprovedSellerToken, createOrderForTest, getSessionId } from './helpers';
import { isBlockedHostname, isPrivateIp, assertPublicHttpUrl } from '../src/utils/safeFetch';
import { findInsecureCorsOrigins, assertSecureCorsConfig } from '../src/config/corsValidation';

async function customer() {
  const reg = await registerUser();
  const login = await loginUser(reg.body.data.email, 'password123');
  return { user: reg.body.data, token: login.body.data.accessToken as string };
}

async function seller() {
  const token = await getApprovedSellerToken();
  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  return { token, user: me.body.data };
}

async function anyCategoryId() {
  const { prisma } = await import('../src/config/database');
  const cat = await prisma.category.findFirst({ where: { parentId: { not: null } } });
  return (cat ?? (await prisma.category.findFirst()))!.id;
}

describe('Asignación masiva de productos', () => {
  it('ignora isApproved, sellerId, slug y expiresAt enviados por el vendedor', async () => {
    const s = await seller();
    const other = await customer();
    const res = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${s.token}`)
      .send({
        name: `Producto Seguro ${Date.now()}`,
        categoryId: await anyCategoryId(),
        price: 100,
        stock: 2,
        isApproved: true,
        isFeatured: true,
        sellerId: other.user.id,
        slug: 'slug-forzado',
        expiresAt: '2099-01-01T00:00:00.000Z',
        viewCount: 9999,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.isApproved).toBe(false);
    expect(res.body.data.isFeatured).toBe(false);
    expect(res.body.data.sellerId).toBe(s.user.id);
    expect(res.body.data.slug).not.toBe('slug-forzado');
    expect(res.body.data.viewCount).toBe(0);
    expect(new Date(res.body.data.expiresAt).getFullYear()).toBeLessThan(2099);
  });

  it('rechaza con 400 tipos inválidos al crear', async () => {
    const s = await seller();
    const res = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${s.token}`)
      .send({ name: 'ab', categoryId: 'x', price: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('al actualizar no permite cambiar isApproved ni sellerId', async () => {
    const s = await seller();
    const created = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${s.token}`)
      .send({ name: `Para Editar ${Date.now()}`, categoryId: await anyCategoryId(), price: 50, stock: 1 });
    const id = created.body.data.id;
    const other = await customer();
    const res = await request(app)
      .put(`/api/seller/products/${id}`)
      .set('Authorization', `Bearer ${s.token}`)
      .send({ price: 60, isApproved: true, sellerId: other.user.id, isActive: false });
    expect(res.status).toBe(200);
    expect(Number(res.body.data.price)).toBe(60);
    expect(res.body.data.isApproved).toBe(false);
    expect(res.body.data.sellerId).toBe(s.user.id);
    expect(res.body.data.isActive).toBe(true);
  });
});

describe('Admin: actualización de usuarios', () => {
  it('rechaza con 400 un rol fuera del enum', async () => {
    const admin = await getAdminToken();
    const c = await customer();
    const res = await request(app)
      .put(`/api/admin/users/${c.user.id}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ role: 'SUPERADMIN' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('rechaza con 400 tipos inválidos y campos no permitidos', async () => {
    const admin = await getAdminToken();
    const c = await customer();
    const bad = await request(app).put(`/api/admin/users/${c.user.id}`).set('Authorization', `Bearer ${admin}`).send({ isActive: 'yes' });
    expect(bad.status).toBe(400);
    const extra = await request(app).put(`/api/admin/users/${c.user.id}`).set('Authorization', `Bearer ${admin}`).send({ passwordHash: 'x' });
    expect(extra.status).toBe(400);
  });

  it('un CUSTOMER no puede usar rutas de admin (403) y sin token es 401', async () => {
    const c = await customer();
    const target = await customer();
    const forbidden = await request(app).put(`/api/admin/users/${target.user.id}`).set('Authorization', `Bearer ${c.token}`).send({ role: 'ADMIN' });
    expect(forbidden.status).toBe(403);
    const anon = await request(app).put(`/api/admin/users/${target.user.id}`).send({ role: 'ADMIN' });
    expect(anon.status).toBe(401);
  });

  it('un SELLER no puede usar rutas de admin (403)', async () => {
    const s = await seller();
    const target = await customer();
    const res = await request(app).put(`/api/admin/users/${target.user.id}`).set('Authorization', `Bearer ${s.token}`).send({ role: 'ADMIN' });
    expect(res.status).toBe(403);
    const list = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${s.token}`);
    expect(list.status).toBe(403);
  });
});

describe('Estados de orden y de pago', () => {
  async function pendingOrder() {
    const s = await seller();
    const buyer = await customer();
    const { orderId } = await createOrderForTest(buyer.user, s.user, buyer.token);
    const { prisma } = await import('../src/config/database');
    await prisma.order.update({ where: { id: orderId }, data: { status: 'PENDING', paymentStatus: 'PENDING' } });
    return { s, buyer, orderId, prisma };
  }

  it('valida el dominio cerrado del estado (400)', async () => {
    const { s, orderId } = await pendingOrder();
    const res = await request(app).put(`/api/orders/seller/${orderId}/status`).set('Authorization', `Bearer ${s.token}`).send({ status: 'HACKED' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    const pay = await request(app).put(`/api/orders/seller/${orderId}/payment-status`).set('Authorization', `Bearer ${s.token}`).send({ paymentStatus: 'PAID' });
    expect(pay.status).toBe(400);
  });

  it('acepta un estado válido y prohíbe modificar una orden cancelada/entregada (409)', async () => {
    const { s, orderId, prisma } = await pendingOrder();
    const ok = await request(app).put(`/api/orders/seller/${orderId}/status`).set('Authorization', `Bearer ${s.token}`).send({ status: 'CANCELLED' });
    expect(ok.status).toBe(200);
    const again = await request(app).put(`/api/orders/seller/${orderId}/status`).set('Authorization', `Bearer ${s.token}`).send({ status: 'SHIPPED' });
    expect(again.status).toBe(409);
    const pay = await request(app).put(`/api/orders/seller/${orderId}/payment-status`).set('Authorization', `Bearer ${s.token}`).send({ paymentStatus: 'VERIFIED' });
    expect(pay.status).toBe(409);
    await prisma.order.update({ where: { id: orderId }, data: { status: 'DELIVERED' } });
    const delivered = await request(app).put(`/api/orders/seller/${orderId}/status`).set('Authorization', `Bearer ${s.token}`).send({ status: 'PREPARING' });
    expect(delivered.status).toBe(409);
  });

  it('un CUSTOMER recibe 403 en rutas de vendedor y sin token 401', async () => {
    const c = await customer();
    const res = await request(app).put('/api/orders/seller/1/status').set('Authorization', `Bearer ${c.token}`).send({ status: 'SHIPPED' });
    expect(res.status).toBe(403);
    const pay = await request(app).put('/api/orders/seller/1/payment-status').set('Authorization', `Bearer ${c.token}`).send({ paymentStatus: 'VERIFIED' });
    expect(pay.status).toBe(403);
    const list = await request(app).get('/api/orders/seller').set('Authorization', `Bearer ${c.token}`);
    expect(list.status).toBe(403);
    const products = await request(app).post('/api/seller/products').set('Authorization', `Bearer ${c.token}`).send({});
    expect(products.status).toBe(403);
    const anon = await request(app).put('/api/orders/seller/1/status').send({ status: 'SHIPPED' });
    expect(anon.status).toBe(401);
  });

  it('el comprobante de pago debe ser una URL válida', async () => {
    const { buyer, orderId } = await pendingOrder();
    const bad = await request(app).post(`/api/orders/${orderId}/payment-proof`).set('Authorization', `Bearer ${buyer.token}`).send({ proofUrl: 'javascript:alert(1)' });
    expect(bad.status).toBe(400);
    const ok = await request(app).post(`/api/orders/${orderId}/payment-proof`).set('Authorization', `Bearer ${buyer.token}`).send({ proofUrl: '/uploads/123-456.png' });
    expect(ok.status).toBe(200);
  });
});

describe('Carrito: merge sin sessionId', () => {
  it('devuelve 400 y no 500', async () => {
    const c = await customer();
    const res = await request(app).post('/api/cart/merge').set('Authorization', `Bearer ${c.token}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    const ok = await request(app).post('/api/cart/merge').set('Authorization', `Bearer ${c.token}`).send({ sessionId: getSessionId() });
    expect(ok.status).toBe(200);
  });
});

describe('Proxy de imágenes: bloqueo SSRF', () => {
  it('bloquea hosts y IPs privadas', () => {
    for (const h of ['localhost', 'foo.localhost', '127.0.0.1', '10.0.0.5', '192.168.1.1', '172.16.0.1', '169.254.169.254', '0.0.0.0', '[::1]', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', 'intranet.internal']) {
      expect(isBlockedHostname(h)).toBe(true);
    }
    expect(isBlockedHostname('example.com')).toBe(false);
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('172.32.0.1')).toBe(false);
    expect(isPrivateIp('2606:4700:4700::1111')).toBe(false);
  });

  it('rechaza protocolos no http(s) y credenciales', async () => {
    await expect(assertPublicHttpUrl('file:///etc/passwd')).rejects.toThrow();
    await expect(assertPublicHttpUrl('ftp://example.com/a.png')).rejects.toThrow();
    await expect(assertPublicHttpUrl('http://user:pw@example.com/a.png')).rejects.toThrow();
    await expect(assertPublicHttpUrl('http://127.0.0.1:3000/api/admin')).rejects.toThrow();
    await expect(assertPublicHttpUrl('no es url')).rejects.toThrow();
  });

  it('GET /api/img/:encoded responde 400 a destinos internos y sin ACAO *', async () => {
    const target = encodeURIComponent('http://169.254.169.254/latest/meta-data/');
    const res = await request(app).get(`/api/img/${target}`);
    expect(res.status).toBe(400);
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
    const local = await request(app).get(`/api/img/${encodeURIComponent('http://localhost:3001/api/health')}`);
    expect(local.status).toBe(400);
  });
});

describe('Validación de CORS en producción', () => {
  it('rechaza * y localhost en producción', () => {
    expect(findInsecureCorsOrigins(['*'], 'production')).toEqual(['*']);
    expect(findInsecureCorsOrigins(['http://localhost:5173'], 'production')).toHaveLength(1);
    expect(findInsecureCorsOrigins(['https://app.example.com', 'http://127.0.0.1:3000'], 'production')).toEqual(['http://127.0.0.1:3000']);
    expect(() => assertSecureCorsConfig(['*'], 'production')).toThrow();
  });

  it('acepta orígenes reales en producción y todo en desarrollo/test', () => {
    expect(findInsecureCorsOrigins(['https://lacase.example.com'], 'production')).toEqual([]);
    expect(() => assertSecureCorsConfig(['https://lacase.example.com'], 'production')).not.toThrow();
    expect(findInsecureCorsOrigins(['http://localhost:5173', '*'], 'development')).toEqual([]);
    expect(findInsecureCorsOrigins(['http://localhost:5173'], 'test')).toEqual([]);
  });
});

describe('Uploads', () => {
  it('rechaza archivos .svg', async () => {
    const s = await seller();
    const res = await request(app)
      .post('/api/seller/upload')
      .set('Authorization', `Bearer ${s.token}`)
      .attach('image', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), { filename: 'x.svg', contentType: 'image/svg+xml' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
