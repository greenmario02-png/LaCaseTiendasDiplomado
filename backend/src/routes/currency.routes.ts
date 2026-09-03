import { Router } from 'express';

import * as currencyController from '../controllers/currency.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/currencies', asyncHandler(currencyController.getCurrencies));
router.get('/currencies/rates', asyncHandler(currencyController.getLiveRates));

export default router;
