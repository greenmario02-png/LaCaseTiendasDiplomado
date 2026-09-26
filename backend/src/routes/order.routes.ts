import { Router } from 'express';

import * as orderController from '../controllers/order.controller';
import { validate } from '../middlewares/validate';
import { requireSeller } from '../middlewares/roles';
import { paymentProofSchema, updateOrderStatusSchema, updatePaymentStatusSchema } from '../schemas/order.schemas';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/recent-sales', asyncHandler(orderController.recentSales));

router.use(authenticate);

router.post('/', asyncHandler(orderController.createOrders));
router.post('/calculate-shipping', asyncHandler(orderController.shippingQuotes));
router.get('/buyer', asyncHandler(orderController.buyerOrders));
router.get('/buyer/:id', asyncHandler(orderController.buyerOrderDetail));
router.post('/:id/payment-proof', validate(paymentProofSchema), asyncHandler(orderController.paymentProof));
router.post('/:id/confirm-delivery', asyncHandler(orderController.confirmDelivery));
router.get('/seller', requireSeller, asyncHandler(orderController.sellerOrders));
router.put('/seller/:id/status', requireSeller, validate(updateOrderStatusSchema), asyncHandler(orderController.updateOrderStatus));
router.put('/seller/:id/payment-status', requireSeller, validate(updatePaymentStatusSchema), asyncHandler(orderController.updatePaymentStatus));

export default router;
