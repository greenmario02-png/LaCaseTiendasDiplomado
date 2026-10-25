import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Sistema de escrow y payouts:
 * - El dinero de una venta queda retenido (escrow) hasta que la orden se entrega y el pago se verifica.
 * - El "balance disponible" del vendedor = suma de sellerNet de órdenes entregadas/verificadas menos payouts pagados.
 * - El vendedor solicita un payout; el admin lo aprueba y se marca PAID (transferencia BNB/QR/bancaria).
 */

const LIBERATED_STATUS = ['DELIVERED'];
const LIBERATED_PAYMENT = ['VERIFIED'];

/** Suma de sellerNet de órdenes liberadas (escrow liberado) de un vendedor. */
export async function liberatedFunds(sellerId: number): Promise<number> {
  const agg = await prisma.order.aggregate({
    where: {
      sellerId,
      status: { in: LIBERATED_STATUS as any },
      paymentStatus: { in: LIBERATED_PAYMENT as any },
    },
    _sum: { sellerNet: true },
  });
  return agg._sum?.sellerNet ? Number(agg._sum.sellerNet) : 0;
}

/** Suma de payouts pagados (ya transferidos al vendedor). */
export async function paidPayouts(sellerId: number): Promise<number> {
  const agg = await prisma.payout.aggregate({
    where: { sellerId, status: 'PAID' },
    _sum: { amount: true },
  });
  return agg._sum?.amount ? Number(agg._sum.amount) : 0;
}

/** Suma de payouts pendientes/aprobados (en proceso). */
export async function pendingPayouts(sellerId: number): Promise<number> {
  const agg = await prisma.payout.aggregate({
    where: { sellerId, status: { in: ['PENDING', 'APPROVED'] } },
    _sum: { amount: true },
  });
  return agg._sum?.amount ? Number(agg._sum.amount) : 0;
}

/** Balance disponible para retirar (escrow liberado - ya pagado - en proceso). */
export async function availableBalance(sellerId: number): Promise<number> {
  const liberated = await liberatedFunds(sellerId);
  const paid = await paidPayouts(sellerId);
  const pending = await pendingPayouts(sellerId);
  return Math.max(0, liberated - paid - pending);
}

/** Resumen completo del balance del vendedor. */
export async function payoutSummary(sellerId: number) {
  const [liberated, paid, pending, available, account, payouts] = await Promise.all([
    liberatedFunds(sellerId),
    paidPayouts(sellerId),
    pendingPayouts(sellerId),
    availableBalance(sellerId),
    prisma.payoutAccount.findUnique({ where: { sellerId } }),
    prisma.payout.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ]);

  return {
    liberated,
    paid,
    pending,
    available,
    account,
    payouts: payouts.map((p) => ({ ...p, amount: Number(p.amount) })),
  };
}

/**
 * Compara dos teléfonos tolerando formato (espacios, guiones, +591/591/00591 al inicio). Este
 * repo no tiene un util compartido de teléfono boliviano (a diferencia de la versión completa del
 * marketplace, que sí trae `utils/boPhone.ts`), así que se compara solo por dígitos quitando el
 * prefijo de país si aparece.
 */
function phonesMatch(a: string, b: string): boolean {
  const onlyDigits = (v: string) => {
    let digits = v.replace(/\D/g, '');
    if (digits.startsWith('00591')) digits = digits.slice(5);
    else if (digits.startsWith('591') && digits.length > 8) digits = digits.slice(3);
    return digits;
  };
  const da = onlyDigits(a);
  const db = onlyDigits(b);
  return !!da && da === db;
}

/**
 * El teléfono del método QR no es "cualquier número": es el WhatsApp de la tienda, para que el
 * comprador pueda verificar el titular antes de pagar. Solo se exige a vendedores (rol SELLER); si
 * quien guarda la cuenta es un empleado de la tienda (storeOwnerId), se compara contra el WhatsApp
 * del dueño, que es quien realmente figura como "la tienda".
 * Si la tienda todavía no registró su WhatsApp, se acepta el número enviado tal cual (no hay nada
 * con qué comparar); el vendedor puede declarar su WhatsApp cuando quiera en "Mi tienda" y desde ahí
 * sí deberá coincidir en los próximos cambios de cuenta.
 */
export async function assertQrMatchesStoreWhatsapp(userId: number, phoneQr: string): Promise<void> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, storeOwnerId: true } });
  if (!u || u.role !== 'SELLER') return;
  const ownerId = u.storeOwnerId ?? userId;
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { whatsappPhone: true } });
  const wa = (owner?.whatsappPhone ?? '').trim();
  if (!wa) return;
  if (!phonesMatch(phoneQr, wa)) {
    throw new ApiError(400, 'QR_PHONE_NOT_STORE_WHATSAPP', 'El teléfono del QR debe coincidir con el WhatsApp de tu tienda.');
  }
}

/** Configura (crea o actualiza) la cuenta de cobro del vendedor. */
export async function upsertAccount(sellerId: number, data: { method?: string; accountHolder?: string; accountNumber?: string; bankName?: string; phoneQr?: string }) {
  // Importante: trim antes de evaluar como vacío, o un valor de solo espacios se consideraría "con dato".
  const phoneQr = (data.phoneQr ?? '').trim() || undefined;
  if (data.method === 'QR') {
    if (!phoneQr) throw ApiError.badRequest('Indica el teléfono del QR');
    await assertQrMatchesStoreWhatsapp(sellerId, phoneQr);
  }
  const next = { ...data, phoneQr };
  return prisma.payoutAccount.upsert({
    where: { sellerId },
    create: { sellerId, ...next },
    update: next,
  });
}

/** El vendedor solicita un retiro del balance disponible. */
export async function requestPayout(sellerId: number, amount: number, note?: string) {
  if (!Number.isFinite(amount) || amount <= 0) throw ApiError.badRequest('Monto inválido');

  const account = await prisma.payoutAccount.findUnique({ where: { sellerId } });
  if (!account) throw ApiError.badRequest('Configura primero tu cuenta de cobro (BNB, banco o QR)');

  const available = await availableBalance(sellerId);
  if (amount > available + 0.01) {
    throw ApiError.badRequest(`No tienes ese saldo disponible. Tu balance es ${available.toFixed(2)} Bs`);
  }

  const payout = await prisma.payout.create({
    data: {
      sellerId,
      amount,
      status: 'PENDING',
      method: account.method,
      note: note || null,
    },
  });

  logger.info(`[payout] ${sellerId} solicitó retiro de ${amount} Bs`);
  return { ...payout, amount: Number(payout.amount) };
}

/** El admin aprueba/rechaza/marca como pagado un payout. */
export async function processPayout(payoutId: number, status: 'APPROVED' | 'REJECTED' | 'PAID', note?: string) {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) throw ApiError.notFound('Payout no encontrado');

  const transitions: Record<string, string[]> = {
    APPROVED: ['PENDING'],
    REJECTED: ['PENDING'],
    PAID: ['PENDING', 'APPROVED'],
  };
  if (!(transitions[status] ?? []).includes(payout.status)) {
    throw ApiError.badRequest(`No se puede pasar de ${payout.status} a ${status}`);
  }

  const updated = await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status,
      note: note || payout.note,
      processedAt: status === 'PAID' ? new Date() : payout.processedAt,
    },
  });

  logger.info(`[payout] #${payoutId} → ${status}`);
  return { ...updated, amount: Number(updated.amount) };
}
