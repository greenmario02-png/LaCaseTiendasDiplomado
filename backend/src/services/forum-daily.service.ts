import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { karmaService } from './karma.service';
import { boliviaDateOnly, creditForumCoins } from './forum.service';

/**
 * Job nocturno del foro (23:55 hora boliviana / 03:55 UTC):
 * acredita +5 karma y +5 monedas al autor del post más votado del día
 * (FL-03 del spec 02; RF-10.5 del spec 01).
 */
export async function processForumTopPost(): Promise<number | null> {
  const startOfDay = boliviaDateOnly();
  const nextDay = new Date(startOfDay);
  nextDay.setDate(nextDay.getDate() + 1);

  const topPost = await prisma.forumPost.findFirst({
    where: {
      createdAt: { gte: startOfDay, lt: nextDay },
      deletedAt: null,
      isHidden: false,
    },
    orderBy: { score: 'desc' },
  });

  if (!topPost?.authorId) return null;

  // Idempotencia real (no solo "buscar si ya existe" en JS, que sigue siendo racy bajo
  // concurrencia real): el constraint único de ForumTopPostAward.postId hace que solo una
  // ejecución concurrente gane el `create`; las demás reciben P2002 y no otorgan nada.
  try {
    await prisma.forumTopPostAward.create({ data: { postId: topPost.id } });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') {
      logger.info(`[forum-top-post] post ${topPost.id} ya fue premiado — se ignora esta ejecución`);
      return topPost.id;
    }
    throw e;
  }

  await karmaService.earn(
    topPost.authorId,
    5,
    'EARN_TOP_POST',
    'POST',
    topPost.id,
    'Post más votado del día',
  );
  await creditForumCoins(topPost.authorId, topPost.id, 'FORUM_QUESTION', topPost.id, 5);

  logger.info(`[forum-top-post] acreditado +5 karma/+5 monedas al post ${topPost.id}`);
  return topPost.id;
}
