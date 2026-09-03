import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import * as coinsController from '../controllers/coins.controller';

const router = Router();

router.use(authenticate);
router.get('/balance', asyncHandler(coinsController.getBalance));
router.get('/rate', asyncHandler(coinsController.getCoinRate));
router.post('/buy', asyncHandler(coinsController.buyCoins));
router.get('/invite', asyncHandler(coinsController.getInvite));

export default router;
