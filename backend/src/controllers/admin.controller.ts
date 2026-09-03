import { NextFunction, Response } from 'express';

import { OrderStatus, Role } from '@prisma/client';

import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { ok, created, paginated } from '../utils/response';
import { getCommissionConfig, setCommissionConfig, calculateCommission } from '../services/commission.service';
import { createNotification } from '../services/notification.service';
import { recordAudit } from './audit.controller';

export async function dashboard(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalProducts, pendingProducts, totalSellers, pendingSellers, totalUsers, totalOrders, totalRevenue, pendingOrders, recentOrders] =
      await Promise.all([
        prisma.product.count(),
        prisma.product.count({ where: { isApproved: false, isActive: true } }),
        prisma.user.count({ where: { role: 'SELLER' } }),
        prisma.user.count({ where: { role: 'SELLER', isApproved: false } }),
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.order.count(),
        prisma.order.aggregate({
          where: { status: { not: 'CANCELLED' }, paymentStatus: 'VERIFIED' },
          _sum: { total: true },
        }),
        prisma.order.count({ where: { status: 'PENDING' } }),
        prisma.order.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            buyer: { select: { firstName: true, lastName: true, email: true } },
            seller: { select: { storeName: true } },
            items: { take: 2, include: { product: { select: { name: true } } } },
          },
        }),
      ]);

    const monthRevenue = await prisma.order.aggregate({
      where: { status: { not: 'CANCELLED' }, paymentStatus: 'VERIFIED', createdAt: { gte: monthStart } },
      _sum: { total: true },
    });

    const salesByDay = await prisma.order.groupBy({
      by: ['createdAt'],
      where: { status: { not: 'CANCELLED' }, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      _sum: { total: true },
      _count: true,
    });

    return ok(res, {
      kpis: {
        totalProducts,
        pendingProducts,
        totalSellers,
        pendingSellers,
        totalUsers,
        totalOrders,
        totalRevenue: totalRevenue._sum.total ?? 0,
        monthRevenue: monthRevenue._sum.total ?? 0,
        pendingOrders,
      },
      salesByDay,
      recentOrders,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Estadísticas avanzadas para el dashboard: ventas por día, top productos, top tiendas,
 * ventas por categoría, estado de órdenes, subastas activas, distribución de usuarios.
 */
export async function stats(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const days30 = new Date(Date.now() - 30 * 86400000);
    const days7 = new Date(Date.now() - 7 * 86400000);

    // 1. Ventas por día (últimos 30 días, serie completa con ceros)
    const salesRaw = await prisma.order.findMany({
      where: { status: { not: 'CANCELLED' }, createdAt: { gte: days30 } },
      select: { createdAt: true, total: true },
    });
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

    // 2. Top 10 productos más vendidos
    const topProductsRaw = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });
    const topProducts = [];
    for (const t of topProductsRaw) {
      const p = await prisma.product.findUnique({
        where: { id: t.productId },
        select: { id: true, name: true, price: true, images: { take: 1, select: { url: true } } },
      });
      if (p) topProducts.push({ ...p, totalSold: t._sum.quantity ?? 0 });
    }

    // 3. Top 10 tiendas por ingresos
    const sellerRevenueRaw = await prisma.order.groupBy({
      by: ['sellerId'],
      where: { status: { not: 'CANCELLED' }, paymentStatus: 'VERIFIED' },
      _sum: { total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: 10,
    });
    const topSellers = [];
    for (const s of sellerRevenueRaw) {
      const seller = await prisma.user.findUnique({
        where: { id: s.sellerId },
        select: { id: true, storeName: true, storeLogo: true, rating: true, locationCity: true, country: true },
      });
      if (seller) topSellers.push({ ...seller, revenue: s._sum.total ?? 0, orders: s._count ?? 0 });
    }

    // 4. Ventas por categoría
    const ordersWithItems = await prisma.orderItem.findMany({
      where: { order: { status: { not: 'CANCELLED' }, createdAt: { gte: days30 } } },
      select: { product: { select: { categoryId: true } }, quantity: true, unitPrice: true },
    });
    const catSales = new Map<number, number>();
    for (const oi of ordersWithItems) {
      if (!oi.product.categoryId) continue;
      catSales.set(oi.product.categoryId, (catSales.get(oi.product.categoryId) ?? 0) + Number(oi.unitPrice) * oi.quantity);
    }
    const salesByCategory = [];
    for (const [catId, total] of catSales.entries()) {
      const cat = await prisma.category.findUnique({ where: { id: catId }, select: { id: true, name: true } });
      if (cat) salesByCategory.push({ id: cat.id, name: cat.name, total });
    }
    salesByCategory.sort((a, b) => b.total - a.total);

    // 5. Distribución de órdenes por estado
    const ordersByStatus = await prisma.order.groupBy({ by: ['status'], _count: true });

    // 6. Distribución de usuarios por rol
    const usersByRole = await prisma.user.groupBy({ by: ['role'], _count: true });

    // 7. Subastas
    const [activeAuctions, totalAuctions, closedAuctions] = await Promise.all([
      prisma.auction.count({ where: { isActive: true, endDate: { gt: now } } }),
      prisma.auction.count(),
      prisma.auction.count({ where: { isSold: true } }),
    ]);

    // 8. Ventas de la semana vs anterior
    const weekRevenue = salesRaw.filter((o) => o.createdAt >= days7).reduce((acc, o) => acc + Number(o.total), 0);
    const prevWeekRevenue = salesRaw
      .filter((o) => o.createdAt < days7 && o.createdAt >= new Date(Date.now() - 14 * 86400000))
      .reduce((acc, o) => acc + Number(o.total), 0);
    const weekGrowth = prevWeekRevenue > 0 ? Math.round(((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100) : 100;

    return ok(res, {
      salesByDay,
      topProducts,
      topSellers,
      salesByCategory,
      ordersByStatus,
      usersByRole,
      auctions: { activeAuctions, totalAuctions, closedAuctions },
      weekRevenue,
      weekGrowth,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Detalle de una tienda para el admin: métricas de la tienda, sus productos,
 * sus pedidos y sus reseñas.
 */
export async function sellerDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellerId = Number(req.params.id);
    const seller = await prisma.user.findUnique({
      where: { id: sellerId, role: 'SELLER' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        storeName: true,
        storeDescription: true,
        storeLogo: true,
        storeBanner: true,
        storeCategory: true,
        country: true,
        locationCity: true,
        locationState: true,
        locationPostalCode: true,
        rating: true,
        totalSales: true,
        gamerCoins: true,
        isVerified: true,
        isApproved: true,
        isActive: true,
        storePaused: true,
        createdAt: true,
      },
    });
    if (!seller) throw ApiError.notFound('Vendedor no encontrado');

    const [productCount, activeProducts, pendingProducts, orderCount, revenue, recentOrders, reviews] = await Promise.all([
      prisma.product.count({ where: { sellerId } }),
      prisma.product.count({ where: { sellerId, isActive: true, isApproved: true } }),
      prisma.product.count({ where: { sellerId, isApproved: false, isActive: true } }),
      prisma.order.count({ where: { sellerId, status: { not: 'CANCELLED' } } }),
      prisma.order.aggregate({ where: { sellerId, status: { not: 'CANCELLED' }, paymentStatus: 'VERIFIED' }, _sum: { total: true } }),
      prisma.order.findMany({
        where: { sellerId },
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { buyer: { select: { firstName: true, lastName: true } }, items: { take: 2, include: { product: { select: { name: true } } } } },
      }),
      prisma.review.findMany({
        where: { sellerId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    return ok(res, {
      seller,
      metrics: {
        productCount,
        activeProducts,
        pendingProducts,
        orderCount,
        revenue: revenue._sum.total ?? 0,
      },
      recentOrders,
      reviews,
    });
  } catch (error) {
    next(error);
  }
}

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const role = req.query.role as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();

    const where = {
      ...(role ? { role: role as any } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' as const } },
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
  storeName: true,
  isApproved: true,
  isActive: true,
  storePaused: true,
  rating: true,
          totalSales: true,
          gamerCoins: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      data: users,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = Number(req.params.id);
    const { role, isActive, isApproved, isVerified, locationVerified } = req.body;

    const prevUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isApproved: true, isActive: true, storeName: true, locationVerified: true } });
    if (!prevUser) throw ApiError.notFound('Usuario no encontrado');

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role !== undefined && { role: role as any }),
        ...(isActive !== undefined && { isActive }),
        ...(isApproved !== undefined && { isApproved }),
        ...(isVerified !== undefined && { isVerified }),
        ...(locationVerified !== undefined && { locationVerified }),
      },
      select: {
        id: true,
        email: true,
        role: true,
        storeName: true,
        isApproved: true,
        isActive: true,
        isVerified: true,
        locationVerified: true,
      },
    });

    // Notificar aprobación de ubicación verificada (tienda física comprobada por el admin)
    if (prevUser.role === 'SELLER' && locationVerified !== undefined && locationVerified !== prevUser.locationVerified) {
      await createNotification({
        userId,
        type: 'SELLER_APPROVED',
        title: locationVerified ? '📍 Ubicación verificada' : 'Ubicación pendiente de verificación',
        message: locationVerified
          ? 'El administrador comprobó la ubicación física de tu tienda. Ya figura como verificada.'
          : 'El administrador marcó tu ubicación como no verificada.',
        refType: 'seller',
        refId: userId,
      });
    }

    // Notificar aprobación/rechazo de vendedor
    if (prevUser.role === 'SELLER' && isApproved !== undefined && isApproved !== prevUser.isApproved) {
      await createNotification({
        userId,
        type: isApproved ? 'SELLER_APPROVED' : 'SELLER_REJECTED',
        title: isApproved ? '¡Tu tienda fue aprobada! 🎉' : 'Tu tienda fue rechazada',
        message: isApproved
          ? 'Ya podés publicar productos en MultiTienda.'
          : 'Tu solicitud de tienda fue rechazada. Contactá al administrador.',
        refType: 'seller',
        refId: userId,
      });
    }

    // Notificar suspensión/activación
    if (prevUser.role === 'SELLER' && isActive !== undefined && isActive !== prevUser.isActive) {
      await createNotification({
        userId,
        type: 'SYSTEM',
        title: isActive ? 'Tu tienda fue reactivada' : 'Tu tienda fue suspendida',
        message: isActive
          ? 'Ya podés operar con normalidad.'
          : 'Tu tienda fue suspendida temporalmente. Contactá al administrador.',
        refType: 'seller',
        refId: userId,
      });
    }

    return ok(res, user);
  } catch (error) {
    if ((error as any).code === 'P2025') return next(ApiError.notFound('Usuario no encontrado'));
    next(error);
  }
}

export async function createUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, password, firstName, lastName, phone, role, storeName } = req.body;
    if (!email || !password || !firstName || !lastName) throw ApiError.badRequest('email, password, firstName y lastName son obligatorios');

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw ApiError.conflict('Ya existe un usuario con ese email');

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(password, 10);

    const normalizedRole = role === 'USER' ? 'CUSTOMER' : (role as string) || 'CUSTOMER';
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone: phone || null,
        role: normalizedRole as any,
        storeName: storeName || null,
        isApproved: normalizedRole === 'SELLER' ? true : false,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        storeName: true,
        isApproved: true,
        isActive: true,
      },
    });

    return created(res, user);
  } catch (error) {
    next(error);
  }
}

export async function userDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = Number(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        storeName: true,
        storeCategory: true,
        country: true,
        locationCity: true,
        locationState: true,
        rating: true,
        totalSales: true,
        gamerCoins: true,
        isVerified: true,
        isApproved: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user) throw ApiError.notFound('Usuario no encontrado');

    const [orders, addresses, reviews, wishlistCount] = await Promise.all([
      prisma.order.findMany({
        where: user.role === 'SELLER' ? { sellerId: userId } : { buyerId: userId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { firstName: true, lastName: true } },
          seller: { select: { storeName: true } },
          items: { take: 3, include: { product: { select: { name: true, price: true } } } },
        },
      }),
      prisma.address.findMany({ where: { userId }, take: 5 }),
      prisma.review.count({ where: user.role === 'SELLER' ? { sellerId: userId } : { userId } }),
      prisma.wishlistItem.count({ where: { userId } }),
    ]);

    const totalSpent =
      user.role === 'SELLER'
        ? await prisma.order.aggregate({ where: { sellerId: userId, status: { not: 'CANCELLED' } }, _sum: { total: true } })
        : await prisma.order.aggregate({ where: { buyerId: userId, status: { not: 'CANCELLED' } }, _sum: { total: true } });

    return ok(res, {
      user,
      orders,
      addresses,
      reviewCount: reviews,
      wishlistCount,
      totalSpent: totalSpent._sum.total ?? 0,
    });
  } catch (error) {
    next(error);
  }
}

export async function pendingSellers(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellers = await prisma.user.findMany({
      where: { role: 'SELLER', isApproved: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        storeName: true,
        storeDescription: true,
        locationCity: true,
        locationState: true,
        createdAt: true,
      },
    });
    return ok(res, sellers);
  } catch (error) {
    next(error);
  }
}

/** Tiendas que solicitaron el sello de vendedor verificado (NIT/documentos presentados). */
export async function verificationRequests(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sellers = await prisma.user.findMany({
      where: { role: 'SELLER', isVerificationRequested: true },
      orderBy: { updatedAt: 'asc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        storeName: true,
        storeDescription: true,
        locationCity: true,
        locationState: true,
        latitude: true,
        longitude: true,
        locationVerified: true,
        nit: true,
        verificationNote: true,
        isVerified: true,
        createdAt: true,
      },
    });
    return ok(res, sellers);
  } catch (error) {
    next(error);
  }
}

export async function pendingProducts(_req: AuthRequest, res: Response, next: NextFunction) {  try {
    const products = await prisma.product.findMany({
      where: { isApproved: false, isActive: true },
      orderBy: { createdAt: 'asc' },
      include: {
        seller: { select: { id: true, storeName: true } },
        category: { select: { name: true } },
        images: { take: 1, select: { url: true } },
      },
    });
    return ok(res, products);
  } catch (error) {
    next(error);
  }
}

export async function moderateProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const productId = Number(req.params.id);
    const { approve, reason } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Producto no encontrado');

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { isApproved: Boolean(approve) },
    });

    await recordAudit({
      productId,
      actorId: req.user!.id,
      action: 'MODERATED',
      changes: { approve: Boolean(approve) },
      note: approve ? 'Producto aprobado por el admin' : `Producto rechazado por el admin${reason ? `: ${reason}` : ''}`,
    });

    // Notificar al vendedor de la moderación
    await createNotification({
      userId: product.sellerId,
      type: approve ? 'PRODUCT_APPROVED' : 'PRODUCT_REJECTED',
      title: approve ? 'Producto aprobado ✅' : 'Producto rechazado',
      message: approve
        ? `"${product.name}" fue aprobado y ya está visible en el catálogo.`
        : `"${product.name}" fue rechazado${reason ? `: ${reason}` : '. Corregilo y volvé a enviarlo.'}`,
      refType: 'product',
      refId: productId,
    });

    return ok(res, { ...updated, moderationNote: approve ? undefined : reason });
  } catch (error) {
    next(error);
  }
}

export async function listOrders(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status as string | undefined;

    const where = status ? { status: status as any } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { firstName: true, lastName: true, email: true } },
          seller: { select: { storeName: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return res.json({
      data: orders,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const orderId = Number(req.params.id);
    const { status } = req.body;

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: status as any, ...(status === 'DELIVERED' ? { deliveredAt: new Date() } : {}) },
    });

    // Si es un pedido para retirar en tienda y quedó entregado, avisar que está listo para retirar
    if (status === 'DELIVERED' && order.fulfillmentType === 'PICKUP') {
      await createNotification({
        userId: order.buyerId,
        type: 'ORDER_STATUS',
        title: `Tu pedido #${orderId} está listo para retirar 📦`,
        message: `Tu pedido #${orderId} ya está listo para retirar en ${order.pickupAddress ?? 'la tienda'}.`,
        refType: 'order',
        refId: orderId,
      });
    }

    return ok(res, order);
  } catch (error) {
    if ((error as any).code === 'P2025') return next(ApiError.notFound('Orden no encontrada'));
    next(error);
  }
}

export async function createCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, parentId, icon, imageUrl, order } = req.body;
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    const category = await prisma.category.create({
      data: { name, slug, parentId: parentId || null, icon, imageUrl, order: order || 0 },
    });
    return created(res, category);
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const categoryId = Number(req.params.id);
    const { name, parentId, icon, imageUrl, order, isActive } = req.body;

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(name !== undefined && { name }),
        ...(parentId !== undefined && { parentId }),
        ...(icon !== undefined && { icon }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return ok(res, category);
  } catch (error) {
    if ((error as any).code === 'P2025') return next(ApiError.notFound('Categoría no encontrada'));
    next(error);
  }
}

export async function createAttribute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, type, categoryId, options, unit, isRequired, isFilterable, isVariant, order } = req.body;
    const attribute = await prisma.attributeDefinition.create({
      data: {
        name,
        type,
        categoryId: categoryId || null,
        options: options ? { values: options } : undefined,
        unit: unit || null,
        isRequired: isRequired ?? false,
        isFilterable: isFilterable ?? true,
        isVariant: isVariant ?? false,
        order: order || 0,
      },
    });
    return created(res, attribute);
  } catch (error) {
    next(error);
  }
}

export async function listAttributes(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const attributes = await prisma.attributeDefinition.findMany({
      include: { category: { select: { name: true } } },
      orderBy: { order: 'asc' },
    });
    return ok(res, attributes);
  } catch (error) {
    next(error);
  }
}

export async function updateAttribute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const attributeId = Number(req.params.id);
    const { name, type, categoryId, options, unit, isRequired, isFilterable, isVariant, order } = req.body;

    const attribute = await prisma.attributeDefinition.update({
      where: { id: attributeId },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(options !== undefined && { options: options?.length ? { values: options } : undefined }),
        ...(unit !== undefined && { unit: unit || null }),
        ...(isRequired !== undefined && { isRequired }),
        ...(isFilterable !== undefined && { isFilterable }),
        ...(isVariant !== undefined && { isVariant }),
        ...(order !== undefined && { order }),
      },
      include: { category: { select: { name: true } } },
    });
    return ok(res, attribute);
  } catch (error) {
    if ((error as any).code === 'P2025') return next(ApiError.notFound('Atributo no encontrado'));
    next(error);
  }
}

export async function createBanner(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, imageDesktop, imageTablet, imageMobile, link, newWindow, backgroundColor, order, isActive, startDate, endDate } = req.body;

    const banner = await prisma.banner.create({
      data: {
        title: title || null,
        imageDesktop,
        imageTablet: imageTablet || null,
        imageMobile: imageMobile || null,
        link: link || null,
        newWindow: newWindow ?? false,
        backgroundColor: backgroundColor || null,
        order: order || 0,
        isActive: isActive ?? true,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 86400000),
      },
    });
    return created(res, banner);
  } catch (error) {
    next(error);
  }
}

export async function listBanners(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const banners = await prisma.banner.findMany({ orderBy: { order: 'asc' } });
    return ok(res, banners);
  } catch (error) {
    next(error);
  }
}

export async function updateBanner(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const bannerId = Number(req.params.id);
    const banner = await prisma.banner.update({ where: { id: bannerId }, data: req.body });
    return ok(res, banner);
  } catch (error) {
    if ((error as any).code === 'P2025') return next(ApiError.notFound('Banner no encontrado'));
    next(error);
  }
}

export async function deleteBanner(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.banner.delete({ where: { id: Number(req.params.id) } });
    return ok(res, { message: 'Banner eliminado' });
  } catch (error) {
    if ((error as any).code === 'P2025') return next(ApiError.notFound('Banner no encontrado'));
    next(error);
  }
}

export async function createPromotion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, description, discountType, discountValue, minQuantity, startDate, endDate, productIds } = req.body;

    const promotion = await prisma.promotion.create({
      data: {
        title,
        description: description || null,
        discountType,
        discountValue,
        minQuantity: minQuantity || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        products: productIds
          ? { create: (productIds as number[]).map((productId) => ({ productId })) }
          : undefined,
      },
      include: { products: true },
    });
    return created(res, promotion);
  } catch (error) {
    next(error);
  }
}

export async function listPromotions(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const promotions = await prisma.promotion.findMany({
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                images: { take: 1, select: { url: true } },
                seller: { select: { storeName: true } },
              },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
    return ok(res, promotions);
  } catch (error) {
    next(error);
  }
}

export async function updatePromotion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const promotionId = Number(req.params.id);
    const { productIds, ...data } = req.body;

    const update: any = { ...data };
    if (data.startDate) update.startDate = new Date(data.startDate);
    if (data.endDate) update.endDate = new Date(data.endDate);

    const promotion = await prisma.promotion.update({ where: { id: promotionId }, data: update });
    return ok(res, promotion);
  } catch (error) {
    if ((error as any).code === 'P2025') return next(ApiError.notFound('Promoción no encontrada'));
    next(error);
  }
}

export async function createTag(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, group } = req.body;
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    const tag = await prisma.tag.create({ data: { name, slug, group: group || null } });
    return created(res, tag);
  } catch (error) {
    next(error);
  }
}

export async function listTags(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
    return ok(res, tags);
  } catch (error) {
    next(error);
  }
}

export async function listCategories(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.category.findMany({
      include: { children: { orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    });
    return ok(res, categories);
  } catch (error) {
    next(error);
  }
}

// ============ SOFT DELETE HELPERS ============

export async function deleteCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) throw ApiError.notFound('Categoría no encontrada');
    // soft delete: desactivar
    await prisma.category.update({ where: { id }, data: { isActive: false } });
    await prisma.category.updateMany({ where: { parentId: id }, data: { isActive: false } });
    return ok(res, { message: 'Categoría desactivada', id });
  } catch (error) {
    next(error);
  }
}

export async function deleteAttribute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const attr = await prisma.attributeDefinition.findUnique({ where: { id } });
    if (!attr) throw ApiError.notFound('Atributo no encontrado');
    await prisma.attributeDefinition.update({ where: { id }, data: { isActive: false } });
    return ok(res, { message: 'Atributo desactivado', id });
  } catch (error) {
    next(error);
  }
}

export async function deletePromotion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const promo = await prisma.promotion.findUnique({ where: { id } });
    if (!promo) throw ApiError.notFound('Promoción no encontrada');
    await prisma.promotion.update({ where: { id }, data: { isActive: false } });
    return ok(res, { message: 'Promoción desactivada', id });
  } catch (error) {
    next(error);
  }
}

export async function updateTag(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { name } = req.body;
    if (!name || !name.trim()) throw ApiError.badRequest('Nombre obligatorio');
    const tag = await prisma.tag.update({ where: { id }, data: { name: name.trim() } });
    return ok(res, tag);
  } catch (error) {
    if ((error as any).code === 'P2025') return next(ApiError.notFound('Tag no encontrado'));
    next(error);
  }
}

export async function deleteTag(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const tag = await prisma.tag.findUnique({ where: { id } });
    if (!tag) throw ApiError.notFound('Tag no encontrado');
    await prisma.tag.delete({ where: { id } });
    return ok(res, { message: 'Tag eliminado', id });
  } catch (error) {
    next(error);
  }
}

// ============ CONTENIDO: FAQs ============

export async function listFaqs(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const faqs = await prisma.faq.findMany({ orderBy: { order: 'asc' } });
    return ok(res, faqs);
  } catch (error) {
    next(error);
  }
}

export async function createFaq(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { question, answer, order } = req.body;
    if (!question || !answer) throw ApiError.badRequest('Pregunta y respuesta obligatorias');
    const faq = await prisma.faq.create({ data: { question, answer, order: Number(order) || 0 } });
    return created(res, faq);
  } catch (error) {
    next(error);
  }
}

export async function updateFaq(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { question, answer, order } = req.body;
    const faq = await prisma.faq.update({
      where: { id },
      data: { ...(question !== undefined && { question }), ...(answer !== undefined && { answer }), ...(order !== undefined && { order: Number(order) }) },
    });
    return ok(res, faq);
  } catch (error) {
    if ((error as any).code === 'P2025') return next(ApiError.notFound('FAQ no encontrada'));
    next(error);
  }
}

export async function deleteFaq(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await prisma.faq.delete({ where: { id } });
    return ok(res, { message: 'FAQ eliminada', id });
  } catch (error) {
    next(error);
  }
}

// ============ CONTENIDO: GARANTÍAS ============

export async function listWarranties(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const warranties = await prisma.warranty.findMany({ orderBy: { order: 'asc' } });
    return ok(res, warranties);
  } catch (error) {
    next(error);
  }
}

export async function createWarranty(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, content, order } = req.body;
    if (!title || !content) throw ApiError.badRequest('Título y contenido obligatorios');
    const warranty = await prisma.warranty.create({ data: { title, content, order: Number(order) || 0 } });
    return created(res, warranty);
  } catch (error) {
    next(error);
  }
}

export async function updateWarranty(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { title, content, order } = req.body;
    const warranty = await prisma.warranty.update({
      where: { id },
      data: { ...(title !== undefined && { title }), ...(content !== undefined && { content }), ...(order !== undefined && { order: Number(order) }) },
    });
    return ok(res, warranty);
  } catch (error) {
    if ((error as any).code === 'P2025') return next(ApiError.notFound('Garantía no encontrada'));
    next(error);
  }
}

export async function deleteWarranty(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await prisma.warranty.delete({ where: { id } });
    return ok(res, { message: 'Garantía eliminada', id });
  } catch (error) {
    next(error);
  }
}

// ============ CONTENIDO: ALCANCES ============

export async function listReaches(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const reaches = await prisma.reach.findMany({ orderBy: { order: 'asc' } });
    return ok(res, reaches);
  } catch (error) {
    next(error);
  }
}

export async function createReach(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, content, order } = req.body;
    if (!title || !content) throw ApiError.badRequest('Título y contenido obligatorios');
    const reach = await prisma.reach.create({ data: { title, content, order: Number(order) || 0 } });
    return created(res, reach);
  } catch (error) {
    next(error);
  }
}

export async function updateReach(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { title, content, order } = req.body;
    const reach = await prisma.reach.update({
      where: { id },
      data: { ...(title !== undefined && { title }), ...(content !== undefined && { content }), ...(order !== undefined && { order: Number(order) }) },
    });
    return ok(res, reach);
  } catch (error) {
    if ((error as any).code === 'P2025') return next(ApiError.notFound('Alcance no encontrado'));
    next(error);
  }
}

export async function deleteReach(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await prisma.reach.delete({ where: { id } });
    return ok(res, { message: 'Alcance eliminado', id });
  } catch (error) {
    next(error);
  }
}

// ============ PRODUCTOS (admin) ============

export async function listAllProducts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = req.query.search as string | undefined;
    const includeInactive = req.query.includeInactive === 'true';

    const where: any = {};
    if (!includeInactive) where.isActive = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { id: true, storeName: true } },
          category: { select: { id: true, name: true } },
          images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({ data: products, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
}

export async function updateAnyProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const allowed = ['name', 'description', 'brand', 'price', 'originalPrice', 'stock', 'isActive', 'isApproved', 'isFeatured', 'categoryId', 'condition'];
    const data: any = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (['price', 'originalPrice'].includes(key)) data[key] = Number(req.body[key]);
        else if (['stock'].includes(key)) data[key] = Number(req.body[key]);
        else data[key] = req.body[key];
      }
    }
    const product = await prisma.product.update({ where: { id }, data });
    await recordAudit({ productId: id, actorId: req.user!.id, action: 'UPDATED', changes: data, note: 'Editado por el administrador' });
    return ok(res, product);
  } catch (error) {
    if ((error as any).code === 'P2025') return next(ApiError.notFound('Producto no encontrado'));
    next(error);
  }
}

export async function deleteAnyProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw ApiError.notFound('Producto no encontrado');
    // soft delete
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    await recordAudit({ productId: id, actorId: req.user!.id, action: 'DEACTIVATED', note: 'Desactivado por el administrador' });
    return ok(res, { message: 'Producto desactivado', id });
  } catch (error) {
    next(error);
  }
}

// ============ COMISIONES ============

export async function getCommission(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const config = await getCommissionConfig();
    return ok(res, config);
  } catch (error) {
    next(error);
  }
}

export async function setCommission(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { enabled, percentage, minimum, fixed, onShipping } = req.body;
    const config = await setCommissionConfig({
      enabled: enabled !== undefined ? Boolean(enabled) : undefined,
      percentage: percentage !== undefined ? Number(percentage) : undefined,
      minimum: minimum !== undefined ? Number(minimum) : undefined,
      fixed: fixed !== undefined ? Number(fixed) : undefined,
      onShipping: onShipping !== undefined ? Boolean(onShipping) : undefined,
    });
    return ok(res, { message: 'Configuración de comisiones guardada' });
  } catch (error) {
    next(error);
  }
}

// ============ REPORTES ECONÓMICOS ============

function reportRange(query: any) {
  const fromRaw = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 86400000);
  let to = query.to ? new Date(query.to) : new Date();
  // Si `to` viene como fecha sin hora (YYYY-MM-DD), extender al final del día
  // para incluir las ventas del día completo (p. ej. el frontend manda to=2026-08-09).
  if (query.to && typeof query.to === 'string' && query.to.length === 10 && !Number.isNaN(to.getTime())) {
    to = new Date(to.getTime() + 24 * 3600000 - 1);
  }
  return { from: fromRaw, to };
}

/** Parsea ids CSV (?sellers=2,3) → number[] | undefined (reportes personalizados) */
function parseIdList(value: unknown): number[] | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const ids = value.split(',').map((v) => Number(v.trim())).filter((n) => Number.isInteger(n) && n > 0);
  return ids.length ? ids : undefined;
}

/** Construye el where de órdenes con filtros opcionales de tienda(s) y usuario(s) */
function reportOrderWhere(from: Date, to: Date, query: any) {
  const sellerIds = parseIdList(query.sellers);
  const buyerIds = parseIdList(query.buyers);
  return {
    createdAt: { gte: from, lte: to },
    status: { not: OrderStatus.CANCELLED },
    ...(sellerIds ? { sellerId: { in: sellerIds } } : {}),
    ...(buyerIds ? { buyerId: { in: buyerIds } } : {}),
  };
}

/** Ventas por día (con comisión y neto) */
export async function salesReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { from, to } = reportRange(req.query);
    const orders = await prisma.order.findMany({
      where: reportOrderWhere(from, to, req.query),
      select: {
        createdAt: true,
        subtotal: true,
        shippingCost: true,
        total: true,
        commission: true,
        sellerNet: true,
      },
    });

    const byDay: Record<string, { date: string; sales: number; orders: number; commission: number; net: number }> = {};
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      if (!byDay[key]) byDay[key] = { date: key, sales: 0, orders: 0, commission: 0, net: 0 };
      byDay[key].sales += Number(o.total);
      byDay[key].orders += 1;
      byDay[key].commission += Number(o.commission ?? 0);
      byDay[key].net += Number(o.sellerNet ?? Number(o.total));
    }

    const summary = orders.reduce(
      (acc, o) => {
        acc.sales += Number(o.total);
        acc.orders += 1;
        acc.commission += Number(o.commission ?? 0);
        acc.net += Number(o.sellerNet ?? Number(o.total));
        return acc;
      },
      { sales: 0, orders: 0, commission: 0, net: 0 }
    );

    return ok(res, { from, to, summary, byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)) });
  } catch (error) {
    next(error);
  }
}

/** Comisiones acumuladas por período */
export async function commissionReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { from, to } = reportRange(req.query);
    const orders = await prisma.order.findMany({
      where: reportOrderWhere(from, to, req.query),
      select: { commission: true, sellerNet: true, total: true },
    });

    const totalCommission = orders.reduce((acc, o) => acc + Number(o.commission ?? 0), 0);
    const totalNet = orders.reduce((acc, o) => acc + Number(o.sellerNet ?? 0), 0);
    const totalSales = orders.reduce((acc, o) => acc + Number(o.total), 0);

    return ok(res, { from, to, totalCommission, totalNet, totalSales, ordersCount: orders.length });
  } catch (error) {
    next(error);
  }
}

/** Ventas por tienda (con comisión y neto por tienda) */
export async function sellerReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { from, to } = reportRange(req.query);
    const orders = await prisma.order.findMany({
      where: reportOrderWhere(from, to, req.query),
      select: {
        seller: { select: { id: true, storeName: true } },
        total: true,
        commission: true,
        sellerNet: true,
        subtotal: true,
      },
    });

    const bySeller: Record<number, any> = {};
    for (const o of orders) {
      const sid = o.seller.id;
      if (!bySeller[sid]) bySeller[sid] = { id: sid, storeName: o.seller.storeName, sales: 0, orders: 0, commission: 0, net: 0 };
      bySeller[sid].sales += Number(o.total);
      bySeller[sid].orders += 1;
      bySeller[sid].commission += Number(o.commission ?? 0);
      bySeller[sid].net += Number(o.sellerNet ?? Number(o.total));
    }

    const sellers = Object.values(bySeller).sort((a: any, b: any) => b.sales - a.sales);
    return ok(res, { from, to, sellers });
  } catch (error) {
    next(error);
  }
}

/** Ventas por categoría */
export async function categoryReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { from, to } = reportRange(req.query);
    const orderItems = await prisma.orderItem.findMany({
      where: { order: reportOrderWhere(from, to, req.query) },
      select: {
        quantity: true,
        unitPrice: true,
        product: { select: { category: { select: { id: true, name: true } } } },
      },
    });

    const byCategory: Record<number, any> = {};
    for (const oi of orderItems) {
      const cat = oi.product.category;
      const key = cat?.id ?? 0;
      if (!byCategory[key]) byCategory[key] = { id: key, name: cat?.name ?? 'Sin categoría', sales: 0, units: 0 };
      byCategory[key].sales += Number(oi.unitPrice) * oi.quantity;
      byCategory[key].units += oi.quantity;
    }

    const categories = Object.values(byCategory).sort((a: any, b: any) => b.sales - a.sales);
    return ok(res, { from, to, categories });
  } catch (error) {
    next(error);
  }
}

/** Pausa o reanuda una tienda (actividades sospechosas). PUT /admin/sellers/:id/pause */
export async function pauseSeller(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const sellerId = Number(req.params.id);
    if (!Number.isInteger(sellerId)) {
      throw ApiError.badRequest('ID de vendedor inválido.');
    }
    const paused = Boolean(req.body?.paused);
    const user = await prisma.user.findUnique({ where: { id: sellerId } });
    if (!user || user.role !== Role.SELLER) {
      throw ApiError.notFound('Vendedor no encontrado.');
    }
    const updated = await prisma.user.update({
      where: { id: sellerId },
      data: { storePaused: paused },
      select: { id: true, email: true, storeName: true, storePaused: true },
    });
    return ok(res, updated);
  } catch (error) {
    next(error);
  }
}

/** Alertas de copias masivas de productos. GET /admin/copies/alerts?days=&min= */
export async function copyAlerts(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const days = Math.min(Number(req.query.days) || 30, 365);
    const min = Math.min(Number(req.query.min) || 20, 1000);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const audits = await prisma.productAudit.groupBy({
      by: ['actorId'],
      where: { action: 'COPIED', createdAt: { gte: since } },
      _count: { _all: true },
    });
    const rows = audits
      .filter((a) => a.actorId !== null && a._count._all >= min)
      .map((a) => ({ actorId: a.actorId as number, count: a._count._all }));
    const actors = await prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.actorId) } },
      select: { id: true, email: true, firstName: true, lastName: true, storeName: true, storePaused: true },
    });
    const data = rows
      .map((r) => ({ ...r, actor: actors.find((a) => a.id === r.actorId) }))
      .sort((a, b) => b.count - a.count);
    return ok(res, { days, min, data });
  } catch (error) {
    next(error);
  }
}

/**
 * Lista global de reseñas (para moderación del super admin).
 */
export async function listReviews(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const search = String(req.query.search || '').trim();
    const where = search
      ? {
          OR: [
            { comment: { contains: search, mode: 'insensitive' as const } },
            { user: { OR: [{ firstName: { contains: search, mode: 'insensitive' as const } }, { lastName: { contains: search, mode: 'insensitive' as const } }] } },
            { seller: { storeName: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {};
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          seller: { select: { id: true, storeName: true } },
          product: { select: { id: true, name: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);
    return paginated(res, reviews, total, page, limit);
  } catch (error) {
    next(error);
  }
}

/**
 * El super admin puede editar cualquier reseña (comentario, rating o etiquetas).
 */
export async function updateReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw ApiError.badRequest('ID de reseña inválido');
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Reseña no encontrada');

    const data: any = {};
    if (typeof req.body.rating === 'number') data.rating = req.body.rating;
    if (typeof req.body.comment === 'string') data.comment = req.body.comment;
    if (req.body.tags !== undefined) {
      data.tags = Array.isArray(req.body.tags) ? req.body.tags : undefined;
    }

    const review = await prisma.review.update({ where: { id }, data });
    return ok(res, review);
  } catch (error) {
    next(error);
  }
}

/**
 * El super admin puede eliminar cualquier reseña.
 */
export async function deleteReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw ApiError.badRequest('ID de reseña inválido');
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Reseña no encontrada');
    await prisma.review.delete({ where: { id } });
    return ok(res, { deleted: true });
  } catch (error) {
    next(error);
  }
}

/**
 * Lista la configuración global del sitio (tabla Setting key/value).
 */
export async function getSettings(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
    const settings: Record<string, string> = {};
    for (const row of rows) settings[row.key] = row.value;
    return ok(res, settings);
  } catch (error) {
    next(error);
  }
}

/**
 * Actualiza la configuración global del sitio. Body: { key, value } (upsert por key).
 */
export async function updateSetting(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { key, value } = req.body ?? {};
    if (typeof key !== 'string' || !key.trim()) throw ApiError.badRequest('Se requiere una key de configuración válida');
    if (typeof value !== 'string') throw ApiError.badRequest('El value debe ser texto (string)');

    const setting = await prisma.setting.upsert({
      where: { key: key.trim() },
      update: { value },
      create: { key: key.trim(), value },
    });
    return ok(res, setting);
  } catch (error) {
    next(error);
  }
}

/**
 * Actualiza varias claves de configuración a la vez. Body: { settings: { [key]: value } }.
 */
export async function updateSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { settings } = req.body ?? {};
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw ApiError.badRequest('Se requiere un objeto settings { key: value }');
    }

    const keys = Object.keys(settings);
    const data: any[] = [];
    for (const key of keys) {
      if (typeof key !== 'string' || typeof settings[key] !== 'string') continue;
      data.push({
        key: key.trim(),
        value: settings[key],
      });
    }

    await prisma.$transaction(
      data.map((entry) =>
        prisma.setting.upsert({
          where: { key: entry.key },
          update: { value: entry.value },
          create: entry,
        }),
      ),
    );

    return ok(res, { updated: data.length, settings: keys });
  } catch (error) {
    next(error);
  }
}

/**
 * Elimina una clave de configuración global.
 */
export async function deleteSetting(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const key = String(req.params.key ?? '');
    if (!key) throw ApiError.badRequest('Se requiere una key de configuración válida');
    await prisma.setting.delete({ where: { key } });
    return ok(res, { deleted: key });
  } catch (error) {
    next(error);
  }
}
