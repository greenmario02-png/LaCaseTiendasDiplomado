import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { isInternalImagePath, isPaymentQrUrl } from '../utils/imageSafety';

/**
 * Datos de pago visibles de una tienda: QR, titular, banco y número de cuenta (cuenta de cobro activa de la tienda).
 *  - Cualquiera ve el QR, el método, el banco y los datos ENMASCARADOS (titular abreviado, últimos 4 dígitos).
 *  - El número completo y el titular completo solo los ve quien tiene una razón para pagar: un comprador con productos de
 *    esa tienda en su carrito o con un pedido no cancelado con ella, o el propio equipo de la tienda (anti-scraping / IDOR).
 */
export interface PaymentViewer {
  id: number;
  storeOwnerId?: number | null;
}

/** "Juan Pérez Rojas" -> "Juan P. R." (lo justo para reconocerlo sin publicar el nombre completo). */
export function abbreviateHolder(name: string | null | undefined): string | null {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  return [parts[0], ...parts.slice(1).map((p) => `${p[0].toUpperCase()}.`)].join(' ');
}

/** Últimos 4 caracteres visibles. */
export const maskTail = (v: string | null | undefined): string | null => (v ? (v.length > 4 ? `${'•'.repeat(v.length - 4)}${v.slice(-4)}` : '••••') : null);

/** Solo imágenes internas: el QR subido (payment-qr) o una imagen propia heredada. Una URL externa antigua no se muestra. */
export function safeQrUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return isPaymentQrUrl(url) || isInternalImagePath(url) ? url : null;
}

export async function canSeeFullPaymentData(viewer: PaymentViewer | null | undefined, storeId: number): Promise<boolean> {
  if (!viewer) return false;
  if (viewer.id === storeId || viewer.storeOwnerId === storeId) return true;
  const [inCart, order] = await Promise.all([
    prisma.cartItem.findFirst({ where: { cart: { userId: viewer.id }, product: { sellerId: storeId } }, select: { id: true } }),
    prisma.order.findFirst({ where: { buyerId: viewer.id, sellerId: storeId, status: { not: 'CANCELLED' } }, select: { id: true } }),
  ]);
  return !!(inCart || order);
}

export async function storePaymentInfo(storeId: number, viewer?: PaymentViewer | null) {
  const store = await prisma.user.findFirst({
    where: { id: storeId, role: 'SELLER', isActive: true },
    select: { id: true, storeName: true, paymentQrUrl: true },
  });
  if (!store) throw ApiError.notFound('Tienda no encontrada');
  const row = await prisma.payoutAccount.findUnique({ where: { sellerId: storeId } });
  const acct = row && row.isActive && row.accountHolder ? row : null;
  const full = await canSeeFullPaymentData(viewer, storeId);
  const qrUrl = safeQrUrl(store.paymentQrUrl);
  return {
    storeId: store.id,
    storeName: store.storeName,
    available: !!(acct || qrUrl),
    // En esta versión no hay aprobación de cambios: "approved" indica que la tienda tiene su cuenta de cobro configurada.
    approved: !!acct,
    full,
    qrUrl,
    method: acct?.method ?? null,
    bankName: acct?.bankName ?? null,
    accountHolder: acct ? (full ? acct.accountHolder : abbreviateHolder(acct.accountHolder)) : null,
    accountNumber: acct?.accountNumber ? (full ? acct.accountNumber : maskTail(acct.accountNumber)) : null,
    phoneQr: acct?.phoneQr ? (full ? acct.phoneQr : maskTail(acct.phoneQr)) : null,
  };
}
