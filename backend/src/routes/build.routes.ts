import { Router } from 'express';

import * as buildController from '../controllers/build.controller';
import { authenticate, optionalAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/slot-products', asyncHandler(buildController.getBuildSlotProducts));
router.get('/compatibility', asyncHandler(buildController.checkCompatibility));
router.get('/', authenticate, asyncHandler(buildController.getBuilds));
router.post('/', authenticate, asyncHandler(buildController.createBuild));
router.get('/:id', authenticate, asyncHandler(buildController.getBuild));
router.delete('/:id', authenticate, asyncHandler(buildController.deleteBuild));

export default router;
