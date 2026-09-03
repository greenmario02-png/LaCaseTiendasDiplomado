import { NextFunction, Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { ok, created } from '../utils/response';

const SLOT_CATEGORIES: Record<string, string[]> = {
  CPU: ['Procesadores'],
  MOTHERBOARD: ['Motherboards'],
  RAM: ['Memorias RAM'],
  GPU: ['Placas de Video'],
  STORAGE: ['Almacenamiento'],
  PSU: ['Fuentes de Poder'],
  CASE: ['Gabinetes'],
  COOLER: ['Refrigeración'],
};

/**
 * Verifica la compatibilidad entre CPU y Motherboard por socket.
 * Extrae el socket de los atributos dinámicos del producto.
 */
async function getProductSocket(productId: number): Promise<string | null> {
  const attr = await prisma.productAttribute.findFirst({
    where: {
      productId,
      attributeDefinition: { name: 'Socket' },
    },
    select: { valueText: true },
  });
  return attr?.valueText ?? null;
}

export async function checkCompatibility(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const productId = Number(_req.query.productId);
    const slotType = String(_req.query.slotType || '').toUpperCase();

    if (!productId || !slotType) throw ApiError.badRequest('productId y slotType son obligatorios');

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Producto no encontrado');

    // Validar que el producto pertenezca a la categoría correcta del slot
    const categoryNames = SLOT_CATEGORIES[slotType] ?? [];
    if (categoryNames.length === 0) throw ApiError.badRequest('slotType inválido');

    const category = await prisma.category.findUnique({ where: { id: product.categoryId } });
    const validCategory = category && categoryNames.includes(category.name);

    return ok(res, {
      productId,
      slotType,
      compatible: Boolean(validCategory),
      reason: validCategory ? 'ok' : 'Este producto no corresponde al slot seleccionado',
    });
  } catch (error) {
    next(error);
  }
}

export async function getBuilds(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const builds = await prisma.build.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        components: {
          include: {
            product: {
              include: {
                images: { take: 1, select: { url: true } },
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    return ok(res, builds);
  } catch (error) {
    next(error);
  }
}

export async function getBuild(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const build = await prisma.build.findFirst({
      where: { id: Number(req.params.id), userId: req.user!.id },
      include: {
        components: {
          include: {
            product: {
              include: {
                images: { take: 1, select: { url: true } },
                category: { select: { name: true } },
                seller: { select: { storeName: true } },
              },
            },
          },
        },
      },
    });
    if (!build) throw ApiError.notFound('Build no encontrada');
    return ok(res, build);
  } catch (error) {
    next(error);
  }
}

export async function createBuild(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, components } = req.body;

    if (!components || !Array.isArray(components) || components.length === 0) {
      throw ApiError.badRequest('Se requieren componentes');
    }

    // Validar que cada producto exista y corresponda a su slot
    let totalPrice = 0;
    const resolved = [];

    for (const comp of components) {
      const { productId, slotType } = comp;
      const slot = String(slotType).toUpperCase();
      const categoryNames = SLOT_CATEGORIES[slot] ?? [];

      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { category: { select: { name: true } } },
      });

      if (!product) throw ApiError.notFound(`Producto ${productId} no encontrado`);
      if (categoryNames.length === 0) throw ApiError.badRequest(`slotType inválido: ${slot}`);
      if (!categoryNames.includes(product.category.name)) {
        throw ApiError.badRequest(`El producto "${product.name}" no corresponde al slot ${slot}`);
      }

      totalPrice += Number(product.price);
      resolved.push({ productId, slotType: slot as any });
    }

    const build = await prisma.build.create({
      data: {
        userId: req.user!.id,
        name: name || 'Mi PC',
        totalPrice,
        components: { create: resolved },
      },
      include: { components: true },
    });

    return created(res, build);
  } catch (error) {
    next(error);
  }
}

export async function deleteBuild(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const build = await prisma.build.findFirst({
      where: { id: Number(req.params.id), userId: req.user!.id },
    });
    if (!build) throw ApiError.notFound('Build no encontrada');

    await prisma.build.delete({ where: { id: build.id } });
    return ok(res, { message: 'Build eliminada' });
  } catch (error) {
    next(error);
  }
}

export async function getBuildSlotProducts(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const slotType = String(_req.query.slotType || '').toUpperCase();
    const categoryNames = SLOT_CATEGORIES[slotType] ?? [];
    if (categoryNames.length === 0) throw ApiError.badRequest('slotType inválido');

    const categories = await prisma.category.findMany({ where: { name: { in: categoryNames } } });
    const categoryIds = categories.map((c) => c.id);

    const products = await prisma.product.findMany({
      where: { categoryId: { in: categoryIds }, isActive: true, isApproved: true },
      orderBy: { saleCount: 'desc' },
      take: 100,
      include: {
        images: { take: 1, select: { url: true } },
        attributes: {
          include: { attributeDefinition: { select: { name: true, unit: true } } },
        },
        seller: { select: { storeName: true, rating: true } },
      },
    });

    return ok(res, products);
  } catch (error) {
    next(error);
  }
}
