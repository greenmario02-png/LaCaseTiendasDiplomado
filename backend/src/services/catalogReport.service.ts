import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';

/** Denuncias del catálogo (vendedor, tienda o producto) hechas desde la ficha del producto. */

const envInt = (name: string, def: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
};

/** Límite diario por usuario, leído en cada llamada para poder ajustarlo sin reiniciar el código. */
export const catalogReportConfig = {
  reportsPerDay: () => envInt('CATALOG_REPORTS_PER_DAY', 10),
};

const dayAgo = () => new Date(Date.now() - 24 * 3_600_000);

export type CatalogReportTarget = 'SELLER' | 'STORE' | 'PRODUCT';
export type CatalogReportReason = 'VENDEDOR_SOSPECHOSO' | 'TIENDA_SOSPECHOSA' | 'PRODUCTO_INADECUADO' | 'OTRO';

export interface CreateCatalogReportInput {
  targetType: CatalogReportTarget;
  targetId: number;
  reason: CatalogReportReason;
  detail?: string;
}

/** El objetivo debe existir: un producto, o un usuario vendedor para SELLER/STORE. */
async function assertTargetExists(targetType: CatalogReportTarget, targetId: number) {
  if (targetType === 'PRODUCT') {
    const p = await prisma.product.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!p) throw ApiError.notFound('Producto no encontrado');
    return;
  }
  const u = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true } });
  if (!u || u.role !== 'SELLER') throw ApiError.notFound('Tienda no encontrada');
}

export async function createCatalogReport(reporterId: number, input: CreateCatalogReportInput) {
  const recent = await prisma.catalogReport.count({ where: { reporterId, createdAt: { gt: dayAgo() } } });
  if (recent >= catalogReportConfig.reportsPerDay()) {
    throw new ApiError(429, 'TOO_MANY_REQUESTS', 'Llegaste al límite de denuncias de hoy.');
  }
  await assertTargetExists(input.targetType, input.targetId);
  return prisma.catalogReport.create({
    data: {
      reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      detail: input.detail?.trim().slice(0, 300) || null,
    },
  });
}

// ── Cola de revisión (ADMIN o moderador asignado) ───────────────────────────────────────────────
// CatalogReport no declara relaciones: el denunciante, el revisor y el objetivo se completan aquí.

export interface AdminListCatalogReportsFilters {
  status?: 'OPEN' | 'REVIEWED' | 'DISCARDED';
  targetType?: CatalogReportTarget;
  reason?: CatalogReportReason;
  page: number;
  limit: number;
}

function publicUser(u?: { id: number; firstName: string; lastName: string; email: string } | null) {
  if (!u) return null;
  return { id: u.id, name: `${u.firstName} ${u.lastName}`.trim(), email: u.email };
}

export async function adminListCatalogReports(f: AdminListCatalogReportsFilters) {
  const where = {
    status: f.status ?? 'OPEN',
    ...(f.targetType ? { targetType: f.targetType } : {}),
    ...(f.reason ? { reason: f.reason } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.catalogReport.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (f.page - 1) * f.limit, take: f.limit }),
    prisma.catalogReport.count({ where }),
  ]);

  const userIds = new Set<number>();
  const productIds = new Set<number>();
  for (const r of rows) {
    userIds.add(r.reporterId);
    if (r.reviewedBy) userIds.add(r.reviewedBy);
    if (r.targetType === 'PRODUCT') productIds.add(r.targetId);
    else userIds.add(r.targetId);
  }
  const [users, products] = await Promise.all([
    userIds.size
      ? prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, firstName: true, lastName: true, email: true, storeName: true } })
      : [],
    productIds.size ? prisma.product.findMany({ where: { id: { in: [...productIds] } }, select: { id: true, name: true, sellerId: true } }) : [],
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const productById = new Map(products.map((p) => [p.id, p]));

  return {
    items: rows.map((r) => {
      const targetUser = r.targetType === 'PRODUCT' ? undefined : userById.get(r.targetId);
      const product = r.targetType === 'PRODUCT' ? productById.get(r.targetId) : undefined;
      return {
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        detail: r.detail,
        status: r.status,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
        adminNote: r.adminNote,
        reporter: publicUser(userById.get(r.reporterId)),
        reviewer: r.reviewedBy ? publicUser(userById.get(r.reviewedBy)) : null,
        target:
          r.targetType === 'PRODUCT'
            ? { type: 'PRODUCT', id: r.targetId, name: product?.name ?? null, sellerId: product?.sellerId ?? null }
            : { type: r.targetType, id: r.targetId, name: targetUser?.storeName || publicUser(targetUser)?.name || null, sellerId: r.targetId },
      };
    }),
    total,
  };
}

export interface UpdateCatalogReportInput {
  status: 'REVIEWED' | 'DISCARDED';
  note?: string;
}

export async function adminUpdateCatalogReportStatus(reviewerId: number, reportId: number, input: UpdateCatalogReportInput) {
  const note = input.note?.trim().slice(0, 300) || null;
  // updateMany con status OPEN es atómico: si dos personas procesan la misma denuncia a la vez,
  // solo una la actualiza y la otra recibe 409 en lugar de pisar el resultado.
  const result = await prisma.catalogReport.updateMany({
    where: { id: reportId, status: 'OPEN' },
    data: { status: input.status, reviewedAt: new Date(), reviewedBy: reviewerId, adminNote: note },
  });
  if (result.count === 0) {
    const existing = await prisma.catalogReport.findUnique({ where: { id: reportId }, select: { id: true } });
    if (!existing) throw ApiError.notFound('Denuncia no encontrada');
    throw ApiError.conflict('Esta denuncia ya fue procesada');
  }
  return prisma.catalogReport.findUniqueOrThrow({ where: { id: reportId } });
}
