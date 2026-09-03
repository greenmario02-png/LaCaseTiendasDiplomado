import { Router } from 'express';
import * as affiliateController from '../controllers/affiliate.controller';
import { authenticate } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/roles';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Afiliado
router.get('/me', authenticate, asyncHandler(affiliateController.getMyAffiliate));
router.get('/my-referrals', authenticate, asyncHandler(affiliateController.listMyReferrals));

// Admin
router.get('/', authenticate, requireAdmin, asyncHandler(affiliateController.listAffiliates));
router.put('/:id/commission', authenticate, requireAdmin, asyncHandler(affiliateController.setCommission));

export default router;
