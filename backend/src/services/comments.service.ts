import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { ensureForumProfile } from './forum.service';

/**
 * Motor genérico de comentarios con votación de credibilidad (de acuerdo / está mamando /
 * creado con IA) — reusable por memes y torneo, QuemadosBolivia, Bolivia en Comunidad
 *. `targetType`/`targetId`
 * identifican el contenido comentado; esas tablas de contenido todavía no existen (fases
 * posteriores), así que quedan como strings/ids libres, no FKs.
 */

export async function listComments(targetType: string, targetId: number, page: number, limit: number) {
  const where = { targetType, targetId, deletedAt: null, isHidden: false };
  const [data, total] = await Promise.all([
    prisma.genericComment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, forumUsername: true, avatarUrl: true, tag: true } } },
    }),
    prisma.genericComment.count({ where }),
  ]);
  return { comments: data, total };
}

export async function createComment(userId: number, targetType: string, targetId: number, body: string) {
  const profile = await ensureForumProfile(userId);
  if (profile.isBanned) throw new ApiError(403, 'BANNED', 'Tu perfil de foro está baneado.');

  return prisma.genericComment.create({
    data: { targetType, targetId, authorId: profile.id, body: body.trim() },
    include: { author: { select: { id: true, forumUsername: true, avatarUrl: true, tag: true } } },
  });
}

export async function deleteComment(userId: number, commentId: number) {
  const profile = await ensureForumProfile(userId);
  const comment = await prisma.genericComment.findUniqueOrThrow({ where: { id: commentId } });
  if (comment.authorId !== profile.id) {
    throw new ApiError(403, 'NOT_COMMENT_AUTHOR', 'Solo el autor puede eliminar su comentario.');
  }
  return prisma.genericComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
}

async function recountVotes(tx: Prisma.TransactionClient, commentId: number) {
  const [agreeCount, fakeCount, aiCount] = await Promise.all([
    tx.genericCommentVote.count({ where: { commentId, type: 'AGREE' } }),
    tx.genericCommentVote.count({ where: { commentId, type: 'FAKE' } }),
    tx.genericCommentVote.count({ where: { commentId, type: 'AI_GENERATED' } }),
  ]);
  await tx.genericComment.update({ where: { id: commentId }, data: { agreeCount, fakeCount, aiCount } });
  return { agreeCount, fakeCount, aiCount };
}

/**
 * Voto único por usuario por comentario (AGREE | FAKE | AI_GENERATED). Igual patrón que
 * `voteTarget` en forum.service.ts: si el mismo tipo ya estaba votado, toggle (quita el
 * voto); si era otro tipo, lo cambia. El create puede chocar con el constraint único bajo
 * concurrencia — en Postgres eso aborta TODA la transacción, así que la recuperación va en
 * una transacción nueva, no dentro del mismo intento fallido (ver forum.service.ts:voteTarget
 * para el detalle de por qué).
 */
export async function voteComment(userId: number, commentId: number, type: 'AGREE' | 'FAKE' | 'AI_GENERATED') {
  const profile = await ensureForumProfile(userId);

  const runVoteTx = () => prisma.$transaction(async (tx) => {
    const existing = await tx.genericCommentVote.findUnique({
      where: { commentId_profileId: { commentId, profileId: profile.id } },
    });
    if (existing) {
      if (existing.type === type) {
        await tx.genericCommentVote.delete({ where: { id: existing.id } });
      } else {
        await tx.genericCommentVote.update({ where: { id: existing.id }, data: { type } });
      }
    } else {
      await tx.genericCommentVote.create({ data: { commentId, profileId: profile.id, type } });
    }
    return recountVotes(tx, commentId);
  });

  try {
    return await runVoteTx();
  } catch (e) {
    if ((e as { code?: string }).code !== 'P2002') throw e;
    return await runVoteTx();
  }
}
