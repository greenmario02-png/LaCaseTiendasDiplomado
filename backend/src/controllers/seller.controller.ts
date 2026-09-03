import { NextFunction, Response } from 'express';
import { Prisma, Role } from '@prisma/client';

import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { ok, created } from '../utils/response';
import { recordAudit } from './audit.controller';

const PRODUCT_INCLUDE = {
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
    select: { id: true, url: true, isPrimary: true },
  },
  attributes: {
    include: { attributeDefinition: { select: { id: true, name: true, unit: true, type: true } } },
  },
  variants: { select: { id: true, sku: true, priceModifier: true, stock: true, attributesJson: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
};

/** Genera el siguiente SKU secuencial con prefijo de categoría (formato: PRO-0000). */
async function generateSku(prefix: string): Promise<string> {
  const last = await prisma.product.findFirst({
    where: { sku: { startsWith: `${prefix}-` } },
    orderBy: { sku: 'desc' },
    select: { sku: true },
  });
  const num = last ? parseInt(last.sku.split('-')[1], 10) + 1 : 1;
  return `${prefix}-${String(num).padStart(4, '0')}`;
}

export async function createProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== Role.SELLER) throw ApiError.forbidden('Solo los vendedores pueden publicar');
    if (!user.isApproved) throw ApiError.forbidden('Tu tienda debe ser aprobada por un administrador');
    if (user.storePaused) throw ApiError.forbidden('Tu tienda está pausada por el administrador. No podés publicar productos por el momento');

    const { attributes, tags, images, ...data } = req.body;

    const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    // SKU: si no viene, se genera automáticamente a partir de la categoría
    let sku = data.sku?.trim();
    if (!sku) {
      const category = await prisma.category.findUnique({ where: { id: data.categoryId }, select: { name: true } });
      const prefix = (category?.name ?? 'GEN').substring(0, 3).toUpperCase();
      sku = await generateSku(prefix);
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        sellerId: userId,
        slug,
        sku,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        attributes: attributes
          ? {
              create: attributes.map((a: any) => ({
                attributeDefinitionId: a.attributeDefinitionId,
                valueText: a.valueText ?? null,
                valueNumber: a.valueNumber ?? null,
                valueBoolean: a.valueBoolean ?? null,
              })),
            }
          : undefined,
        tags: tags
          ? {
              create: tags.map((tagSlug: string) => ({
                tag: { connect: { slug: tagSlug } },
              })),
            }
          : undefined,
        images: images
          ? { create: (images as Array<{ url: string; isPrimary?: boolean }>).map((img, i) => ({ url: img.url, order: i, isPrimary: img.isPrimary ?? i === 0 })) }
          : undefined,
      },
      include: PRODUCT_INCLUDE,
    });

    await recordAudit({ productId: product.id, actorId: userId, action: 'CREATED', note: `Producto creado: ${product.name}` });

    return created(res, product);
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const productId = Number(req.params.id);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Producto no encontrado');
    if (product.sellerId !== req.user!.id && req.user!.role !== Role.ADMIN) {
      throw ApiError.forbidden('No puedes modificar este producto');
    }

    const seller = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, storePaused: true } });
    if (seller?.storePaused) throw ApiError.forbidden('Tu tienda está pausada por el administrador. No podés modificar productos por el momento');

    const { attributes, tags, images, ...data } = req.body;

    // Empleados: NO pueden editar precios (solo dueño/admin de tienda o admin global)
    const isEmployee = req.user!.role === Role.SELLER && (req.user!.storeRole === 'EMPLOYEE');
    if (isEmployee) {
      const priceFields = ['price', 'originalPrice', 'salePrice', 'compareAtPrice'];
      const hasPriceChange = Object.keys(data).some((k) => priceFields.includes(k));
      if (hasPriceChange) {
        throw ApiError.forbidden('Como empleado no podés modificar el precio del producto. Solo el administrador de la tienda.');
      }
      // Empleado: la modificación queda pendiente de aprobación del dueño
      await recordAudit({
        productId,
        actorId: req.user!.id,
        action: 'UPDATED',
        note: 'Modificación propuesta por empleado (requiere aprobación del dueño)',
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: productId },
        data: { ...data, slug: data.slug || product.slug },
        include: PRODUCT_INCLUDE,
      });

      if (attributes) {
        await tx.productAttribute.deleteMany({ where: { productId } });
        await tx.productAttribute.createMany({
          data: attributes.map((a: any) => ({
            productId,
            attributeDefinitionId: a.attributeDefinitionId,
            valueText: a.valueText ?? null,
            valueNumber: a.valueNumber ?? null,
            valueBoolean: a.valueBoolean ?? null,
          })),
        });
      }

      if (images !== undefined) {
        await tx.productImage.deleteMany({ where: { productId } });
        await tx.productImage.createMany({
          data: (images as Array<{ url: string; isPrimary?: boolean }>).map((img, i) => ({
            productId,
            url: img.url,
            order: i,
            isPrimary: img.isPrimary ?? i === 0,
          })),
        });
      }

      return p;
    });

    await recordAudit({
      productId,
      actorId: req.user!.id,
      action: 'UPDATED',
      changes: data,
      note: 'Producto modificado',
    });

    return ok(res, updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const productId = Number(req.params.id);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Producto no encontrado');
    if (product.sellerId !== req.user!.id && req.user!.role !== Role.ADMIN) {
      throw ApiError.forbidden('No puedes eliminar este producto');
    }
    // Empleados: NO pueden eliminar productos (solo dueño/admin de tienda o admin global)
    const isEmployee = req.user!.role === Role.SELLER && req.user!.storeRole === 'EMPLOYEE';
    if (isEmployee) {
      throw ApiError.forbidden('Como empleado no podés eliminar productos. Solo el administrador de la tienda.');
    }

    await prisma.product.update({ where: { id: productId }, data: { isActive: false } });
    await recordAudit({ productId, actorId: req.user!.id, action: 'DELETED', note: 'Producto eliminado (soft delete)' });
    return ok(res, { message: 'Producto eliminado' });
  } catch (error) {
    next(error);
  }
}

export async function reactivateProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const productId = Number(req.params.id);
    const { reactivateProduct: doReactivate } = await import('../services/expiration.service');
    const result = await doReactivate(productId, req.user!.id);
    await recordAudit({
      productId,
      actorId: req.user!.id,
      action: 'REACTIVATED',
      note: `Producto reactivado (restantes: ${result.reactivationLeft})`,
    });
    return ok(res, {
      message: `Producto reactivado por 30 días. Reactivaciones restantes: ${result.reactivationLeft}`,
      reactivationLeft: result.reactivationLeft,
    });
  } catch (error) {
    next(error);
  }
}

export async function listSellerProducts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = req.user!.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    // Búsqueda opcional por nombre o SKU (usado por el lector de código de barras)
    const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined;
    const where: Prisma.ProductWhereInput = { sellerId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: PRODUCT_INCLUDE,
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({
      data: products,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

export async function getSellerDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = req.user!.id;

    const days30 = new Date(Date.now() - 30 * 86400000);

    const [totalProducts, activeProducts, pendingProducts, totalSales, totalRevenue, recentOrders, salesRaw, ordersByStatus, unreadMessages, sellerInfo, customersServed] =
      await Promise.all([
        prisma.product.count({ where: { sellerId } }),
        prisma.product.count({ where: { sellerId, isActive: true, isApproved: true } }),
        prisma.product.count({ where: { sellerId, isApproved: false, isActive: true } }),
        prisma.order.count({ where: { sellerId, status: { not: 'CANCELLED' } } }),
        prisma.order.aggregate({
          where: { sellerId, status: { not: 'CANCELLED' }, paymentStatus: 'VERIFIED' },
          _sum: { total: true },
        }),
        prisma.order.findMany({
          where: { sellerId },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { buyer: { select: { firstName: true, lastName: true } }, items: { include: { product: { select: { name: true, images: { take: 1 } } } } } },
        }),
        prisma.order.findMany({
          where: { sellerId, status: { not: 'CANCELLED' }, createdAt: { gte: days30 } },
          select: { createdAt: true, total: true },
        }),
        prisma.order.groupBy({ by: ['status'], where: { sellerId }, _count: true }),
        prisma.conversation
          .findMany({
            where: { sellerId },
            select: { id: true, messages: { where: { senderId: { not: sellerId }, readAt: null }, select: { id: true } } },
          })
          .then((convs) => convs.reduce((acc, c) => acc + c.messages.length, 0)),
        prisma.user.findUnique({
          where: { id: sellerId },
          select: { rating: true, totalSales: true, storeName: true, storeLogo: true, isVerified: true },
        }),
        prisma.conversation.count({ where: { sellerId } }),
      ]);

    // Ventas por día (serie de 30 días con ceros)
    const salesByDay: { date: string; revenue: number; orders: number }[] = [];
    const byDay = new Map<string, { revenue: number; orders: number }>();
    for (const o of salesRaw) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const cur = byDay.get(key) ?? { revenue: 0, orders: 0 };
      cur.revenue += Number(o.total);
      cur.orders += 1;
      byDay.set(key, cur);
    }
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      salesByDay.push({ date: key, revenue: byDay.get(key)?.revenue ?? 0, orders: byDay.get(key)?.orders ?? 0 });
    }

    // Top productos del vendedor por unidades vendidas
    const topProductsRaw = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: { product: { sellerId } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });
    const topProducts = [];
    for (const t of topProductsRaw) {
      const p = await prisma.product.findUnique({
        where: { id: t.productId },
        select: { id: true, name: true, price: true, stock: true, images: { take: 1, select: { url: true } } },
      });
      if (p) topProducts.push({ ...p, totalSold: t._sum.quantity ?? 0 });
    }

    // Ventas de la semana y mes para comparación
    const weekStart = new Date(Date.now() - 7 * 86400000);
    const monthStart = new Date(Date.now() - 30 * 86400000);
    const revenueWeek = salesRaw.filter((o) => o.createdAt >= weekStart).reduce((acc, o) => acc + Number(o.total), 0);
    const revenueMonth = salesRaw.filter((o) => o.createdAt >= monthStart).reduce((acc, o) => acc + Number(o.total), 0);

    return ok(res, {
      totalProducts,
      activeProducts,
      pendingProducts,
      totalSales,
      totalRevenue: totalRevenue._sum.total ?? 0,
      revenueWeek,
      revenueMonth,
      recentOrders,
      salesByDay,
      ordersByStatus,
      unreadMessages,
      topProducts,
      sellerInfo,
      customersServed,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSellerProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const allowed = [
      'storeName',
      'storeDescription',
      'storeLogo',
      'storeBanner',
      'profileImage',
      'bio',
      'storeCategory',
      'country',
      'locationCity',
      'locationState',
      'locationPostalCode',
      'latitude',
      'longitude',
      'youtubeUrl',
      'tiktokUrl',
      'instagramUrl',
      'facebookUrl',
      'whatsappPhone',
      'phone',
      'paymentQrUrl',
      'freeShippingThreshold',
    ];
    const data: Prisma.UserUpdateInput = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'freeShippingThreshold' && req.body[key] !== null && req.body[key] !== '') {
          (data as any)[key] = Number(req.body[key]);
        } else if (key === 'latitude' || key === 'longitude') {
          (data as any)[key] = req.body[key] === '' || req.body[key] === null ? null : Number(req.body[key]);
        } else {
          (data as any)[key] = req.body[key];
        }
      }
    }

    const user = await prisma.user.update({ where: { id: userId }, data });
    return ok(res, user);
  } catch (error) {
    next(error);
  }
}

/** Solicitudes de compradores privilegiados pendientes para la tienda. */
export async function listPrivilegedRequests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const requests = await prisma.privilegedBuyer.findMany({
      where: { sellerId: req.user!.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { buyer: { select: { id: true, firstName: true, lastName: true, email: true, totalSales: true, createdAt: true } } },
    });
    return ok(res, requests);
  } catch (error) {
    next(error);
  }
}

/** Lista de compradores privilegiados aprobados de la tienda. */
export async function listPrivilegedBuyers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const buyers = await prisma.privilegedBuyer.findMany({
      where: { sellerId: req.user!.id, status: 'APPROVED' },
      orderBy: { approvedAt: 'desc' },
      include: { buyer: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    return ok(res, buyers);
  } catch (error) {
    next(error);
  }
}

/** El vendedor aprueba o rechaza una solicitud de comprador privilegiado. */
export async function respondPrivilegedRequest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const decision = req.body.decision as 'APPROVED' | 'REJECTED';
    if (!['APPROVED', 'REJECTED'].includes(decision)) throw ApiError.badRequest('Decisión inválida');

    const rel = await prisma.privilegedBuyer.findUnique({ where: { id: Number(id) } });
    if (!rel) throw ApiError.notFound('Solicitud no encontrada');
    if (rel.sellerId !== req.user!.id) throw ApiError.forbidden('No tenés permiso');

    const updated = await prisma.privilegedBuyer.update({
      where: { id: rel.id },
      data: { status: decision, approvedAt: decision === 'APPROVED' ? new Date() : null },
    });
    return ok(res, updated);
  } catch (error) {
    next(error);
  }
}

/** El vendedor solicita el sello de vendedor verificado (paga suscripción y presenta NIT/documentos). */
export async function requestVerification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { nit, note, documentUrl } = req.body;
    if (!nit || !nit.trim()) throw ApiError.badRequest('El NIT es obligatorio');
    if (nit.trim().length < 6) throw ApiError.badRequest('El NIT debe tener al menos 6 caracteres');

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { nit: nit.trim(), verificationNote: note || null, isVerificationRequested: true },
    });
    return ok(res, {
      message: 'Solicitud de verificación enviada. El administrador revisará tus documentos.',
      isVerificationRequested: updated.isVerificationRequested,
      isVerified: updated.isVerified,
      documentUrl: documentUrl || null,
    });
  } catch (error) {
    next(error);
  }
}

/** Estado de la verificación de la tienda del vendedor. */
export async function verificationStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { isVerified: true, isVerificationRequested: true, nit: true, verificationNote: true },
    });
    return ok(res, user);
  } catch (error) {
    next(error);
  }
}

/**
 * Copia los datos de un producto existente (de cualquier tienda) para precargar
 * un formulario nuevo. NO copia imagen ni precio: el vendedor debe poner los suyos.
 * Registra la acción en el audit trail como COPIED (para detectar copias masivas).
 */
export async function copyProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const productId = Number(req.body?.productId);
    if (!Number.isInteger(productId)) throw ApiError.badRequest('El ID del producto a copiar es obligatorio');

    const source = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        name: true,
        description: true,
        condition: true,
        categoryId: true,
        warrantyInfo: true,
        attributes: { select: { attributeDefinitionId: true, valueText: true, valueNumber: true, valueBoolean: true } },
      },
    });
    if (!source) throw ApiError.notFound('Producto no encontrado');

    await recordAudit({
      productId,
      actorId: req.user!.id,
      action: 'COPIED',
      note: `Producto copiado para re-publicación: ${source.name}`,
    });

    return ok(res, {
      name: source.name,
      description: source.description,
      condition: source.condition,
      categoryId: source.categoryId,
      warrantyInfo: source.warrantyInfo,
      attributes: source.attributes.map((a) => ({
        attributeDefinitionId: a.attributeDefinitionId,
        valueText: a.valueText,
        valueNumber: a.valueNumber,
        valueBoolean: a.valueBoolean,
      })),
    });
  } catch (error) {
    next(error);
  }
}
