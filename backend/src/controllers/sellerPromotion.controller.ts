import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { ok, created } from '../utils/response';
import { ApiError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';

const PROMO_INCLUDE = {
  products: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          originalPrice: true,
          stock: true,
          images: { take: 1, select: { url: true } },
        },
      },
    },
  },
} as const;

export async function listSellerPromotions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = req.user!.id;
    const { status } = req.query as { status?: string };
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: {
        sellerId,
        ...(status === 'active' ? { isActive: true, endDate: { gt: now } } : {}),
        ...(status === 'finished' ? { OR: [{ isActive: false }, { endDate: { lte: now } }] } : {}),
      },
      include: PROMO_INCLUDE,
      orderBy: { startDate: 'desc' },
    });
    return ok(res, promotions);
  } catch (error) {
    next(error);
  }
}

export async function createSellerPromotion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = req.user!.id;
    const { title, description, discountType, discountValue, minQuantity, minSpend, maxSpend, startDate, endDate, productIds } = req.body;

    if (!productIds || productIds.length === 0) {
      throw ApiError.badRequest('Debés elegir al menos un producto para la promoción');
    }
    if (!discountValue || Number(discountValue) <= 0) {
      throw ApiError.badRequest('El valor del descuento debe ser mayor a 0');
    }
    if (!['PERCENTAGE', 'FIXED'].includes(discountType)) {
      throw ApiError.badRequest('Tipo de descuento inválido');
    }
    if (discountType === 'PERCENTAGE' && Number(discountValue) > 100) {
      throw ApiError.badRequest('El porcentaje de descuento no puede superar el 100%');
    }
    if (!startDate || !endDate) {
      throw ApiError.badRequest('Fecha de inicio y fin son obligatorias');
    }
    if (new Date(endDate) <= new Date(startDate)) {
      throw ApiError.badRequest('La fecha de fin debe ser posterior al inicio');
    }

    const ownProducts = await prisma.product.count({
      where: { id: { in: productIds as number[] }, sellerId },
    });
    if (ownProducts !== productIds.length) {
      throw ApiError.forbidden('Solo podés crear promociones con tus propios productos');
    }

    const promotion = await prisma.promotion.create({
      data: {
        title,
        description: description || null,
        sellerId,
        discountType,
        discountValue,
        minQuantity: minQuantity || null,
        minSpend: minSpend ? Number(minSpend) : null,
        maxSpend: maxSpend ? Number(maxSpend) : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        products: { create: (productIds as number[]).map((productId) => ({ productId })) },
      },
      include: PROMO_INCLUDE,
    });
    return created(res, promotion);
  } catch (error) {
    next(error);
  }
}

export async function updateSellerPromotion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = req.user!.id;
    const promotionId = Number(req.params.id);
    const promo = await prisma.promotion.findFirst({ where: { id: promotionId, sellerId } });
    if (!promo) {
      throw ApiError.notFound('Promoción no encontrada');
    }

    const { title, description, discountType, discountValue, minQuantity, minSpend, maxSpend, startDate, endDate, productIds, isActive } = req.body;
    const update: Record<string, unknown> = {};

    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description || null;
    if (discountType !== undefined) update.discountType = discountType;
    if (discountValue !== undefined) update.discountValue = discountValue;
    if (minQuantity !== undefined) update.minQuantity = minQuantity || null;
    if (minSpend !== undefined) update.minSpend = minSpend ? Number(minSpend) : null;
    if (maxSpend !== undefined) update.maxSpend = maxSpend ? Number(maxSpend) : null;
    if (startDate !== undefined) update.startDate = new Date(startDate);
    if (endDate !== undefined) update.endDate = new Date(endDate);
    if (isActive !== undefined) update.isActive = isActive;

    if (productIds !== undefined) {
      const ownProducts = await prisma.product.count({ where: { id: { in: productIds as number[] }, sellerId } });
      if (ownProducts !== productIds.length) {
        throw ApiError.forbidden('Solo podés usar tus propios productos');
      }
      await prisma.promotionProduct.deleteMany({ where: { promotionId } });
      update.products = { create: (productIds as number[]).map((productId) => ({ productId })) };
    }

    const promotion = await prisma.promotion.update({ where: { id: promotionId }, data: update, include: PROMO_INCLUDE });
    return ok(res, promotion);
  } catch (error) {
    next(error);
  }
}

export async function deleteSellerPromotion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = req.user!.id;
    const promotionId = Number(req.params.id);
    const promo = await prisma.promotion.findFirst({ where: { id: promotionId, sellerId } });
    if (!promo) {
      throw ApiError.notFound('Promoción no encontrada');
    }
    await prisma.promotion.update({ where: { id: promotionId }, data: { isActive: false } });
    return ok(res, { id: promotionId, isActive: false });
  } catch (error) {
    next(error);
  }
}

export async function sellerPromotionStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = req.user!.id;
    const now = new Date();
    const [active, finished, totalSpent] = await Promise.all([
      prisma.promotion.count({ where: { sellerId, isActive: true, endDate: { gt: now } } }),
      prisma.promotion.count({ where: { sellerId, OR: [{ isActive: false }, { endDate: { lte: now } }] } }),
      prisma.promotion.aggregate({ where: { sellerId }, _sum: { spentAmount: true } }),
    ]);
    return ok(res, {
      active,
      finished,
      totalSpent: totalSpent._sum.spentAmount ? Number(totalSpent._sum.spentAmount) : 0,
    });
  } catch (error) {
    next(error);
  }
}
