import request from 'supertest';
import { app, registerUser, getSessionId } from './helpers';

async function setupBuyerWithCart() {
  const reg = await registerUser();
  const email = reg.body.data.email;
  const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  const token = login.body.data.accessToken;

  const products = await request(app).get('/api/products').query({ limit: 100 });
  const withStock = products.body.data.filter((p: any) => p.stock >= 2);
  const list = withStock.length > 1 ? withStock : products.body.data.filter((p: any) => p.stock >= 1);
  const p1 = list[0];
  const p2 = list.find((p: any) => p.seller.id !== p1.seller.id) || list[1];

  // Dirección del comprador
  const addr = await request(app)
    .post('/api/account/addresses')
    .set('Authorization', `Bearer ${token}`)
    .send({
      street: 'Av. Libertador',
      number: '1500',
      city: 'Buenos Aires',
      state: 'CABA',
      postalCode: '1000',
      isDefault: true,
    });

  // Agregar al carrito
  await request(app)
    .post('/api/cart/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ productId: p1.id, quantity: 2 });
  await request(app)
    .post('/api/cart/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ productId: p2.id, quantity: 1 });

  return { token, addrId: addr.body.data.id, p1, p2 };
}

describe('Orders API — E2E flujo de compra', () => {
  it('POST /api/orders/calculate-shipping — cotiza envío por seller', async () => {
    const { token } = await setupBuyerWithCart();
    const res = await request(app)
      .post('/api/orders/calculate-shipping')
      .set('Authorization', `Bearer ${token}`)
      .send({ buyerPostalCode: '1000' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    for (const quote of res.body.data) {
      expect(quote.shippingCost).toBeGreaterThan(0);
      expect(quote.total).toBe(quote.subtotal + quote.shippingCost);
    }
  });

  it('POST /api/orders/calculate-shipping — valida CP obligatorio', async () => {
    const { token } = await setupBuyerWithCart();
    const res = await request(app)
      .post('/api/orders/calculate-shipping')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/orders — crea órdenes agrupadas por seller y vacía el carrito', async () => {
    const { token, addrId } = await setupBuyerWithCart();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddressId: addrId, notes: 'Test' });
    expect(res.status).toBe(201);
    expect(res.body.data.length).toBe(2);
    for (const order of res.body.data) {
      expect(order.status).toBe('PENDING');
      expect(order.paymentStatus).toBe('PENDING');
      expect(Number(order.shippingCost)).toBeGreaterThan(0);
    }

    // Carrito vacío
    const cart = await request(app).get('/api/cart').set('Authorization', `Bearer ${token}`);
    expect(cart.body.data.itemCount).toBe(0);
  });

  it('POST /api/orders — carrito vacío → 400', async () => {
    const reg = await registerUser();
    const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${login.body.data.accessToken}`).send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/orders — requiere auth', async () => {
    const res = await request(app).post('/api/orders').send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/orders/:id/payment-proof — sube comprobante', async () => {
    const { token, addrId } = await setupBuyerWithCart();
    const orders = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({ shippingAddressId: addrId });
    const orderId = orders.body.data[0].id;

    const res = await request(app)
      .post(`/api/orders/${orderId}/payment-proof`)
      .set('Authorization', `Bearer ${token}`)
      .send({ proofUrl: 'https://img.example.com/comprobante.jpg' });
    expect(res.status).toBe(200);
    expect(res.body.data.paymentStatus).toBe('PROOF_SUBMITTED');
    expect(res.body.data.paymentProofUrl).toBe('https://img.example.com/comprobante.jpg');
  });

  it('GET /api/orders/buyer — historial del comprador', async () => {
    const { token, addrId } = await setupBuyerWithCart();
    await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({ shippingAddressId: addrId });
    const res = await request(app).get('/api/orders/buyer').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/orders/buyer/:id — detalle de orden', async () => {
    const { token, addrId } = await setupBuyerWithCart();
    const orders = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({ shippingAddressId: addrId });
    const orderId = orders.body.data[0].id;

    const res = await request(app).get(`/api/orders/buyer/${orderId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it('GET /api/account/orders — historial desde cuenta', async () => {
    const { token, addrId } = await setupBuyerWithCart();
    await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({ shippingAddressId: addrId });
    const res = await request(app).get('/api/account/orders').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('Account API (integración)', () => {
  it('CRUD de direcciones', async () => {
    const reg = await registerUser();
    const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    const token = login.body.data.accessToken;
    const auth = { Authorization: `Bearer ${token}` };

    // crear
    const created = await request(app).post('/api/account/addresses').set(auth).send({
      street: 'Calle 1',
      number: '100',
      city: 'Rosario',
      state: 'Santa Fe',
      postalCode: '2000',
      isDefault: true,
    });
    expect(created.status).toBe(201);

    // listar
    const list = await request(app).get('/api/account/addresses').set(auth);
    expect(list.body.data.length).toBe(1);

    // actualizar
    const id = created.body.data.id;
    const updated = await request(app).put(`/api/account/addresses/${id}`).set(auth).send({ number: '200' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.number).toBe('200');

    // eliminar
    const deleted = await request(app).delete(`/api/account/addresses/${id}`).set(auth);
    expect(deleted.status).toBe(200);
  });

  it('GET /api/account — perfil', async () => {
    const reg = await registerUser();
    const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    const res = await request(app).get('/api/account').set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(reg.body.data.email);
  });
});
