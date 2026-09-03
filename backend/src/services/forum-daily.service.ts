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
