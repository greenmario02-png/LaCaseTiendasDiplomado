import { NextFunction, Response } from 'express';
import { Request } from 'express';

import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { ok, created } from '../utils/response';
import { ApiError } from '../utils/errors';

function getIdentity(req: AuthRequest): { userId?: number; sessionId?: string } {
  if (req.user) return { userId: req.user.id };
  const sessionId = (req.headers['x-session-id'] as string) || undefined;
  if (!sessionId) return {};
  return { sessionId };
}

export async function recordSearch(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { term } = req.body;
    if (!term || !term.trim()) throw ApiError.badRequest('term obligatorio');
    const { userId, sessionId } = getIdentity(req);
    if (!userId && !sessionId) return created(res, { skipped: true, reason: 'sin identidad' });

    await prisma.searchHistory.create({
      data: { userId: userId ?? null, sessionId: sessionId ?? null, term: term.trim().slice(0, 100) },
    });

    return created(res, { recorded: true });
  } catch (error) {
    next(error);
  }
}

export async function recordProductView(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const productId = Number(req.params.id);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Producto no encontrado');

    const { userId, sessionId } = getIdentity(req);
    if (!userId && !sessionId) return created(res, { skipped: true });

    await prisma.productView.create({
      data: { userId: userId ?? null, sessionId: sessionId ?? null, productId },
    });

    // incrementar contador de vistas
    await prisma.product.update({ where: { id: productId }, data: { viewCount: { increment: 1 } } });

    return created(res, { recorded: true });
  } catch (error) {
    next(error);
  }
}

async function getRecentProductIds(identity: { userId?: number; sessionId?: string }, limit = 30): Promise<number[]> {
  const views = await prisma.productView.findMany({
    where: {
      ...(identity.userId ? { userId: identity.userId } : { sessionId: identity.sessionId }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    distinct: ['productId'],
    select: { productId: true },
  });
  return views.map((v) => v.productId);
}

export async function recentViews(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId, sessionId } = getIdentity(req);
    if (!userId && !sessionId) return ok(res, []);

    const ids = await getRecentProductIds({ userId, sessionId });
    if (ids.length === 0) return ok(res, []);

    const products = await prisma.product.findMany({
      where: { id: { in: ids }, isActive: true, isApproved: true },
      include: {
        seller: { select: { id: true, storeName: true, rating: true, locationCity: true } },
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { order: 'asc' as const }, select: { id: true, url: true, isPrimary: true } },
      },
    });

    // ordenar por el orden de vistas recientes
    const ordered = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
    return ok(res, ordered);
  } catch (error) {
    next(error);
  }
}

export async function recommendedForUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId, sessionId } = getIdentity(req);
    if (!userId && !sessionId) {
      // Sin datos: devolver destacados
      const featured = await prisma.product.findMany({
        where: { isActive: true, isApproved: true, isFeatured: true },
        take: 10,
        include: {
          seller: { select: { id: true, storeName: true, rating: true } },
          images: { orderBy: { order: 'asc' as const }, take: 1, select: { url: true } },
        },
      });
      return ok(res, { recommendations: featured, reason: 'sin-historial' });
    }

    const identity = { userId, sessionId };

    // Categorías de interés basadas en búsquedas y vistas
    const [searches, viewedIds] = await Promise.all([
      prisma.searchHistory.findMany({
        where: {
          ...(userId ? { userId } : { sessionId }),
          createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { term: true },
      }),
      getRecentProductIds(identity, 20),
    ]);

    // Buscar categorías de los productos vistos
    let interestCategoryIds: number[] = [];
    let interestBrands: string[] = [];

    if (viewedIds.length > 0) {
      const viewedProducts = await prisma.product.findMany({
        where: { id: { in: viewedIds } },
        select: { categoryId: true, brand: true },
      });
      interestCategoryIds = [...new Set(viewedProducts.map((p) => p.categoryId))].slice(0, 5);
      interestBrands = [...new Set(viewedProducts.filter((p) => p.brand).map((p) => p.brand!))].slice(0, 5);
    }

    // Términos de búsqueda más frecuentes
    const termCounts = new Map<string, number>();
    for (const s of searches) {
      const key = s.term.toLowerCase();
      termCounts.set(key, (termCounts.get(key) ?? 0) + 1);
    }
    const topTerms = [...termCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);

    // Construir recomendación: productos de categorías/brands de interés
    const recWhere: any = { isActive: true, isApproved: true, id: { notIn: viewedIds } };
    const ors: any[] = [];
    if (interestCategoryIds.length > 0) ors.push({ categoryId: { in: interestCategoryIds } });
    if (interestBrands.length > 0) ors.push({ brand: { in: interestBrands } });
    if (topTerms.length > 0) {
      for (const t of topTerms) {
        ors.push({ name: { contains: t, mode: 'insensitive' } });
      }
    }
    if (ors.length > 0) recWhere.OR = ors;

    const recommendations = await prisma.product.findMany({
      where: recWhere,
      take: 12,
      orderBy: [{ saleCount: 'desc' }, { createdAt: 'desc' }],
      include: {
        seller: { select: { id: true, storeName: true, rating: true } },
        category: { select: { id: true, name: true } },
        images: { orderBy: { order: 'asc' as const }, take: 1, select: { url: true } },
      },
    });

    return ok(res, { recommendations, reason: 'historial', interests: { categories: interestCategoryIds, brands: interestBrands, terms: topTerms } });
  } catch (error) {
    next(error);
  }
}

export async function mySearchHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId, sessionId } = getIdentity(req);
    if (!userId && !sessionId) return ok(res, []);

    const history = await prisma.searchHistory.findMany({
      where: {
        ...(userId ? { userId } : { sessionId }),
        createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { term: true, createdAt: true },
    });

    return ok(res, history);
  } catch (error) {
    next(error);
  }
}

const FEED_PRODUCT_INCLUDE = {
  seller: {
    select: {
      id: true,
      storeName: true,
      rating: true,
      locationCity: true,
      locationState: true,
      isVerified: true,
    },
  },
  category: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: { order: 'asc' as const },
    take: 1,
    select: { id: true, url: true, isPrimary: true },
  },
} as const;

/** Feed de aterrizaje: productos cerca de ti + carruseles por categoría (recientes) + para ti + destacados por vistas. */
export async function personalizedFeed(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId, sessionId } = getIdentity(req);

    // Ciudad del usuario (para "cerca de ti")
    let userCity: string | null = null;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { locationCity: true, locationState: true },
      });
      userCity = user?.locationCity?.trim()?.toLowerCase() || user?.locationState?.trim()?.toLowerCase() || null;
    }

    // 1) Productos cerca de ti (misma ciudad, isActive, recientes) — fallback: destacados
    const nearYou = await prisma.product.findMany({
      where: {
        isActive: true,
        isApproved: true,
        ...(userCity
          ? { OR: [
              { seller: { locationCity: { contains: userCity, mode: 'insensitive' as const } } },
              { seller: { locationState: { contains: userCity, mode: 'insensitive' as const } } },
            ] }
          : { isFeatured: true }),
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: FEED_PRODUCT_INCLUDE,
    });

    // 2) Carruseles por categoría (productos agregados recientemente)
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' as const },
      take: 8,
      select: { id: true, name: true, slug: true },
    });
    const categoryFeeds = await Promise.all(
      categories.map(async (cat) => {
        const products = await prisma.product.findMany({
          where: { isActive: true, isApproved: true, categoryId: cat.id },
          orderBy: { createdAt: 'desc' },
          take: 6,
          include: FEED_PRODUCT_INCLUDE,
        });
        return { category: cat, products };
      }),
    );
    const categoryCarousels = categoryFeeds.filter((c) => c.products.length > 0);

    // 3) Para ti (recomendaciones personalizadas)
    let forYou: any[] = [];
    try {
      if (userId || sessionId) {
        const identity = { userId, sessionId };
        const viewedIds = await getRecentProductIds(identity, 20);
        let interestCategoryIds: number[] = [];
        if (viewedIds.length > 0) {
          const viewedProducts = await prisma.product.findMany({
            where: { id: { in: viewedIds } },
            select: { categoryId: true },
          });
          interestCategoryIds = Array.from(new Set(viewedProducts.map((p) => p.categoryId)));
        }
        const searches = await prisma.searchHistory.findMany({
          where: {
            ...(userId ? { userId } : { sessionId }),
            createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { term: true },
        });
        const terms = searches.map((s) => s.term);
        const forYouWhere: any = { isActive: true, isApproved: true };
        if (interestCategoryIds.length > 0 || terms.length > 0) {
          forYouWhere.OR = [
            ...(interestCategoryIds.length > 0 ? [{ categoryId: { in: interestCategoryIds } }] : []),
            ...(terms.length > 0 ? [{ name: { contains: terms[0], mode: 'insensitive' } }] : []),
          ];
        }
        forYou = await prisma.product.findMany({
          where: forYouWhere,
          orderBy: { saleCount: 'desc' },
          take: 12,
          include: FEED_PRODUCT_INCLUDE,
        });
      }
      if (forYou.length === 0) {
        forYou = await prisma.product.findMany({
          where: { isActive: true, isApproved: true, isFeatured: true },
          take: 12,
          include: FEED_PRODUCT_INCLUDE,
        });
      }
    } catch {
      forYou = [];
    }

    // 4) Destacados por vistas (semana, orden por viewCount)
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const trendingViews = await prisma.productView.groupBy({
      by: ['productId'],
      where: { createdAt: { gte: weekAgo } },
      _count: { _all: true },
      orderBy: { _count: { productId: 'desc' as const } },
      take: 10,
    });
    const trendingIds = trendingViews.map((v) => v.productId);
    let trending: any[] = [];
    if (trendingIds.length > 0) {
      trending = await prisma.product.findMany({
        where: { id: { in: trendingIds }, isActive: true, isApproved: true },
        include: FEED_PRODUCT_INCLUDE,
      });
    }
    if (trending.length === 0) {
      trending = await prisma.product.findMany({
        where: { isActive: true, isApproved: true },
        orderBy: { viewCount: 'desc' },
        take: 10,
        include: FEED_PRODUCT_INCLUDE,
      });
    }

    return ok(res, {
      nearYou,
      categoryCarousels,
      forYou,
      trending,
      userCity,
    });
  } catch (error) {
    next(error);
  }
}
