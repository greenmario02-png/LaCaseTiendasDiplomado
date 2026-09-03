import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { ok } from '../utils/response';

/**
 * Construye los eventos de calendario (FullCalendar) para un rango de fechas.
 * Eventos: promociones (rango), subastas (cierre), ventas por día (allDay).
 */
export async function adminCalendarEvents(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 86400000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date(Date.now() + 30 * 86400000);
    const events = await buildEvents(undefined, from, to);
    return ok(res, { from, to, events });
  } catch (error) {
    next(error);
  }
}

export async function sellerCalendarEvents(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const storeId = (req.user as any)?.storeOwnerId ?? (req.user as any)?.id;
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 86400000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date(Date.now() + 30 * 86400000);
    const events = await buildEvents(storeId, from, to);
    return ok(res, { from, to, events });
  } catch (error) {
    next(error);
  }
}

async function buildEvents(storeId: number | undefined, from: Date, to: Date) {
  // Promociones activas cuyo rango solape [from, to]
  const promotions = await prisma.promotion.findMany({
    where: {
      isActive: true,
      startDate: { lte: to },
      endDate: { gte: from },
      ...(storeId ? { sellerId: storeId } : {}),
    },
    select: { id: true, title: true, discountType: true, discountValue: true, startDate: true, endDate: true, seller: { select: { storeName: true } } },
  });

  const promoEvents = promotions.map((p) => ({
    id: `promo-${p.id}`,
    title: `${p.title}${p.seller?.storeName ? ` · ${p.seller.storeName}` : ''}`,
    start: p.startDate.toISOString(),
    end: new Date(p.endDate.getTime() + 86400000).toISOString(), // FullCalendar excluye end
    allDay: true,
    backgroundColor: '#f0320a',
    borderColor: '#f0320a',
    extendedProps: { type: 'promotion', discount: p.discountType === 'PERCENTAGE' ? `${Number(p.discountValue)}%` : `Bs ${Number(p.discountValue)}` },
  }));

  // Subastas activas cuyo cierre (endDate) caiga en [from, to]
  const auctions = await prisma.auction.findMany({
    where: {
      isActive: true,
      endDate: { gte: from, lte: to },
      ...(storeId ? { sellerId: storeId } : {}),
    },
    select: { id: true, title: true, endDate: true, currentPrice: true },
  });

  const auctionEvents = auctions.map((a) => ({
    id: `auction-${a.id}`,
    title: `🔨 ${a.title}`,
    start: a.endDate.toISOString(),
    allDay: true,
    backgroundColor: '#9c27b0',
    borderColor: '#9c27b0',
    extendedProps: { type: 'auction', current: Number(a.currentPrice) },
  }));

  // Ventas por día (órdenes no canceladas en el rango)
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { not: 'CANCELLED' },
      ...(storeId ? { sellerId: storeId } : {}),
    },
    select: { createdAt: true, total: true },
  });

  const byDay: Record<string, { count: number; total: number }> = {};
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    byDay[key] = byDay[key] || { count: 0, total: 0 };
    byDay[key].count += 1;
    byDay[key].total += Number(o.total);
  }

  const saleEvents = Object.entries(byDay).map(([date, v]) => ({
    id: `sale-${date}`,
    title: `${v.count} venta(s) · Bs ${v.total.toLocaleString('es-BO')}`,
    start: date,
    allDay: true,
    backgroundColor: '#00d12a',
    borderColor: '#00d12a',
    extendedProps: { type: 'sales', count: v.count, total: v.total },
  }));

  return [...promoEvents, ...auctionEvents, ...saleEvents];
}

/**
 * Productos vendidos hoy (con su cantidad) + promociones activas.
 * Se usa en el widget de ventas del día del admin y del vendedor.
 */
async function buildSalesToday(storeId: number | undefined) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86400000);

  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        createdAt: { gte: start, lt: end },
        status: { not: 'CANCELLED' },
        ...(storeId ? { sellerId: storeId } : {}),
      },
    },
    select: {
      quantity: true,
      product: { select: { id: true, name: true } },
    },
  });

  const byProduct: Record<number, { productId: number; name: string; quantity: number }> = {};
  for (const it of items) {
    const pid = it.product.id;
    byProduct[pid] = byProduct[pid] || { productId: pid, name: it.product.name, quantity: 0 };
    byProduct[pid].quantity += it.quantity;
  }
  const products = Object.values(byProduct).sort((a, b) => b.quantity - a.quantity);

  const promotions = await prisma.promotion.findMany({
    where: {
      isActive: true,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
      ...(storeId ? { sellerId: storeId } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      discountType: true,
      discountValue: true,
      endDate: true,
      products: { select: { product: { select: { id: true, name: true, images: { take: 1, select: { url: true } } } } } },
    },
    orderBy: { id: 'asc' },
  });

  return { products, promotions };
}

export async function adminSalesToday(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await buildSalesToday(undefined);
    return ok(res, data);
  } catch (error) {
    next(error);
  }
}

export async function sellerSalesToday(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const storeId = (req.user as any)?.storeOwnerId ?? (req.user as any)?.id;
    const data = await buildSalesToday(storeId);
    return ok(res, data);
  } catch (error) {
    next(error);
  }
}
