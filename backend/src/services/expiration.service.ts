import { prisma } from '../config/database';
import { logger } from '../utils/logger';

/** Desactiva productos aprobados cuya fecha de expiración venció (30 días sin venderse). */
export async function expireProducts(): Promise<number> {
  const now = new Date();
  const result = await prisma.product.updateMany({
    where: {
      isApproved: true,
      isActive: true,
      expiresAt: { lte: now },
    },
    data: { isActive: false },
  });
  if (result.count > 0) {
    logger.info(`[expiration] ${result.count} producto(s) expiraron y pasaron a inactivos`);
  }
  return result.count;
}

/** Reactiva un producto vencido (máx 3 veces) renovando su expiración a +30 días. */
export async function reactivateProduct(productId: number, sellerId: number): Promise<{ product: unknown; reactivationLeft: number }> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Producto no encontrado');
  if (product.sellerId !== sellerId) throw new Error('No tenés permiso para reactivar este producto');
  if (product.reactivationCount >= 3) {
    throw new Error('Este producto alcanzó el máximo de reactivaciones (3). Ya no puede volver a publicarse.');
  }
  const now = new Date();
  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      isActive: true,
      reactivationCount: { increment: 1 },
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  return { product: updated, reactivationLeft: 3 - updated.reactivationCount };
}
