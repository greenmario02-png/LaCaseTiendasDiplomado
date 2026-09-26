import { Router } from 'express';

import * as C from '../controllers/cono.controller';
import { authenticate, optionalAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { uploadSingleAuthenticated } from '../middlewares/upload';
import * as S from '../schemas/cono.schemas';

const router = Router();

router.post('/upload', authenticate, uploadSingleAuthenticated('image'));

router.get('/themes', optionalAuth, validate(S.listThemesSchema), asyncHandler(C.listThemes));
router.post('/themes', authenticate, validate(S.createThemeSchema), asyncHandler(C.createTheme));
router.get('/themes/:slug', optionalAuth, asyncHandler(C.getThemeBySlug));

router.get('/themes/:themeId/entries', optionalAuth, validate(S.listEntriesSchema), asyncHandler(C.listEntries));
router.post('/themes/:themeId/entries', authenticate, validate(S.createEntrySchema), asyncHandler(C.createEntry));

router.get('/entries/:id', optionalAuth, asyncHandler(C.getEntry));
router.post('/entries/:id/vote', authenticate, validate(S.voteEntrySchema), asyncHandler(C.voteEntry));

router.get('/themes/:themeId/matches', optionalAuth, asyncHandler(C.listMatches));
router.post('/matches', authenticate, validate(S.createMatchSchema), asyncHandler(C.createMatch));
router.post('/matches/:id/vote', authenticate, validate(S.voteMatchSchema), asyncHandler(C.voteMatch));

export default router;
