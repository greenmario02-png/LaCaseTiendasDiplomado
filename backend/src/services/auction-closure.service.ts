import { prisma } from '../config/database';
import { createNotification } from './notification.service';
import { logger } from '../utils/logger';
import { getCommissionConfig, calculateCommission, sellerNet } from './commission.service';

const PAYMENT_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 horas (estilo eBay/AliExpress)

/**
 * Cierra subastas expiradas y gestiona el ciclo de pago del ganador.
 * - Subasta expirada sin ganador → define ganador y CREA UNA ORDEN DE PAGO con plazo de 48h.
 * - Subasta ganada sin pagar y con plazo vencido → cancela la orden y RELISTA al mismo precio.
 */
export async function processAuctionClosures() {
  const now = new Date();
  let closed = 0;
  let relisted = 0;

  // 1. Subastas expiradas, activas, sin ganador
  const expired = await prisma.auction.findMany({
    where: { isActive: true, isSold: false, endDate: { lt: now } },
    include: {
      bids: { orderBy: { bidAmount: 'desc' } },
      product: { select: { id: true, name: true, stock: true, sellerId: true } },
      seller: { select: { id: true, paymentQrUrl: true, locationPostalCode: true } },
    },
    take: 50,
  });

  for (const auction of expired) {
    if (auction.bids.length === 0) {
      // Sin ofertas: marcar inactiva (no vendida)
      await prisma.auction.update({ where: { id: auction.id }, data: { isActive: false } });
      continue;
    }

    const highest = auction.bids[0];
    const reserve = auction.reservePrice ? Number(auction.reservePrice) : null;
    if (reserve && Number(highest.bidAmount) < reserve) {
      // No alcanzó la reserva → no se vende
      await prisma.auction.update({ where: { id: auction.id }, data: { isActive: false, isSold: false } });
      await createNotification({
        userId: highest.bidderId,
        type: 'AUCTION_ENDED',
        title: 'Subasta finalizada sin venta',
        message: `"${auction.title}" no alcanzó el precio de reserva. No se realizó la venta.`,
        refType: 'auction',
        refId: auction.id,
      });
      continue;
    }

    // GANADOR: crear la orden de pago estilo eBay (plazo 48h)
    const paymentDeadline = new Date(now.getTime() + PAYMENT_WINDOW_MS);
    const winnerId = highest.bidderId;
    const finalPrice = Number(highest.bidAmount);

    // Comisión de la plataforma
    const commissionConfig = await getCommissionConfig();
    const commission = calculateCommission(finalPrice, 0, commissionConfig);
    const net = sellerNet(finalPrice, 0, commission);

    try {
      const order = await prisma.$transaction(async (tx) => {
        // Descontar stock del producto (si hay)
        if (auction.productId) {
          const product = await tx.product.findUnique({ where: { id: auction.productId } });
          if (product && product.stock > 0) {
            await tx.product.update({
              where: { id: auction.productId },
              data: { stock: { decrement: 1 }, saleCount: { increment: 1 } },
            });
          }
        }

        return tx.order.create({
          data: {
            buyerId: winnerId,
            sellerId: auction.sellerId,
            status: 'PENDING',
            subtotal: finalPrice,
            shippingCost: 0,
            total: finalPrice,
            commission: commission > 0 ? commission : null,
            sellerNet: net,
            paymentMethod: 'QR',
            paymentStatus: 'PENDING',
            paymentQrUrl: auction.seller?.paymentQrUrl || null,
            notes: `Ganador de subasta #${auction.id} — ${auction.title}`,
            items: auction.product
              ? {
                  create: {
                    productId: auction.product.id,
                    quantity: 1,
                    unitPrice: finalPrice,
                  },
                }
              : undefined,
          },
        });
      });

      // Marcar la subasta como vendida con la orden
      await prisma.auction.update({
        where: { id: auction.id },
        data: {
          winnerId,
          isSold: true,
          orderId: order.id,
          paymentDeadline,
        },
      });

      // Notificar al ganador
      await createNotification({
        userId: winnerId,
        type: 'AUCTION_WON',
        title: '¡Ganaste la subasta! 🎉',
        message: `Ganaste "${auction.title}" por ${finalPrice} Bs. Tenés 48 horas para pagar la orden #${order.id} antes de que vuelva a subasta.`,
        refType: 'order',
        refId: order.id,
      });
      // Notificar al vendedor
      await createNotification({
        userId: auction.sellerId,
        type: 'AUCTION_SOLD',
        title: '¡Tu subasta se vendió! 🎉',
        message: `"${auction.title}" se vendió por ${finalPrice} Bs. El ganador tiene 48h para pagar.`,
        refType: 'auction',
        refId: auction.id,
      });

      closed++;
    } catch (error) {
      logger.warn(`[auctions] error cerrando subasta ${auction.id}: ${(error as Error).message}`);
    }
  }

  // 2. Subastas vendidas sin pago con plazo vencido → relistar (sin inflación)
  const unpaid = await prisma.auction.findMany({
    where: { isSold: true, isPaid: false, paymentDeadline: { lt: now } },
    include: { product: { select: { id: true, name: true, stock: true } } },
    take: 50,
  });

  for (const auction of unpaid) {
    try {
      // Cancelar la orden pendiente si existe
      if (auction.orderId) {
        await prisma.order.update({
          where: { id: auction.orderId },
          data: { status: 'CANCELLED' },
        });
        // Reponer stock
        if (auction.productId) {
          await prisma.product.update({
            where: { id: auction.productId },
            data: { stock: { increment: 1 } },
          });
        }
        await createNotification({
          userId: auction.winnerId!,
          type: 'AUCTION_ENDED',
          title: 'Perdiste la subasta por no pagar 😕',
          message: `No pagaste "${auction.title}" a tiempo. La subasta vuelve a estar activa.`,
          refType: 'auction',
          refId: auction.id,
        });
      }

      // Relistar al MISMO precio final (sin inflación posible)
      await prisma.auction.update({
        where: { id: auction.id },
        data: {
          winnerId: null,
          isSold: false,
          isActive: true,
          isPaid: false,
          orderId: null,
          paymentDeadline: null,
          startingPrice: auction.currentPrice,
          endDate: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        },
      });

      // Notificar a TODOS los postores que la subasta volvió a estar activa
      const bidders = await prisma.auctionBid.findMany({
        where: { auctionId: auction.id },
        distinct: ['bidderId'],
        select: { bidderId: true },
      });
      const bidderIds = bidders.map((b) => b.bidderId);
      for (const bidderId of bidderIds) {
        await createNotification({
          userId: bidderId,
          type: 'AUCTION_ENDED',
          title: '¡La subasta volvió a estar activa! ⚡',
          message: `"${auction.title}" se relistó al mismo precio (${auction.currentPrice} Bs). Volvé a pujar antes de que termine.`,
          refType: 'auction',
          refId: auction.id,
        });
      }

      relisted++;
    } catch (error) {
      logger.warn(`[auctions] error relistando subasta ${auction.id}: ${(error as Error).message}`);
    }
  }

  if (closed > 0 || relisted > 0) {
    logger.info(`[auctions] cerradas=${closed} relistadas=${relisted}`);
  }
}
