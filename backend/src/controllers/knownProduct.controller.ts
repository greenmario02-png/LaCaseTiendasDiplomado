import { Response, NextFunction } from 'express';

import { prisma } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { ApiError } from '../utils/errors';
import { ok, created } from '../utils/response';

/**
 * Productos conocidos por categoría (catálogo de artículos típicos).
 * Un producto conocido define un tipo de artículo (ej. "Cuaderno", "Chompa")
 * y los atributos dinámicos que debería traer ese artículo (tabla relacional).
 * - sellerId null  → producto GLOBAL creado por el admin.
 * - sellerId != null → preset PRIVADO del vendedor (solo lo ve su tienda).
 * Atributos: KnownProductAttribute (attributeDefinitionId FK + defaultValue + isRequired).
 */

function sellerStoreId(user: any): number {
  return user.storeOwnerId ?? user.id;
}

const WITH_ATTRIBUTES = {
  attributes: {
    include: { attributeDefinition: { select: { id: true, name: true, type: true, unit: true } } },
    orderBy: { id: 'asc' as const },
  },
};

function mapAttributes(input: unknown): Array<{ attributeDefinitionId: number; defaultValue?: string; isRequired?: boolean }> {
  if (!Array.isArray(input)) return [];
  const seen = new Set<number>();
  const out: Array<{ attributeDefinitionId: number; defaultValue?: string; isRequired?: boolean }> = [];
  for (const raw of input) {
    const defId = Number((raw as any)?.attributeDefinitionId);
    if (!Number.isInteger(defId) || defId <= 0) continue;
    if (seen.has(defId)) continue;
    seen.add(defId);
    out.push({
      attributeDefinitionId: defId,
      defaultValue: (raw as any)?.defaultValue != null ? String((raw as any).defaultValue) : undefined,
      isRequired: Boolean((raw as any)?.isRequired),
    });
  }
  return out;
}

/* ------------------------- ADMIN (productos conocidos globales) ------------------------- */

export async function adminListKnownProducts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const categoryId = (req.query.categoryId as string | undefined)?.trim();
    const search = (req.query.search as string | undefined)?.trim();
    const where: Record<string, unknown> = {};
    if (categoryId && Number.isFinite(Number(categoryId))) where.categoryId = Number(categoryId);
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const items = await prisma.knownProduct.findMany({
      where,
      include: {
        ...WITH_ATTRIBUTES,
        category: { select: { id: true, name: true } },
        seller: { select: { id: true, firstName: true, lastName: true, storeName: true } },
      },
      orderBy: [{ categoryId: 'asc' }, { name: 'asc' }],
    });
    return ok(res, items);
  } catch (err) {
    return next(err);
  }
}

export async function adminCreateKnownProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { categoryId, name, attributes } = req.body ?? {};
    if (!categoryId || !name?.trim()) throw ApiError.badRequest('categoryId y name son obligatorios');
    const category = await prisma.category.findUnique({ where: { id: Number(categoryId) } });
    if (!category) throw ApiError.notFound('Categoría no encontrada');

    const attrs = mapAttributes(attributes);
    const item = await prisma.knownProduct.create({
      data: {
        categoryId: Number(categoryId),
        name: String(name).trim(),
        sellerId: null,
        attributes: attrs.length
          ? { create: attrs.map((a) => ({ attributeDefinitionId: a.attributeDefinitionId, defaultValue: a.defaultValue, isRequired: a.isRequired })) }
          : undefined,
      },
      include: WITH_ATTRIBUTES,
    });
    return created(res, item);
  } catch (err) {
    return next(err);
  }
}

export async function adminUpdateKnownProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.knownProduct.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Producto conocido no encontrado');

    const { name, attributes, isActive, categoryId } = req.body ?? {};
    const data: Record<string, unknown> = {};
    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (typeof isActive === 'boolean') data.isActive = isActive;
    if (categoryId && Number.isFinite(Number(categoryId))) data.categoryId = Number(categoryId);
    if (Array.isArray(attributes)) {
      const attrs = mapAttributes(attributes);
      data.attributes = {
        deleteMany: {},
        create: attrs.map((a) => ({ attributeDefinitionId: a.attributeDefinitionId, defaultValue: a.defaultValue, isRequired: a.isRequired })),
      };
    }

    const item = await prisma.knownProduct.update({ where: { id }, data, include: WITH_ATTRIBUTES });
    return ok(res, item);
  } catch (err) {
    return next(err);
  }
}

export async function adminDeleteKnownProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await prisma.knownProduct.delete({ where: { id } }).catch(() => {
      throw ApiError.notFound('Producto conocido no encontrado');
    });
    return ok(res, { deleted: true });
  } catch (err) {
    return next(err);
  }
}

/* ------------------------- SELLER (presets privados) ------------------------- */

export async function sellerListKnownProducts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const storeId = sellerStoreId(req.user);
    const categoryId = (req.query.categoryId as string | undefined)?.trim();
    const search = (req.query.search as string | undefined)?.trim();
    const where: Record<string, unknown> = { OR: [{ sellerId: null }, { sellerId: storeId }] };
    if (categoryId && Number.isFinite(Number(categoryId))) where.categoryId = Number(categoryId);
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const items = await prisma.knownProduct.findMany({
      where,
      include: { ...WITH_ATTRIBUTES, category: { select: { id: true, name: true } } },
      orderBy: [{ categoryId: 'asc' }, { name: 'asc' }],
    });
    return ok(res, items);
  } catch (err) {
    return next(err);
  }
}

export async function sellerCreateKnownProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const storeId = sellerStoreId(req.user);
    const { categoryId, name, attributes } = req.body ?? {};
    if (!categoryId || !name?.trim()) throw ApiError.badRequest('categoryId y name son obligatorios');
    const category = await prisma.category.findUnique({ where: { id: Number(categoryId) } });
    if (!category) throw ApiError.notFound('Categoría no encontrada');

    const attrs = mapAttributes(attributes);
    const item = await prisma.knownProduct.create({
      data: {
        categoryId: Number(categoryId),
        name: String(name).trim(),
        sellerId: storeId,
        attributes: attrs.length
          ? { create: attrs.map((a) => ({ attributeDefinitionId: a.attributeDefinitionId, defaultValue: a.defaultValue, isRequired: a.isRequired })) }
          : undefined,
      },
      include: WITH_ATTRIBUTES,
    });
    return created(res, item);
  } catch (err) {
    return next(err);
  }
}

export async function sellerUpdateKnownProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const storeId = sellerStoreId(req.user);
    const id = Number(req.params.id);
    const existing = await prisma.knownProduct.findUnique({ where: { id } });
    if (!existing || existing.sellerId !== storeId) throw ApiError.notFound('Producto conocido no encontrado');

    const { name, attributes } = req.body ?? {};
    const data: Record<string, unknown> = {};
    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (Array.isArray(attributes)) {
      const attrs = mapAttributes(attributes);
      data.attributes = {
        deleteMany: {},
        create: attrs.map((a) => ({ attributeDefinitionId: a.attributeDefinitionId, defaultValue: a.defaultValue, isRequired: a.isRequired })),
      };
    }

    const item = await prisma.knownProduct.update({ where: { id }, data, include: WITH_ATTRIBUTES });
    return ok(res, item);
  } catch (err) {
    return next(err);
  }
}

export async function sellerDeleteKnownProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const storeId = sellerStoreId(req.user);
    const id = Number(req.params.id);
    const existing = await prisma.knownProduct.findUnique({ where: { id } });
    if (!existing || existing.sellerId !== storeId) throw ApiError.notFound('Producto conocido no encontrado');
    await prisma.knownProduct.delete({ where: { id } });
    return ok(res, { deleted: true });
  } catch (err) {
    return next(err);
  }
}

/**
 * Crea atributos dinámicos globales desde el panel del vendedor.
 * El usuario escribe nombres separados por coma (estilo etiquetas), ej:
 * "Marca, Nro de hojas, Tamaño". Cada nombre se crea como AttributeDefinition
 * de tipo TEXT en la tabla global `attribute_definitions`.
 * Si un nombre ya existe (case-insensitive), se devuelve el existente.
 */
export async function sellerCreateAttributes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const raw = String(req.body.names ?? req.body.name ?? '').trim();
    if (!raw) throw ApiError.badRequest('Escribí al menos un nombre de atributo.');
    const names = [...new Set(raw.split(',').map((s: string) => s.trim()).filter(Boolean))];
    if (names.length === 0) throw ApiError.badRequest('Escribí al menos un nombre de atributo.');

    const existing = await prisma.attributeDefinition.findMany({
      where: { name: { in: names, mode: 'insensitive' } },
      select: { id: true, name: true, type: true, unit: true },
    });
    const existingByLower = new Map(existing.map((e) => [e.name.toLowerCase(), e]));
    const toCreate = names.filter((n) => !existingByLower.has(n.toLowerCase()));

    let createdDefs: Array<{ id: number; name: string; type: string; unit: string | null }> = [];
    if (toCreate.length > 0) {
      createdDefs = await prisma.$transaction(
        toCreate.map((name) =>
          prisma.attributeDefinition.create({
            data: {
              name,
              type: 'TEXT',
              categoryId: null,
              isRequired: false,
              isFilterable: true,
              isVariant: false,
              order: 0,
            },
            select: { id: true, name: true, type: true, unit: true },
          }),
        ),
      );
    }

    const all = [...existing, ...createdDefs];
    return created(res, all);
  } catch (err) {
    return next(err);
  }
}
