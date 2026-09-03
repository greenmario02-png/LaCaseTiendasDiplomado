import { NextFunction, Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { ok, created } from '../utils/response';

const COUPON_INCLUDE = {
  products: { include: { product: { select: { id: true, name: true, price: true, images: { take: 1, select: { url: true } } } } } },
  seller: { select: { id: true, storeName: true, isVerified: true } },
} as const;

const format = (c: any) => ({
  ...c,
  value: Number(c.value),
  minSpend: c.minSpend ? Number(c.minSpend) : null,
  spentAmount: c.spentAmount ? Number(c.spentAmount) : null,
});

/** CRUD de cupones (admin) */

export async function listCoupons(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' }, include: COUPON_INCLUDE });
    return ok(res, coupons.map(format));
  } catch (error) {
    next(error);
  }
}

export async function createCoupon(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { code, description, type, value, minSpend, maxUses, maxSpend, perUserLimit, isSingleUse, startDate, endDate, sellerId, productIds } = req.body;
    if (!code || !code.trim()) throw ApiError.badRequest('El código es obligatorio');
    if (!/^[A-Z0-9_-]{3,32}$/.test(code.trim().toUpperCase())) throw ApiError.badRequest('Código inválido (solo letras, números, guiones; 3-32 caracteres)');
    if (!['PERCENTAGE', 'FIXED', 'GIFT'].includes(type)) throw ApiError.badRequest('Tipo inválido');
    if (!Number.isFinite(Number(value)) || Number(value) <= 0) throw ApiError.badRequest('Valor inválido');
    if (type === 'PERCENTAGE' && Number(value) > 100) throw ApiError.badRequest('El porcentaje no puede superar 100');
    if (maxSpend !== undefined && maxSpend !== null && maxSpend !== '' && Number(maxSpend) <= 0) throw ApiError.badRequest('El presupuesto máximo debe ser mayor a 0');
    if (perUserLimit !== undefined && perUserLimit !== null && perUserLimit !== '' && Number(perUserLimit) <= 0) throw ApiError.badRequest('El límite por usuario debe ser mayor a 0');
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) throw ApiError.badRequest('La fecha de inicio debe ser anterior a la de fin');

    const existing = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (existing) throw ApiError.conflict('Ya existe un cupón con ese código');

    const coupon = await prisma.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        description: description || null,
        type,
        value: Number(value),
        sellerId: sellerId ? Number(sellerId) : null,
        minSpend: minSpend ? Number(minSpend) : null,
        maxUses: maxUses !== undefined && maxUses !== null && maxUses !== '' ? Number(maxUses) : 1,
        maxSpend: maxSpend !== undefined && maxSpend !== null && maxSpend !== '' ? Number(maxSpend) : null,
        perUserLimit: perUserLimit !== undefined && perUserLimit !== null && perUserLimit !== '' ? Number(perUserLimit) : null,
        isSingleUse: Boolean(isSingleUse),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        products: Array.isArray(productIds) && productIds.length > 0
          ? { create: productIds.map((pid: number) => ({ productId: Number(pid) })) }
          : undefined,
      },
      include: COUPON_INCLUDE,
    });
    return created(res, format(coupon));
  } catch (error) {
    next(error);
  }
}

export async function updateCoupon(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { description, type, value, minSpend, maxUses, startDate, endDate, isActive, productIds } = req.body;
    const data: Record<string, unknown> = {};
    if (description !== undefined) data.description = description;
    if (type !== undefined) data.type = type;
    if (value !== undefined) data.value = Number(value);
    if (minSpend !== undefined) data.minSpend = minSpend === null || minSpend === '' ? null : Number(minSpend);
    if (maxUses !== undefined) data.maxUses = maxUses === null || maxUses === '' ? null : Number(maxUses);
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const coupon = await prisma.$transaction(async (tx) => {
      const c = await tx.coupon.update({ where: { id }, data, include: COUPON_INCLUDE });
      if (Array.isArray(productIds)) {
        await tx.couponProduct.deleteMany({ where: { couponId: id } });
        if (productIds.length > 0) {
          await tx.couponProduct.createMany({
            data: productIds.map((pid: number) => ({ couponId: id, productId: Number(pid) })),
          });
        }
        return tx.coupon.findUniqueOrThrow({ where: { id }, include: COUPON_INCLUDE });
      }
      return c;
    });
    return ok(res, format(coupon));
  } catch (error) {
    next(error);
  }
}

export async function deleteCoupon(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.coupon.delete({ where: { id: Number(req.params.id) } });
    return ok(res, { message: 'Cupón eliminado' });
  } catch (error) {
    next(error);
  }
}

/** Validación pública de un código de cupón (para el checkout). */
export async function validateCoupon(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const code = String(req.params.code || req.query.code || '').trim().toUpperCase();
    if (!code) throw ApiError.badRequest('Código obligatorio');

    const coupon = await prisma.coupon.findUnique({ where: { code }, include: COUPON_INCLUDE });
    if (!coupon) throw ApiError.notFound('Cupón no válido');
    if (!coupon.isActive) throw ApiError.badRequest('Cupón inactivo');
    const now = new Date();
    if (coupon.startDate && coupon.startDate > now) throw ApiError.badRequest('El cupón aún no está activo');
    if (coupon.endDate && coupon.endDate < now) throw ApiError.badRequest('El cupón expiró');
    if (coupon.maxUses && coupon.usesCount >= coupon.maxUses) throw ApiError.badRequest('El cupón alcanzó su límite de usos');
    if (coupon.type === 'GIFT' && coupon.spentAmount && Number(coupon.spentAmount) >= Number(coupon.value)) {
      throw ApiError.badRequest('El cupón de regalo ya fue agotado');
    }

    return ok(res, {
      ...format(coupon),
      productIds: coupon.products.map((p: any) => p.productId),
      seller: coupon.seller,
    });
  } catch (error) {
    next(error);
  }
}

/** Cupones creados por la tienda (seller). */
export async function listSellerCoupons(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const coupons = await prisma.coupon.findMany({ where: { sellerId: req.user!.id }, orderBy: { createdAt: 'desc' }, include: COUPON_INCLUDE });
    return ok(res, coupons.map(format));
  } catch (error) {
    next(error);
  }
}

export async function createSellerCoupon(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { code, description, type, value, minSpend, maxUses, maxSpend, perUserLimit, isSingleUse, startDate, endDate, productIds } = req.body;
    if (!code || !code.trim()) throw ApiError.badRequest('El código es obligatorio');
    if (!/^[A-Z0-9_-]{3,32}$/.test(code.trim().toUpperCase())) throw ApiError.badRequest('Código inválido (solo letras, números, guiones; 3-32 caracteres)');
    if (!['PERCENTAGE', 'FIXED', 'GIFT'].includes(type)) throw ApiError.badRequest('Tipo inválido');
    if (!Number.isFinite(Number(value)) || Number(value) <= 0) throw ApiError.badRequest('Valor inválido');
    if (type === 'PERCENTAGE' && Number(value) > 100) throw ApiError.badRequest('El porcentaje no puede superar 100');
    if (maxSpend !== undefined && maxSpend !== null && maxSpend !== '' && Number(maxSpend) <= 0) throw ApiError.badRequest('El presupuesto máximo debe ser mayor a 0');
    if (perUserLimit !== undefined && perUserLimit !== null && perUserLimit !== '' && Number(perUserLimit) <= 0) throw ApiError.badRequest('El límite por usuario debe ser mayor a 0');
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) throw ApiError.badRequest('La fecha de inicio debe ser anterior a la de fin');

    // Si se eligieron productos, deben pertenecer a la tienda
    if (Array.isArray(productIds) && productIds.length > 0) {
      const owned = await prisma.product.count({ where: { id: { in: productIds }, sellerId: req.user!.id } });
      if (owned !== productIds.length) throw ApiError.badRequest('Todos los productos deben pertenecer a tu tienda');
    }

    const existing = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (existing) throw ApiError.conflict('Ya existe un cupón con ese código');

    const coupon = await prisma.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        description: description || null,
        type,
        value: Number(value),
        sellerId: req.user!.id,
        minSpend: minSpend ? Number(minSpend) : null,
        maxUses: maxUses !== undefined && maxUses !== null && maxUses !== '' ? Number(maxUses) : 1,
        maxSpend: maxSpend !== undefined && maxSpend !== null && maxSpend !== '' ? Number(maxSpend) : null,
        perUserLimit: perUserLimit !== undefined && perUserLimit !== null && perUserLimit !== '' ? Number(perUserLimit) : null,
        isSingleUse: Boolean(isSingleUse),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        products: Array.isArray(productIds) && productIds.length > 0
          ? { create: productIds.map((pid: number) => ({ productId: Number(pid) })) }
          : undefined,
      },
      include: COUPON_INCLUDE,
    });
    return created(res, format(coupon));
  } catch (error) {
    next(error);
  }
}

export async function updateSellerCoupon(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Cupón no encontrado');
    if (existing.sellerId !== req.user!.id) throw ApiError.forbidden('No tenés permiso');

    const { description, type, value, minSpend, maxUses, startDate, endDate, isActive, productIds } = req.body;
    const data: Record<string, unknown> = {};
    if (description !== undefined) data.description = description;
    if (type !== undefined) data.type = type;
    if (value !== undefined) data.value = Number(value);
    if (minSpend !== undefined) data.minSpend = minSpend === null || minSpend === '' ? null : Number(minSpend);
    if (maxUses !== undefined) data.maxUses = maxUses === null || maxUses === '' ? null : Number(maxUses);
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const coupon = await prisma.$transaction(async (tx) => {
      const c = await tx.coupon.update({ where: { id }, data, include: COUPON_INCLUDE });
      if (Array.isArray(productIds)) {
        await tx.couponProduct.deleteMany({ where: { couponId: id } });
        if (productIds.length > 0) {
          await tx.couponProduct.createMany({
            data: productIds.map((pid: number) => ({ couponId: id, productId: Number(pid) })),
          });
        }
        return tx.coupon.findUniqueOrThrow({ where: { id }, include: COUPON_INCLUDE });
      }
      return c;
    });
    return ok(res, format(coupon));
  } catch (error) {
    next(error);
  }
}

export async function deleteSellerCoupon(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Cupón no encontrado');
    if (existing.sellerId !== req.user!.id) throw ApiError.forbidden('No tenés permiso');
    await prisma.coupon.delete({ where: { id } });
    return ok(res, { message: 'Cupón eliminado' });
  } catch (error) {
    next(error);
  }
}
