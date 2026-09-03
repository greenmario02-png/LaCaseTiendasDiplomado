import { NextFunction, Request, Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import * as orderService from '../services/order.service';
import { prisma } from '../config/database';
import { ok, created } from '../utils/response';
import { ApiError } from '../utils/errors';

export async function createOrders(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { shippingAddressId, notes, paymentQrUrl, couponCode, fulfillmentType, pickupAddress } = req.body;
    const orders = await orderService.createOrdersFromCart(
      req,
      shippingAddressId,
      notes,
      paymentQrUrl,
      couponCode,
      fulfillmentType ?? 'SHIPPING',
      pickupAddress,
    );
    return created(res, orders);
  } catch (error) {
    next(error);
  }
}

export async function shippingQuotes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { buyerPostalCode } = req.body;
    if (!buyerPostalCode) throw ApiError.badRequest('buyerPostalCode obligatorio');
    const quotes = await orderService.calculateShippingQuotes(req, buyerPostalCode);
    return ok(res, quotes);
  } catch (error) {
    next(error);
  }
}

export async function buyerOrders(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const result = await orderService.getBuyerOrders(req.user!.id, page, limit);
    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function buyerOrderDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const order = await orderService.getBuyerOrderById(req.user!.id, Number(req.params.id));
    return ok(res, order);
  } catch (error) {
    next(error);
  }
}

export async function paymentProof(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { proofUrl } = req.body;
    if (!proofUrl) throw ApiError.badRequest('proofUrl obligatorio');
    const order = await orderService.submitPaymentProof(Number(req.params.id), req.user!.id, proofUrl);
    return ok(res, order);
  } catch (error) {
    next(error);
  }
}

export async function sellerOrders(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status as string | undefined;
    const result = await orderService.getSellerOrders(req.user!.id, page, limit, status);
    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    if (!status) throw ApiError.badRequest('status obligatorio');
    const order = await orderService.updateOrderStatus(req.user!.id, Number(req.params.id), status);
    return ok(res, order);
  } catch (error) {
    next(error);
  }
}

export async function confirmDelivery(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const order = await orderService.confirmDelivery(req.user!.id, Number(req.params.id));
    return ok(res, order);
  } catch (error) {
    next(error);
  }
}

export async function updatePaymentStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { paymentStatus } = req.body;
    if (!paymentStatus) throw ApiError.badRequest('paymentStatus obligatorio');
    const order = await orderService.updatePaymentStatus(req.user!.id, Number(req.params.id), paymentStatus);
    return ok(res, order);
  } catch (error) {
    next(error);
  }
}

/** Últimas ventas confirmadas (ticker de compras en tiempo real). Público. */
export async function recentSales(req: Request, res: Response, next: NextFunction) {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { not: 'CANCELLED' } },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        items: {
          take: 1,
          include: { product: { select: { id: true, name: true } } },
        },
        seller: { select: { storeName: true, locationCity: true } },
        buyer: { select: { locationCity: true } },
      },
    });
    const sales = orders.map((o) => ({
      id: o.id,
      productName: o.items[0]?.product?.name ?? 'Producto',
      storeName: o.seller?.storeName ?? 'Tienda',
      city: o.buyer?.locationCity ?? o.seller?.locationCity ?? 'Bolivia',
      amount: Number(o.total),
      createdAt: o.createdAt,
    }));
    return ok(res, sales);
  } catch (error) {
    next(error);
  }
}
