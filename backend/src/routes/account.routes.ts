import { Router } from 'express';

import * as accountController from '../controllers/account.controller';
import { authenticate } from '../middlewares/auth';
import { uploadSingleAuthenticated } from '../middlewares/upload';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(accountController.getProfile));
router.put('/', asyncHandler(accountController.updateProfile));
router.put('/push-token', asyncHandler(accountController.updatePushToken));
router.post('/upload', uploadSingleAuthenticated('image'));
router.get('/addresses', asyncHandler(accountController.listAddresses));
router.post('/addresses', asyncHandler(accountController.createAddress));
router.put('/addresses/:id', asyncHandler(accountController.updateAddress));
router.delete('/addresses/:id', asyncHandler(accountController.deleteAddress));
router.get('/orders', asyncHandler(accountController.myOrders));
router.get('/orders/:id', asyncHandler(accountController.myOrderDetail));

export default router;
