import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { ApiError } from '../utils/errors';
import { ok } from '../utils/response';
import { createNotification } from '../services/notification.service';

const REASONS = ['PRODUCTO_DEFECTUOSO', 'PRODUCTO_INCORRECTO', 'NO_COINCIDE_DESCRIPCION', 'YA_NO_LO_NECESITO', 'OTRO'];

export async function createReturn(req: AuthRequest, res: Response) {
  const { orderItemId, reason, details } = req.body;
  if (!req.user) return ApiError.unauthorized();
  if (!orderItemId || !reason) throw ApiError.badRequest('orderItemId y reason son obligatorios');
  if (!REASONS.includes(reason)) throw ApiError.badRequest('Motivo de devolución no válido');

  const item = await prisma.orderItem.findFirst({
    where: { id: orderItemId, order: { buyerId: req.user.id } },
    include: { order: { select: { id: true, sellerId: true, status: true, paymentStatus: true } }, product: { select: { id: true, name: true } } },
  });
  if (!item) throw ApiError.notFound('Item de orden no encontrado');
  if (item.order.status !== 'DELIVERED' || item.order.paymentStatus !== 'VERIFIED')
    throw ApiError.badRequest('Solo podés solicitar una devolución después de recibir la compra con pago verificado');

  const existing = await prisma.returnRequest.findFirst({ where: { orderItemId, status: { in: ['PENDING', 'APPROVED'] } } });
  if (existing) throw ApiError.badRequest('Ya existe una solicitud de devolución activa para este producto');

  const r = await prisma.returnRequest.create({
    data: { orderItemId, orderId: item.orderId, buyerId: req.user.id, sellerId: item.order.sellerId, reason, details },
    include: { orderItem: { include: { product: { select: { id: true, name: true } } } } },
  });

  await createNotification({
    userId: item.order.sellerId,
    type: 'RETURN_REQUEST',
    title: 'Solicitud de devolución',
    message: `Un comprador pidió devolver "${item.product.name}"`,
    refType: 'return',
    refId: r.id,
  });

  ok(res, r, 201);
}

export async function listMyReturns(req: AuthRequest, res: Response) {
  if (!req.user) return ApiError.unauthorized();
  const returns = await prisma.returnRequest.findMany({
    where: { buyerId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      orderItem: { include: { product: { select: { id: true, name: true, images: { take: 1, select: { url: true } } } } } },
      seller: { select: { id: true, storeName: true } },
    },
  });
  ok(res, returns);
}

export async function listSellerReturns(req: AuthRequest, res: Response) {
  if (!req.user) return ApiError.unauthorized();
  const returns = await prisma.returnRequest.findMany({
    where: { sellerId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      orderItem: { include: { product: { select: { id: true, name: true, images: { take: 1, select: { url: true } } } } } },
      buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  ok(res, returns);
}

export async function respondReturn(req: AuthRequest, res: Response) {
  if (!req.user) return ApiError.unauthorized();
  const id = Number(req.params.id);
  const { decision, responseNote, refundAmount } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(decision)) throw ApiError.badRequest('Decisión inválida');

  const r = await prisma.returnRequest.findFirst({ where: { id, sellerId: req.user.id } });
  if (!r) throw ApiError.notFound('Solicitud no encontrada');
  if (r.status !== 'PENDING') throw ApiError.badRequest('Esta solicitud ya fue respondida');

  const updated = await prisma.returnRequest.update({
    where: { id },
    data: {
      status: decision,
      responseNote,
      refundAmount: decision === 'APPROVED' && refundAmount != null ? refundAmount : null,
    },
  });

  await createNotification({
    userId: r.buyerId,
    type: 'RETURN_STATUS',
    title: decision === 'APPROVED' ? 'Devolución aprobada' : 'Devolución rechazada',
    message:
      decision === 'APPROVED'
        ? `El vendedor aprobó tu devolución${refundAmount != null ? ` — reembolso de Bs ${refundAmount}` : ''}`
        : 'El vendedor rechazó tu solicitud de devolución',
    refType: 'return',
    refId: r.id,
  });

  ok(res, updated);
}

export async function cancelReturn(req: AuthRequest, res: Response) {
  if (!req.user) return ApiError.unauthorized();
  const id = Number(req.params.id);
  const r = await prisma.returnRequest.findFirst({ where: { id, buyerId: req.user.id, status: 'PENDING' } });
  if (!r) throw ApiError.notFound('Solicitud no encontrada o ya no está pendiente');
  const updated = await prisma.returnRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
  ok(res, updated);
}

// ---------- ADMIN ----------

export async function adminListReturns(req: AuthRequest, res: Response) {
  const { status } = req.query;
  const returns = await prisma.returnRequest.findMany({
    where: status ? { status: String(status) } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      orderItem: { include: { product: { select: { id: true, name: true } } } },
      buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
      seller: { select: { id: true, storeName: true } },
    },
  });
  ok(res, returns);
}

export async function adminResolveReturn(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  const { status, refundAmount, adminNote } = req.body;
  if (!['COMPLETED', 'CANCELLED', 'REJECTED', 'APPROVED'].includes(status)) throw ApiError.badRequest('Estado inválido');

  const r = await prisma.returnRequest.findUnique({ where: { id } });
  if (!r) throw ApiError.notFound('Solicitud no encontrada');

  const updated = await prisma.returnRequest.update({
    where: { id },
    data: { status, refundAmount: refundAmount != null ? refundAmount : r.refundAmount, adminNote },
  });

  if (status === 'COMPLETED') {
    await createNotification({
      userId: r.buyerId,
      type: 'RETURN_STATUS',
      title: 'Devolución completada',
      message: 'Tu devolución fue procesada por el administrador. El reembolso se acreditará en tu medio de pago.',
      refType: 'return',
      refId: r.id,
    });
  }

  ok(res, updated);
}
