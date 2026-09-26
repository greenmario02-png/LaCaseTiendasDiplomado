import { Router } from 'express';

import * as C from '../controllers/forum-extensions.controller';
import { authenticate, optionalAuth } from '../middlewares/auth';
import { requireRole } from '../middlewares/roles';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import * as S from '../schemas/forum-extensions.schemas';

const router = Router();

// ── Verificación profesional (subforos profesionales) ────────────────
router.get('/professional/fields', optionalAuth, asyncHandler(C.listFields));
router.get('/professional/fields/:slug/questions', authenticate, asyncHandler(C.getFieldQuestions));
router.post('/professional/fields/:slug/verify', authenticate, validate(S.submitVerificationSchema), asyncHandler(C.submitVerification));
router.get('/professional/me', authenticate, asyncHandler(C.getMyVerifications));

router.get('/admin/professional/fields', authenticate, requireRole('ADMIN'), asyncHandler(C.adminListFields));
router.post('/admin/professional/fields', authenticate, requireRole('ADMIN'), validate(S.adminCreateFieldSchema), asyncHandler(C.adminCreateField));
router.put('/admin/professional/fields/:id', authenticate, requireRole('ADMIN'), validate(S.adminUpdateFieldSchema), asyncHandler(C.adminUpdateField));
router.post('/admin/professional/questions', authenticate, requireRole('ADMIN'), validate(S.adminCreateQuestionSchema), asyncHandler(C.adminCreateQuestion));
router.put('/admin/professional/questions/:id', authenticate, requireRole('ADMIN'), validate(S.adminUpdateQuestionSchema), asyncHandler(C.adminUpdateQuestion));
router.delete('/admin/professional/questions/:id', authenticate, requireRole('ADMIN'), asyncHandler(C.adminDeleteQuestion));

// ── Universidades (subforos geolocalizados) ───────────────────────────
router.get('/universities', optionalAuth, asyncHandler(C.listUniversities));
router.get('/admin/universities', authenticate, requireRole('ADMIN'), asyncHandler(C.adminListUniversities));
router.post('/admin/universities', authenticate, requireRole('ADMIN'), validate(S.adminCreateUniversitySchema), asyncHandler(C.adminCreateUniversity));
router.put('/admin/universities/:id', authenticate, requireRole('ADMIN'), validate(S.adminUpdateUniversitySchema), asyncHandler(C.adminUpdateUniversity));

// ── Comentarios genéricos (memes y torneo / QuemadosBolivia / Comunidad) ────────
router.get('/comments', validate(S.listCommentsSchema), asyncHandler(C.listComments));
router.post('/comments', authenticate, validate(S.createCommentSchema), asyncHandler(C.createComment));
router.delete('/comments/:id', authenticate, asyncHandler(C.deleteComment));
router.post('/comments/:id/vote', authenticate, validate(S.voteCommentSchema), asyncHandler(C.voteComment));

export default router;
