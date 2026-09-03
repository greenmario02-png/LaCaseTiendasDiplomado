import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { createNotification } from './notification.service';

const RANK_THRESHOLDS = [
  { min: 0,    tag: 'Novato'      },
  { min: 50,   tag: 'Colaborador' },
  { min: 200,  tag: 'Activo'      },
  { min: 500,  tag: 'Experto'     },
  { min: 1000, tag: 'Maestro'     },
  { min: 3000, tag: 'Leyenda'     },
];

export const karmaService = {
  getTag(karma: number): string {
    return [...RANK_THRESHOLDS].reverse().find((r) => karma >= r.min)?.tag ?? 'Novato';
  },

  async earn(
    profileId: number,
    amount: number,
    type: string,
    refType?: string,
    refId?: number,
    note?: string,
  ): Promise<void> {
    if (amount === 0) return;

    const profile = await prisma.forumProfile.findUniqueOrThrow({ where: { id: profileId } });

    // Karma nunca baja de 0
    const effectiveAmount = amount < 0 ? Math.max(-profile.karma, amount) : amount;
    if (effectiveAmount === 0) return;

    const newKarma = profile.karma + effectiveAmount;
    const newTag = this.getTag(newKarma);

    await prisma.$transaction([
      prisma.karmaTransaction.create({
        data: { profileId, amount: effectiveAmount, type: type as never, refType, refId, note },
      }),
      prisma.forumProfile.update({
        where: { id: profileId },
        data: { karma: { increment: effectiveAmount }, tag: newTag },
      }),
    ]);

    // Notificar si subió de rango
    if (newTag !== profile.tag && effectiveAmount > 0) {
      try {
        await createNotification({
          userId: profile.userId,
          type: 'FORUM_RANK_UP' as never,
          title: `¡Nuevo rango: ${newTag}! 🏅`,
          message: `Tu karma llegó a ${newKarma}. ¡Ahora eres ${newTag} en LaCASE!`,
          refType: 'FORUM_PROFILE',
          refId: profileId,
        });
      } catch (e) {
        console.error('[Karma] rank-up notif error:', (e as Error).message);
      }
    }
  },

  async redeem(profileId: number, karmaAmount: number): Promise<{ coinsEarned: number }> {
    const profile = await prisma.forumProfile.findUniqueOrThrow({ where: { id: profileId } });
    const available = profile.karma - profile.karmaSpent;

    if (available < karmaAmount) {
      throw new ApiError(400, 'INSUFFICIENT_KARMA',
        `Solo tienes ${available} karma disponible para canjear.`);
    }
    if (karmaAmount % 100 !== 0) {
      throw new ApiError(400, 'INVALID_AMOUNT', 'El karma a canjear debe ser múltiplo de 100.');
    }

    const coinsEarned = (karmaAmount / 100) * 10;

    await prisma.$transaction([
      // KarmaTransaction de tipo REDEEM (no baja karma histórico)
      prisma.karmaTransaction.create({
        data: {
          profileId,
          amount: -karmaAmount,
          type: 'REDEEM' as never,
          note: `Canje: ${karmaAmount} karma → ${coinsEarned} monedas`,
        },
      }),
      // Solo sube karmaSpent, NO baja karma
      prisma.forumProfile.update({
        where: { id: profileId },
        data: { karmaSpent: { increment: karmaAmount } },
      }),
      // Acreditar monedas
      prisma.user.update({
        where: { id: profile.userId },
        data: { gamerCoins: { increment: coinsEarned } },
      }),
      prisma.coinTransaction.create({
        data: {
          userId: profile.userId,
          amount: coinsEarned,
          type: 'EARN_FORUM' as never,
          refType: 'REWARD',
          refId: profileId,
          note: `Canje de karma: ${karmaAmount} karma → ${coinsEarned} monedas`,
        },
      }),
    ]);

    return { coinsEarned };
  },
};
