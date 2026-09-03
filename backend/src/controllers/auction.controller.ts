import { NextFunction, Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { ok, created } from '../utils/response';
import { getIO } from '../config/socket';
import * as auctionService from '../services/auction.service';
import { createNotification } from '../services/notification.service';
import { processAuctionClosures } from '../services/auction-closure.service';

const { AUCTION_INCLUDE, formatAuction, processBid, buyNow, toggleWatchlist } = auctionService;

export async function createAuction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'SELLER') throw ApiError.forbidden('Solo los vendedores pueden crear subastas');
    if (!user.isApproved) throw ApiError.forbidden('Tu tienda debe ser aprobada');

    const { title, description, categoryId, imageUrl, startingPrice, minIncrement, maxIncrement, endDate, productId, reservePrice, buyNowPrice, extensionMinutes, incrementType } = req.body;

    const start = new Date();
    const end = new Date(endDate);
    if (isNaN(end.getTime())) throw ApiError.badRequest('Fecha de fin inválida');
    if (end <= start) throw ApiError.badRequest('La fecha de fin debe ser posterior a la de inicio');
    if (!title || !title.trim()) throw ApiError.badRequest('El título es obligatorio');
    const starting = Number(startingPrice);
    if (!Number.isFinite(starting) || starting <= 0) throw ApiError.badRequest('Precio inicial inválido');

    const reserve = reservePrice ? Number(reservePrice) : null;
    const buyNow = buyNowPrice ? Number(buyNowPrice) : null;
    if (reserve !== null && reserve <= starting) throw ApiError.badRequest('La reserva debe ser mayor al precio inicial');
    if (buyNow !== null && buyNow <= (reserve ?? starting)) throw ApiError.badRequest('El precio de compra directa debe ser mayor al precio inicial/reserva');

    const auction = await prisma.auction.create({
      data: {
        sellerId: userId,
        title: title.trim(),
        description: description || null,
        categoryId: categoryId ? Number(categoryId) : null,
        imageUrl: imageUrl || null,
        productId: productId ? Number(productId) : null,
        startingPrice: starting,
        currentPrice: starting,
        reservePrice: reserve,
        buyNowPrice: buyNow,
        minIncrement: Number(minIncrement) || 1,
        maxIncrement: Number(maxIncrement) || 100,
        incrementType: incrementType || 'fixed',
        extensionMinutes: Number(extensionMinutes) || 0,
        endDate: end,
      },
      include: AUCTION_INCLUDE,
    });

    return created(res, formatAuction(auction, userId));
  } catch (error) {
    next(error);
  }
}

export async function listAuctions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const search = (req.query.search as string | undefined)?.trim();
    const sort = (req.query.sort as string | undefined) || 'interest';
    const hasBids = req.query.hasBids === 'true';

    const where: any = { isActive: true, endDate: { gt: new Date() } };
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (hasBids) where.bids = { some: {} };

    // Ordenamiento dinámico (estilo productos): interés del usuario primero,
    // luego buenas ofertas y precios más bajos.
    let orderBy: any[] = [];
    if (sort === 'interest' && req.user) {
      // Categorías de interés basadas en el historial del usuario (búsquedas + vistas)
      const recentSearches = await prisma.searchHistory.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { term: true },
      });
      const viewed = await prisma.productView.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { product: { select: { categoryId: true } } },
      });
      const interestTerms = recentSearches.map((s) => s.term).filter(Boolean).slice(0, 10);
      const interestCategoryIds = [...new Set(viewed.map((v) => v.product.categoryId))].slice(0, 8);

      // Peso: si la subasta pertenece a una categoría de interés del usuario
      const auctions = await prisma.auction.findMany({
        where,
        include: AUCTION_INCLUDE,
      });
      const ranked = auctions
        .map((a) => {
          const current = Number(a.currentPrice);
          const starting = Number(a.startingPrice);
          const inInterestCat = interestCategoryIds.includes(a.categoryId as number);
          const termMatch = interestTerms.some((t) => t && a.title.toLowerCase().includes(t.toLowerCase()));
          // Buena oferta: descuento respecto al precio inicial (currentPrice < startingPrice por reserva baja) o buy-now bajo
          const dealScore = starting > current ? (starting - current) / starting : 0;
          // Interés del usuario
          const interestScore = inInterestCat ? 1 : termMatch ? 0.8 : 0;
          // Cuánto queda de tiempo (las que terminan pronto tienen urgencia)
          const timeLeft = new Date(a.endDate).getTime() - Date.now();
          const urgencyScore = Math.max(0, 1 - timeLeft / (7 * 24 * 3600000));
          // Cantidad de ofertas (actividad)
          const activityScore = Math.min(1, (a.bids?.length ?? 0) / 20);

          // Puntaje total ponderado: interés 40%, oferta 25%, urgencia 20%, actividad 15%
          const score = interestScore * 0.4 + dealScore * 0.25 + urgencyScore * 0.2 + activityScore * 0.15;
          return { a, score };
        })
        .sort((x, y) => y.score - x.score)
        .map((x) => x.a);

      const total = await prisma.auction.count({ where });
      const sliced = ranked.slice((page - 1) * limit, page * limit);
      return res.json({
        data: sliced.map((a) => formatAuction(a, req.user?.id)),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit), sort: 'interest' },
      });
    }

    switch (sort) {
      case 'price_asc':
        orderBy = [{ currentPrice: 'asc' }];
        break;
      case 'price_desc':
        orderBy = [{ currentPrice: 'desc' }];
        break;
      case 'ending_soon':
        orderBy = [{ endDate: 'asc' }];
        break;
      case 'most_bids':
        orderBy = [{ bids: { _count: 'desc' } }];
        break;
      case 'newest':
      default:
        orderBy = [{ createdAt: 'desc' }];
    }

    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: AUCTION_INCLUDE,
      }),
      prisma.auction.count({ where }),
    ]);

    return res.json({
      data: auctions.map((a) => formatAuction(a, req.user?.id)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), sort },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAuction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    let auction = await prisma.auction.findUnique({ where: { id }, include: AUCTION_INCLUDE });
    if (!auction) throw ApiError.notFound('Subasta no encontrada');

    // El cierre de subastas lo maneja el job automático (processAuctionClosures).
    // Aquí solo ejecutamos una verificación on-demand por si el job aún no corrió.
    const nowMs = Date.now();
    if (auction.endDate.getTime() < nowMs && !auction.winnerId && auction.isActive) {
      await processAuctionClosures();
      auction = await prisma.auction.findUnique({ where: { id }, include: AUCTION_INCLUDE });
      if (!auction) throw ApiError.notFound('Subasta no encontrada');
    }

    // Añadir watchlist status para el usuario
    const viewerId = req.user?.id;
    let isWatching = false;
    if (viewerId) {
      const w = await prisma.auctionWatchlist.findUnique({
        where: { auctionId_userId: { auctionId: id, userId: viewerId } },
      });
      isWatching = Boolean(w);
    }

    return ok(res, { ...formatAuction(auction, viewerId), isWatching });
  } catch (error) {
    next(error);
  }
}

export async function placeBid(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const auctionId = Number(req.params.id);
    const userId = req.user!.id;
    const bidAmount = Number(req.body.bidAmount);

    if (!Number.isFinite(bidAmount)) throw ApiError.badRequest('Monto de oferta inválido');

    // Obtener ganador anterior para notificar outbid (el bid más reciente)
    const before = await prisma.auction.findUnique({
      where: { id: auctionId },
      select: { bids: { orderBy: { createdAt: 'desc' }, take: 1, select: { bidderId: true } }, title: true },
    });

    const result = await processBid(auctionId, userId, bidAmount);

    // Emitir por socket a la room
    const io = getIO();
    const auction = await prisma.auction.findUnique({ where: { id: auctionId }, include: AUCTION_INCLUDE });
    if (io && auction) {
      io.to(`auction:${auctionId}`).emit('auction:bidPlaced', {
        auction: formatAuction(auction, undefined),
        bidderName: req.user!.email?.split('@')[0] || 'Usuario',
        bidAmount: result.newPrice,
        extendedTo: result.extendedTo,
      });
    }

    // Notificar outbid al ganador anterior
    if (before?.bids?.[0] && before.bids[0].bidderId !== userId) {
      auctionService.notifyOutbid(auctionId, before.bids[0].bidderId, result.newPrice);
    }

    return ok(res, {
      message: result.extendedTo ? `Oferta registrada. ¡Tiempo extendido!` : 'Oferta registrada',
      bid: result.bid,
      auction: auction ? formatAuction(auction, userId) : null,
      extendedTo: result.extendedTo,
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const auctionId = Number(req.params.id);
    const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) throw ApiError.notFound('Subasta no encontrada');
    if (auction.winnerId !== req.user!.id) throw ApiError.forbidden('Solo el ganador puede confirmar el pago');
    if (!auction.isSold || auction.isPaid) throw ApiError.badRequest('Esta subasta ya está pagada o no vendida');

    const updated = await prisma.auction.update({
      where: { id: auctionId },
      data: { isPaid: true },
      include: AUCTION_INCLUDE,
    });
    return ok(res, { message: 'Pago confirmado. ¡Gracias por tu compra!', auction: formatAuction(updated, req.user!.id) });
  } catch (error) {
    next(error);
  }
}

export async function buyItNow(req: AuthRequest, res: Response, next: NextFunction) {  try {
    const auctionId = Number(req.params.id);
    const closed = await buyNow(auctionId, req.user!.id);

    const io = getIO();
    if (io) {
      io.to(`auction:${auctionId}`).emit('auction:sold', { auctionId, message: 'Comprado con Buy It Now' });
    }

    return ok(res, { message: '¡Compra realizada con Buy It Now!', auction: closed });
  } catch (error) {
    next(error);
  }
}

export async function myAuctions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
        where: { sellerId: req.user!.id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: AUCTION_INCLUDE,
      }),
      prisma.auction.count({ where: { sellerId: req.user!.id } }),
    ]);
    return res.json({ data: auctions.map((a) => formatAuction(a, req.user!.id)), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
}

export async function myBids(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
    const [bids, total] = await Promise.all([
      prisma.auctionBid.findMany({
        where: { bidderId: req.user!.id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { auction: { include: { seller: { select: { storeName: true } } } } },
      }),
      prisma.auctionBid.count({ where: { bidderId: req.user!.id } }),
    ]);
    return res.json({ data: bids, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
}

/** Subastas ACTIVAS en las que el usuario está pujando (o ganando) con tiempo restante */
export async function activeBids(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const where = {
      isActive: true,
      endDate: { gt: now },
      bids: { some: { bidderId: req.user!.id } },
    };
    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
        where,
        orderBy: { endDate: 'asc' },
        include: AUCTION_INCLUDE,
      }),
      prisma.auction.count({ where }),
    ]);
    return res.json({ data: auctions.map((a) => formatAuction(a, req.user!.id)), meta: { total } });
  } catch (error) {
    next(error);
  }
}

export async function myWatchlist(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const items = await prisma.auctionWatchlist.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { auction: { include: { seller: { select: { storeName: true } }, category: { select: { name: true } } } } },
    });
    return ok(res, items.map((w) => formatAuction(w.auction, req.user!.id)));
  } catch (error) {
    next(error);
  }
}

export async function toggleWatch(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await toggleWatchlist(Number(req.params.id), req.user!.id);
    return ok(res, result);
  } catch (error) {
    next(error);
  }
}

export async function myWonAuctions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const auctions = await prisma.auction.findMany({
      where: { winnerId: req.user!.id, isSold: true },
      orderBy: { endDate: 'desc' },
      include: AUCTION_INCLUDE,
    });
    return ok(res, auctions.map((a) => formatAuction(a, req.user!.id)));
  } catch (error) {
    next(error);
  }
}
