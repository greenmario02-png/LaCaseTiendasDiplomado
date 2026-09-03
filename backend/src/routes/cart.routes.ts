import { Router } from 'express';

import * as cartController from '../controllers/cart.controller';
import { authenticate, optionalAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', optionalAuth, asyncHandler(cartController.getCart));
router.post('/items', optionalAuth, asyncHandler(cartController.addItem));
router.put('/items/:id', optionalAuth, asyncHandler(cartController.updateItem));
router.delete('/items/:id', optionalAuth, asyncHandler(cartController.removeItem));
router.delete('/', optionalAuth, asyncHandler(cartController.clear));
router.post('/merge', authenticate, asyncHandler(cartController.merge));

export default router;
