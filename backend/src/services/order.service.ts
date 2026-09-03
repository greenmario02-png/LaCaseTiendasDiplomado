import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import { calculateShipping } from '../utils/shipping';

import { findOrCreateCart, getCartKey } from './cart.service';
import { getCommissionConfig, calculateCommission, sellerNet } from './commission.service';
import { evaluateGiftPromotions } from './gift.service';
import { getEffectivePrices } from './promotion.service';
import { createNotification } from './notification.service';
import { creditPurchaseCoins } from '../controllers/coins.controller';
import { getIO } from '../config/socket';

export interface ShippingQuote {
  sellerId: number;
  sellerName: string;
  sellerCity: string;
  sellerState: string;
  buyerCity: string | null;
  buyerState: string | null;
  shippingCost: number;
  subtotal: number;
  total: number;
}

export async function calculateShippingQuotes(req: AuthRequest, buyerPostalCode: string): Promise<ShippingQuote[]> {
  const key = getCartKey(req);
  const cart = await findOrCreateCart(key);

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      product: {
        include: {
          seller: {
            select: {
              id: true,
              storeName: true,
              locationCity: true,
              locationState: true,
              locationPostalCode: true,
            },
          },
        },
      },
    },
  });

  const groups: Record<number, { seller: any; subtotal: number; items: any[] }> = {};
  for (const item of items) {
    const sellerId = item.product.seller.id;
    if (!groups[sellerId]) {
      groups[sellerId] = { seller: item.product.seller, subtotal: 0, items: [] };
    }
    groups[sellerId].subtotal += Number(item.product.price) * item.quantity;
    groups[sellerId].items.push(item);
  }

  return Object.values(groups).map((g) => {
    const sellerPostal = g.seller.locationPostalCode || '1000';
    const shippingCost = calculateShipping(buyerPostalCode, sellerPostal);
    return {
      sellerId: g.seller.id,
      sellerName: g.seller.storeName,
      sellerCity: g.seller.locationCity,
      sellerState: g.seller.locationState,
      buyerCity: null,
      buyerState: null,
      subtotal: g.subtotal,
      shippingCost,
      total: g.subtotal + shippingCost,
    };
  });
}

export async function createOrdersFromCart(req: AuthRequest, shippingAddressId?: number, notes?: string, paymentQrUrl?: string, couponCode?: string, fulfillmentType: 'SHIPPING' | 'PICKUP' = 'SHIPPING', pickupAddress?: string) {
  const key = getCartKey(req);
  const cart = await findOrCreateCart(key);

  if (!['SHIPPING', 'PICKUP'].includes(fulfillmentType)) {
    throw ApiError.badRequest('fulfillmentType debe ser SHIPPING o PICKUP');
  }
  const isPickup = fulfillmentType === 'PICKUP';
  if (isPickup && !pickupAddress?.trim()) {
    throw ApiError.badRequest('Indica la direccion de retiro para el pedido en tienda');
  }
  if (!req.user) throw ApiError.unauthorized('Debes iniciar sesiÃ³n para comprar');

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      product: {
        include: {
          seller: {
            select: { id: true, storeName: true, locationPostalCode: true, locationCity: true, locationState: true },
          },
        },
      },
    },
  });

  if (items.length === 0) throw ApiError.badRequest('El carrito estÃ¡ vacÃ­o');

  // Validar y aplicar cupÃ³n si se enviÃ³
  let coupon: { id: number; type: string; value: number; minSpend: number | null } | null = null;
  const globalSubtotal = items.reduce((acc, item) => acc + Number(item.product.price) * item.quantity, 0);
  const cartProductIds = items.map((item) => item.productId);
  if (couponCode) {
    coupon = await validateCouponForOrder(couponCode.trim().toUpperCase(), globalSubtotal, cartProductIds, req.user.id);
  }

  let address = null;
  if (shippingAddressId) {
    address = await prisma.address.findFirst({
      where: { id: shippingAddressId, userId: req.user.id },
    });
    if (!address) throw ApiError.notFound('DirecciÃ³n no encontrada');
  }

  // Agrupar por seller
  const groups: Record<number, typeof items> = {};
  for (const item of items) {
    const sellerId = item.product.sellerId;
    if (!groups[sellerId]) groups[sellerId] = [];
    groups[sellerId].push(item);
  }

  const orders = [];

  for (const [sellerIdStr, sellerItems] of Object.entries(groups)) {
    const sellerId = Number(sellerIdStr);
    const seller = sellerItems[0].product.seller;
    const effectivePrices = await getEffectivePrices(sellerId, sellerItems);
    const subtotal = sellerItems.reduce(
      (acc, item) => acc + (effectivePrices.get(item.productId)?.unitPrice ?? Number(item.product.price)) * item.quantity,
      0,
    );
    const shippingCost = !isPickup && address
      ? calculateShipping(address.postalCode, seller.locationPostalCode || '1000')
      : 0;

    // Evaluar promociones de regalo de la tienda (agrega productos gratis a la orden)
    const giftPromos = await evaluateGiftPromotions(sellerId, sellerItems, subtotal);

    const order = await prisma.$transaction(async (tx) => {
      // Validar y descontar stock
      for (const item of sellerItems) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw ApiError.badRequest(`Producto ${item.productId} no existe`);
        if (product.stock < item.quantity) {
          throw ApiError.badRequest(`Stock insuficiente de "${product.name}" (quedan ${product.stock})`);
        }
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            saleCount: { increment: item.quantity },
          },
        });
      }

      // ComisiÃ³n de la plataforma
      const commissionConfig = await getCommissionConfig();
      const commission = calculateCommission(subtotal, shippingCost, commissionConfig);
      const net = sellerNet(subtotal, shippingCost, commission);

      // Aplicar descuento del cupÃ³n proporcional al subtotal de esta orden
      let discountAmount = 0;
      let couponId: number | null = null;
      if (coupon) {
        couponId = coupon.id;
        if (coupon.type === 'FIXED') {
          // Monto fijo: se reparte proporcionalmente al subtotal de cada tienda
          discountAmount = globalSubtotal > 0 ? (coupon.value * subtotal) / globalSubtotal : 0;
        } else if (coupon.type === 'GIFT') {
          // CupÃ³n de regalo: el valor ya es min(restante, subtotalGlobal); repartir proporcional
          discountAmount = globalSubtotal > 0 ? (coupon.value * subtotal) / globalSubtotal : 0;
        } else {
          discountAmount = Math.round(subtotal * (coupon.value / 100) * 100) / 100;
        }
        discountAmount = Math.min(discountAmount, subtotal);
      }

      return tx.order.create({
        data: {
          buyerId: req.user!.id,
          sellerId,
          status: 'PENDING',
          subtotal,
          shippingCost,
          discountAmount: discountAmount > 0 ? discountAmount : null,
          couponId,
          total: subtotal + shippingCost - discountAmount,
          commission: commission > 0 ? commission : null,
          sellerNet: net,
          paymentMethod: 'QR',
          paymentStatus: 'PENDING',
          paymentQrUrl: paymentQrUrl || null,
          shippingAddressId: !isPickup ? address?.id ?? null : null,
          fulfillmentType,
          pickupAddress: isPickup ? pickupAddress?.trim() : null,
          notes: notes || null,
          items: {
            create: [
              ...sellerItems.map((item) => {
                const eff = effectivePrices.get(item.productId);
                return {
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: eff?.unitPrice ?? item.product.price,
                  promotionId: eff?.promotionId ?? null,
                  promotionTitle: eff?.promotionTitle ?? null,
                };
              }),
              ...giftPromos.map((g) => ({
                productId: g.productId,
                quantity: 1,
                unitPrice: 0,
                isGift: true,
                giftLabel: g.label,
              })),
            ],
          },
        },
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
          seller: { select: { storeName: true, paymentQrUrl: true } },
        },
      });
    });

    orders.push(order);

    // Descontar el presupuesto (maxSpend) de las promociones aplicadas a esta orden
    const appliedDiscounts = new Map<number, number>();
    for (const item of sellerItems) {
      const eff = effectivePrices.get(item.productId);
      if (eff?.promotionId) {
        const prev = appliedDiscounts.get(eff.promotionId) ?? 0;
        appliedDiscounts.set(eff.promotionId, prev + eff.discountAmount * item.quantity);
      }
    }
    for (const [promoId, discount] of appliedDiscounts) {
      const promo = await prisma.promotion.findUnique({
        where: { id: promoId },
        select: { spentAmount: true },
      });
      const prevSpent = promo?.spentAmount ? Number(promo.spentAmount) : 0;
      await prisma.promotion.update({
        where: { id: promoId },
        data: { spentAmount: Math.round((prevSpent + discount) * 100) / 100 },
      });
    }

    // Notificar al vendedor de la nueva venta
    try {
      const totalItems = sellerItems.reduce((acc, item) => acc + item.quantity, 0);
      await createNotification({
        userId: sellerId,
        type: 'NEW_ORDER',
        title: 'Â¡Nueva venta! ðŸŽ‰',
        message: `Recibiste un pedido de ${totalItems} Ã­tem(s) por ${order.total} Bs`,
        refType: 'order',
        refId: order.id,
      });
    } catch (error) {
      // La notificaciÃ³n no debe impedir que la orden se complete
      logger.warn('No se pudo notificar la venta', { error: (error as Error).message });
    }
  }

  // Vaciar carrito
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  // Registrar el uso del cupÃ³n
  if (coupon) {
    if (coupon.type === 'GIFT') {
      // El cupÃ³n de regalo acumula el gasto; el saldo restante se devuelve en efectivo.
      // Prisma NO hace COALESCE en increment sobre campos nullable â†’ leer y fijar.
      const current = await prisma.coupon.findUnique({ where: { id: coupon.id }, select: { spentAmount: true } });
      const prev = current?.spentAmount ? Number(current.spentAmount) : 0;
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: {
          usesCount: { increment: 1 },
          spentAmount: prev + Math.min(coupon.value, globalSubtotal),
        },
      });
      // Registrar el uso del cupÃ³n por este usuario (para isSingleUse / perUserLimit)
      const firstOrder = orders.length > 0 ? orders[0] : null;
      await prisma.couponUsage.upsert({
        where: { couponId_userId: { couponId: coupon.id, userId: req.user.id } },
        create: { couponId: coupon.id, userId: req.user.id, orderId: firstOrder?.id ?? 0, amount: Math.min(coupon.value, globalSubtotal),  },
        update: {},
      });
    } else {
      // FIXED/PERCENTAGE: acumular el presupuesto gastado (maxSpend) para anti-abuso
      const cur = await prisma.coupon.findUnique({ where: { id: coupon.id }, select: { spentAmount: true } });
      const sp = cur?.spentAmount ? Number(cur.spentAmount) : 0;
      const realDiscount = coupon.type === 'PERCENTAGE'
        ? Math.min(Math.round(Number(globalSubtotal) * (Number(coupon.value) / 100) * 100) / 100, Number(globalSubtotal))
        : Math.min(Number(coupon.value), Number(globalSubtotal));
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { usesCount: { increment: 1 }, spentAmount: Math.round((sp + realDiscount) * 100) / 100 },
      });
      const firstOrder = orders.length > 0 ? orders[0] : null;
      await prisma.couponUsage.upsert({
        where: { couponId_userId: { couponId: coupon.id, userId: req.user.id } },
        create: { couponId: coupon.id, userId: req.user.id, orderId: firstOrder?.id ?? 0, amount: realDiscount },
        update: {},
      });
    }
  }

  // Ticker de ventas en tiempo real: emitir evento global con la compra más reciente
  try {
    const io = getIO();
    if (io && orders.length > 0) {
      const firstOrder = orders[0];
      const buyer = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { locationCity: true, locationState: true },
      });
      const firstItem = firstOrder.items[0];
      io.emit('order:created', {
        productName: firstItem?.product?.name ?? 'Producto',
        storeName: firstOrder.seller?.storeName ?? 'Tienda',
        city: buyer?.locationCity ?? address?.city ?? 'Bolivia',
        amount: Number(firstOrder.total),
        orderId: firstOrder.id,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (tickerError) {
    // El ticker nunca debe impedir completar la orden
    logger.warn('No se pudo emitir el ticker de venta', { error: (tickerError as Error).message });
  }

  return orders;
}

/** Valida un cupÃ³n para aplicar en una orden: activo, vigente, lÃ­mite y monto mÃ­nimo. */
export async function validateCouponForOrder(code: string, subtotal: number, productIdsInCart?: number[], userId?: number) {
  const coupon = await prisma.coupon.findUnique({ where: { code }, include: { products: true } });
  if (!coupon) throw ApiError.badRequest('CupÃ³n no vÃ¡lido');
  if (!coupon.isActive) throw ApiError.badRequest('El cupÃ³n estÃ¡ inactivo');
  const now = new Date();
  if (coupon.startDate && coupon.startDate > now) throw ApiError.badRequest('El cupÃ³n aÃºn no estÃ¡ activo');
  if (coupon.endDate && coupon.endDate < now) throw ApiError.badRequest('El cupÃ³n expirÃ³');
  if (coupon.maxUses && coupon.usesCount >= coupon.maxUses) throw ApiError.badRequest('El cupÃ³n alcanzÃ³ su lÃ­mite de usos');

  // Presupuesto total del cupÃ³n agotado (maxSpend) â€” evita el "agotar el beneficio"
  if (coupon.maxSpend) {
    const spent = Number(coupon.spentAmount ?? 0);
    if (spent >= Number(coupon.maxSpend)) throw ApiError.badRequest('El cupÃ³n agotÃ³ su presupuesto de descuento');
  }

  // LÃ­mite de usos por usuario (perUserLimit) â€” evita que un usuario acapare el beneficio
  if (coupon.perUserLimit && userId) {
    const userUses = await prisma.couponUsage.count({ where: { couponId: coupon.id, userId } });
    if (userUses >= coupon.perUserLimit) throw ApiError.badRequest('Ya usaste este cupÃ³n el mÃ¡ximo de veces permitido');
  }

  // CupÃ³n de un solo uso por usuario (isSingleUse)
  if (coupon.isSingleUse && userId) {
    const used = await prisma.couponUsage.findUnique({ where: { couponId_userId: { couponId: coupon.id, userId } } });
    if (used) throw ApiError.badRequest('Ya usaste este cupÃ³n en otra compra');
  }

  // CupÃ³n restringido a productos especÃ­ficos: el carrito debe contener al menos uno
  if (coupon.products.length > 0 && productIdsInCart?.length) {
    const allowed = new Set(coupon.products.map((p) => p.productId));
    const hasAllowed = productIdsInCart.some((pid) => allowed.has(pid));
    if (!hasAllowed) throw ApiError.badRequest('El cupÃ³n no aplica a los productos de tu carrito');
  }

  if (coupon.type === 'GIFT') {
    const remaining = Number(coupon.value) - Number(coupon.spentAmount ?? 0);
    if (remaining <= 0) throw ApiError.badRequest('El cupÃ³n de regalo ya fue agotado');
    return { id: coupon.id, type: 'GIFT', value: Math.min(remaining, subtotal), remaining, minSpend: coupon.minSpend ? Number(coupon.minSpend) : null };
  }

  if (coupon.minSpend && subtotal < Number(coupon.minSpend)) {
    throw ApiError.badRequest(`El cupón requiere un pedido mínimo de ${Number(coupon.minSpend)} Bs`);
  }

  // Un cupón FIXED/PERCENTAGE no puede exceder el presupuesto restante del cupón (maxSpend)
  let value = Number(coupon.value);
  if (coupon.maxSpend) {
    const spent = Number(coupon.spentAmount ?? 0);
    const remaining = Number(coupon.maxSpend) - spent;
    if (coupon.type === 'FIXED') {
      value = Math.min(value, Math.max(remaining, 0));
      if (value <= 0) throw ApiError.badRequest('El cupón agotó su presupuesto de descuento');
    }
  }
  return { id: coupon.id, type: coupon.type, value, minSpend: coupon.minSpend ? Number(coupon.minSpend) : null };
}

export async function getBuyerOrders(userId: number, page = 1, limit = 20) {
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { buyerId: userId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: { select: { id: true, name: true, images: { take: 1, select: { url: true } } } } } },
        seller: { select: { storeName: true } },
      },
    }),
    prisma.order.count({ where: { buyerId: userId } }),
  ]);

  return { data: orders, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getBuyerOrderById(userId: number, orderId: number) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, buyerId: userId },
    include: {
      items: { include: { product: { select: { id: true, name: true, images: { take: 1, select: { url: true } } } } } },
      seller: { select: { storeName: true, paymentQrUrl: true, locationCity: true } },
      shippingAddress: true,
    },
  });

  if (!order) throw ApiError.notFound('Orden no encontrada');
  return order;
}

export async function submitPaymentProof(orderId: number, userId: number, proofUrl: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, buyerId: userId } });
  if (!order) throw ApiError.notFound('Orden no encontrada');
  if (order.paymentStatus === 'VERIFIED') throw ApiError.badRequest('El pago ya fue verificado');

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: 'PROOF_SUBMITTED', paymentProofUrl: proofUrl },
  });

  // Notificar al vendedor que hay un comprobante por revisar
  await createNotification({
    userId: order.sellerId,
    type: 'PAYMENT_PROOF',
    title: 'Comprobante de pago enviado',
    message: `El comprador subiÃ³ el comprobante de la orden #${orderId}. Revisalo.`,
    refType: 'order',
    refId: orderId,
  });

  return updated;
}

export async function getSellerOrders(sellerId: number, page = 1, limit = 20, status?: string) {
  const where = { sellerId, ...(status ? { status: status as any } : {}) };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: { include: { product: { select: { id: true, name: true, images: { take: 1, select: { url: true } } } } } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return { data: orders, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function updateOrderStatus(sellerId: number, orderId: number, status: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, sellerId } });
  if (!order) throw ApiError.notFound('Orden no encontrada');

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: status as any, ...(status === 'DELIVERED' ? { deliveredAt: new Date() } : {}) },
  });

  const statusLabels: Record<string, string> = {
    CONFIRMED: 'confirmada',
    PREPARING: 'en preparación',
    SHIPPED: 'enviada',
    DELIVERED: 'entregada',
    CANCELLED: 'cancelada',
  };
  const isPickup = order.fulfillmentType === 'PICKUP';
  const title = status === 'DELIVERED' && isPickup
    ? `Tu pedido #${orderId} está listo para retirar 📦`
    : `Tu pedido #${orderId} ${statusLabels[status] ?? 'actualizado'}`;
  const message = status === 'DELIVERED' && isPickup
    ? `Tu pedido #${orderId} ya está listo para retirar en ${order.pickupAddress ?? 'la tienda'}.`
    : `El vendedor actualizó el estado de tu orden #${orderId} a "${statusLabels[status] ?? status}".`;
  // Notificar al comprador del cambio de estado
  await createNotification({
    userId: order.buyerId,
    type: 'ORDER_STATUS',
    title,
    message,
    refType: 'order',
    refId: orderId,
  });

  return updated;
}

/**
 * ConfirmaciÃ³n de entrega por el COMPRADOR (mecanismo de confianza / escrow).
 * Solo puede confirmar el comprador, y solo cuando la orden estÃ¡ SHIPPED o DELIVERED.
 * Al confirmar, la orden pasa a CONFIRMED y el sellerNet se libera al vendedor.
 */
export async function confirmDelivery(buyerId: number, orderId: number) {
  const order = await prisma.order.findFirst({ where: { id: orderId, buyerId } });
  if (!order) throw ApiError.notFound('Orden no encontrada');

  if (!['SHIPPED', 'DELIVERED', 'PENDING', 'PROOF_SUBMITTED', 'CONFIRMED'].includes(order.status as string)) {
    throw ApiError.badRequest('La orden no estÃ¡ en un estado que permita confirmar la entrega');
  }
  if (order.paymentStatus !== 'VERIFIED') {
    throw ApiError.badRequest('El pago debe estar verificado para confirmar la entrega');
  }
  if (order.status === 'CONFIRMED') {
    throw ApiError.badRequest('Ya confirmaste la entrega de esta orden');
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: 'CONFIRMED' },
  });

  await createNotification({
    userId: order.sellerId,
    type: 'ORDER_STATUS',
    title: `Pedido #${orderId} confirmado ðŸŽ‰`,
    message: 'El comprador confirmÃ³ la recepciÃ³n. El pago de esta venta se liberÃ³ a tu balance.',
    refType: 'order',
    refId: orderId,
  });

  return updated;
}

export async function updatePaymentStatus(sellerId: number, orderId: number, paymentStatus: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, sellerId } });
  if (!order) throw ApiError.notFound('Orden no encontrada');

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: paymentStatus as any },
  });

  // Notificar al comprador cuando el pago es verificado o rechazado
  if (paymentStatus === 'VERIFIED') {
    await createNotification({
      userId: order.buyerId,
      type: 'PAYMENT_VERIFIED',
      title: 'Pago verificado âœ…',
      message: `El pago de tu orden #${orderId} fue verificado. El vendedor prepararÃ¡ el envÃ­o.`,
      refType: 'order',
      refId: orderId,
    });

    // Si la orden pertenece a una subasta, marcarla como pagada
    const auction = await prisma.auction.findFirst({ where: { orderId } });
    if (auction) {
      await prisma.auction.update({ where: { id: auction.id }, data: { isPaid: true } });
    }

    // ComisiÃ³n del afiliado: si el comprador fue referido, el afiliado gana un %
      const referral = await prisma.affiliateReferral.findFirst({
        where: { referredId: order.buyerId, status: 'REGISTERED', orderId: null },
        include: { affiliate: true },
      });
      if (referral && referral.affiliate) {
        const base = Number(order.subtotal ?? 0);
        const commission = Math.round(base * Number(referral.affiliate.commissionPct) / 100 * 100) / 100;
        await prisma.$transaction([
          prisma.affiliateReferral.update({
            where: { id: referral.id },
            data: { status: 'ORDER_PAID', orderId, commission },
          }),
          prisma.affiliate.update({
            where: { id: referral.affiliateId },
            data: { balance: { increment: commission } },
          }),
        ]);
      }
  // Monedas del proyecto: compra efectiva (sin devolución) acredita monedas al comprador
  void creditPurchaseCoins(order.buyerId, orderId, Number(order.total ?? 0));

  } else if (paymentStatus === 'REJECTED') {
    await createNotification({
      userId: order.buyerId,
      type: 'PAYMENT_VERIFIED',
      title: 'Comprobante rechazado',
      message: `El comprobante de tu orden #${orderId} fue rechazado. ContactÃ¡ al vendedor.`,
      refType: 'order',
      refId: orderId,
    });
  }

  return updated;
}

export { getCartKey };
