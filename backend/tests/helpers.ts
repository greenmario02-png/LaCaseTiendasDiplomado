import request from 'supertest';
import { createApp } from '../src/app';

export const app = createApp();

export function getSessionId(prefix = 'test-sess') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function uniqueEmail(prefix = 'test') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@mail.com`;
}

export async function registerUser(overrides: Record<string, unknown> = {}) {
  const payload = {
    email: uniqueEmail(),
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    phone: '5551234',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(payload);
  return res;
}

export async function registerSeller(overrides: Record<string, unknown> = {}) {
  const payload = {
    email: uniqueEmail('seller'),
    password: 'password123',
    firstName: 'Seller',
    lastName: 'Shop',
    phone: '5917777777',
    storeName: 'Tienda Test',
    storeDescription: 'Vendemos productos variados de tecnologia',
    storeCategory: 'Hardware',
    country: 'Bolivia',
    locationCity: 'La Paz',
    locationState: 'La Paz',
    locationPostalCode: '0001',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/sellers/register').send(payload);
  return res;
}

export async function loginUser(email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res;
}

export async function getAdminToken() {
  // Admin del seed de test
  const res = await loginUser('admin@pctienda.com', 'admin123');
  if (res.status !== 200) {
    // Si no existe el admin, lo creamos
    await request(app).post('/api/auth/register').send({
      email: 'admin@pctienda.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'Principal',
    });
    // Elevar rol a admin directamente en BD
    const { prisma } = await import('../src/config/database');
    await prisma.user.update({ where: { email: 'admin@pctienda.com' }, data: { role: 'ADMIN', isApproved: true, isActive: true } });
    const res2 = await loginUser('admin@pctienda.com', 'admin123');
    return res2.body.data.accessToken as string;
  }
  return res.body.data.accessToken as string;
}

export async function getApprovedSellerToken() {
  const { prisma } = await import('../src/config/database');
  const seller = await prisma.user.findFirst({ where: { role: 'SELLER' } });

  if (seller) {
    // Actualizar password conocida para poder loguear
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('password123', 10);
    await prisma.user.update({ where: { id: seller.id }, data: { passwordHash: hash, isApproved: true, isActive: true } });
    const res = await loginUser(seller.email, 'password123');
    if (res.status === 200) return res.body.data.accessToken as string;
  }

  // Crear seller aprobado manualmente
  const reg = await registerSeller();
  const email = reg.body.data.email;
  await prisma.user.update({ where: { email }, data: { isApproved: true } });
  const res = await loginUser(email, 'password123');
  return res.body.data.accessToken as string;
}

/**
 * Crea una orden completa entregada (DELIVERED + paymentStatus VERIFIED) entre un
 * comprador y un vendedor, y devuelve el primer orderItemId para usarlo en devoluciones.
 */
export async function createOrderForTest(
  buyer: any,
  seller: any,
  buyerToken?: string
): Promise<{ orderId: number; orderItemId: number }> {
  const { prisma } = await import('../src/config/database');

  let product = await prisma.product.findFirst({
    where: { sellerId: seller.id, isActive: true, isApproved: true, stock: { gt: 0 } },
  });
  if (!product) {
    // Crear un producto para el vendedor si no tiene uno aprobado
    const category = await prisma.category.findFirst();
    if (!category) throw new Error('No hay categorías en la BD de test');
    product = await prisma.product.create({
      data: {
        name: `Producto Test ${Date.now()}`,
        slug: `producto-test-${Date.now()}`,
        sku: `SKU-TEST-${Date.now()}`,
        description: 'Producto de prueba para tests',
        price: 150,
        stock: 10,
        sellerId: seller.id,
        categoryId: category.id,
        isApproved: true,
        isActive: true,
        condition: 'NEW',
      },
    });
  }

  // Crear dirección de envío
  const address = await prisma.address.create({
    data: {
      userId: buyer.id,
      street: 'Calle Test 123',
      number: '123',
      city: 'La Paz',
      state: 'La Paz',
      postalCode: '0000',
      isDefault: true,
    },
  });

  // Agregar al carrito (con token del comprador para vincularlo al usuario)
  let addReq = request(app)
    .post('/api/cart/items')
    .send({ productId: product.id, quantity: 1 });
  if (buyerToken) addReq = addReq.set('Authorization', `Bearer ${buyerToken}`);
  else addReq = addReq.set('X-Session-Id', getSessionId());
  const res = await addReq;
  if (res.status >= 400) throw new Error('No se pudo agregar al carrito: ' + JSON.stringify(res.body));

  // Checkout (con token del comprador para vincular el carrito al usuario)
  let checkoutReq = request(app).post('/api/orders').send({ shippingAddressId: address.id });
  if (buyerToken) checkoutReq = checkoutReq.set('Authorization', `Bearer ${buyerToken}`);
  const checkout = await checkoutReq;
  const order = Array.isArray(checkout.body.data) ? checkout.body.data[0] : checkout.body.data;
  if (!order) throw new Error('No se creó la orden: ' + JSON.stringify(checkout.body));

  // Marcar entregada + pago verificado directo en BD
  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'DELIVERED', paymentStatus: 'VERIFIED' },
  });

  const item = await prisma.orderItem.findFirst({ where: { orderId: order.id } });
  if (!item) throw new Error('No hay items en la orden');

  return { orderId: order.id, orderItemId: item.id };
}
