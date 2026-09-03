import { Router } from 'express';

import * as forumController from '../controllers/forum.controller';
import { authenticate, optionalAuth } from '../middlewares/auth';
import { requireForumStaff, requireRole } from '../middlewares/roles';
import { validate } from '../middlewares/validate';
import { forumPostLimiter, forumVoteLimiter, forumGifLimiter } from '../middlewares/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import { forumUpload } from '../middlewares/upload';
import * as S from '../schemas/forum.schemas';

const router = Router();

// ── Perfil de foro ─────────────────────────────────────────────────
/**
 * @swagger
 * /forum/profile/me:
 *   get:
 *     summary: Mi perfil de foro (crea ForumProfile si no existe)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: ForumProfile }
 */
router.get('/profile/me', authenticate, asyncHandler(forumController.getMyProfile));

/**
 * @swagger
 * /forum/profile/me:
 *   put:
 *     summary: Editar alias, ciudad, firma y redes del perfil de foro
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: ForumProfile actualizado }
 */
router.put('/profile/me', authenticate, validate(S.updateProfileSchema), asyncHandler(forumController.updateMyProfile));

/**
 * @swagger
 * /forum/profile/{username}:
 *   get:
 *     summary: Perfil público de foro por alias
 *     tags: [Foro]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Perfil público }
 */
router.get('/profile/:username', optionalAuth, asyncHandler(forumController.getPublicProfile));

/**
 * @swagger
 * /forum/profile/{username}/posts:
 *   get:
 *     summary: Posts de un usuario (público)
 *     tags: [Foro]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Posts paginados }
 */
router.get('/profile/:username/posts', asyncHandler(forumController.getProfilePosts));

/**
 * @swagger
 * /forum/profile/{username}/karma:
 *   get:
 *     summary: Historial de karma (solo el propio usuario)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Historial de karma }
 */
router.get('/profile/:username/karma', authenticate, asyncHandler(forumController.getKarmaHistory));

/**
 * @swagger
 * /forum/profile/{username}/reputation:
 *   post:
 *     summary: Dejar comentario de reputación a un perfil
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Reputación registrada }
 */
router.post('/profile/:username/reputation', authenticate, validate(S.reputationSchema), asyncHandler(forumController.addReputation));

// ── Categorías ────────────────────────────────────────────────────
/**
 * @swagger
 * /forum/categories:
 *   get:
 *     summary: Listar categorías activas
 *     tags: [Foro]
 *     responses:
 *       200: { description: Categorías }
 */
router.get('/categories', asyncHandler(forumController.listCategories));

/**
 * @swagger
 * /forum/admin/categories:
 *   get:
 *     summary: Listar todas las categorías (incluye inactivas) — solo ADMIN
 *     tags: [Foro]
 *     responses:
 *       200: { description: Categorías }
 */
router.get('/admin/categories', authenticate, requireRole('ADMIN'), asyncHandler(forumController.adminListCategories));

/**
 * @swagger
 * /forum/categories/{slug}:
 *   get:
 *     summary: Detalle de categoría por slug
 *     tags: [Foro]
 *     responses:
 *       200: { description: Categoría }
 */
router.get('/categories/:slug', asyncHandler(forumController.getCategoryBySlug));

/**
 * @swagger
 * /forum/categories:
 *   post:
 *     summary: Crear categoría (ADMIN)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Categoría creada }
 */
router.post('/categories', authenticate, requireRole('ADMIN'), validate(S.categorySchema), asyncHandler(forumController.createCategory));

/**
 * @swagger
 * /forum/categories/{id}:
 *   put:
 *     summary: Editar categoría (ADMIN)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Categoría actualizada }
 */
router.put('/categories/:id', authenticate, requireRole('ADMIN'), validate(S.categorySchema), asyncHandler(forumController.updateCategory));

/**
 * @swagger
 * /forum/categories/{id}:
 *   delete:
 *     summary: Soft-delete categoría (ADMIN)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Categoría desactivada }
 */
router.delete('/categories/:id', authenticate, requireRole('ADMIN'), asyncHandler(forumController.deleteCategory));

// ── Geolocalización (09-spec G2) ──────────────────────────────────
router.get('/geo/session', optionalAuth, asyncHandler(forumController.getGeoSession));
router.get('/geo/me', authenticate, asyncHandler(forumController.getMyGeo));
router.put('/geo', authenticate, validate(S.geoSchema), asyncHandler(forumController.updateMyGeo));
router.post('/geo/resolve', optionalAuth, validate(S.resolveGeoSchema), asyncHandler(forumController.resolveGeo));
router.get('/cities', asyncHandler(forumController.listCities));

// ── Posts ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /forum/posts:
 *   get:
 *     summary: Feed paginado de preguntas (filtros mode/city/category/q/type)
 *     tags: [Foro]
 *     parameters:
 *       - in: query
 *         name: mode
 *         schema: { type: string, enum: [RECIENTE, POPULAR, SIN_RESPUESTA, MI_CIUDAD] }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Feed paginado }
 */
router.get('/posts', optionalAuth, validate(S.listPostsSchema), asyncHandler(forumController.listPosts));

/**
 * @swagger
 * /forum/posts/{id}:
 *   get:
 *     summary: Detalle de post + replies
 *     tags: [Foro]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Post con replies }
 */
router.get('/posts/:id', optionalAuth, asyncHandler(forumController.getPost));

/**
 * @swagger
 * /forum/posts:
 *   post:
 *     summary: Crear pregunta (1 por día; activa el bot si PRECIO/EXISTENCIA)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Post creado con botReplyPending }
 */
router.post('/posts', authenticate, forumPostLimiter, validate(S.createPostSchema), asyncHandler(forumController.createPost));

/**
 * @swagger
 * /forum/posts/{id}:
 *   put:
 *     summary: Editar post (autor; si RESOLVED solo tags)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Post actualizado }
 */
router.put('/posts/:id', authenticate, validate(S.updatePostSchema), asyncHandler(forumController.updatePost));

/**
 * @swagger
 * /forum/posts/{id}:
 *   delete:
 *     summary: Soft-delete post (autor)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Post eliminado lógicamente }
 */
router.delete('/posts/:id', authenticate, asyncHandler(forumController.deletePost));

/**
 * @swagger
 * /forum/posts/{id}/images:
 *   post:
 *     summary: Subir hasta 4 imágenes al post (autor)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       200: { description: URLs de imágenes }
 */
router.post('/posts/:id/images', authenticate, forumUpload.array('images', 4), asyncHandler(forumController.uploadPostImages));

/**
 * @swagger
 * /forum/posts/{id}/vote:
 *   post:
 *     summary: Votar post (+1/-1, toggle/cambio)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value: { type: integer, enum: [1, -1] }
 *     responses:
 *       200: { description: Voto registrado }
 */
router.post('/posts/:id/vote', authenticate, forumVoteLimiter, validate(S.voteSchema), asyncHandler(forumController.votePost));

/**
 * @swagger
 * /forum/posts/{id}/report:
 *   post:
 *     summary: Reportar post
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Reporte creado }
 */
router.post('/posts/:id/report', authenticate, validate(S.reportSchema), asyncHandler(forumController.reportPost));

// ── Replies ───────────────────────────────────────────────────────
/**
 * @swagger
 * /forum/posts/{id}/replies:
 *   post:
 *     summary: Crear respuesta (máx 5/día)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Reply creada }
 */
router.post('/posts/:id/replies', authenticate, validate(S.createReplySchema), asyncHandler(forumController.createReply));

/**
 * @swagger
 * /forum/replies/{id}:
 *   put:
 *     summary: Editar respuesta (autor)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Reply actualizada }
 */
router.put('/replies/:id', authenticate, asyncHandler(forumController.updateReply));

/**
 * @swagger
 * /forum/replies/{id}:
 *   delete:
 *     summary: Soft-delete respuesta (autor)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Reply eliminada }
 */
router.delete('/replies/:id', authenticate, asyncHandler(forumController.deleteReply));

/**
 * @swagger
 * /forum/replies/{id}/vote:
 *   post:
 *     summary: Votar respuesta
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Voto registrado }
 */
router.post('/replies/:id/vote', authenticate, forumVoteLimiter, validate(S.voteSchema), asyncHandler(forumController.voteReply));

/**
 * @swagger
 * /forum/replies/{id}/accept:
 *   post:
 *     summary: Marcar respuesta como aceptada (autor del post)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Reply aceptada, post RESOLVED, karma+10, coins+3 }
 */
router.post('/replies/:id/accept', authenticate, asyncHandler(forumController.acceptReply));

/**
 * @swagger
 * /forum/replies/{id}/images:
 *   post:
 *     summary: Subir hasta 2 imágenes a la respuesta (autor)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       200: { description: URLs de imágenes }
 */
router.post('/replies/:id/images', authenticate, forumUpload.array('images', 2), asyncHandler(forumController.uploadReplyImages));

/**
 * @swagger
 * /forum/replies/{id}/report:
 *   post:
 *     summary: Reportar respuesta
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Reporte creado }
 */
router.post('/replies/:id/report', authenticate, validate(S.reportSchema), asyncHandler(forumController.reportReply));

// ── Karma ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /forum/karma:
 *   get:
 *     summary: Mi karma actual + historial
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Karma y transacciones }
 */
router.get('/karma', authenticate, asyncHandler(forumController.getKarma));

/**
 * @swagger
 * /forum/karma/redeem:
 *   post:
 *     summary: Canjear karma por gamerCoins (100 karma → 10 monedas)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               karmaAmount: { type: integer, minimum: 100, multipleOf: 100 }
 *     responses:
 *       200: { description: Canje realizado }
 */
router.post('/karma/redeem', authenticate, validate(S.redeemKarmaSchema), asyncHandler(forumController.redeemKarma));

// ── Discovery ─────────────────────────────────────────────────────
/**
 * @swagger
 * /forum/trending:
 *   get:
 *     summary: Tags trending (24 h)
 *     tags: [Foro]
 *     responses:
 *       200: { description: Tags top 10 }
 */
router.get('/trending', asyncHandler(forumController.getTrending));

/**
 * @swagger
 * /forum/cities/stats:
 *   get:
 *     summary: Posts activos por ciudad (7 días)
 *     tags: [Foro]
 *     responses:
 *       200: { description: Stats por ciudad }
 */
router.get('/cities/stats', asyncHandler(forumController.getCitiesStats));

/**
 * @swagger
 * /forum/top-users:
 *   get:
 *     summary: Top 5 usuarios por karma este mes
 *     tags: [Foro]
 *     responses:
 *       200: { description: Top usuarios }
 */
router.get('/top-users', asyncHandler(forumController.getTopUsers));

// ── Moderación (moderador asignado / ADMIN) ────────────────────────────────
/**
 * @swagger
 * /forum/reports:
 *   get:
 *     summary: Listar reportes (moderador asignado / ADMIN)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Reportes paginados }
 */
router.get('/reports', authenticate, requireForumStaff, asyncHandler(forumController.listReports));

/**
 * @swagger
 * /forum/reports/{id}/resolve:
 *   put:
 *     summary: Aprobar reporte → soft-delete + penalizar (moderador asignado / ADMIN)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Reporte resuelto }
 */
router.put('/reports/:id/resolve', authenticate, requireForumStaff, asyncHandler(forumController.resolveReport));

/**
 * @swagger
 * /forum/reports/{id}/reject:
 *   put:
 *     summary: Rechazar reporte → restaurar (moderador asignado / ADMIN)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Reporte rechazado }
 */
router.put('/reports/:id/reject', authenticate, requireForumStaff, asyncHandler(forumController.rejectReport));

/**
 * @swagger
 * /forum/profiles/{id}/ban:
 *   put:
 *     summary: Banear usuario del foro (ADMIN)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Perfil baneado }
 */
router.put('/profiles/:id/ban', authenticate, requireRole('ADMIN'), asyncHandler(forumController.banProfile));

/**
 * @swagger
 * /forum/profiles/{id}/karma-adjust:
 *   put:
 *     summary: Ajustar karma manualmente con nota (ADMIN)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Karma ajustado }
 */
router.put('/profiles/:id/karma-adjust', authenticate, requireRole('ADMIN'), asyncHandler(forumController.adjustKarma));

/**
 * @swagger
 * /forum/admin/stats:
 *   get:
 *     summary: Estadísticas generales del foro (ADMIN / moderador asignado)
 *     tags: [Foro]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Stats del foro }
 */
router.get('/admin/stats', authenticate, requireForumStaff, asyncHandler(forumController.getAdminStats));

// ─── Reglas de uso y gestión de ciudades (09-spec G3) ───
router.get('/rules', asyncHandler(forumController.listRules));
// ─── Búsqueda de GIFs (09-spec G4.2) ───
router.get('/gifs/search', forumGifLimiter, asyncHandler(forumController.searchGifs));
router.post('/admin/rules', authenticate, requireRole('ADMIN'), validate(S.ruleSchema), asyncHandler(forumController.adminCreateRule));
router.put('/admin/rules/:id', authenticate, requireRole('ADMIN'), validate(S.updateRuleSchema), asyncHandler(forumController.adminUpdateRule));
router.delete('/admin/rules/:id', authenticate, requireRole('ADMIN'), asyncHandler(forumController.adminDeleteRule));

router.get('/admin/cities', authenticate, requireRole('ADMIN'), asyncHandler(forumController.adminListCities));
router.post('/admin/cities', authenticate, requireRole('ADMIN'), validate(S.citySchema), asyncHandler(forumController.adminCreateCity));
router.put('/admin/cities/:id', authenticate, requireRole('ADMIN'), validate(S.updateCitySchema), asyncHandler(forumController.adminUpdateCity));
router.delete('/admin/cities/:id', authenticate, requireRole('ADMIN'), asyncHandler(forumController.adminDeleteCity));
router.put('/admin/cities/:id/categories', authenticate, requireRole('ADMIN'), validate(S.cityCategoriesSchema), asyncHandler(forumController.adminSetCityCategories));
router.get('/admin/moderators', authenticate, requireRole('ADMIN'), asyncHandler(forumController.adminListModerators));
// Subforos por defecto por ciudad (super admin): POST /admin/cities/subforos/all y /admin/cities/:id/subforos
router.post('/admin/cities/subforos/all', authenticate, requireRole('ADMIN'), asyncHandler(forumController.adminGenerateAllCitySubforos));
router.post('/admin/cities/:id/subforos', authenticate, requireRole('ADMIN'), asyncHandler(forumController.adminGenerateCitySubforos));

export default router;
