import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { getIO } from '../config/socket';
import { createNotification } from './notification.service';
import { karmaService } from './karma.service';
import { forumBotService } from './forum-bot.service';
import { resolveCategoryGates, assertProfessionalVerified, assertCanAccessUniversity } from './forum-gates.service';
import { flagIfPolemic, maskAuthorsForDebateZone } from './debate-zone.service';

// ─── Helpers internos ──────────────────────────────────────────────

/**
 * Obtiene o crea el ForumProfile del usuario.
 * Se llama en TODOS los endpoints autenticados del foro.
 */
export async function ensureForumProfile(userId: number) {
  const profile = await prisma.forumProfile.findUnique({ where: { userId } });
  if (profile) return profile;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const alias = await generateUniqueAlias();
  try {
    return await prisma.forumProfile.create({
      data: {
        userId,
        forumUsername: alias,
        city: user.locationCity || 'Bolivia',
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code !== 'P2002') throw e;
    // Carrera: dos requests concurrentes del mismo usuario (ej. dos pestañas, web+mobile a
    // la vez) que nunca había entrado al foro — ambas ven "sin perfil" y ambas intentan
    // crear uno; ForumProfile.userId es @unique, así que la segunda choca acá. La otra ya
    // lo creó, así que solo hace falta traerlo.
    return await prisma.forumProfile.findUniqueOrThrow({ where: { userId } });
  }
}

export async function generateUniqueAlias(): Promise<string> {
  let alias: string;
  do {
    alias = `Usuario_${Math.floor(1000 + Math.random() * 9000)}`;
  } while (await prisma.forumProfile.findUnique({ where: { forumUsername: alias } }));
  return alias;
}

export function boliviaDateOnly(): Date {
  const now = new Date();
  const boliviaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
  return new Date(boliviaDate.getFullYear(), boliviaDate.getMonth(), boliviaDate.getDate());
}

/**
 * Verifica y registra una acción diaria. Lanza 429 si se superó el límite.
 * @param userId  User.id
 * @param action  ForumDailyAction
 * @param limit   Límite diario (1 | 5 | 10)
 */
export async function checkAndIncrementDailyCounter(
  userId: number,
  action: 'POST' | 'REPLY' | 'VOTE',
  limit: number,
): Promise<void> {
  const dateOnly = boliviaDateOnly();

  const result = await prisma.$transaction(async (tx) => {
    const counter = await tx.dailyActionCounter.upsert({
      where: { userId_action_date: { userId, action, date: dateOnly } },
      update: { count: { increment: 1 } },
      create: { userId, action, date: dateOnly, count: 1 },
    });
    return counter;
  });

  // Verificar DESPUÉS del upsert
  if (result.count > limit) {
    // Revertir el incremento
    await prisma.dailyActionCounter.update({
      where: { userId_action_date: { userId, action, date: dateOnly } },
      data: { count: { decrement: 1 } },
    });
    throw new ApiError(429, 'DAILY_LIMIT_REACHED',
      `Límite diario de ${limit} ${action.toLowerCase()}(s) alcanzado. Vuelve mañana.`);
  }
}

/**
 * Verifica que la cuenta tenga >= 24 h de antigüedad.
 */
export async function assertAccountAge(userId: number): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const ageMs = Date.now() - user.createdAt.getTime();
  if (ageMs < 24 * 60 * 60 * 1000) {
    throw new ApiError(403, 'ACCOUNT_TOO_NEW',
      'Tu cuenta necesita tener al menos 24 horas para publicar en el foro.');
  }
}

/**
 * Calcula el score ponderado de un post/reply según votos.
 * RNF-06.3: votos de perfiles con < 3 posts valen 0.5
 */
export async function recalculateScore(
  targetType: 'post' | 'reply',
  targetId: number,
): Promise<number> {
  const votes = await prisma.forumVote.findMany({
    where: targetType === 'post' ? { postId: targetId } : { replyId: targetId },
    include: { profile: { select: { _count: { select: { posts: true } } } } },
  });

  const score = votes.reduce((acc, v) => {
    const weight = (v.profile as unknown as { _count: { posts: number } })._count.posts < 3 ? 0.5 : 1;
    return acc + v.value * weight;
  }, 0);

  if (targetType === 'post') {
    await prisma.forumPost.update({ where: { id: targetId }, data: { score } });
  } else {
    await prisma.forumReply.update({ where: { id: targetId }, data: { score } });
  }

  return score;
}

// ─── Perfil ────────────────────────────────────────────────────────

export async function updateProfile(userId: number, data: {
  forumUsername?: string;
  city?: string;
  signatureText?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  whatsappPhone?: string;
  websiteUrl?: string;
}) {
  const profile = await ensureForumProfile(userId);

  if (data.forumUsername && data.forumUsername !== profile.forumUsername) {
    const exists = await prisma.forumProfile.findUnique({
      where: { forumUsername: data.forumUsername },
    });
    if (exists) throw new ApiError(409, 'ALIAS_TAKEN', 'Ese alias ya está en uso.');
    return prisma.forumProfile.update({ where: { id: profile.id }, data });
  }

  return prisma.forumProfile.update({ where: { id: profile.id }, data });
}

export async function getPublicProfile(username: string) {
  return prisma.forumProfile.findUnique({
    where: { forumUsername: username },
    select: {
      id: true,
      forumUsername: true,
      avatarUrl: true,
      city: true,
      cityVerified: true,
      karma: true,
      karmaSpent: true,
      tag: true,
      reputationScore: true,
      streakDays: true,
      signatureText: true,
      signatureImage: true,
      twitterUrl: true,
      linkedinUrl: true,
      whatsappPhone: true,
      websiteUrl: true,
      createdAt: true,
      _count: { select: { posts: true, replies: true } },
    },
  });
}

export async function getProfilePosts(username: string, page: number, limit: number) {
  const author = await prisma.forumProfile.findUnique({
    where: { forumUsername: username },
    select: { id: true },
  });
  if (!author) throw ApiError.notFound('Perfil de foro no encontrado.');

  const where = { authorId: author.id, deletedAt: null, isHidden: false };
  const [posts, total] = await Promise.all([
    prisma.forumPost.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, slug: true, name: true, icon: true, color: true } },
        author: { select: { forumUsername: true, avatarUrl: true, tag: true, karma: true, city: true } },
      },
    }),
    prisma.forumPost.count({ where }),
  ]);
  return { posts, total };
}

export async function getKarmaHistory(userId: number) {
  const profile = await ensureForumProfile(userId);
  const transactions = await prisma.karmaTransaction.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const available = profile.karma - profile.karmaSpent;
  return { profile, available, transactions };
}

export async function addReputation(giverUserId: number, targetUsername: string, value: 1 | -1, comment?: string) {
  const giver = await ensureForumProfile(giverUserId);
  const target = await prisma.forumProfile.findUnique({ where: { forumUsername: targetUsername } });
  if (!target) throw ApiError.notFound('Perfil de foro no encontrado.');
  if (giver.id === target.id) throw new ApiError(403, 'SELF_RATE', 'No puedes darte reputación a ti mismo.');

  await checkAndIncrementDailyCounter(giverUserId, 'VOTE', 10);

  try {
    await prisma.$transaction([
      prisma.forumReputationComment.create({
        data: { fromId: giver.id, toId: target.id, value, comment },
      }),
      prisma.forumProfile.update({
        where: { id: target.id },
        data: { reputationScore: { increment: value } },
      }),
    ]);
  } catch (e) {
    // Unique constraint fromId_toId
    if ((e as { code?: string }).code === 'P2002') {
      throw new ApiError(409, 'ALREADY_RATED', 'Ya dejaste tu reputación para este perfil.');
    }
    throw e;
  }
  return { targetUsername: target.forumUsername, value };
}

// ─── Categorías ────────────────────────────────────────────────────

export async function listCategories() {
  return prisma.forumCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      icon: true,
      color: true,
      parentId: true,
      isActive: true,
      sortOrder: true,
      _count: { select: { posts: { where: { deletedAt: null, isHidden: false } } } },
    },
  });
}

export async function adminListCategories() {
  return prisma.forumCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      icon: true,
      color: true,
      parentId: true,
      isActive: true,
      sortOrder: true,
      _count: { select: { posts: { where: { deletedAt: null, isHidden: false } } } },
    },
  });
}

export async function getCategoryBySlug(slug: string, viewerProfileId?: number) {
  const category = await prisma.forumCategory.findFirst({
    where: { slug, isActive: true },
    include: {
      posts: { where: { deletedAt: null, isHidden: false }, orderBy: { createdAt: 'desc' }, take: 20 },
      parent: { select: { requiresFieldId: true, universityId: true } },
    },
  });
  if (!category) return null;

  const effectiveUniversityId = category.universityId ?? category.parent?.universityId ?? null;
  if (effectiveUniversityId) await assertCanAccessUniversity(viewerProfileId, effectiveUniversityId);

  return category;
}

export async function createCategory(data: {
  slug: string; name: string; description?: string; icon?: string; color?: string;
  parentId?: number; sortOrder?: number; requiresFieldId?: number; universityId?: number;
}) {
  return prisma.forumCategory.create({ data });
}

export async function updateCategory(id: number, data: Partial<{
  slug: string; name: string; description?: string; icon?: string; color?: string;
  parentId?: number; sortOrder?: number; isActive?: boolean; requiresFieldId?: number | null; universityId?: number | null;
}>) {
  return prisma.forumCategory.update({ where: { id }, data });
}

export async function deleteCategory(id: number) {
  // Soft-delete lógico: desactivar (las publicaciones referencian la categoría)
  return prisma.forumCategory.update({ where: { id }, data: { isActive: false } });
}

// ─── Posts ─────────────────────────────────────────────────────────

export interface ListPostsParams {
  page: number;
  limit: number;
  mode: string;
  city?: string;
  category?: string;
  q?: string;
  type?: string;
  viewerProfileId?: number;
}

export async function listPosts(params: ListPostsParams) {
  const { page, limit, mode, city, category, q, type, viewerProfileId } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { deletedAt: null, isHidden: false };
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (category) {
    where.category = { slug: category };
    // Si el subforo filtrado es de universidad, aplicar el gate de visibilidad geolocalizada
    // antes de devolver ningún post (evita listar actividad de otra ciudad vía el feed).
    const cat = await prisma.forumCategory.findFirst({
      where: { slug: category },
      select: { universityId: true, parent: { select: { universityId: true } } },
    });
    const effectiveUniversityId = cat?.universityId ?? cat?.parent?.universityId ?? null;
    if (effectiveUniversityId) await assertCanAccessUniversity(viewerProfileId, effectiveUniversityId);
  }
  if (type) where.type = type;
  if (q) where.OR = [
    { title: { contains: q, mode: 'insensitive' } },
    { tags: { has: q } },
  ];
  if (mode === 'SIN_RESPUESTA') where.replyCount = 0;

  // MI_CIUDAD: filtrar por la ciudad del viewer (si hay perfil)
  if (mode === 'MI_CIUDAD' && viewerProfileId) {
    const viewerProfile = await prisma.forumProfile.findUnique({
      where: { id: viewerProfileId },
      select: { city: true },
    });
    const cityFilter = viewerProfile?.city ?? city;
    if (cityFilter) where.city = { contains: cityFilter, mode: 'insensitive' };
  }

  const orderBy: unknown =
    mode === 'POPULAR'
      ? [{ score: 'desc' }, { createdAt: 'desc' }]
      : [{ createdAt: 'desc' }];

  const [data, total] = await Promise.all([
    prisma.forumPost.findMany({
      where,
      skip,
      take: limit,
      orderBy: orderBy as never,
      include: {
        category: { select: { id: true, slug: true, name: true, icon: true, color: true, isDebateZone: true } },
        author: {
          select: { forumUsername: true, avatarUrl: true, tag: true, karma: true, city: true, userId: true },
        },
        votes: viewerProfileId ? { where: { profileId: viewerProfileId } } : false,
      },
    }),
    prisma.forumPost.count({ where }),
  ]);

  // Zona de Debate: solo resolvemos/creamos alias para autores de posts DE ESA categoría — un
  // feed puede mezclar categorías (sin filtro), no hay que generar un alias para alguien que no
  // publicó ahí solo por compartir página con quien sí.
  const debateZoneAuthors = data.filter((p) => p.category.isDebateZone).map((p) => p.author);
  const aliasMap = await maskAuthorsForDebateZone(debateZoneAuthors, debateZoneAuthors.length > 0);

  const posts = data.map((p) => {
    const votes = (p as unknown as { votes: Array<{ value: number }> }).votes;
    const alias = p.author && p.category.isDebateZone ? aliasMap.get(p.author.userId) : undefined;
    return {
      id: p.id,
      title: p.title,
      body: p.body,
      images: p.images,
      tags: p.tags,
      city: p.city,
      type: p.type,
      status: p.status,
      score: p.score,
      upvotes: p.upvotes,
      downvotes: p.downvotes,
      replyCount: p.replyCount,
      viewCount: p.viewCount,
      createdAt: p.createdAt,
      category: p.category,
      author: p.author ? { ...p.author, userId: undefined, forumUsername: alias ?? p.author.forumUsername } : p.author,
      userVote: viewerProfileId && votes?.length ? votes[0].value : 0,
    };
  });

  return { posts, total };
}

export async function getPost(postId: number, viewerProfileId?: number) {
  const post = await prisma.forumPost.findFirst({
    where: { id: postId, deletedAt: null },
    include: {
      category: {
        select: {
          id: true, slug: true, name: true, icon: true, color: true,
          universityId: true, parent: { select: { universityId: true } }, isDebateZone: true,
        },
      },
      author: {
        select: { forumUsername: true, avatarUrl: true, tag: true, karma: true, city: true, userId: true },
      },
      replies: {
        where: { deletedAt: null },
        orderBy: [{ isAccepted: 'desc' }, { createdAt: 'asc' }],
        include: {
          author: {
            select: { forumUsername: true, avatarUrl: true, tag: true, karma: true, city: true, userId: true },
          },
          votes: viewerProfileId ? { where: { profileId: viewerProfileId } } : false,
        },
      },
    },
  });
  if (!post) throw ApiError.notFound('Pregunta no encontrada.');

  const effectiveUniversityId = post.category.universityId ?? post.category.parent?.universityId ?? null;
  if (effectiveUniversityId) await assertCanAccessUniversity(viewerProfileId, effectiveUniversityId);

  // Incrementar viewCount (no crítico)
  prisma.forumPost.update({
    where: { id: postId },
    data: { viewCount: { increment: 1 } },
  }).catch(() => undefined);

  // Zona de Debate: post y respuestas comparten la categoría del post (las respuestas no tienen
  // categoría propia), así que un solo lote de alias alcanza para todos los autores del hilo.
  const debateZoneAuthors = post.category.isDebateZone
    ? [post.author, ...post.replies.map((r) => r.author)]
    : [];
  const aliasMap = await maskAuthorsForDebateZone(debateZoneAuthors, debateZoneAuthors.length > 0);
  const maskAuthor = <A extends { forumUsername: string; userId: number } | null>(author: A) =>
    author && post.category.isDebateZone
      ? { ...author, userId: undefined, forumUsername: aliasMap.get(author.userId) ?? author.forumUsername }
      : author
        ? { ...author, userId: undefined }
        : author;

  const postVotes = (post as unknown as { votes?: Array<{ value: number }> }).votes;
  const data = {
    id: post.id,
    title: post.title,
    body: post.body,
    images: post.images,
    tags: post.tags,
    city: post.city,
    type: post.type,
    status: post.status,
    score: post.score,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    replyCount: post.replyCount,
    viewCount: post.viewCount,
    createdAt: post.createdAt,
    category: post.category,
    author: maskAuthor(post.author),
    userVote: viewerProfileId && postVotes?.length ? postVotes[0].value : 0,
    replies: post.replies.map((r) => {
      const rVotes = (r as unknown as { votes?: Array<{ value: number }> }).votes;
      return {
        id: r.id,
        body: r.body,
        images: r.images,
        isBotReply: r.isBotReply,
        isAccepted: r.isAccepted,
        isHidden: r.isHidden,
        upvotes: r.upvotes,
        downvotes: r.downvotes,
        score: r.score,
        createdAt: r.createdAt,
        author: maskAuthor(r.author),
        userVote: viewerProfileId && rVotes?.length ? rVotes[0].value : 0,
      };
    }),
  };

  return data;
}

export async function createPost(data: {
  authorId: number; // ForumProfile.id
  categoryId: number;
  city: string;
  title: string;
  body: string;
  tags: string[];
  type: string;
  images?: string[];
}) {
  const gates = await resolveCategoryGates(data.categoryId);
  if (gates.requiresFieldId) await assertProfessionalVerified(data.authorId, gates.requiresFieldId);
  if (gates.universityId) await assertCanAccessUniversity(data.authorId, gates.universityId);

  const post = await prisma.forumPost.create({
    data: {
      authorId: data.authorId,
      categoryId: data.categoryId,
      city: data.city.toLowerCase().trim(),
      title: data.title.trim(),
      body: data.body,
      tags: data.tags,
      type: data.type as never,
      images: data.images ?? [],
    },
  });

  // Bot asíncrono
  if (data.type === 'PRECIO' || data.type === 'EXISTENCIA') {
    setImmediate(() => {
      forumBotService.respond(post.id, data.title, data.type as 'PRECIO' | 'EXISTENCIA')
        .catch((e) => console.error('[ForumBot] Error:', (e as Error).message));
    });
  }

  // Karma: primer post del día (+1)
  setImmediate(() => {
    karmaService.earn(data.authorId, 1, 'EARN_FIRST_POST', 'POST', post.id)
      .catch((e) => console.error('[Karma] Error first post:', (e as Error).message));
  });

  // Detector de Zona de Debate — solo sugiere, nunca mueve el post (ver debate-zone.service.ts).
  setImmediate(() => {
    flagIfPolemic('post', post.id, `${data.title}\n${data.body}`)
      .catch((e) => console.error('[DebateZone] Error flagging post:', (e as Error).message));
  });

  return post;
}

export async function updatePost(userId: number, postId: number, data: {
  title?: string; body?: string; tags?: string[];
}) {
  const profile = await ensureForumProfile(userId);
  const post = await prisma.forumPost.findUniqueOrThrow({ where: { id: postId } });
  if (post.authorId !== profile.id) throw new ApiError(403, 'NOT_POST_AUTHOR', 'Solo el autor puede editar la pregunta.');

  if (post.status === 'RESOLVED') {
    // Solo tags permitido
    return prisma.forumPost.update({ where: { id: postId }, data: { tags: data.tags } });
  }
  return prisma.forumPost.update({ where: { id: postId }, data });
}

export async function deletePost(userId: number, postId: number) {
  const profile = await ensureForumProfile(userId);
  const post = await prisma.forumPost.findUniqueOrThrow({ where: { id: postId } });
  if (post.authorId !== profile.id) throw new ApiError(403, 'NOT_POST_AUTHOR', 'Solo el autor puede eliminar la pregunta.');
  return prisma.forumPost.update({ where: { id: postId }, data: { deletedAt: new Date() } });
}

export async function attachPostImages(userId: number, postId: number, urls: string[]) {
  const profile = await ensureForumProfile(userId);
  const post = await prisma.forumPost.findUniqueOrThrow({ where: { id: postId } });
  if (post.authorId !== profile.id) throw new ApiError(403, 'NOT_POST_AUTHOR', 'Solo el autor puede subir imágenes.');
  if (post.images.length + urls.length > 4) throw new ApiError(400, 'MAX_IMAGES_EXCEEDED', 'El post ya tiene 4 imágenes.');
  return prisma.forumPost.update({
    where: { id: postId },
    data: { images: [...post.images, ...urls] },
  });
}

// ─── Replies ───────────────────────────────────────────────────────

export async function createReply(userId: number, postId: number, body: string) {
  const profile = await ensureForumProfile(userId);
  const post = await prisma.forumPost.findUniqueOrThrow({ where: { id: postId } });
  if (post.deletedAt) throw ApiError.notFound('Pregunta no encontrada.');

  const gates = await resolveCategoryGates(post.categoryId);
  if (gates.requiresFieldId) await assertProfessionalVerified(profile.id, gates.requiresFieldId);
  if (gates.universityId) await assertCanAccessUniversity(profile.id, gates.universityId);

  await checkAndIncrementDailyCounter(userId, 'REPLY', 5);

  const reply = await prisma.$transaction([
    prisma.forumReply.create({
      data: { postId, authorId: profile.id, body },
    }),
    prisma.forumPost.update({ where: { id: postId }, data: { replyCount: { increment: 1 } } }),
  ]);

  // Notificar al autor del post
  if (post.authorId && post.authorId !== profile.id) {
    const postAuthor = await prisma.forumProfile.findUnique({ where: { id: post.authorId } });
    if (postAuthor) {
      setImmediate(() => {
        createNotification({
          userId: postAuthor.userId,
          type: 'FORUM_ANSWER' as never,
          title: 'Nueva respuesta en tu pregunta 💬',
          message: `${profile.forumUsername} respondió a "${post.title}"`,
          refType: 'FORUM_POST',
          refId: postId,
        }).catch((e) => console.error('[Forum] Notif error:', (e as Error).message));
      });
    }
  }

  // Socket en tiempo real
  try {
    const io = getIO();
    if (io) {
      io.to(`forum:${postId}`).emit('forum:reply:new', {
        reply: reply[0],
        postId,
        replyCount: post.replyCount + 1,
      });
    }
  } catch (e) {
    console.error('[Forum] Socket emit error:', (e as Error).message);
  }

  // Detector de Zona de Debate — corre sobre respuestas también, un hilo puede derivar
  // en pelea de política sin que el post original lo sea (ver debate-zone.service.ts).
  setImmediate(() => {
    flagIfPolemic('reply', reply[0].id, body)
      .catch((e) => console.error('[DebateZone] Error flagging reply:', (e as Error).message));
  });

  return reply[0];
}

export async function updateReply(userId: number, replyId: number, body: string) {
  const profile = await ensureForumProfile(userId);
  const reply = await prisma.forumReply.findUniqueOrThrow({ where: { id: replyId } });
  if (reply.authorId !== profile.id) throw new ApiError(403, 'NOT_REPLY_AUTHOR', 'Solo el autor puede editar la respuesta.');
  return prisma.forumReply.update({ where: { id: replyId }, data: { body } });
}

export async function deleteReply(userId: number, replyId: number) {
  const profile = await ensureForumProfile(userId);
  const reply = await prisma.forumReply.findUniqueOrThrow({ where: { id: replyId } });
  if (reply.authorId !== profile.id) throw new ApiError(403, 'NOT_REPLY_AUTHOR', 'Solo el autor puede eliminar la respuesta.');
  return prisma.forumReply.update({ where: { id: replyId }, data: { deletedAt: new Date() } });
}

export async function attachReplyImages(userId: number, replyId: number, urls: string[]) {
  const profile = await ensureForumProfile(userId);
  const reply = await prisma.forumReply.findUniqueOrThrow({ where: { id: replyId } });
  if (reply.authorId !== profile.id) throw new ApiError(403, 'NOT_REPLY_AUTHOR', 'Solo el autor puede subir imágenes.');
  if (reply.images.length + urls.length > 2) throw new ApiError(400, 'MAX_IMAGES_EXCEEDED', 'La respuesta ya tiene 2 imágenes.');
  return prisma.forumReply.update({
    where: { id: replyId },
    data: { images: [...reply.images, ...urls] },
  });
}

// ─── Votos ─────────────────────────────────────────────────────────

export async function voteTarget(params: {
  profileId: number;
  userId: number;
  targetType: 'post' | 'reply';
  targetId: number;
  value: 1 | -1;
}) {
  const { profileId, targetType, targetId, value } = params;

  // Verificar self-vote
  const target = targetType === 'post'
    ? await prisma.forumPost.findUniqueOrThrow({ where: { id: targetId } })
    : await prisma.forumReply.findUniqueOrThrow({ where: { id: targetId } });

  if ((target as unknown as { authorId: number | null }).authorId === profileId) {
    throw new ApiError(403, 'SELF_VOTE', 'No puedes votar tu propio contenido.');
  }

  // Anti-brigada: máx 3 votos al mismo autor en 24 h
  const authorId = (target as unknown as { authorId: number | null }).authorId;
  if (authorId) {
    const recentVotes = await prisma.forumVote.count({
      where: {
        profileId,
        createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
        ...(targetType === 'post'
          ? { post: { authorId } }
          : { reply: { authorId } }),
      },
    });
    if (recentVotes >= 3) {
      throw new ApiError(429, 'VOTE_BRIGADE_LIMIT',
        'Has votado demasiado al mismo usuario en las últimas 24 h.');
    }
  }

  // Upsert del voto. En Postgres, si el INSERT viola el constraint único DENTRO de una
  // transacción, TODA esa transacción queda abortada — cualquier consulta posterior en la
  // misma transacción (ej. un findFirst de recuperación) también falla. Por eso la
  // recuperación ante P2002 no puede vivir en la misma transacción que falló: hay que
  // dejarla abortar y reintentar UNA vez en una transacción nueva, donde el voto
  // concurrente ya está comiteado y visible.
  // El recuento de upvotes/downvotes se hace DENTRO de esta misma transacción (no en una
  // consulta separada después) — dos requests concurrentes que cada una recalculara y
  // escribiera el contador por su cuenta, fuera de la transacción, podían pisarse el
  // resultado entre sí según el orden real de ejecución de cada recuento independiente,
  // dejando upvotes/downvotes en un valor inconsistente con los votos reales en BD.
  const runVoteTx = () => prisma.$transaction(async (tx) => {
    const existingVote = await tx.forumVote.findFirst({
      where: {
        profileId,
        ...(targetType === 'post' ? { postId: targetId } : { replyId: targetId }),
      },
    });

    let netChange: number;
    if (existingVote) {
      if (existingVote.value === value) {
        // Toggle: cancelar voto
        await tx.forumVote.delete({ where: { id: existingVote.id } });
        netChange = -value;
      } else {
        // Cambiar de dirección
        await tx.forumVote.update({ where: { id: existingVote.id }, data: { value } });
        netChange = value * 2;
      }
    } else {
      // Nuevo voto
      await tx.forumVote.create({
        data: {
          profileId,
          targetType: (targetType.toUpperCase()) as never,
          value,
          ...(targetType === 'post' ? { postId: targetId } : { replyId: targetId }),
        },
      });
      netChange = value;
    }

    const [upCount, downCount] = await Promise.all([
      tx.forumVote.count({
        where: { ...(targetType === 'post' ? { postId: targetId } : { replyId: targetId }), value: 1 },
      }),
      tx.forumVote.count({
        where: { ...(targetType === 'post' ? { postId: targetId } : { replyId: targetId }), value: -1 },
      }),
    ]);
    const counters = { upvotes: upCount, downvotes: downCount };
    if (targetType === 'post') {
      await tx.forumPost.update({ where: { id: targetId }, data: counters });
    } else {
      await tx.forumReply.update({ where: { id: targetId }, data: counters });
    }

    return { netChange, ...counters };
  });

  let netChange: number;
  try {
    ({ netChange } = await runVoteTx());
  } catch (e) {
    if ((e as { code?: string }).code !== 'P2002') throw e;
    // Carrera: otra request del mismo usuario creó el voto entre el findFirst y el create
    // de la transacción anterior (que se abortó completa). Reintentar en una transacción
    // nueva — ahora el findFirst sí va a encontrar el voto concurrente ya comiteado, y el
    // recuento de arriba corre otra vez sobre el estado real post-conflicto.
    ({ netChange } = await runVoteTx());
  }

  const newScore = await recalculateScore(targetType, targetId);

  // Karma al autor
  if (authorId && netChange !== 0) {
    setImmediate(() => {
      const type = netChange > 0 ? 'EARN_UPVOTE' : 'DEDUCT_DOWNVOTE';
      karmaService.earn(authorId, netChange > 0 ? 1 : -1, type, targetType.toUpperCase(), targetId)
        .catch((e) => console.error('[Karma] Vote karma error:', (e as Error).message));
    });
  }

  const finalTarget = targetType === 'post'
    ? await prisma.forumPost.findUniqueOrThrow({ where: { id: targetId } })
    : await prisma.forumReply.findUniqueOrThrow({ where: { id: targetId } });

  // Emitir por Socket.IO — mismo payload que la respuesta REST (antes solo mandaba
  // newScore y el cliente conectado por socket quedaba con upvotes/downvotes desactualizados
  // frente a quien recibía la respuesta REST directa).
  try {
    const io = getIO();
    if (io) {
      const postId = targetType === 'post' ? targetId : (target as unknown as { postId: number }).postId;
      io.to(`forum:${postId}`).emit('forum:vote', {
        targetType: targetType.toUpperCase(),
        targetId,
        newScore,
        upvotes: finalTarget.upvotes,
        downvotes: finalTarget.downvotes,
      });
    }
  } catch (e) {
    console.error('[Forum] Socket emit error:', (e as Error).message);
  }

  return {
    newScore,
    upvotes: finalTarget.upvotes,
    downvotes: finalTarget.downvotes,
    userVote: value,
  };
}

// ─── Accept reply ──────────────────────────────────────────────────

export async function acceptReply(params: {
  replyId: number;
  requesterId: number; // ForumProfile.id del requester
}) {
  const { replyId, requesterId } = params;

  const reply = await prisma.forumReply.findUniqueOrThrow({
    where: { id: replyId },
    include: { post: true },
  });

  if (reply.post.authorId !== requesterId) {
    throw new ApiError(403, 'NOT_POST_AUTHOR', 'Solo el autor de la pregunta puede marcar la respuesta.');
  }
  if (reply.authorId === requesterId) {
    throw new ApiError(403, 'SELF_ACCEPT', 'No puedes marcar tu propia respuesta.');
  }
  if (reply.post.status === 'RESOLVED') {
    // Chequeo rápido no-atómico: evita una transacción innecesaria en el caso común.
    // La protección real contra la carrera (dos replies aceptadas a la vez) es el
    // updateMany condicional de abajo, dentro de la transacción.
    throw new ApiError(409, 'ALREADY_RESOLVED', 'Esta pregunta ya tiene una respuesta aceptada.');
  }

  await prisma.$transaction(async (tx) => {
    // Update condicional atómico: si otra respuesta ya resolvió el post entre el chequeo
    // de arriba y acá, count === 0 y abortamos — evita que dos replies queden "aceptadas"
    // a la vez con su karma/coins duplicados.
    const updated = await tx.forumPost.updateMany({
      where: { id: reply.postId, status: { not: 'RESOLVED' } },
      data: { status: 'RESOLVED' },
    });
    if (updated.count === 0) {
      throw new ApiError(409, 'ALREADY_RESOLVED', 'Esta pregunta ya tiene una respuesta aceptada.');
    }
    await tx.forumReply.update({ where: { id: replyId }, data: { isAccepted: true } });
  });

  // Karma + coins al autor de la respuesta
  if (reply.authorId) {
    setImmediate(async () => {
      try {
        await karmaService.earn(reply.authorId!, 10, 'EARN_BEST_ANSWER', 'REPLY', replyId);
        await creditForumCoins(reply.authorId!, reply.postId, 'FORUM_ANSWER', replyId, 3);
      } catch (e) {
        console.error('[Forum] Accept reward error:', (e as Error).message);
      }
    });

    // Notificar al autor de la respuesta
    setImmediate(() => {
      const replyAuthor = prisma.forumProfile.findUnique({ where: { id: reply.authorId! } });
      replyAuthor.then((authorProfile) => {
        if (!authorProfile) return;
        createNotification({
          userId: authorProfile.userId,
          type: 'FORUM_BEST' as never,
          title: '¡Tu respuesta fue aceptada! 🏆',
          message: `Tu respuesta a "${reply.post.title}" fue marcada como la mejor.`,
          refType: 'FORUM_ANSWER',
          refId: replyId,
        }).catch((e) => console.error('[Forum] Notif error:', (e as Error).message));
      });
    });
  }

  // Socket
  try {
    const io = getIO();
    if (io) {
      io.to(`forum:${reply.postId}`).emit('forum:post:resolved', {
        postId: reply.postId,
        acceptedReplyId: replyId,
      });
    }
  } catch (e) {
    console.error('[Forum] Socket emit error:', (e as Error).message);
  }

  return { replyId, postId: reply.postId, postStatus: 'RESOLVED', karmaAwarded: 10, coinsAwarded: 3 };
}

// ─── Coins from forum ──────────────────────────────────────────────

/**
 * Acredita monedas desde el foro. Idempotente: revisa si ya existe la transacción.
 * Nunca rompe el flujo principal (usar en setImmediate + try/catch).
 */
export async function creditForumCoins(
  forumProfileId: number,
  refId: number,
  refType: 'FORUM_QUESTION' | 'FORUM_ANSWER',
  targetId: number,
  coins: number,
): Promise<void> {
  // Obtener User.id desde ForumProfile
  const profile = await prisma.forumProfile.findUniqueOrThrow({
    where: { id: forumProfileId },
    select: { userId: true },
  });

  // Idempotencia: buscar tx previa
  const existing = await prisma.coinTransaction.findFirst({
    where: { userId: profile.userId, type: 'EARN_FORUM', refType, refId },
  });
  if (existing) return; // ya acreditado

  await prisma.$transaction([
    prisma.user.update({
      where: { id: profile.userId },
      data: { gamerCoins: { increment: coins } },
    }),
    prisma.coinTransaction.create({
      data: {
        userId: profile.userId,
        amount: coins,
        type: 'EARN_FORUM' as never,
        refType,
        refId,
        note: `Foro: ganaste ${coins} moneda(s)`,
      },
    }),
  ]);
}

// ─── Reportes ──────────────────────────────────────────────────────

export async function reportTarget(params: {
  reporterUserId: number;
  targetType: 'POST' | 'REPLY' | 'PROFILE';
  postId?: number;
  replyId?: number;
  profileId?: number;
  reason: string;
  detail?: string;
}) {
  const reporter = await ensureForumProfile(params.reporterUserId);

  // Self-report no permitido
  if (params.targetType === 'POST' && params.postId) {
    const post = await prisma.forumPost.findUnique({ where: { id: params.postId } });
    if (post?.authorId === reporter.id) throw new ApiError(403, 'SELF_REPORT', 'No puedes reportar tu propio contenido.');
  }
  if (params.targetType === 'REPLY' && params.replyId) {
    const reply = await prisma.forumReply.findUnique({ where: { id: params.replyId } });
    if (reply?.authorId === reporter.id) throw new ApiError(403, 'SELF_REPORT', 'No puedes reportar tu propio contenido.');
  }

  const report = await prisma.forumReport.create({
    data: {
      reporterId: reporter.id,
      targetType: params.targetType as never,
      reason: params.reason as never,
      detail: params.detail,
      postId: params.postId,
      replyId: params.replyId,
      profileId: params.profileId,
    },
  });

  // Auto-ocultar según acumulación de reportes de PERSONAS DISTINTAS.
  // Motivos de confiabilidad (falso/IA/estafa/datos personales) tienen umbral
  // más sensible: 3 reportes distintos bastan; el resto usa 5.
  const TRUST_REASONS = ['CONTENIDO_FALSO', 'CONTENIDO_IA', 'ESTAFA', 'DATOS_PERSONALES'] as const;
  const isTrustReason = TRUST_REASONS.includes(params.reason as (typeof TRUST_REASONS)[number]);
  const hideThreshold = isTrustReason ? 3 : 5;

  const distinctReporters = await prisma.forumReport.groupBy({
    by: ['reporterId'],
    where: {
      targetType: params.targetType,
      ...(params.postId ? { postId: params.postId } : {}),
      ...(params.replyId ? { replyId: params.replyId } : {}),
      ...(params.profileId ? { profileId: params.profileId } : {}),
    },
  });
  const count = distinctReporters.length;

  if (count >= hideThreshold) {
    if (params.targetType === 'POST' && params.postId) {
      await prisma.forumPost.update({ where: { id: params.postId }, data: { isHidden: true } });
    } else if (params.targetType === 'REPLY' && params.replyId) {
      await prisma.forumReply.update({ where: { id: params.replyId }, data: { isHidden: true } });
    }
    // Notificar a moderadores/admins: ADMIN por rol primario, moderadores por asignación RBAC
    const mods = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: 'ADMIN' as never },
          { userRoles: { some: { role: { code: 'MODERADOR_FORO', isActive: true } } } },
        ],
      },
      select: { id: true },
    });
    for (const mod of mods) {
      createNotification({
        userId: mod.id,
        type: 'FORUM_REPORT' as never,
        title: 'Contenido auto-ocultado 🚩',
        message: `Un contenido acumuló ${count} reportes${isTrustReason ? ' de confiabilidad' : ''} y fue ocultado.`,
        refType: 'FORUM_REPORT',
        refId: report.id,
      }).catch(() => undefined);
    }
  }

  return {
    reportId: report.id,
    autoHidden: count >= hideThreshold,
    distinctReporters: count,
    hideThreshold,
    trustReason: isTrustReason,
  };
}

// ─── Moderación ────────────────────────────────────────────────────

type ReportTargetRef = {
  targetType: string;
  postId: number | null;
  replyId: number | null;
  profileId: number | null;
};

/**
 * Resuelve el departamento del CONTENIDO reportado (no el del reportero):
 * para POST/REPLY, el departamento de la ciudad donde se publicó; para PROFILE,
 * el departamento del perfil denunciado. Devuelve null si no se puede determinar
 * (ej. ciudad no catalogada) — en ese caso el llamador debe denegar por defecto.
 */
async function resolveReportDepartment(report: ReportTargetRef): Promise<string | null> {
  let city: string | null = null;
  let profileId: number | null = null;

  if (report.targetType === 'POST' && report.postId) {
    const post = await prisma.forumPost.findUnique({ where: { id: report.postId }, select: { city: true, authorId: true } });
    city = post?.city ?? null;
    profileId = post?.authorId ?? null;
  } else if (report.targetType === 'REPLY' && report.replyId) {
    const reply = await prisma.forumReply.findUnique({
      where: { id: report.replyId },
      select: { authorId: true, post: { select: { city: true } } },
    });
    city = reply?.post.city ?? null;
    profileId = reply?.authorId ?? null;
  } else if (report.targetType === 'PROFILE' && report.profileId) {
    profileId = report.profileId;
  }

  if (city) {
    // ForumPost.city se guarda en minúsculas (ver createPost); comparar sin distinguir mayúsculas.
    const cityRow = await prisma.forumCity.findFirst({
      where: { name: { equals: city, mode: 'insensitive' } },
      select: { department: true },
    });
    if (cityRow?.department) return cityRow.department;
  }
  if (profileId) {
    const profile = await prisma.forumProfile.findUnique({ where: { id: profileId }, select: { department: true } });
    if (profile?.department) return profile.department;
  }
  return null;
}

/**
 * Un moderador solo puede actuar sobre reportes de contenido de SU PROPIO departamento
 * (`ForumProfile.department`); ADMIN no tiene restricción. Fail-closed: si el departamento
 * del moderador o del contenido no se puede determinar, se deniega.
 */
async function assertCanModerateReport(actingUserId: number, isAdmin: boolean, report: ReportTargetRef) {
  if (isAdmin) return;

  const [modProfile, targetDepartment] = await Promise.all([
    prisma.forumProfile.findUnique({ where: { userId: actingUserId }, select: { department: true } }),
    resolveReportDepartment(report),
  ]);

  if (!modProfile?.department || !targetDepartment || modProfile.department !== targetDepartment) {
    throw new ApiError(403, 'DEPARTMENT_MISMATCH', 'Solo podés moderar reportes de tu propio departamento.');
  }
}

export async function listReports(params: {
  page: number;
  limit: number;
  status?: string;
  targetType?: string;
  reason?: string;
  /** Si se pasa (moderador no-ADMIN), restringe el listado al departamento del moderador. */
  department?: string | null;
}) {
  const { page, limit, status, targetType, reason, department } = params;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (targetType) where.targetType = targetType;
  if (reason) where.reason = reason;

  // department === undefined → sin restricción (llamado por ADMIN).
  // department === null → moderador sin departamento asignado: no ve nada (fail-closed).
  if (department === null) {
    return { reports: [], total: 0 };
  }
  if (department) {
    const [cities, profiles] = await Promise.all([
      prisma.forumCity.findMany({ where: { department }, select: { name: true } }),
      prisma.forumProfile.findMany({ where: { department }, select: { id: true } }),
    ]);
    // ForumPost.city se guarda en minúsculas (ver createPost); el catálogo ForumCity.name no.
    // Prisma no soporta `mode: 'insensitive'` dentro de `in`, así que comparamos ya en minúsculas.
    const cityNamesLower = cities.map((c) => c.name.toLowerCase());
    where.OR = [
      { post: { city: { in: cityNamesLower } } },
      { reply: { post: { city: { in: cityNamesLower } } } },
      { targetType: 'PROFILE', profileId: { in: profiles.map((p) => p.id) } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.forumReport.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, forumUsername: true, tag: true } },
        post: { select: { id: true, title: true, authorId: true } },
        reply: { select: { id: true, body: true, authorId: true, postId: true } },
      },
    }),
    prisma.forumReport.count({ where }),
  ]);
  return { reports: data, total };
}

export async function resolveReport(reportId: number, resolvedByUserId: number, isAdmin: boolean, resolution?: string) {
  const report = await prisma.forumReport.findUniqueOrThrow({ where: { id: reportId } });
  if (report.status !== 'PENDING') throw new ApiError(409, 'ALREADY_PROCESSED', 'Este reporte ya fue procesado.');
  await assertCanModerateReport(resolvedByUserId, isAdmin, report);

  // Soft-delete del contenido denunciado
  if (report.targetType === 'POST' && report.postId) {
    await prisma.forumPost.update({ where: { id: report.postId }, data: { deletedAt: new Date(), isHidden: false } });
    // Karma penalty al infractor
    const post = await prisma.forumPost.findUnique({ where: { id: report.postId } });
    if (post?.authorId) {
      await karmaService.earn(post.authorId, -5, 'DEDUCT_REPORT', 'POST', report.postId, 'Contenido penalizado por moderación');
    }
  } else if (report.targetType === 'REPLY' && report.replyId) {
    await prisma.forumReply.update({ where: { id: report.replyId }, data: { deletedAt: new Date(), isHidden: false } });
    const reply = await prisma.forumReply.findUnique({ where: { id: report.replyId } });
    if (reply?.authorId) {
      await karmaService.earn(reply.authorId, -5, 'DEDUCT_REPORT', 'REPLY', report.replyId, 'Contenido penalizado por moderación');
    }
  }

  // Marcar TODOS los reportes pendientes del mismo target como resueltos
  const sameTargetWhere: Record<string, unknown> = { status: 'PENDING', targetType: report.targetType };
  if (report.postId) sameTargetWhere.postId = report.postId;
  if (report.replyId) sameTargetWhere.replyId = report.replyId;
  if (report.profileId) sameTargetWhere.profileId = report.profileId;

  await prisma.forumReport.updateMany({
    where: sameTargetWhere,
    data: { status: 'RESOLVED', resolvedBy: resolvedByUserId, resolvedAt: new Date(), resolution },
  });

  return { reportId, status: 'RESOLVED' };
}

export async function rejectReport(reportId: number, resolvedByUserId: number, isAdmin: boolean, resolution?: string) {
  const report = await prisma.forumReport.findUniqueOrThrow({ where: { id: reportId } });
  if (report.status !== 'PENDING') throw new ApiError(409, 'ALREADY_PROCESSED', 'Este reporte ya fue procesado.');
  await assertCanModerateReport(resolvedByUserId, isAdmin, report);

  // Restaurar isHidden si fue auto-ocultado
  if (report.targetType === 'POST' && report.postId) {
    await prisma.forumPost.updateMany({
      where: { id: report.postId, deletedAt: null },
      data: { isHidden: false },
    });
  } else if (report.targetType === 'REPLY' && report.replyId) {
    await prisma.forumReply.updateMany({
      where: { id: report.replyId, deletedAt: null },
      data: { isHidden: false },
    });
  }

  await prisma.forumReport.update({
    where: { id: reportId },
    data: { status: 'REJECTED', resolvedBy: resolvedByUserId, resolvedAt: new Date(), resolution },
  });

  return { reportId, status: 'REJECTED' };
}

export async function banProfile(profileId: number, reason?: string) {
  return prisma.forumProfile.update({
    where: { id: profileId },
    data: { isBanned: true, bannedReason: reason ?? 'Baneado por el administrador', bannedUntil: null },
  });
}

export async function adjustKarma(profileId: number, amount: number, note: string) {
  return karmaService.earn(profileId, amount, 'EARN_ADMIN', undefined, undefined, note || 'Ajuste manual del admin');
}

// ─── Discovery ─────────────────────────────────────────────────────

export async function getTrending() {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const posts = await prisma.forumPost.findMany({
    where: { createdAt: { gte: since }, deletedAt: null, isHidden: false },
    select: { tags: true },
  });
  const counts: Record<string, number> = {};
  posts.forEach((p) => p.tags.forEach((t) => { counts[t] = (counts[t] ?? 0) + 1; }));
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return sorted.map(([tag, count]) => ({ tag, count }));
}

export async function getCitiesStats() {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const grouped = await prisma.forumPost.groupBy({
    by: ['city'],
    where: { createdAt: { gte: since }, deletedAt: null, isHidden: false },
    _count: { _all: true },
    orderBy: { _count: { city: 'desc' } },
    take: 20,
  });
  return grouped.map((g) => ({ city: g.city, count: g._count._all }));
}

export async function getTopUsers() {
  const since = new Date();
  since.setDate(1); // inicio de mes
  const topByKarma = await prisma.forumProfile.findMany({
    orderBy: { karma: 'desc' },
    take: 5,
    select: {
      id: true,
      forumUsername: true,
      karma: true,
      tag: true,
      avatarUrl: true,
      city: true,
      _count: { select: { posts: true, replies: true } },
    },
  });
  // Karma del mes: sumar transacciones del mes
  const monthly = await prisma.karmaTransaction.groupBy({
    by: ['profileId'],
    where: { createdAt: { gte: since }, amount: { gt: 0 } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 5,
  });
  const monthlyProfiles = monthly.length
    ? await prisma.forumProfile.findMany({
        where: { id: { in: monthly.map((m) => m.profileId) } },
        select: { id: true, forumUsername: true, karma: true, tag: true, city: true },
      })
    : [];
  const monthlyMap = new Map(monthlyProfiles.map((p) => [p.id, p]));
  const topMonthly = monthly
    .map((m) => ({ profile: monthlyMap.get(m.profileId) ?? null, karmaMonth: m._sum.amount ?? 0 }))
    .filter((m) => m.profile)
    .map((m) => ({ ...m.profile!, karmaMonth: m.karmaMonth }));

  return { topByKarma, topMonthly };
}

// ─── Admin stats ───────────────────────────────────────────────────

export async function getAdminStats() {
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [totalPosts, totalReplies, totalUsers, activeUsers7d, pendingReports, postsWithNoReply] =
    await Promise.all([
      prisma.forumPost.count({ where: { deletedAt: null } }),
      prisma.forumReply.count({ where: { deletedAt: null } }),
      prisma.forumProfile.count(),
      prisma.forumProfile.count({ where: { lastActiveDate: { gte: since7d } } }),
      prisma.forumReport.count({ where: { status: 'PENDING' } }),
      prisma.forumPost.count({ where: { deletedAt: null, replyCount: 0 } }),
    ]);

  const postsByCategory = await prisma.forumPost.groupBy({
    by: ['categoryId'],
    where: { deletedAt: null },
    _count: { _all: true },
    orderBy: { _count: { categoryId: 'desc' } },
  });
  const categories = await prisma.forumCategory.findMany({
    where: { id: { in: postsByCategory.map((p) => p.categoryId) } },
    select: { id: true, slug: true, name: true },
  });
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const postsByCity = await prisma.forumPost.groupBy({
    by: ['city'],
    where: { deletedAt: null },
    _count: { _all: true },
    orderBy: { _count: { city: 'desc' } },
    take: 10,
  });

  const topUsers = await prisma.forumProfile.findMany({
    orderBy: { karma: 'desc' },
    take: 10,
    select: { forumUsername: true, karma: true, tag: true },
  });

  return {
    totalPosts,
    totalReplies,
    totalUsers,
    activeUsers7d,
    postsByCategory: postsByCategory.map((p) => ({
      slug: catMap.get(p.categoryId)?.slug ?? String(p.categoryId),
      name: catMap.get(p.categoryId)?.name ?? 'Desconocida',
      count: p._count._all,
    })),
    postsByCity: postsByCity.map((c) => ({ city: c.city, count: c._count._all })),
    topUsers,
    pendingReports,
    postsWithNoReply,
  };
}
