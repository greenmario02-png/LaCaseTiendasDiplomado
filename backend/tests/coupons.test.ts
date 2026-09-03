import request from 'supertest';
import { app, registerUser, getAdminToken, getApprovedSellerToken } from './helpers';

describe('Cupones (integración)', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  it('admin — crea cupón', async () => {
    const res = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: `TEST${Date.now()}`, type: 'PERCENTAGE', value: 10, minSpend: 50, maxUses: 10 });
    expect(res.status).toBe(201);
    expect(res.body.data.code).toMatch(/^TEST/);
  });

  it('admin — rechaza cupón sin código', async () => {
    const res = await request(app).post('/api/admin/coupons').set('Authorization', `Bearer ${adminToken}`).send({ type: 'PERCENTAGE', value: 10 });
    expect(res.status).toBe(400);
  });

  it('admin — rechaza porcentaje > 100', async () => {
    const res = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'TMP101', type: 'PERCENTAGE', value: 150 });
    expect(res.status).toBe(400);
  });

  it('público — valida cupón válido', async () => {
    const created = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'VALID10', type: 'PERCENTAGE', value: 10, minSpend: 20 });
    const res = await request(app).get(`/api/coupons/${created.body.data.code}/validate`);
    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe(10);
  });

  it('público — cupón inexistente → 404', async () => {
    const res = await request(app).get('/api/coupons/NOEXISTE/validate');
    expect(res.status).toBe(404);
  });

  it('checkout — aplica cupón porcentual a la orden', async () => {
    const reg = await registerUser();
    const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    const token = login.body.data.accessToken;

    const products = await request(app).get('/api/products').query({ limit: 100 });
    const withStock = products.body.data.filter((p: any) => p.stock >= 2);
    const p1 = withStock[0];

    const addr = await request(app)
      .post('/api/account/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({ street: 'Av. Test', number: '123', city: 'La Paz', state: 'La Paz', postalCode: '1000', isDefault: true });
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${token}`).send({ productId: p1.id, quantity: 1 });

    const created = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'CHECKOUT10', type: 'PERCENTAGE', value: 10, minSpend: 1 });
    const code = created.body.data.code;

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddressId: addr.body.data.id, couponCode: code });

    expect(res.status).toBe(201);
    const order = res.body.data[0];
    expect(Number(order.discountAmount)).toBeGreaterThan(0);
    expect(Number(order.total)).toBeLessThan(Number(order.subtotal) + Number(order.shippingCost));
  });
});

describe('Ofertas múltiples (masterSku)', () => {
  it('offers — devuelve agrupados por masterSku', async () => {
    const sellerTok = await getApprovedSellerToken();
    const cats = await request(app).get('/api/products/categories');
    const hardware = cats.body.data.find((c: any) => c.name === 'Hardware');
    const childId = hardware.children[0].id;

    const sku = `MASTER-${Date.now()}`;
    const r1 = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerTok}`)
      .send({ name: `Oferta A ${Date.now()}`, categoryId: childId, price: 100, stock: 5, sku: `${sku}-A`, masterSku: sku });
    const r2 = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerTok}`)
      .send({ name: `Oferta B ${Date.now()}`, categoryId: childId, price: 80, stock: 5, sku: `${sku}-B`, masterSku: sku });

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);

    // Aprobar ambos productos para que aparezcan en las ofertas públicas
    const adminTok = await getAdminToken();
    for (const id of [r1.body.data.id, r2.body.data.id]) {
      await request(app).put(`/api/admin/products/${id}/moderate`).set('Authorization', `Bearer ${adminTok}`).send({ approve: true });
    }

    const offers = await request(app).get(`/api/products/${r1.body.data.id}/offers`);
    expect(offers.status).toBe(200);
    expect(offers.body.data.masterSku).toBe(sku);
    expect(offers.body.data.count).toBeGreaterThanOrEqual(2);
  });
});

describe('Cupón de regalo y por producto', () => {
  it('seller — crea cupón de regalo (GIFT)', async () => {
    const sellerTok = await getApprovedSellerToken();
    const res = await request(app)
      .post('/api/seller/coupons')
      .set('Authorization', `Bearer ${sellerTok}`)
      .send({ code: `GIFT${Date.now()}`, type: 'GIFT', value: 100, maxUses: 5 });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('GIFT');
    expect(Number(res.body.data.value)).toBe(100);
  });

  it('checkout — cupón de regalo descuenta el monto y acumula spentAmount', async () => {
    const reg = await registerUser();
    const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    const token = login.body.data.accessToken;

    const products = await request(app).get('/api/products').query({ limit: 100 });
    const p1 = products.body.data.find((p: any) => p.stock >= 2);
    const price = Number(p1.price);

    // Cupón de regalo por debajo del precio del producto → descuenta el monto del regalo
    const giftValue = Math.max(10, Math.round(price / 2));
    const adminTok = await getAdminToken();
    const created = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminTok}`)
      .send({ code: `GIFTT${Date.now()}`, type: 'GIFT', value: giftValue, maxUses: 5 });
    const code = created.body.data.code;

    const addr = await request(app)
      .post('/api/account/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({ street: 'Av. Test', number: '1', city: 'La Paz', state: 'La Paz', postalCode: '1000', isDefault: true });
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${token}`).send({ productId: p1.id, quantity: 1 });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddressId: addr.body.data.id, couponCode: code });
    expect(res.status).toBe(201);
    const order = res.body.data[0];
    expect(Number(order.discountAmount)).toBe(giftValue);

    // El spentAmount del cupón se acumuló (se consulta vía listado, no validate, que rechaza agotados)
    const adminTok2 = await getAdminToken();
    const list = await request(app).get('/api/admin/coupons').set('Authorization', `Bearer ${adminTok2}`);
    const found = list.body.data.find((c: any) => c.code === code);
    expect(Number(found.spentAmount)).toBe(giftValue);
  });

  it('checkout — cupón de regalo mayor al gasto descuenta solo lo gastado (devuelve saldo)', async () => {
    const reg = await registerUser();
    const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    const token = login.body.data.accessToken;

    // Crear un producto barato de la tienda aprobada
    const sellerTok = await getApprovedSellerToken();
    const cats = await request(app).get('/api/products/categories');
    const hardware = cats.body.data.find((c: any) => c.name === 'Hardware');
    const childId = hardware.children[0].id;
    const prod = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerTok}`)
      .send({ name: `Barato ${Date.now()}`, categoryId: childId, price: 30, stock: 5, condition: 'NEW' });
    const adminTok = await getAdminToken();
    await request(app).put(`/api/admin/products/${prod.body.data.id}/moderate`).set('Authorization', `Bearer ${adminTok}`).send({ approve: true });

    const admin2 = await getAdminToken();
    const created = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${admin2}`)
      .send({ code: `GIFTT2${Date.now()}`, type: 'GIFT', value: 100, maxUses: 5 });
    const code = created.body.data.code;

    const addr = await request(app)
      .post('/api/account/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({ street: 'Av. Test', number: '2', city: 'La Paz', state: 'La Paz', postalCode: '1000', isDefault: true });
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${token}`).send({ productId: prod.body.data.id, quantity: 1 });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddressId: addr.body.data.id, couponCode: code });
    expect(res.status).toBe(201);
    const order = res.body.data[0];
    // Descuenta solo el subtotal (30), no los 100 → el saldo (70) se devuelve
    expect(Number(order.discountAmount)).toBeLessThanOrEqual(30);
  });
});
