import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { ApiError } from '../utils/errors';
import { ok } from '../utils/response';

function generateCode(name: string): string {
  const base = (name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'user';
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

// ---------- PÚBLICO ----------

/** Aplica un código de referido al registrar un nuevo usuario (se llama desde auth.register). */
export async function applyReferral(userId: number, referralCode: string) {
  if (!referralCode) return;
  const affiliate = await prisma.affiliate.findUnique({ where: { referralCode } });
  if (!affiliate || affiliate.userId === userId) return;

  const exists = await prisma.affiliateReferral.findUnique({ where: { referredId: userId } });
  if (exists) return;

  await prisma.affiliateReferral.create({
    data: { affiliateId: affiliate.id, referredId: userId },
  });
}

// ---------- AFILIADO ----------

export async function getMyAffiliate(req: AuthRequest, res: Response) {
  if (!req.user) return ApiError.unauthorized();
  let affiliate = await prisma.affiliate.findUnique({ where: { userId: req.user.id } });

  if (!affiliate) {
    affiliate = await prisma.affiliate.create({
      data: { userId: req.user.id, referralCode: generateCode(req.user.email.split('@')[0]) },
    });
  }

  const referrals = await prisma.affiliateReferral.count({ where: { affiliateId: affiliate.id } });
  const paidOrders = await prisma.affiliateReferral.count({ where: { affiliateId: affiliate.id, status: 'ORDER_PAID' } });

  ok(res, { ...affiliate, referralCount: referrals, paidOrderCount: paidOrders });
}

export async function listMyReferrals(req: AuthRequest, res: Response) {
  if (!req.user) return ApiError.unauthorized();
  const affiliate = await prisma.affiliate.findUnique({ where: { userId: req.user.id } });
  if (!affiliate) throw ApiError.notFound('No tenés cuenta de afiliado todavía');

  const referrals = await prisma.affiliateReferral.findMany({
    where: { affiliateId: affiliate.id },
    orderBy: { createdAt: 'desc' },
    include: { referred: { select: { firstName: true, lastName: true, email: true } } },
  });
  ok(res, referrals);
}

// ---------- ADMIN ----------

export async function listAffiliates(req: AuthRequest, res: Response) {
  const affiliates = await prisma.affiliate.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      _count: { select: { referrals: true } },
    },
  });
  ok(res, affiliates);
}

export async function setCommission(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  const { commissionPct } = req.body;
  if (commissionPct == null || Number(commissionPct) < 0 || Number(commissionPct) > 100)
    throw ApiError.badRequest('Comisión inválida (0-100)');
  const aff = await prisma.affiliate.update({
    where: { id },
    data: { commissionPct: Number(commissionPct) },
  });
  ok(res, aff);
}
