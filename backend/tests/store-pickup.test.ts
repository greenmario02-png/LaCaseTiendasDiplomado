/**
 * Retiro en tienda: solo disponible cuando la tienda configuró su dirección real (storeAddress), y el
 * pedido usa esa dirección, nunca un texto escrito por el comprador.
 */
import request from 'supertest';

import { app } from './helpers';
import { fillCart, initCategory, mkProduct, mkUser, tk } from './factories';
import { prisma } from '../src/config/database';

async function sellerOption(buyer: { id: number; role: string }, sellerId: number) {
  const r = await request(app).get('/api/orders/checkout-options').set('Authorization', tk(buyer));
  expect(r.status).toBe(200);
  return r.body.data.sellers.find((x: any) => x.sellerId === sellerId);
}

beforeAll(async () => {
  await initCategory();
});

describe('GET /api/orders/checkout-options', () => {
  it('requiere sesión', async () => {
    expect((await request(app).get('/api/orders/checkout-options')).status).toBe(401);
  });

  it('tienda sin dirección: sin retiro en tienda', async () => {
    const seller = await mkUser('SELLER');
    const buyer = await mkUser('CUSTOMER');
    await fillCart(buyer.id, [{ productId: (await mkProduct(seller.id)).id }]);
    const s = await sellerOption(buyer, seller.id);
    expect(s).toMatchObject({ storePickup: false, storePickupAddress: null, storeName: seller.storeName });
  });

  it('dirección en blanco cuenta como sin dirección', async () => {
    const seller = await mkUser('SELLER', { storeAddress: '   ' });
    const buyer = await mkUser('CUSTOMER');
    await fillCart(buyer.id, [{ productId: (await mkProduct(seller.id)).id }]);
    expect((await sellerOption(buyer, seller.id)).storePickup).toBe(false);
  });

  it('tienda con dirección: retiro disponible con la dirección real', async () => {
    const seller = await mkUser('SELLER', { storeAddress: 'Av. Las Américas 742, Tarija' });
    const buyer = await mkUser('CUSTOMER');
    await fillCart(buyer.id, [{ productId: (await mkProduct(seller.id)).id }]);
    expect(await sellerOption(buyer, seller.id)).toMatchObject({ storePickup: true, storePickupAddress: 'Av. Las Américas 742, Tarija' });
  });
});

describe('POST /api/orders con retiro en tienda', () => {
  it('se rechaza si la tienda no tiene dirección, aunque el comprador escriba una', async () => {
    const seller = await mkUser('SELLER');
    const product = await mkProduct(seller.id);
    const buyer = await mkUser('CUSTOMER');
    await fillCart(buyer.id, [{ productId: product.id }]);
    const r = await request(app).post('/api/orders').set('Authorization', tk(buyer)).send({ fulfillmentType: 'PICKUP', pickupAddress: 'Dirección inventada 123' });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toContain('no tiene retiro en tienda');
    expect(await prisma.order.count({ where: { buyerId: buyer.id } })).toBe(0);
    expect((await prisma.product.findUnique({ where: { id: product.id } }))!.stock).toBe(50);
  });

  it('guarda la dirección real de la tienda e ignora el texto del comprador', async () => {
    const seller = await mkUser('SELLER', { storeAddress: 'Calle Real 55, Tarija' });
    const buyer = await mkUser('CUSTOMER');
    await fillCart(buyer.id, [{ productId: (await mkProduct(seller.id)).id }]);
    const r = await request(app).post('/api/orders').set('Authorization', tk(buyer)).send({ fulfillmentType: 'PICKUP', pickupAddress: 'Otra cosa' });
    expect(r.status).toBe(201);
    expect(r.body.data[0].pickupAddress).toBe('Calle Real 55, Tarija');
    expect(r.body.data[0].fulfillmentType).toBe('PICKUP');
  });

  it('funciona sin enviar pickupAddress', async () => {
    const seller = await mkUser('SELLER', { storeAddress: 'Calle Real 56, Tarija' });
    const buyer = await mkUser('CUSTOMER');
    await fillCart(buyer.id, [{ productId: (await mkProduct(seller.id)).id }]);
    const r = await request(app).post('/api/orders').set('Authorization', tk(buyer)).send({ fulfillmentType: 'PICKUP' });
    expect(r.status).toBe(201);
    expect(r.body.data[0].pickupAddress).toBe('Calle Real 56, Tarija');
  });

  it('carrito con dos tiendas: si una no tiene dirección se rechaza todo el pedido', async () => {
    const withAddr = await mkUser('SELLER', { storeAddress: 'Calle Real 57, Tarija' });
    const without = await mkUser('SELLER');
    const buyer = await mkUser('CUSTOMER');
    await fillCart(buyer.id, [{ productId: (await mkProduct(withAddr.id)).id }, { productId: (await mkProduct(without.id)).id }]);
    const r = await request(app).post('/api/orders').set('Authorization', tk(buyer)).send({ fulfillmentType: 'PICKUP' });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toContain(without.storeName!);
    expect(await prisma.order.count({ where: { buyerId: buyer.id } })).toBe(0);
  });

  it('carrito con dos tiendas con dirección: cada pedido lleva la dirección de su tienda', async () => {
    const a = await mkUser('SELLER', { storeAddress: 'Tienda A, Calle 1' });
    const b = await mkUser('SELLER', { storeAddress: 'Tienda B, Calle 2' });
    const buyer = await mkUser('CUSTOMER');
    await fillCart(buyer.id, [{ productId: (await mkProduct(a.id)).id }, { productId: (await mkProduct(b.id)).id }]);
    const r = await request(app).post('/api/orders').set('Authorization', tk(buyer)).send({ fulfillmentType: 'PICKUP' });
    expect(r.status).toBe(201);
    const bySeller = Object.fromEntries(r.body.data.map((o: any) => [o.sellerId, o.pickupAddress]));
    expect(bySeller[a.id]).toBe('Tienda A, Calle 1');
    expect(bySeller[b.id]).toBe('Tienda B, Calle 2');
  });

  it('el envío a domicilio no se ve afectado por la falta de dirección de la tienda', async () => {
    const seller = await mkUser('SELLER');
    const buyer = await mkUser('CUSTOMER');
    const addr = await prisma.address.create({
      data: { userId: buyer.id, street: 'Calle', number: '1', city: 'Tarija', state: 'Tarija', postalCode: '0001' },
    });
    await fillCart(buyer.id, [{ productId: (await mkProduct(seller.id)).id }]);
    const r = await request(app).post('/api/orders').set('Authorization', tk(buyer)).send({ fulfillmentType: 'SHIPPING', shippingAddressId: addr.id });
    expect(r.status).toBe(201);
    expect(r.body.data[0].pickupAddress).toBeNull();
  });
});

describe('PUT /api/seller/profile storeAddress', () => {
  it('el vendedor guarda y borra la dirección de su tienda', async () => {
    const seller = await mkUser('SELLER');
    const put = (storeAddress: string) => request(app).put('/api/seller/profile').set('Authorization', tk(seller)).send({ storeAddress });
    const r1 = await put('  Av. Victor Paz 10, Tarija  ');
    expect(r1.status).toBe(200);
    expect((await prisma.user.findUnique({ where: { id: seller.id } }))!.storeAddress).toBe('Av. Victor Paz 10, Tarija');
    const r2 = await put('');
    expect(r2.status).toBe(200);
    expect((await prisma.user.findUnique({ where: { id: seller.id } }))!.storeAddress).toBeNull();
  });
});
