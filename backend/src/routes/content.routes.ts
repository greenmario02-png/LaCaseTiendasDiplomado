import { Router } from 'express';

import * as contentController from '../controllers/content.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/banners', asyncHandler(contentController.banners));
router.get('/promotions', asyncHandler(contentController.promotions));
router.get('/faqs', asyncHandler(contentController.faqs));
router.get('/warranties', asyncHandler(contentController.warranties));
router.get('/reaches', asyncHandler(contentController.reaches));

export default router;
