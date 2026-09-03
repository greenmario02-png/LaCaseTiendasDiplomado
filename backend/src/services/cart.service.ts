import { randomUUID } from 'crypto';

import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';

export function getCartKey(req: AuthRequest): { userId?: number; sessionId?: string } {
  if (req.user) return { userId: req.user.id };
  const sessionId = req.headers['x-session-id'] as string | undefined;
  if (!sessionId) throw ApiError.badRequest('Se requiere X-Session-Id para carrito de invitado');
  return { sessionId };
}

export async function findOrCreateCart(key: { userId?: number; sessionId?: string }) {
  let cart = await prisma.cart.findFirst({
    where: key.userId ? { userId: key.userId } : { sessionId: key.sessionId },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: key.userId ? { userId: key.userId } : { sessionId: key.sessionId || randomUUID() },
    });
  }

  return cart;
}

export async function getCart(req: AuthRequest) {
  const key = getCartKey(req);
  const cart = await findOrCreateCart(key);

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      product: {
        include: {
          seller: {
            select: { id: true, storeName: true, locationCity: true, locationState: true, locationPostalCode: true, rating: true, paymentQrUrl: true },
          },
          images: { orderBy: { order: 'asc' as const }, take: 1, select: { url: true, isPrimary: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      },
      variant: true,
    },
  });

  // Agrupar por vendedor
  const grouped: Record<number, any> = {};
  let subtotal = 0;

  for (const item of items) {
    const sellerId = item.product.seller.id;
    if (!grouped[sellerId]) {
      grouped[sellerId] = {
        seller: item.product.seller,
        items: [],
        subtotal: 0,
      };
    }
    const lineTotal = Number(item.product.price) * item.quantity;
    grouped[sellerId].subtotal += lineTotal;
    subtotal += lineTotal;
    grouped[sellerId].items.push({
      id: item.id,
      quantity: item.quantity,
      unitPrice: Number(item.product.price),
      lineTotal,
      product: item.product,
      variant: item.variant,
    });
  }

  return {
    cartId: cart.id,
    items,
    groupedBySeller: Object.values(grouped),
    subtotal,
    itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
  };
}

export async function addItem(req: AuthRequest, productId: number, quantity: number, variantId?: number) {
  const key = getCartKey(req);
  const cart = await findOrCreateCart(key);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isActive: true, isApproved: true, stock: true, sellerId: true },
  });

  if (!product || !product.isActive || !product.isApproved) {
    throw ApiError.notFound('Producto no encontrado');
  }

  if (variantId) {
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || variant.productId !== productId) throw ApiError.badRequest('Variante inválida');
    if (variant.stock < quantity) throw ApiError.badRequest('Stock insuficiente de la variante');
  }

  if (product.stock < quantity) throw ApiError.badRequest('Stock insuficiente');

  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantId: variantId ?? null },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, variantId: variantId ?? null, quantity },
    });
  }

  return getCart(req);
}

export async function updateItemQuantity(req: AuthRequest, itemId: number, quantity: number) {
  if (quantity <= 0) throw ApiError.badRequest('La cantidad debe ser mayor a 0');

  const key = getCartKey(req);
  const cart = await findOrCreateCart(key);

  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
  if (!item) throw ApiError.notFound('Ítem no encontrado en el carrito');

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  return getCart(req);
}

export async function removeItem(req: AuthRequest, itemId: number) {
  const key = getCartKey(req);
  const cart = await findOrCreateCart(key);

  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
  if (!item) throw ApiError.notFound('Ítem no encontrado en el carrito');

  await prisma.cartItem.delete({ where: { id: itemId } });
  return getCart(req);
}

export async function clearCart(req: AuthRequest) {
  const key = getCartKey(req);
  const cart = await findOrCreateCart(key);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return { message: 'Carrito vaciado' };
}

export async function mergeGuestCart(userId: number, sessionId: string) {
  const guestCart = await prisma.cart.findUnique({ where: { sessionId } });
  if (!guestCart) return;

  const userCart = await prisma.cart.findFirst({ where: { userId } });

  if (!userCart) {
    await prisma.cart.update({ where: { id: guestCart.id }, data: { userId, sessionId: null } });
    return;
  }

  const guestItems = await prisma.cartItem.findMany({ where: { cartId: guestCart.id } });
  for (const item of guestItems) {
    const existing = await prisma.cartItem.findFirst({
      where: { cartId: userCart.id, productId: item.productId, variantId: item.variantId ?? null },
    });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        },
      });
    }
  }

  await prisma.cart.delete({ where: { id: guestCart.id } });
}
