import { NextFunction, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { ApiError } from '../utils/errors';
import { ok } from '../utils/response';

/**
 * Valor de las monedas del proyecto: 1.000 monedas = 0,50 USD (medio dólar).
 * 1 moneda = 0,0005 USD → en Bs = 0,0005 × tasa USD/BOB (fuente BCB).
 */
export const COINS_PER_USD = 2000; // 2.000 monedas = 1 USD
export const USD_PER_COIN = 1 / COINS_PER_USD; // 0,0005 USD por moneda

/** Acredita monedas al comprador cuando su pago es VERIFICADO (compra efectiva, sin devolución).
 *  Regla: 1 moneda por cada 100 Bs de total (mínimo 1 si el total es >= 100). Idempotente. */
export async function creditPurchaseCoins(buyerId: number, orderId: number, total: number): Promise<void> {
  try {
    const existing = await prisma.coinTransaction.findFirst({
      where: { userId: buyerId, type: 'EARN_PURCHASE', refType: 'ORDER', refId: orderId },
    });
    if (existing) return;
    if (!total || total <= 0) return;
    const amount = Math.max(1, Math.floor(total / 100));
    const user = await prisma.user.update({
      where: { id: buyerId },
      data: { gamerCoins: { increment: amount } },
      select: { id: true },
    });
    if (!user) return;
    await prisma.coinTransaction.create({
      data: {
        userId: buyerId,
        amount,
        type: 'EARN_PURCHASE',
        refType: 'ORDER',
        refId: orderId,
        note: `Compra efectiva #${orderId}: ganaste ${amount} moneda(s)`,
      },
    });
  } catch (e) {
    // Nunca romper el flujo de pago por la acreditación de monedas.
    console.error('[coins] creditPurchaseCoins error:', (e as Error).message);
  }
}

export async function getBalance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, gamerCoins: true },
    });
    const transactions = await prisma.coinTransaction.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return ok(res, { balance: user?.gamerCoins ?? 0, transactions });
  } catch (error) {
    next(error);
  }
}

/** Equivalencia pública de las monedas del proyecto: 1.000 monedas = 0,50 USD (≈ tasa BCB). */
export async function getCoinRate(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { getRates } = await import('../services/currency.service');
    const rates = await getRates();
    const usdToBob = rates.USD ?? 6.96;
    const usdPerCoin = USD_PER_COIN;
    const bobPerCoin = usdPerCoin * usdToBob;
    const bobPerThousand = bobPerCoin * 1000;
    return ok(res, {
      coinsPerUsd: COINS_PER_USD,
      usdPerCoin,
      bobPerCoin,
      bobPerThousand,
      usdToBob,
      equivalencias: {
        '1000': { usd: 0.5, bob: bobPerThousand },
        '2000': { usd: 1, bob: bobPerThousand * 2 },
        '5000': { usd: 2.5, bob: bobPerThousand * 5 },
        '10000': { usd: 5, bob: bobPerThousand * 10 },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function buyCoins(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const amount = Math.floor(Number(req.body?.amount));
    if (!Number.isInteger(amount) || amount <= 0) {
      throw ApiError.badRequest('Indicá una cantidad válida de monedas a comprar.');
    }
    if (amount > 100000) {
      throw ApiError.badRequest('La cantidad máxima por compra es 100.000 monedas.');
    }
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { gamerCoins: { increment: amount } },
    });
    const tx = await prisma.coinTransaction.create({
      data: {
        userId: req.user!.id,
        amount,
        type: 'PURCHASE',
        note: `Compra de ${amount} moneda(s) del proyecto`,
      },
    });
    return ok(res, { balance: await prisma.user.findUnique({ where: { id: req.user!.id }, select: { gamerCoins: true } }).then((u) => u?.gamerCoins ?? 0), transaction: tx });
  } catch (error) {
    next(error);
  }
}

/** Monedas que gana el que invita a un amigo a la app. */
export const INVITE_COINS = 50;

/** Aplica un código de invitación al registrarse: el nuevo usuario queda referido por el
 *  invitador y el invitador gana monedas (EARN_INVITE). Idempotente por pareja. */
export async function applyInviteCode(newUserId: number, code: string): Promise<void> {
  try {
    const raw = String(code ?? '').trim();
    if (!raw) return;
    const referrer = await prisma.user.findUnique({ where: { inviteCode: raw } });
    if (!referrer || referrer.id === newUserId) return;
    await prisma.user.update({ where: { id: newUserId }, data: { referredById: referrer.id } });
    const existing = await prisma.coinTransaction.findFirst({
      where: { userId: referrer.id, type: 'EARN_INVITE', refType: 'USER', refId: newUserId },
    });
    if (existing) return;
    await prisma.user.update({
      where: { id: referrer.id },
      data: { gamerCoins: { increment: INVITE_COINS } },
    });
    await prisma.coinTransaction.create({
      data: {
        userId: referrer.id,
        amount: INVITE_COINS,
        type: 'EARN_INVITE',
        refType: 'USER',
        refId: newUserId,
        note: `Invitaste a un amigo a LaCase Multi Tiendas: ganaste ${INVITE_COINS} moneda(s)`,
      },
    });
  } catch (e) {
    console.error('[coins] applyInviteCode error:', (e as Error).message);
  }
}

/** Devuelve el código de invitación propio (lo genera si el usuario es del seed y no lo tiene). */
export async function getInvite(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { inviteCode: true },
    });
    let inviteCode = user?.inviteCode ?? null;
    if (!inviteCode) {
      inviteCode = `INV-${userId}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      await prisma.user.update({ where: { id: userId }, data: { inviteCode } });
    }
    const referredCount = await prisma.user.count({ where: { referredById: userId } });
    return ok(res, { inviteCode, inviteUrl: `/register?ref=${inviteCode}`, referredCount });
  } catch (error) {
    next(error);
  }
}
