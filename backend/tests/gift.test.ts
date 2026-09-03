import request from 'supertest';
import { app, registerUser, registerSeller, loginUser, getAdminToken } from './helpers';
import { prisma } from '../src/config/database';

describe('Promociones de regalo 🎁 — E2E', () => {
  let sellerToken: string;
  let sellerId: number;
  let sellerEmail: string;
  let buyerToken: string;
  let buyerEmail: string;
  let triggerProductId: number;
  let giftProductId: number;

  beforeAll(async () => {
    const seller = await registerSeller();
    sellerEmail = seller.body.data.email;
    const login = await loginUser(sellerEmail, 'password123');
    sellerToken = login.body.data.accessToken;
    sellerId = login.body.data.user.id;
    await prisma.user.update({ where: { id: sellerId }, data: { isApproved: true } });

    // Productos del vendedor: uno que dispara (trigger) y uno de regalo
    const catRes = await request(app).get('/api/products/categories');
    const hardware = catRes.body.data.find((c: any) => c.name === 'Hardware');
    const childId = hardware.children[0].id;

    const p1 = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ name: `Trigger ${Date.now()}`, categoryId: childId, price: 500, stock: 10, condition: 'NEW' });
    if (p1.status !== 201) {
      console.error('P1 FALLO:', p1.status, JSON.stringify(p1.body));
    }
    triggerProductId = p1.body.data?.id;

    const p2 = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ name: `Gift ${Date.now()}`, categoryId: childId, price: 100, stock: 5, condition: 'NEW' });
    giftProductId = p2.body.data?.id;

    // Aprobar ambos productos para poder agregarlos al carrito
    await prisma.product.updateMany({
      where: { id: { in: [triggerProductId, giftProductId].filter(Boolean) } },
      data: { isApproved: true },
    });

    const buyer = await registerUser();
    buyerEmail = buyer.body.data.email;
    const buyerLogin = await loginUser(buyerEmail, 'password123');
    buyerToken = buyerLogin.body.data.accessToken;
  });

  it('crear una promo de regalo tipo UNITS', async () => {
    const res = await request(app)
      .post('/api/seller/gifts')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: '2x1 regalo',
        triggerType: 'UNITS',
        triggerProductId,
        triggerQuantity: 2,
        allowChoice: false,
        productIds: [giftProductId],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.triggerType).toBe('UNITS');
    expect(res.body.data.items.length).toBe(1);
  });

  it('rechaza regalos de productos de otra tienda', async () => {
    const other = await registerSeller();
    const otherLogin = await loginUser(other.body.data.email, 'password123');
    const res = await request(app)
      .post('/api/seller/gifts')
      .set('Authorization', `Bearer ${otherLogin.body.data.accessToken}`)
      .send({ title: 'inválido', triggerType: 'AMOUNT', triggerAmount: 100, productIds: [giftProductId] });
    expect(res.status).toBe(400);
  });

  it('lista las promos del vendedor', async () => {
    const res = await request(app).get('/api/seller/gifts').set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('el checkout agrega el regalo gratis cuando se cumple la condición', async () => {
    // Limpiar el carrito y agregar 2x trigger
    await request(app).delete('/api/cart').set('Authorization', `Bearer ${buyerToken}`);
    const add = await request(app).post('/api/cart/items').set('Authorization', `Bearer ${buyerToken}`).send({ productId: triggerProductId, quantity: 2 });
    if (add.status !== 201) {
      console.error('ADD FALLO:', add.status, JSON.stringify(add.body));
    }
    expect(add.status).toBe(201);
    // Dirección directo en BD (patrón de returns.test)
    const buyerLogin = await loginUser(buyerEmail, 'password123');
    const buyerId = buyerLogin.body.data.user.id;
    const addr = await prisma.address.create({
      data: { userId: buyerId, street: 'Av Test', number: '1', city: 'La Paz', state: 'La Paz', postalCode: '1000', isDefault: true },
    });
    const checkout = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ shippingAddressId: addr.id });

    if (checkout.status !== 201) {
      console.error('CHECKOUT FALLO:', checkout.status, JSON.stringify(checkout.body));
    }
    expect(checkout.status).toBe(201);
    expect(Array.isArray(checkout.body.data)).toBe(true);
    const order = checkout.body.data.find((o: any) => o.sellerId === sellerId);
    expect(order).toBeTruthy();
    const giftLine = order.items.find((i: any) => i.isGift);
    expect(giftLine).toBeTruthy();
    expect(giftLine.productId).toBe(giftProductId);
    expect(Number(giftLine.unitPrice)).toBe(0);
    expect(giftLine.giftLabel).toContain('Regalo');
  });

  it('toggle de activación de la promo', async () => {
    const list = await request(app).get('/api/seller/gifts').set('Authorization', `Bearer ${sellerToken}`);
    const promo = list.body.data[0];
    const res = await request(app)
      .put(`/api/seller/gifts/${promo.id}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('eliminar una promo', async () => {
    const list = await request(app).get('/api/seller/gifts').set('Authorization', `Bearer ${sellerToken}`);
    const promo = list.body.data[0];
    const res = await request(app)
      .delete(`/api/seller/gifts/${promo.id}`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
  });

  it('endpoint público: promos activas de una tienda', async () => {
    const res = await request(app).get(`/api/sellers/${sellerId}/gifts`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
