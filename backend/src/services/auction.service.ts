import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { getIO } from '../config/socket';

import { createNotification } from './notification.service';

const AUCTION_INCLUDE = {
  seller: { select: { id: true, storeName: true, rating: true } },
  winner: { select: { id: true, firstName: true, lastName: true } },
  category: { select: { id: true, name: true } },
  product: { select: { id: true, name: true, images: { take: 1, select: { url: true } } } },
  bids: {
    orderBy: { createdAt: 'desc' as const },
    include: { bidder: { select: { id: true, firstName: true, lastName: true, storeName: true } } },
  },
  proxyBids: {
    orderBy: { maxBid: 'desc' as const },
    select: { userId: true, maxBid: true },
  },
};

export function formatAuction(a: any, viewerId?: number) {
  const now = Date.now();
  const isExpired = new Date(a.endDate).getTime() < now;
  const current = Number(a.currentPrice);
  const starting = Number(a.startingPrice);
  const reserve = a.reservePrice ? Number(a.reservePrice) : null;
  const buyNow = a.buyNowPrice ? Number(a.buyNowPrice) : null;

  // Determinar el incremento dinámico según el precio actual (estilo eBay)
  const increment = getDynamicIncrement(current, a.incrementType, Number(a.minIncrement), Number(a.maxIncrement));

  // ¿El usuario es el mejor postor? (el ganador es quien tiene el proxy más alto)
  let isHighestBidder = false;
  let myProxyBid: number | null = null;
  if (viewerId && a.proxyBids?.length) {
    const sorted = [...a.proxyBids].sort((x: any, y: any) => Number(y.maxBid) - Number(x.maxBid));
    isHighestBidder = sorted[0]?.userId === viewerId;
    const mine = a.proxyBids.find((p: any) => p.userId === viewerId);
    if (mine) myProxyBid = Number(mine.maxBid);
  }

  // ¿Se alcanzó la reserva?
  const reserveMet = reserve !== null ? current >= reserve : true;

  return {
    ...a,
    bidsCount: a.bids?.length ?? 0,
    timeLeftMs: Math.max(0, new Date(a.endDate).getTime() - now),
    isExpired,
    currentPrice: current,
    startingPrice: starting,
    minIncrement: increment,
    maxIncrement: a.maxIncrement ? Number(a.maxIncrement) : increment,
    nextBid: current + increment,
    reservePrice: reserve,
    reserveMet,
    buyNowPrice: buyNow,
    isHighestBidder,
    myProxyBid,
    winnerId: a.winnerId,
    orderId: a.orderId,
    isPaid: a.isPaid,
    paymentDeadline: a.paymentDeadline ? new Date(a.paymentDeadline).getTime() : null,
    _count: undefined,
  };
}

/**
 * Incremento dinámico por rango de precio (estilo eBay):
 * precios más altos → incrementos más grandes.
 */
export function getDynamicIncrement(currentPrice: number, type: string, minIncr: number, maxIncr: number): number {
  if (type === 'fixed') return minIncr;
  if (currentPrice < 100) return Math.max(1, minIncr);
  if (currentPrice < 500) return Math.max(5, Math.min(50, Math.ceil(currentPrice * 0.02)));
  if (currentPrice < 2000) return Math.max(10, Math.min(100, Math.ceil(currentPrice * 0.02)));
  if (currentPrice < 10000) return Math.max(50, Math.min(500, Math.ceil(currentPrice * 0.015)));
  return Math.max(100, Math.min(maxIncr, Math.ceil(currentPrice * 0.01)));
}

/**
 * Extiende la subasta si una oferta llega dentro de la ventana anti-sniping.
 * Retorna true si se extendió.
 */
export function maybeExtend(auction: { endDate: Date; extensionMinutes: number }, now = new Date()): boolean {
  if (auction.extensionMinutes <= 0) return false;
  const ends = new Date(auction.endDate).getTime();
  const remaining = ends - now.getTime();
  const window = auction.extensionMinutes * 60 * 1000;
  // Si queda menos que la ventana, extender
  if (remaining > 0 && remaining < window) {
    return true;
  }
  return false;
}

/**
 * Procesa una oferta con proxy bidding (estilo eBay):
 * - La oferta del usuario se guarda como su "máximo" (proxy bid).
 * - El precio mostrado es el mínimo necesario para ganar:
 *   (segundo mejor proxy o inicial) + incremento, sin superar el máximo del ganador.
 * - El ganador es quien tiene el proxy más alto.
 */
export async function processBid(auctionId: number, bidderId: number, bidAmount: number) {
  const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
  if (!auction) throw ApiError.notFound('Subasta no encontrada');
  if (auction.endDate.getTime() < Date.now()) throw ApiError.badRequest('La subasta ya terminó');
  if (auction.sellerId === bidderId) throw ApiError.forbidden('No podés ofertar en tu propia subasta');

  const current = Number(auction.currentPrice);
  const starting = Number(auction.startingPrice);
  const increment = getDynamicIncrement(current, auction.incrementType, Number(auction.minIncrement), Number(auction.maxIncrement));
  const minBid = Math.max(current, starting) + increment;

  if (bidAmount < minBid) {
    throw ApiError.badRequest(`La oferta debe ser al menos ${minBid} Bs`);
  }

  // Transacción atómica
  return prisma.$transaction(async (tx) => {
    const locked = await tx.auction.findUnique({ where: { id: auctionId } });
    if (!locked) throw ApiError.notFound('Subasta no encontrada');
    if (locked.endDate.getTime() < Date.now()) throw ApiError.badRequest('La subasta ya terminó');

    const lockedCurrent = Number(locked.currentPrice);
    const lockedStarting = Number(locked.startingPrice);
    const lockedIncrement = getDynamicIncrement(lockedCurrent, locked.incrementType, Number(locked.minIncrement), Number(locked.maxIncrement));

    // 1. Guardar/actualizar el proxy del usuario
    await tx.auctionProxyBid.upsert({
      where: { auctionId_userId: { auctionId, userId: bidderId } },
      create: { auctionId, userId: bidderId, maxBid: bidAmount },
      update: { maxBid: bidAmount },
    });

    // 2. Resolver: el ganador es quien tiene el proxy más alto
    const allProxies = await tx.auctionProxyBid.findMany({
      where: { auctionId },
      orderBy: { maxBid: 'desc' },
    });

    const winnerProxy = allProxies[0];
    if (!winnerProxy) throw ApiError.badRequest('No se pudo resolver la oferta');
    const winnerMax = Number(winnerProxy.maxBid);
    const secondMax = allProxies.length > 1 ? Number(allProxies[1].maxBid) : lockedStarting;

    // Precio = min(ganador, (segundo mejor + incremento)), nunca menos que inicial+incremento
    const priceToBeat = Math.max(secondMax, lockedStarting) + lockedIncrement;

    // La reserva actúa como piso: si el ganador cubre la reserva, el precio sube al menos hasta ella
    let floor = priceToBeat;
    const reserve = locked.reservePrice ? Number(locked.reservePrice) : null;
    if (reserve !== null && winnerMax >= reserve) {
      floor = Math.max(priceToBeat, reserve);
    }

    const newPrice = Math.min(winnerMax, floor);
    const resolvedBidderId = winnerProxy.userId;

    // 3. Registrar en historial (cada intento de oferta queda registrado)
    const bid = await tx.auctionBid.create({
      data: { auctionId, bidderId, bidAmount: newPrice },
    });

    // 4. Actualizar precio actual
    await tx.auction.update({
      where: { id: auctionId },
      data: { currentPrice: newPrice },
    });

    // 5. Extensión anti-sniping
    const shouldExtend = maybeExtend(locked);
    let extendedTo: Date | null = null;
    if (shouldExtend) {
      extendedTo = new Date(locked.endDate.getTime() + locked.extensionMinutes * 60 * 1000);
      await tx.auction.update({ where: { id: auctionId }, data: { endDate: extendedTo } });
    }

    return { bid, newPrice, resolvedBidderId, extendedTo };
  });
}

/**
 * Compra inmediata (Buy It Now): cierra la subasta y asigna el ganador.
 */
export async function buyNow(auctionId: number, buyerId: number) {
  return prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({ where: { id: auctionId } });
    if (!auction) throw ApiError.notFound('Subasta no encontrada');
    if (auction.endDate.getTime() < Date.now()) throw ApiError.badRequest('La subasta ya terminó');
    if (auction.sellerId === buyerId) throw ApiError.forbidden('No podés comprar tu propia subasta');
    if (!auction.buyNowPrice) throw ApiError.badRequest('Esta subasta no tiene compra directa');
    if (auction.isSold) throw ApiError.badRequest('Ya fue vendida');

    const price = Number(auction.buyNowPrice);

    // Registrar oferta de compra directa
    await tx.auctionBid.create({
      data: { auctionId, bidderId: buyerId, bidAmount: price },
    });

    // Cerrar subasta
    const closed = await tx.auction.update({
      where: { id: auctionId },
      data: {
        currentPrice: price,
        winnerId: buyerId,
        isSold: true,
        endDate: new Date(),
        isActive: false,
      },
    });

    // Notificar al vendedor (venta por Buy It Now) y al comprador (ganó)
    await createNotification({
      userId: auction.sellerId,
      type: 'AUCTION_SOLD',
      title: '¡Tu subasta se vendió! 🎉',
      message: `"${auction.title}" se vendió por ${price} Bs con compra directa.`,
      refType: 'auction',
      refId: auctionId,
    });
    await createNotification({
      userId: buyerId,
      type: 'AUCTION_WON',
      title: '¡Compraste con Buy It Now! 🎉',
      message: `Compraste "${auction.title}" por ${price} Bs. Coordiná con el vendedor.`,
      refType: 'auction',
      refId: auctionId,
    });

    return closed;
  });
}

/** Añade/quita una subasta al watchlist del usuario. Devuelve { watched: boolean } */
export async function toggleWatchlist(auctionId: number, userId: number): Promise<{ watched: boolean }> {
  const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
  if (!auction) throw ApiError.notFound('Subasta no encontrada');

  const existing = await prisma.auctionWatchlist.findUnique({
    where: { auctionId_userId: { auctionId, userId } },
  });

  if (existing) {
    await prisma.auctionWatchlist.delete({ where: { id: existing.id } });
    return { watched: false };
  }
  await prisma.auctionWatchlist.create({ data: { auctionId, userId } });
  return { watched: true };
}

/** Notifica por socket + notificación persistente al usuario superado (outbid) */
export async function notifyOutbid(auctionId: number, oldWinnerId: number | null, newBid: number) {
  if (!oldWinnerId) return;
  const io = getIO();
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { id: true, title: true },
  });
  if (!auction) return;
  if (io) {
    io.to(`user:${oldWinnerId}`).emit('auction:outbid', {
      auctionId,
      title: auction.title,
      newBid,
    });
  }
  await createNotification({
    userId: oldWinnerId,
    type: 'OUTBID',
    title: '¡La puja se calentó! 🔥',
    message: `Alguien superó tu oferta en "${auction.title}". Ahora está en ${newBid} Bs — volvé a pujar y no pierdas tu lugar. 💪`,
    refType: 'auction',
    refId: auctionId,
  });
}

export { AUCTION_INCLUDE };
