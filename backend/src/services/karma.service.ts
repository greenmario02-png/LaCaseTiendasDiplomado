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

    const result = await prisma.$transaction(async (tx) => {
      // Update atómico con piso en 0: el CTE `locked` toma el row lock (FOR UPDATE) y
      // el UPDATE calcula karma nuevo a partir de ESE valor bloqueado, no de un valor
      // leído antes de la transacción — dos penalizaciones concurrentes ya no pueden
      // ambas "ver" el mismo karma viejo y hacer que el total termine por debajo de 0.
      const rows = await tx.$queryRaw<{ oldKarma: number; newKarma: number; oldTag: string; userId: number }[]>`
        WITH locked AS (
          SELECT karma, tag, "userId" FROM forum_profiles WHERE id = ${profileId} FOR UPDATE
        )
        UPDATE forum_profiles
        SET karma = GREATEST((SELECT karma FROM locked) + ${amount}, 0)
        WHERE id = ${profileId}
        RETURNING
          (SELECT karma FROM locked) AS "oldKarma",
          karma AS "newKarma",
          (SELECT tag FROM locked) AS "oldTag",
          (SELECT "userId" FROM locked) AS "userId"
      `;
      const row = rows[0];
      if (!row) throw ApiError.notFound('Perfil de foro no encontrado.');

      const effectiveAmount = row.newKarma - row.oldKarma;
      if (effectiveAmount === 0) return { ...row, effectiveAmount, newTag: row.oldTag };

      const newTag = this.getTag(row.newKarma);
      if (newTag !== row.oldTag) {
        await tx.forumProfile.update({ where: { id: profileId }, data: { tag: newTag } });
      }
      await tx.karmaTransaction.create({
        data: { profileId, amount: effectiveAmount, type: type as never, refType, refId, note },
      });

      return { ...row, effectiveAmount, newTag };
    });

    if (result.effectiveAmount === 0) return;

    // Notificar si subió de rango
    if (result.newTag !== result.oldTag && result.effectiveAmount > 0) {
      try {
        await createNotification({
          userId: result.userId,
          type: 'FORUM_RANK_UP' as never,
          title: `¡Nuevo rango: ${result.newTag}! 🏅`,
          message: `Tu karma llegó a ${result.newKarma}. ¡Ahora eres ${result.newTag} en LaCASE!`,
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
