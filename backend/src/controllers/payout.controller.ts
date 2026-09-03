import { NextFunction, Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { ok, created } from '../utils/response';
import * as payoutService from '../services/payout.service';

/** Resumen de balance + cuenta + historial (seller). */
export async function summary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await payoutService.payoutSummary(req.user!.id);
    return ok(res, data);
  } catch (error) {
    next(error);
  }
}

/** Configurar la cuenta de cobro (seller). */
export async function saveAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { method, accountHolder, accountNumber, bankName, phoneQr } = req.body;
    const account = await payoutService.upsertAccount(req.user!.id, {
      method: method || 'BNB',
      accountHolder: accountHolder || null,
      accountNumber: accountNumber || null,
      bankName: bankName || null,
      phoneQr: phoneQr || null,
    });
    return ok(res, account);
  } catch (error) {
    next(error);
  }
}

/** Solicitar un retiro (seller). */
export async function requestPayout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { amount, note } = req.body;
    const payout = await payoutService.requestPayout(req.user!.id, Number(amount), note);
    return created(res, payout);
  } catch (error) {
    next(error);
  }
}

/** Listar todos los payouts (admin). */
export async function listAllPayouts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payouts = await prisma.payout.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { seller: { select: { id: true, storeName: true, email: true } } },
    });
    return ok(res, payouts.map((p) => ({ ...p, amount: Number(p.amount) })));
  } catch (error) {
    next(error);
  }
}

/** Aprobar/rechazar/marcar pagado (admin). */
export async function processPayout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, note } = req.body;
    if (!['APPROVED', 'REJECTED', 'PAID'].includes(status)) {
      return next(new Error('Estado inválido'));
    }
    const payout = await payoutService.processPayout(Number(req.params.id), status, note);
    return ok(res, payout);
  } catch (error) {
    next(error);
  }
}
