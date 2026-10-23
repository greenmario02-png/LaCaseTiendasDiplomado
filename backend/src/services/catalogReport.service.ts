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
