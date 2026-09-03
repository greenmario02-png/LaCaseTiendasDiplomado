import { Router } from 'express';

import * as trackingController from '../controllers/tracking.controller';
import { authenticate, optionalAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { recordSearchSchema, viewProductSchema } from '../schemas/tracking.schemas';

const router = Router();

router.post('/search', optionalAuth, validate(recordSearchSchema), asyncHandler(trackingController.recordSearch));
router.post('/products/:id/view', optionalAuth, validate(viewProductSchema), asyncHandler(trackingController.recordProductView));
router.get('/me/recent-views', optionalAuth, asyncHandler(trackingController.recentViews));
router.get('/me/recommended', optionalAuth, asyncHandler(trackingController.recommendedForUser));
router.get('/me/search-history', optionalAuth, asyncHandler(trackingController.mySearchHistory));

export default router;
router.get('/feed', optionalAuth, asyncHandler(trackingController.personalizedFeed));
