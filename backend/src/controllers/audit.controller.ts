import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { ApiError } from '../utils/errors';
import { ok, paginated } from '../utils/response';

/**
 * Registra una acción de auditoría sobre un producto.
 * Se llama desde todas las mutaciones de productos (crear, editar, moderar, eliminar, reactivar).
 */
export async function recordAudit(input: {
  productId: number;
  actorId: number;
  action: string;
  changes?: unknown;
  note?: string;
}) {
  try {
    await prisma.productAudit.create({
      data: {
        productId: input.productId,
        actorId: input.actorId,
        action: input.action,
        changes: input.changes ?? undefined,
        note: input.note ?? undefined,
      },
    });
  } catch {
    // La auditoría nunca debe romper la operación principal
  }
}

export async function listProductAudits(req: AuthRequest, res: Response) {
  const productId = Number(req.params.id);
  if (!productId) throw ApiError.badRequest('productId inválido');

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw ApiError.notFound('Producto no encontrado');

  // Solo el dueño de la tienda, el admin o quien creó el producto puede ver el historial
  if (req.user!.id !== product.sellerId && req.user!.role !== 'ADMIN') {
    throw ApiError.forbidden('No tenés permiso para ver este historial');
  }

  const audits = await prisma.productAudit.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    include: { actor: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
  });
  ok(res, audits);
}

export async function listMyProductsAudits(req: AuthRequest, res: Response) {
  if (!req.user) return ApiError.unauthorized();

  const audits = await prisma.productAudit.findMany({
    where: { actorId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      product: { select: { id: true, name: true } },
      actor: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });
  ok(res, audits);
}

/**
 * Listado global de auditorías para el admin (dashboard /admin/logs).
 * Filtros: action (CREATED|UPDATED|MODERATED|ACTIVATED|DEACTIVATED|DELETED|REACTIVATED|AUCTIONED)
 * y search (por nombre de producto o email/actor).
 */
export async function listAllAudits(req: AuthRequest, res: Response) {
  if (!req.user) return ApiError.unauthorized();

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const action = typeof req.query.action === 'string' && req.query.action ? req.query.action : undefined;
  const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined;

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (search) {
    where.OR = [
      { product: { name: { contains: search, mode: 'insensitive' } } },
      { actor: { OR: [{ email: { contains: search, mode: 'insensitive' } }, { firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }] } },
    ];
  }

  const [audits, total] = await Promise.all([
    prisma.productAudit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        actor: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      },
    }),
    prisma.productAudit.count({ where }),
  ]);

  paginated(res, audits, total, page, limit);
}
