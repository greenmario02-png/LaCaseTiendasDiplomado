import { Router } from 'express';
import * as returnController from '../controllers/return.controller';
import { authenticate } from '../middlewares/auth';
import { requireAdmin, requireSeller } from '../middlewares/roles';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Comprador
router.post('/', authenticate, asyncHandler(returnController.createReturn));
router.get('/mine', authenticate, asyncHandler(returnController.listMyReturns));
router.post('/:id/cancel', authenticate, asyncHandler(returnController.cancelReturn));

// Vendedor
router.get('/seller', authenticate, requireSeller, asyncHandler(returnController.listSellerReturns));
router.post('/:id/respond', authenticate, requireSeller, asyncHandler(returnController.respondReturn));

// Admin
router.get('/admin', authenticate, requireAdmin, asyncHandler(returnController.adminListReturns));
router.put('/admin/:id', authenticate, requireAdmin, asyncHandler(returnController.adminResolveReturn));

export default router;
