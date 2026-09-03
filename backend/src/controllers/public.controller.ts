import { NextFunction, Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { ok, created } from '../utils/response';

/** Etiquetas estilo Couchsurfing permitidas en las reseñas (tienda y producto). */
export const REVIEW_TAGS = [
  'Buena comunicación',
  'Resolvió mis dudas',
  'Puntual',
  'Entrega rápida',
  'Producto como se describe',
  'Excelente trato',
  'Recomendado',
] as const;

/** Pares de etiquetas positivas/negativas para la calificación post-venta del vendedor/tienda. */
export const REVIEW_TAG_PAIRS = [
  { positive: 'Recomendar', negative: 'No recomendar' },
  { positive: 'Cumplió', negative: 'No cumplió' },
  { positive: 'Verificado', negative: 'No verificado' },
  { positive: 'Confiable', negative: 'No confiable' },
  { positive: 'Todo correcto', negative: 'Hubo un problema' },
  { positive: 'Llegó a tiempo', negative: 'Llegó tarde' },
  { positive: 'Trato correcto', negative: 'Trato problemático' },
  { positive: 'Seguro', negative: 'No me sentí seguro' },
  { positive: 'Contrataría otra vez', negative: 'No contrataría otra vez' },
  { positive: 'Confirmado', negative: 'Reportado' },
  { positive: 'Lo avalo', negative: 'No lo avalo' },
  { positive: 'Experiencia positiva', negative: 'Experiencia negativa' },
] as const;

export const ALL_REVIEW_TAGS = REVIEW_TAG_PAIRS.flatMap((p) => [p.positive, p.negative]);

/** Valida la ventana de 3 a 7 días para calificar (si la entrega tiene fecha registrada). */
function assertReviewWindow(deliveredAt: Date | null | undefined) {
  if (!deliveredAt) return; // órdenes viejas sin fecha de entrega: se permite
  const now = Date.now();
  const min = deliveredAt.getTime() + 3 * 24 * 3600000; // +3 días
  const max = deliveredAt.getTime() + 7 * 24 * 3600000; // +7 días
  if (now < min) {
    throw ApiError.forbidden(
      'Todavía no podés calificar. Podés hacerlo entre 3 y 7 días después de recibir tu compra.'
    );
  }
  if (now > max) {
    throw ApiError.forbidden(
      'El período para calificar (3 a 7 días después de recibir tu compra) ya venció.'
    );
  }
}

export async function searchSellers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const term = String(req.query.q || '').trim();
    const sellers = await prisma.user.findMany({
      where: {
        role: 'SELLER',
        isActive: true,
        isApproved: true,
        OR: [
          { storeName: { contains: term, mode: 'insensitive' } },
          { locationCity: { contains: term, mode: 'insensitive' } },
          { locationState: { contains: term, mode: 'insensitive' } },
          { storeCategory: { contains: term, mode: 'insensitive' } },
        ],
      },
      take: 20,
      select: {
        id: true,
        storeName: true,
        storeLogo: true,
        storeCategory: true,
        locationCity: true,
        locationState: true,
        country: true,
        rating: true,
        totalSales: true,
        isVerified: true,
      },
    });
    return ok(res, sellers);
  } catch (error) {
    next(error);
  }
}

export async function listBrands(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const brands = await prisma.product.findMany({
      where: { brand: { not: null }, isActive: true, isApproved: true },
      distinct: ['brand'],
      select: { brand: true },
    });
    const unique = [...new Set(brands.map((b) => b.brand!).filter(Boolean))].sort();
    return ok(res, unique);
  } catch (error) {
    next(error);
  }
}

export async function listDeliveryTypes(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const types = ['PRESENCIAL', 'DELIVERY', 'ENVIO', 'RETIRO', 'PERMUTA'];
    const labels: Record<string, string> = {
      PRESENCIAL: 'Presencial',
      DELIVERY: 'Delivery',
      ENVIO: 'Envío',
      RETIRO: 'Retiro en punto',
      PERMUTA: 'Permuta',
    };
    return ok(res, types.map((t) => ({ code: t, label: labels[t] })));
  } catch (error) {
    next(error);
  }
}

// La tienda es el dueño + sus empleados (ADMIN/EMPLOYEE con storeOwnerId = dueño)
async function teamSellerIds(ownerId: number): Promise<number[]> {
  const employees = await prisma.user.findMany({
    where: { storeOwnerId: ownerId, storeRole: { in: ['ADMIN', 'EMPLOYEE'] } },
    select: { id: true },
  });
  return [ownerId, ...employees.map((e) => e.id)];
}

export async function publicSellerProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = Number(req.params.id);
    // La tienda incluye los productos del dueño + los de sus empleados
    const teamIds = await teamSellerIds(sellerId);
    const seller = await prisma.user.findUnique({
      where: { id: sellerId, role: 'SELLER', isActive: true },
      select: {
        id: true,
        storeName: true,
        storeDescription: true,
        storeLogo: true,
        storeBanner: true,
        profileImage: true,
        bio: true,
        storeCategory: true,
        country: true,
        locationCity: true,
        locationState: true,
        locationPostalCode: true,
        latitude: true,
        longitude: true,
        locationVerified: true,
        youtubeUrl: true,
        tiktokUrl: true,
        instagramUrl: true,
        facebookUrl: true,
        whatsappPhone: true,
        rating: true,
        totalSales: true,
        isVerified: true,
        createdAt: true,
        freeShippingThreshold: true,
      },
    });

    if (!seller) throw ApiError.notFound('Vendedor no encontrado');

    // Métricas adicionales de confianza: productos activos, referencias de compradores, ventas mensuales
    const [productCount, activeCount, reviewCount, recentOrders, monthlySales] = await Promise.all([
      prisma.product.count({ where: { sellerId: { in: teamIds }, isApproved: true } }),
      prisma.product.count({ where: { sellerId: { in: teamIds }, isApproved: true, isActive: true } }),
      prisma.review.count({ where: { sellerId } }),
      prisma.order.findMany({
        where: { sellerId, status: 'DELIVERED', paymentStatus: 'VERIFIED' },
        orderBy: { updatedAt: 'desc' },
        take: 12,
        select: {
          id: true,
          total: true,
          updatedAt: true,
          buyer: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.order.count({ where: { sellerId, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
    ]);

    return ok(res, {
      ...seller,
      productCount,
      activeCount,
      reviewCount,
      monthlySales,
      recentBuyers: recentOrders,
    });
  } catch (error) {
    next(error);
  }
}

export async function sellerProducts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = Number(req.params.id);
    const teamIds = await teamSellerIds(sellerId);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { sellerId: { in: teamIds }, isActive: true, isApproved: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: {
            select: { id: true, storeName: true, rating: true, locationCity: true, locationState: true, isVerified: true },
          },
          category: { select: { id: true, name: true, slug: true } },
          images: { orderBy: { order: 'asc' }, select: { id: true, url: true, isPrimary: true } },
        },
      }),
      prisma.product.count({ where: { sellerId: { in: teamIds }, isActive: true, isApproved: true } }),
    ]);

    return res.json({
      data: products,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

export async function sellerReviews(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = Number(req.params.id);
    const [reviews, tagVotes] = await Promise.all([
      prisma.review.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.reviewTagVote.groupBy({
        by: ['tag'],
        where: { sellerId },
        _count: { _all: true },
      }),
    ]);
    const votesByTag = Object.fromEntries(tagVotes.map((v) => [v.tag, v._count._all]));
    return ok(res, { reviews, tagVotes: votesByTag });
  } catch (error) {
    next(error);
  }
}

export async function productReviews(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const productId = Number(req.params.id);
    const reviews = await prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return ok(res, reviews);
  } catch (error) {
    next(error);
  }
}

export async function addProductReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const productId = Number(req.params.id);
    const userId = req.user!.id;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Producto no encontrado');
    if (product.sellerId === userId) throw ApiError.badRequest('No puedes reseñar tu propio producto');

    // Confianza: solo se puede calificar un producto DESPUÉS de haberlo comprado y recibido
    const purchase = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: { buyerId: userId, status: 'DELIVERED', paymentStatus: 'VERIFIED' },
      },
      select: { id: true, order: { select: { id: true, deliveredAt: true } } },
    });
    if (!purchase) {
      throw ApiError.forbidden(
        'Solo podés calificar un producto después de haberlo comprado y recibido. Tu opinión es valiosa para la comunidad.'
      );
    }
    assertReviewWindow(purchase.order.deliveredAt);

    const tags = Array.isArray(req.body.tags)
      ? (req.body.tags as unknown[]).filter((t): t is string => typeof t === 'string' && (REVIEW_TAGS as readonly string[]).includes(t))
      : undefined;

    // Una reseña por producto-comprador (editable)
    const existing = await prisma.review.findFirst({ where: { productId, userId } });
    const review = existing
      ? await prisma.review.update({
          where: { id: existing.id },
          data: { rating: req.body.rating, comment: req.body.comment, tags: tags?.length ? tags : undefined },
        })
      : await prisma.review.create({
          data: {
            productId,
            userId,
            rating: req.body.rating,
            comment: req.body.comment,
            tags: tags?.length ? tags : undefined,
            orderId: purchase.order.id,
          },
        });

    // Recalcular el rating promedio del producto (score agregado en el producto)
    const agg = await prisma.review.aggregate({ where: { productId }, _avg: { rating: true } });
    await prisma.product.update({
      where: { id: productId },
      data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10 },
    });

    return created(res, review);
  } catch (error) {
    next(error);
  }
}

export async function addSellerReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = Number(req.params.id);
    const userId = req.user!.id;
    if (sellerId === userId) throw ApiError.badRequest('No puedes reseñarte a ti mismo');

    const seller = await prisma.user.findUnique({ where: { id: sellerId, role: 'SELLER' } });
    if (!seller) throw ApiError.notFound('Vendedor no encontrado');

    // Confianza mutua: solo pueden calificar quienes hayan COMPRADO y recibido (entregado + pago verificado)
    const purchase = await prisma.order.findFirst({
      where: {
        sellerId,
        buyerId: userId,
        status: 'DELIVERED',
        paymentStatus: 'VERIFIED',
      },
      select: { id: true, deliveredAt: true },
    });
    if (!purchase) {
      throw ApiError.forbidden('Solo podés calificar a un vendedor después de recibir tu compra. Esta calificación genera confianza en la comunidad.');
    }
    assertReviewWindow(purchase.deliveredAt);

    const tags = Array.isArray(req.body.tags)
      ? (req.body.tags as unknown[]).filter((t): t is string => typeof t === 'string' && (REVIEW_TAGS as readonly string[]).includes(t))
      : undefined;

    // Una sola reseña por comprador-vendedor (editable)
    const existing = await prisma.review.findFirst({ where: { sellerId, userId } });
    const review = existing
      ? await prisma.review.update({
          where: { id: existing.id },
          data: { rating: req.body.rating, comment: req.body.comment, tags: tags?.length ? tags : undefined },
        })
      : await prisma.review.create({
          data: {
            sellerId,
            userId,
            rating: req.body.rating,
            comment: req.body.comment,
            tags: tags?.length ? tags : undefined,
            orderId: purchase.id,
          },
        });

    // Recalcular el rating del vendedor (promedio)
    const agg = await prisma.review.aggregate({ where: { sellerId }, _avg: { rating: true }, _count: true });
    await prisma.user.update({
      where: { id: sellerId },
      data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10 },
    });

    return created(res, { ...review, avgRating: agg._avg.rating ?? 0, totalReviews: agg._count });
  } catch (error) {
    next(error);
  }
}

/** Vota (o des-vota) una etiqueta de reseña del vendedor. Un voto por (vendedor, etiqueta). */
export async function voteSellerTag(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = Number(req.params.id);
    const userId = req.user!.id;
    const tag = String(req.body?.tag ?? '').trim();

    if (!(ALL_REVIEW_TAGS as readonly string[]).includes(tag)) {
      throw ApiError.badRequest('Etiqueta de reseña no válida.');
    }
    const seller = await prisma.user.findUnique({ where: { id: sellerId, role: 'SELLER' } });
    if (!seller) throw ApiError.notFound('Vendedor no encontrado');

    const where = { sellerId_userId_tag: { sellerId, userId, tag } };
    const existing = await prisma.reviewTagVote.findUnique({ where });
    if (existing) {
      await prisma.reviewTagVote.delete({ where: { id: existing.id } });
      return ok(res, { tag, voted: false });
    }
    await prisma.reviewTagVote.create({ data: { sellerId, userId, tag } });
    return ok(res, { tag, voted: true });
  } catch (error) {
    next(error);
  }
}

/** Devuelve las etiquetas votadas por el usuario autenticado para un vendedor. */
export async function getMySellerTagVotes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = Number(req.params.id);
    const votes = await prisma.reviewTagVote.findMany({
      where: { sellerId, userId: req.user!.id },
      select: { tag: true },
    });
    return ok(res, votes.map((v) => v.tag));
  } catch (error) {
    next(error);
  }
}

/** Indica si el usuario autenticado puede calificar a este vendedor (compró y recibió). */
export async function canReviewSeller(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = Number(req.params.id);
    const userId = req.user!.id;
    if (sellerId === userId) return ok(res, { canReview: false, reason: 'self' });

    const purchase = await prisma.order.findFirst({
      where: { sellerId, buyerId: userId, status: 'DELIVERED', paymentStatus: 'VERIFIED' },
    });
    if (!purchase) return ok(res, { canReview: false, reason: 'no-purchase' });

    const existing = await prisma.review.findFirst({ where: { sellerId, userId } });
    return ok(res, { canReview: true, existing: Boolean(existing) });
  } catch (error) {
    next(error);
  }
}

export async function getWishlist(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: { orderBy: { order: 'asc' }, take: 1, select: { url: true, isPrimary: true } },
            category: { select: { name: true, slug: true } },
            seller: { select: { storeName: true, rating: true } },
          },
        },
      },
    });
    return ok(res, items);
  } catch (error) {
    next(error);
  }
}

export async function addToWishlist(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const productId = Number(req.params.id);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Producto no encontrado');

    const item = await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: req.user!.id, productId } },
      create: { userId: req.user!.id, productId },
      update: {},
    });
    return created(res, item);
  } catch (error) {
    next(error);
  }
}

export async function removeFromWishlist(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.wishlistItem.deleteMany({
      where: { userId: req.user!.id, productId: Number(req.params.id) },
    });
    return ok(res, { message: 'Eliminado de favoritos' });
  } catch (error) {
    next(error);
  }
}

/** El comprador solicita ser comprador privilegiado de una tienda. */
export async function requestPrivileged(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = Number(req.params.id);
    const buyerId = req.user!.id;
    if (sellerId === buyerId) throw ApiError.badRequest('No podés ser comprador privilegiado de tu propia tienda');

    const seller = await prisma.user.findUnique({ where: { id: sellerId, role: 'SELLER' } });
    if (!seller) throw ApiError.notFound('Vendedor no encontrado');

    const rel = await prisma.privilegedBuyer.upsert({
      where: { sellerId_buyerId: { sellerId, buyerId } },
      create: { sellerId, buyerId, status: 'PENDING' },
      update: {},
    });
    return ok(res, { status: rel.status, message: rel.status === 'PENDING' ? 'Solicitud enviada. El vendedor debe aprobarla.' : undefined });
  } catch (error) {
    next(error);
  }
}

/** Estado del comprador en una tienda (PENDING/APPROVED/REJECTED o null). */
export async function privilegedStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = Number(req.params.id);
    const rel = await prisma.privilegedBuyer.findUnique({
      where: { sellerId_buyerId: { sellerId, buyerId: req.user!.id } },
    });
    return ok(res, rel ? { status: rel.status } : { status: null });
  } catch (error) {
    next(error);
  }
}

/** Productos nuevos con acceso anticipado (solo para compradores privilegiados aprobados). */
export async function privilegedNewProducts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const approved = await prisma.privilegedBuyer.findMany({
      where: { buyerId: userId, status: 'APPROVED' },
      select: { sellerId: true },
    });
    if (approved.length === 0) return ok(res, []);

    const sellerIds = approved.map((p) => p.sellerId);
    const products = await prisma.product.findMany({
      where: {
        sellerId: { in: sellerIds },
        isApproved: true,
        isActive: true,
        createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 24,
      include: {
        seller: { select: { id: true, storeName: true, rating: true, isVerified: true } },
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { order: 'asc' }, select: { id: true, url: true, isPrimary: true } },
      },
    });
    return ok(res, products);
  } catch (error) {
    next(error);
  }
}

/**
 * Resumen completo de confianza de una tienda: promedio y distribución de
 * calificaciones, etiquetas (Couchsurfing) más usadas, estadísticas de ventas
 * (mes actual y totales) y las últimas 10 órdenes entregadas.
 */
export async function sellerOverview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = Number(req.params.id);
    const seller = await prisma.user.findUnique({
      where: { id: sellerId, role: 'SELLER' },
      select: { id: true, storeName: true, firstName: true, lastName: true, rating: true },
    });
    if (!seller) throw ApiError.notFound('Vendedor no encontrado');

    const [reviews, avg, dist, totalOrders, monthOrders, monthAgg, lastOrders] = await Promise.all([
      prisma.review.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.review.aggregate({ where: { sellerId }, _avg: { rating: true }, _count: { _all: true } }),
      prisma.review.groupBy({ by: ['rating'], where: { sellerId }, _count: { _all: true } }),
      prisma.order.count({ where: { sellerId, status: { not: 'CANCELLED' } } }),
      prisma.order.count({
        where: {
          sellerId,
          status: { not: 'CANCELLED' },
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
      prisma.order.aggregate({
        where: {
          sellerId,
          status: 'DELIVERED',
          paymentStatus: 'VERIFIED',
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { total: true },
      }),
      prisma.order.findMany({
        where: { sellerId, status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          total: true,
          createdAt: true,
          items: { take: 1, select: { product: { select: { name: true } } } },
        },
      }),
    ]);

    const distMap: Record<number, number> = {};
    for (const d of dist) distMap[d.rating] = d._count._all;

    const tagCounts: Record<string, number> = {};
    for (const r of reviews) {
      const tags = r.tags as unknown[] | null | undefined;
      if (Array.isArray(tags)) {
        for (const t of tags) {
          if (typeof t === 'string') tagCounts[t] = (tagCounts[t] ?? 0) + 1;
        }
      }
    }
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    return ok(res, {
      seller,
      summary: { avg: avg._avg.rating ?? 0, total: avg._count._all },
      dist: distMap,
      topTags,
      storeStats: {
        totalOrders,
        monthOrders,
        monthSales: monthAgg._sum.total ?? 0,
        lastOrders: lastOrders.map((o) => ({
          id: o.id,
          total: o.total,
          createdAt: o.createdAt,
          productName: o.items[0]?.product?.name ?? null,
        })),
      },
      reviews,
    });
  } catch (error) {
    next(error);
  }
}
