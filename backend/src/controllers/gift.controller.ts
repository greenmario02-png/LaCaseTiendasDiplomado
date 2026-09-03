import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { ok, created } from '../utils/response';

const PROMO_INCLUDE = {
  items: {
    include: { product: { select: { id: true, name: true, price: true } } },
  },
  triggerProduct: { select: { id: true, name: true } },
};

/** CRUD del vendedor: listar sus promociones de regalo */
export async function listMine(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const items = await prisma.giftPromotion.findMany({
      where: { sellerId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: PROMO_INCLUDE,
    });
    return ok(res, items);
  } catch (error) {
    next(error);
  }
}

/** Crear una promoción de regalo */
export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = req.user!.id;
    const {
      title,
      description,
      triggerType,
      triggerProductId,
      triggerQuantity,
      triggerAmount,
      allowChoice,
      productIds,
    } = req.body;

    if (!title?.trim()) throw ApiError.badRequest('El título es obligatorio');
    if (!['UNITS', 'AMOUNT', 'PRODUCT'].includes(triggerType)) {
      throw ApiError.badRequest('triggerType inválido');
    }
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw ApiError.badRequest('Debés elegir al menos un producto de regalo');
    }

    // Verificar que los productos de regalo pertenezcan a la tienda
    const giftProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, sellerId },
      select: { id: true },
    });
    if (giftProducts.length !== productIds.length) {
      throw ApiError.badRequest('Uno o más productos de regalo no pertenecen a tu tienda');
    }

    const promo = await prisma.giftPromotion.create({
      data: {
        sellerId,
        title,
        description: description || null,
        triggerType,
        triggerProductId: triggerProductId || null,
        triggerQuantity: triggerQuantity ? Number(triggerQuantity) : null,
        triggerAmount: triggerAmount ? Number(triggerAmount) : null,
        allowChoice: Boolean(allowChoice),
        items: { create: productIds.map((pid: number) => ({ productId: pid })) },
      },
      include: PROMO_INCLUDE,
    });
    return created(res, promo);
  } catch (error) {
    next(error);
  }
}

/** Actualizar una promoción (toggle activo, campos, regalos) */
export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.giftPromotion.findFirst({
      where: { id, sellerId: req.user!.id },
    });
    if (!existing) throw ApiError.notFound('Promoción no encontrada');

    const { title, description, triggerType, triggerProductId, triggerQuantity, triggerAmount, allowChoice, isActive, productIds } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (triggerType !== undefined) data.triggerType = triggerType;
    if (triggerProductId !== undefined) data.triggerProductId = triggerProductId || null;
    if (triggerQuantity !== undefined) data.triggerQuantity = triggerQuantity ? Number(triggerQuantity) : null;
    if (triggerAmount !== undefined) data.triggerAmount = triggerAmount ? Number(triggerAmount) : null;
    if (allowChoice !== undefined) data.allowChoice = Boolean(allowChoice);
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    if (Array.isArray(productIds)) {
      if (productIds.length === 0) throw ApiError.badRequest('Debés elegir al menos un producto de regalo');
      const giftProducts = await prisma.product.findMany({
        where: { id: { in: productIds }, sellerId: req.user!.id },
        select: { id: true },
      });
      if (giftProducts.length !== productIds.length) {
        throw ApiError.badRequest('Uno o más productos de regalo no pertenecen a tu tienda');
      }
      await prisma.giftPromotionItem.deleteMany({ where: { giftPromotionId: id } });
      await prisma.giftPromotionItem.createMany({
        data: productIds.map((pid: number) => ({ giftPromotionId: id, productId: pid })),
      });
    }

    const promo = await prisma.giftPromotion.update({
      where: { id },
      data,
      include: PROMO_INCLUDE,
    });
    return ok(res, promo);
  } catch (error) {
    next(error);
  }
}

/** Eliminar una promoción */
export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.giftPromotion.findFirst({ where: { id, sellerId: req.user!.id } });
    if (!existing) throw ApiError.notFound('Promoción no encontrada');
    await prisma.giftPromotion.delete({ where: { id } });
    return ok(res, { id });
  } catch (error) {
    next(error);
  }
}

/** Público: promociones de regalo activas de una tienda */
export async function listBySeller(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = Number(req.params.id ?? req.params.sellerId);
    const items = await prisma.giftPromotion.findMany({
      where: { sellerId, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: PROMO_INCLUDE,
    });
    return ok(res, items);
  } catch (error) {
    next(error);
  }
}
