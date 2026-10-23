import { prisma } from '../src/config/database';
import { signAccessToken } from '../src/utils/jwt';

/** Fábricas mínimas de datos para pruebas de integración (usuarios, productos, carrito, token). */

const sfx = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
let seq = 0;
let categoryId = 0;

export async function initCategory() {
  categoryId = (await prisma.category.findFirstOrThrow()).id;
}

export async function mkUser(role: 'CUSTOMER' | 'SELLER' | 'ADMIN' = 'CUSTOMER', extra: Record<string, unknown> = {}) {
  const n = ++seq;
  return prisma.user.create({
    data: {
      email: `fx-${role.toLowerCase()}-${n}-${sfx}@t.com`,
      passwordHash: 'x',
      firstName: 'Fx',
      lastName: `U${n}`,
      role,
      isApproved: true,
      isActive: true,
      storeName: role === 'SELLER' ? `Tienda FX${n}` : null,
      storeRole: 'OWNER',
      locationCity: role === 'SELLER' ? 'Tarija' : null,
      locationPostalCode: '0001',
      ...extra,
    } as any,
  });
}

export const tk = (u: { id: number; role: string }) => `Bearer ${signAccessToken({ userId: u.id, role: u.role } as any)}`;

export async function mkProduct(sellerId: number, price = 100, stock = 50) {
  const n = ++seq;
  return prisma.product.create({
    data: { sellerId, categoryId, name: `Prod FX ${n}`, slug: `fx-prod-${n}-${sfx}`, sku: `FX-${n}-${sfx}`, description: 'x', price, stock, isActive: true, isApproved: true, condition: 'NEW' } as any,
  });
}

export async function fillCart(userId: number, items: { productId: number; quantity?: number }[]) {
  const cart = (await prisma.cart.findFirst({ where: { userId } })) ?? (await prisma.cart.create({ data: { userId } }));
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  for (const i of items) await prisma.cartItem.create({ data: { cartId: cart.id, productId: i.productId, quantity: i.quantity ?? 1 } });
  return cart;
}
