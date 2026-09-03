import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { isForumModerator } from '../middlewares/roles';
import { ApiError } from '../utils/errors';
import { ok, created, paginated } from '../utils/response';
import * as FS from '../services/forum.service';
import { karmaService } from '../services/karma.service';
import * as giphyService from '../services/giphy.service';

// ─── Perfil ───────────────────────────────────────────────────────

export async function getMyProfile(req: AuthRequest, res: Response) {
  const profile = await FS.ensureForumProfile(req.user!.id);
  return ok(res, profile);
}

export async function updateMyProfile(req: AuthRequest, res: Response) {
  const profile = await FS.updateProfile(req.user!.id, req.body);
  return ok(res, profile);
}

export async function getPublicProfile(req: AuthRequest, res: Response) {
  const profile = await FS.getPublicProfile(String(req.params.username));
  if (!profile) throw ApiError.notFound('Perfil de foro no encontrado.');
  return ok(res, profile);
}

export async function getProfilePosts(req: AuthRequest, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const { posts, total } = await FS.getProfilePosts(String(req.params.username), page, limit);
  return paginated(res, posts, total, page, limit);
}

export async function getKarmaHistory(req: AuthRequest, res: Response) {
  const data = await FS.getKarmaHistory(req.user!.id);
  return ok(res, data);
}

export async function addReputation(req: AuthRequest, res: Response) {
  const result = await FS.addReputation(req.user!.id, String(req.params.username), req.body.value, req.body.comment);
  return ok(res, result);
}

// ─── Categorías ───────────────────────────────────────────────────

export async function listCategories(_req: Request, res: Response) {
  const categories = await FS.listCategories();
  return ok(res, categories);
}

export async function adminListCategories(_req: Request, res: Response) {
  const categories = await FS.adminListCategories();
  return ok(res, categories);
}

export async function getCategoryBySlug(req: Request, res: Response) {
  const category = await FS.getCategoryBySlug(String(req.params.slug));
  if (!category) throw ApiError.notFound('Categoría no encontrada.');
  return ok(res, category);
}

export async function createCategory(req: AuthRequest, res: Response) {
  const category = await FS.createCategory(req.body);
  return created(res, category);
}

export async function updateCategory(req: AuthRequest, res: Response) {
  const category = await FS.updateCategory(Number(req.params.id), req.body);
  return ok(res, category);
}

export async function deleteCategory(req: AuthRequest, res: Response) {
  const category = await FS.deleteCategory(Number(req.params.id));
  return ok(res, category);
}

// ─── Posts ────────────────────────────────────────────────────────

export async function listPosts(req: AuthRequest, res: Response) {
  const { page, limit, mode, city, category, q, type, cityId } = req.query as Record<string, string | undefined>;
  const viewerProfile = req.user ? await FS.ensureForumProfile(req.user.id).catch(() => null) : null;

  let cityFilter = city;
  if (cityId) {
    const fc = await prisma.forumCity.findUnique({ where: { id: Number(cityId) } });
    if (fc) cityFilter = fc.name;
  }

  const { posts, total } = await FS.listPosts({
    page: Math.max(1, Number(page) || 1),
    limit: Math.min(50, Math.max(1, Number(limit) || 20)),
    mode: mode || 'RECIENTE',
    city: cityFilter,
    category,
    q,
    type,
    viewerProfileId: viewerProfile?.id,
  });

  return paginated(res, posts, total, Number(page) || 1, Number(limit) || 20);
}

export async function getPost(req: AuthRequest, res: Response) {
  const viewerProfile = req.user ? await FS.ensureForumProfile(req.user.id).catch(() => null) : null;
  const post = await FS.getPost(Number(req.params.id), viewerProfile?.id);
  return ok(res, post);
}

export async function createPost(req: AuthRequest, res: Response) {
  await FS.assertAccountAge(req.user!.id);
  const profile = await FS.ensureForumProfile(req.user!.id);

  if (profile.isBanned) {
    throw new ApiError(403, 'FORUM_BANNED', 'Estás baneado del foro.');
  }

  // Validar que la categoría exista ANTES de consumir el post diario (BUG fix)
  const category = await prisma.forumCategory.findUnique({
    where: { id: Number(req.body.categoryId) },
    select: { id: true },
  });
  if (!category) {
    throw new ApiError(400, 'INVALID_CATEGORY', 'La categoría seleccionada no existe.');
  }

  await FS.checkAndIncrementDailyCounter(req.user!.id, 'POST', 1);

  const post = await FS.createPost({ ...req.body, authorId: profile.id });
  return created(res, {
    ...post,
    botReplyPending: post.type === 'PRECIO' || post.type === 'EXISTENCIA',
  });
}

export async function updatePost(req: AuthRequest, res: Response) {
  const post = await FS.updatePost(req.user!.id, Number(req.params.id), req.body);
  return ok(res, post);
}

export async function deletePost(req: AuthRequest, res: Response) {
  const post = await FS.deletePost(req.user!.id, Number(req.params.id));
  return ok(res, { ...post, softDeleted: true });
}

export async function uploadPostImages(req: AuthRequest, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const urls = files.map((f) => `/uploads/forum/posts/${req.params.id}/${f.filename}`);
  const post = await FS.attachPostImages(req.user!.id, Number(req.params.id), urls);
  return ok(res, { post, urls });
}

export async function votePost(req: AuthRequest, res: Response) {
  await FS.assertAccountAge(req.user!.id);
  const profile = await FS.ensureForumProfile(req.user!.id);
  await FS.checkAndIncrementDailyCounter(req.user!.id, 'VOTE', 10);

  const result = await FS.voteTarget({
    profileId: profile.id,
    userId: req.user!.id,
    targetType: 'post',
    targetId: Number(req.params.id),
    value: req.body.value,
  });
  return ok(res, result);
}

export async function reportPost(req: AuthRequest, res: Response) {
  const report = await FS.reportTarget({
    reporterUserId: req.user!.id,
    targetType: 'POST',
    postId: Number(req.params.id),
    reason: req.body.reason,
    detail: req.body.detail,
  });
  return created(res, report);
}

// ─── Replies ──────────────────────────────────────────────────────

export async function createReply(req: AuthRequest, res: Response) {
  await FS.assertAccountAge(req.user!.id);
  const profile = await FS.ensureForumProfile(req.user!.id);
  if (profile.isBanned) throw new ApiError(403, 'FORUM_BANNED', 'Estás baneado del foro.');

  const reply = await FS.createReply(req.user!.id, Number(req.params.id), req.body.body);
  return created(res, reply);
}

export async function updateReply(req: AuthRequest, res: Response) {
  const reply = await FS.updateReply(req.user!.id, Number(req.params.id), req.body.body);
  return ok(res, reply);
}

export async function deleteReply(req: AuthRequest, res: Response) {
  const reply = await FS.deleteReply(req.user!.id, Number(req.params.id));
  return ok(res, { ...reply, softDeleted: true });
}

export async function uploadReplyImages(req: AuthRequest, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const urls = files.map((f) => `/uploads/forum/replies/${req.params.id}/${f.filename}`);
  const reply = await FS.attachReplyImages(req.user!.id, Number(req.params.id), urls);
  return ok(res, { reply, urls });
}

export async function voteReply(req: AuthRequest, res: Response) {
  await FS.assertAccountAge(req.user!.id);
  const profile = await FS.ensureForumProfile(req.user!.id);
  await FS.checkAndIncrementDailyCounter(req.user!.id, 'VOTE', 10);

  const result = await FS.voteTarget({
    profileId: profile.id,
    userId: req.user!.id,
    targetType: 'reply',
    targetId: Number(req.params.id),
    value: req.body.value,
  });
  return ok(res, result);
}

export async function acceptReply(req: AuthRequest, res: Response) {
  const profile = await FS.ensureForumProfile(req.user!.id);
  const result = await FS.acceptReply({ replyId: Number(req.params.id), requesterId: profile.id });
  return ok(res, result);
}

export async function reportReply(req: AuthRequest, res: Response) {
  const report = await FS.reportTarget({
    reporterUserId: req.user!.id,
    targetType: 'REPLY',
    replyId: Number(req.params.id),
    reason: req.body.reason,
    detail: req.body.detail,
  });
  return created(res, report);
}

// ─── Karma ────────────────────────────────────────────────────────

export async function getKarma(req: AuthRequest, res: Response) {
  const data = await FS.getKarmaHistory(req.user!.id);
  return ok(res, data);
}

export async function redeemKarma(req: AuthRequest, res: Response) {
  const profile = await FS.ensureForumProfile(req.user!.id);
  const { karmaAmount } = req.body;
  const { coinsEarned } = await karmaService.redeem(profile.id, karmaAmount);
  const updated = await prisma.forumProfile.findUnique({ where: { id: profile.id } });
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { gamerCoins: true } });

  return ok(res, {
    karmaRedeemed: karmaAmount,
    coinsEarned,
    newGamerCoins: user?.gamerCoins ?? 0,
    karmaBalance: updated?.karma,
    karmaSpent: updated?.karmaSpent,
  });
}

// ─── Discovery ────────────────────────────────────────────────────

export async function getTrending(_req: Request, res: Response) {
  const tags = await FS.getTrending();
  return ok(res, tags);
}

export async function getCitiesStats(_req: Request, res: Response) {
  const stats = await FS.getCitiesStats();
  return ok(res, stats);
}

export async function getTopUsers(_req: Request, res: Response) {
  const users = await FS.getTopUsers();
  return ok(res, users);
}

// ─── Moderación ───────────────────────────────────────────────────

export async function listReports(req: AuthRequest, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const { reports, total } = await FS.listReports({
    page,
    limit,
    status: req.query.status as string | undefined,
    targetType: req.query.targetType as string | undefined,
    reason: req.query.reason as string | undefined,
  });
  return paginated(res, reports, total, page, limit);
}

export async function resolveReport(req: AuthRequest, res: Response) {
  const report = await FS.resolveReport(Number(req.params.id), req.user!.id, req.body.resolution);
  return ok(res, report);
}

export async function rejectReport(req: AuthRequest, res: Response) {
  const report = await FS.rejectReport(Number(req.params.id), req.user!.id, req.body.resolution);
  return ok(res, report);
}

export async function banProfile(req: AuthRequest, res: Response) {
  const profile = await FS.banProfile(Number(req.params.id), req.body.reason);
  return ok(res, profile);
}

export async function adjustKarma(req: AuthRequest, res: Response) {
  if (!req.body.amount || typeof req.body.amount !== 'number') {
    throw ApiError.badRequest('El ajuste de karma requiere un amount numérico.');
  }
  if (!req.body.note || !String(req.body.note).trim()) {
    throw ApiError.badRequest('El ajuste de karma requiere una nota (note) obligatoria.');
  }
  const profile = await FS.adjustKarma(Number(req.params.id), req.body.amount, String(req.body.note).trim());
  return ok(res, profile);
}

// ─── Admin stats ──────────────────────────────────────────────────

export async function getAdminStats(_req: Request, res: Response) {
  const stats = await FS.getAdminStats();
  return ok(res, stats);
}

// ─── Geolocalización del foro (09-spec G2) ────────────────────────

/** Distancia haversine en km entre dos coordenadas. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Ciudad más cercana a las coords dadas (dentro de su radio, o la más cercana). */
async function nearestCity(lat: number, lng: number) {
  const cities = await prisma.forumCity.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  let best: { city: (typeof cities)[number]; dist: number } | null = null;
  for (const c of cities) {
    const dist = haversineKm(lat, lng, c.latitude, c.longitude);
    if (!best || dist < best.dist) best = { city: c, dist };
  }
  if (!best) return null;
  const within = best.dist <= best.city.radiusKm;
  return { city: best.city, distanceKm: Math.round(best.dist * 100) / 100, within };
}

/** GET /forum/geo/session — carga única por sesión del cliente. */
export async function getGeoSession(req: AuthRequest, res: Response) {
  if (!req.user) return ok(res, { city: null });
  const profile = await prisma.forumProfile.findUnique({ where: { userId: req.user.id } });
  if (!profile || !profile.cityId) return ok(res, { city: null });
  const city = await prisma.forumCity.findUnique({ where: { id: profile.cityId } });
  return ok(res, {
    cityId: profile.cityId,
    city: city?.name ?? profile.city,
    department: profile.department ?? city?.department ?? null,
    latitude: profile.latitude ?? null,
    longitude: profile.longitude ?? null,
    radioKm: profile.radioKm,
    cityVerified: profile.cityVerified,
  });
}

/** GET /forum/geo/me — perfil geo + catálogo de ciudades. */
export async function getMyGeo(req: AuthRequest, res: Response) {
  const profile = await prisma.forumProfile.findUnique({ where: { userId: req.user!.id } });
  const cities = await prisma.forumCity.findMany({
    where: { isActive: true },
    orderBy: [{ department: 'asc' }, { sortOrder: 'asc' }],
  });
  return ok(res, { profile, cities });
}

/** PUT /forum/geo — actualiza zona/ciudad/radio del usuario. */
export async function updateMyGeo(req: AuthRequest, res: Response) {
  const { cityId, latitude, longitude, radioKm } = req.body ?? {};
  const userId = req.user!.id;

  let cityName = '';
  let department: string | null = null;
  let cityVerified = req.user!.role === 'ADMIN' || (await isForumModerator(userId));

  if (cityId) {
    const city = await prisma.forumCity.findUnique({ where: { id: cityId } });
    if (!city) throw ApiError.notFound('Ciudad no encontrada');
    if (!city.isActive) throw ApiError.badRequest('La ciudad no está activa');
    cityName = city.name;
    department = city.department;
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      const dist = haversineKm(latitude, longitude, city.latitude, city.longitude);
      if (dist > city.radiusKm) cityVerified = false;
      else cityVerified = true;
    } else {
      cityVerified = false;
    }
  }

  const data: Record<string, unknown> = { lastGeoUpdate: new Date() };
  if (cityId) data.cityId = cityId;
  if (cityName) data.city = cityName;
  if (department) data.department = department;
  if (typeof latitude === 'number') data.latitude = latitude;
  if (typeof longitude === 'number') data.longitude = longitude;
  if (typeof radioKm === 'number') data.radioKm = radioKm;
  if (cityId) data.cityVerified = cityVerified;

  const profile = await prisma.forumProfile.upsert({
    where: { userId },
    create: {
      userId,
      forumUsername: `user${userId}`,
      city: cityName || 'Bolivia',
      ...(cityId ? { cityId, cityVerified, department } : {}),
      ...(typeof latitude === 'number' ? { latitude } : {}),
      ...(typeof longitude === 'number' ? { longitude } : {}),
      ...(typeof radioKm === 'number' ? { radioKm } : {}),
      lastGeoUpdate: new Date(),
    },
    update: data,
  });

  const city = cityId
    ? await prisma.forumCity.findUnique({ where: { id: cityId } })
    : null;
  return ok(res, {
    ...profile,
    city: city ? { id: city.id, name: city.name, department: city.department, latitude: city.latitude, longitude: city.longitude, radiusKm: city.radiusKm } : null,
  });
}

/** POST /forum/geo/resolve — reverse geocoding por cercanía (GPS). */
export async function resolveGeo(req: AuthRequest, res: Response) {
  const { latitude, longitude } = req.body ?? {};
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw ApiError.badRequest('Latitud y longitud son obligatorias');
  }
  const found = await nearestCity(latitude, longitude);
  if (!found) return ok(res, { cityId: null, city: null, department: null, distanceKm: null });
  return ok(res, {
    cityId: found.city.id,
    city: found.city.name,
    department: found.city.department,
    distanceKm: found.distanceKm,
    within: found.within,
  });
}

/** GET /forum/cities?department= — catálogo público para el selector. */
export async function listCities(req: Request, res: Response) {
  const { department } = req.query as Record<string, string | undefined>;
  const cities = await prisma.forumCity.findMany({
    where: { isActive: true, ...(department ? { department } : {}) },
    orderBy: [{ department: 'asc' }, { sortOrder: 'asc' }],
    include: { categories: { select: { categoryId: true, category: { select: { id: true, name: true, slug: true } } } } },
  });
  return ok(res, cities);
}

// ─── Reglas de uso del foro (09-spec G3.2) ───
export async function listRules(_req: Request, res: Response) {
  const rules = await prisma.forumRule.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return ok(res, rules);
}

export async function adminCreateRule(req: AuthRequest, res: Response) {
  const { title, body, sortOrder } = req.body;
  const rule = await prisma.forumRule.create({ data: { title, body, sortOrder } });
  return created(res, rule);
}

export async function adminUpdateRule(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  const { title, body, sortOrder, isActive } = req.body;
  const rule = await prisma.forumRule.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(body !== undefined ? { body } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });
  return ok(res, rule);
}

export async function adminDeleteRule(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  await prisma.forumRule.delete({ where: { id } });
  return ok(res, { deleted: true });
}

// ─── Gestión de ciudades y foros por defecto (09-spec G3.3) ───
export async function adminListCities(req: Request, res: Response) {
  const cities = await prisma.forumCity.findMany({
    orderBy: [{ department: 'asc' }, { sortOrder: 'asc' }],
    include: {
      categories: {
        select: { categoryId: true, category: { select: { id: true, name: true, slug: true } } },
      },
    },
  });
  return ok(res, cities);
}

export async function adminCreateCity(req: AuthRequest, res: Response) {
  const { name, department, latitude, longitude, radiusKm } = req.body;
  const city = await prisma.forumCity.create({
    data: { name, department, latitude, longitude, radiusKm },
  });
  return created(res, city);
}

export async function adminUpdateCity(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  const { name, department, latitude, longitude, radiusKm, isActive, sortOrder } = req.body;
  const city = await prisma.forumCity.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(department !== undefined ? { department } : {}),
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {}),
      ...(radiusKm !== undefined ? { radiusKm } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
    },
  });
  return ok(res, city);
}

export async function adminDeleteCity(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  const city = await prisma.forumCity.update({
    where: { id },
    data: { isActive: false },
  });
  return ok(res, { deleted: true, city });
}

export async function adminSetCityCategories(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  const { categoryIds } = req.body;
  await prisma.$transaction([
    prisma.forumCityCategory.deleteMany({ where: { cityId: id } }),
    prisma.forumCityCategory.createMany({
      data: categoryIds.map((categoryId: number) => ({ cityId: id, categoryId })),
      skipDuplicates: true,
    }),
  ]);
  const city = await prisma.forumCity.findUnique({
    where: { id },
    include: {
      categories: {
        select: { categoryId: true, category: { select: { id: true, name: true, slug: true } } },
      },
    },
  });
  return ok(res, city);
}

export async function adminListModerators(req: Request, res: Response) {
  const { department } = req.query as Record<string, string | undefined>;
  const profiles = await prisma.forumProfile.findMany({
    where: {
      user: { userRoles: { some: { role: { code: 'MODERADOR_FORO', isActive: true } } } },
      ...(department ? { department } : {}),
    },
    select: {
      id: true,
      forumUsername: true,
      city: true,
      department: true,
      cityVerified: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
    orderBy: { forumUsername: 'asc' },
  });
  return ok(res, profiles);
}

// ─── Búsqueda de GIFs (09-spec G4.2) ───
export async function searchGifs(req: Request, res: Response) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limit = Number(req.query.limit) || 12;
  if (!q) return ok(res, []);
  const results = await giphyService.searchGifs(q, limit);
  return ok(res, results);
}

// ─── Subforos por defecto por ciudad (super admin) ───
// Asigna a una ciudad TODOS los subforos (categorías) activos del catálogo,
// idempotente (deleteMany + createMany skipDuplicates) = "foros por defecto".
export async function adminGenerateCitySubforos(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  const city = await prisma.forumCity.findUnique({ where: { id } });
  if (!city) throw ApiError.notFound('Ciudad no encontrada');

  const categories = await prisma.forumCategory.findMany({ where: { isActive: true } });
  if (categories.length === 0) throw ApiError.badRequest('No hay subforos activos en el catálogo');

  await prisma.$transaction([
    prisma.forumCityCategory.deleteMany({ where: { cityId: id } }),
    prisma.forumCityCategory.createMany({
      data: categories.map((c) => ({ cityId: id, categoryId: c.id })),
      skipDuplicates: true,
    }),
  ]);

  const cityWith = await prisma.forumCity.findUnique({
    where: { id },
    include: {
      categories: {
        select: { categoryId: true, category: { select: { id: true, name: true, slug: true } } },
      },
    },
  });
  return ok(res, cityWith);
}

// Regenera los subforos por defecto de TODAS las ciudades activas.
export async function adminGenerateAllCitySubforos(req: AuthRequest, res: Response) {
  const cities = await prisma.forumCity.findMany({ where: { isActive: true } });
  const categories = await prisma.forumCategory.findMany({ where: { isActive: true } });
  let total = 0;
  for (const city of cities) {
    const created = await prisma.forumCityCategory.createMany({
      data: categories.map((c) => ({ cityId: city.id, categoryId: c.id })),
      skipDuplicates: true,
    });
    total += created.count;
  }
  return ok(res, { cities: cities.length, assigned: total, categories: categories.length });
}
