import { Request, Response } from 'express';

import * as productService from '../services/product.service';
import { ok, created, paginated } from '../utils/response';
import { prisma } from '../config/database';

export async function list(req: Request, res: Response) {
  const q = req.query as Record<string, unknown>;
  const filters = { ...q } as any;

  if (typeof q.categoryIds === 'string' && q.categoryIds) {
    filters.categoryIds = q.categoryIds.split(',').map(Number).filter(Boolean);
  }
  if (q.acceptsTrade !== undefined) {
    filters.acceptsTrade = q.acceptsTrade === 'true';
  }

  const result = await productService.listProducts(filters);
  return res.json(result);
}

export async function featured(req: Request, res: Response) {
  const products = await productService.getFeaturedProducts();
  return ok(res, products);
}

export async function detail(req: Request, res: Response) {
  const product = await productService.getProductById(Number(req.params.id));

  // "X personas están viendo": sesiones únicas que vieron el producto en los últimos 5 minutos
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const viewingNow = await prisma.productView.count({
    where: { productId: product.id, createdAt: { gte: fiveMinAgo } },
  });

  return ok(res, { ...product, viewingNow: Math.min(viewingNow, 20) });
}

/** Ofertas del mismo producto (masterSku) de distintos vendedores, ordenadas por precio. */
export async function offers(req: Request, res: Response) {
  const product = await productService.getProductById(Number(req.params.id));
  const masterSku = product.masterSku ?? product.sku;

  const offers = await prisma.product.findMany({
    where: { masterSku, isApproved: true, isActive: true },
    orderBy: [{ price: 'asc' }],
    include: {
      seller: { select: { id: true, storeName: true, rating: true, isVerified: true, locationCity: true, locationState: true } },
      images: { orderBy: { order: 'asc' }, select: { id: true, url: true, isPrimary: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  return ok(res, {
    masterSku,
    currentId: product.id,
    count: offers.length,
    bestPrice: offers[0] ? Number(offers[0].price) : null,
    offers: offers.map((o) => ({ ...o, price: Number(o.price) })),
  });
}

export async function related(req: Request, res: Response) {
  const product = await productService.getProductById(Number(req.params.id));
  const related = await productService.getRelatedProducts(product.id, product.categoryId, Number(product.price));
  return ok(res, related);
}

export async function listCategories(_req: Request, res: Response) {
  const tree = await productService.getCategoriesTree();
  return ok(res, tree);
}

export async function categoryAttributes(req: Request, res: Response) {
  const attrs = await productService.getCategoryAttributes(Number(req.params.id));
  return ok(res, attrs);
}

/** Busca definiciones de atributos activas por nombre (botón "+" del form de producto). */
export async function searchAttributeDefinitions(req: Request, res: Response) {
  const ids = String(req.query.ids ?? '')
    .split(',')
    .map(Number)
    .filter(Boolean);
  const q = String(req.query.q ?? '').trim();
  const where: any = { isActive: true };
  if (ids.length > 0) {
    where.id = { in: ids };
  } else if (q) {
    where.name = { contains: q, mode: 'insensitive' };
  }
  const defs = await prisma.attributeDefinition.findMany({
    where,
    take: ids.length > 0 ? 30 : 15,
    orderBy: { order: 'asc' },
    select: {
      id: true,
      name: true,
      type: true,
      unit: true,
      options: true,
      category: { select: { name: true } },
    },
  });
  return ok(res, defs);
}

/** Valores ya usados para una definición (autocompletado de valores en el form). */
export async function attributeValues(req: Request, res: Response) {
  const attrId = Number(req.query.attributeDefinitionId);
  if (!attrId) return ok(res, []);
  const q = String(req.query.q ?? '').trim();
  const where: any = { attributeDefinitionId: attrId, valueText: { not: null } };
  if (q) where.valueText = { contains: q, mode: 'insensitive' };
  const rows = await prisma.productAttribute.findMany({
    where,
    take: 10,
    distinct: ['valueText'],
    select: { valueText: true },
    orderBy: { valueText: 'asc' },
  });
  return ok(res, rows.map((r) => r.valueText).filter(Boolean));
}

export { paginated };
