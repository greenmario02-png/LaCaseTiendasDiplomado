import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as publicController from '../controllers/public.controller';
import * as couponController from '../controllers/coupon.controller';
import * as giftController from '../controllers/gift.controller';
import { authenticate, optionalAuth, AuthRequest } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { storePaymentInfo } from '../services/storePayment.service';
import { ok } from '../utils/response';
import { ApiError } from '../utils/errors';

const router = Router();

// Datos de pago de la tienda: QR + titular/banco/cuenta; completos solo para quien tiene algo que pagarle.
const paymentInfoLimiter = rateLimit({
  windowMs: 60_000,
  max: process.env.NODE_ENV === 'test' ? 100000 : 60,
  message: { error: { code: 'RATE_LIMIT', message: 'Demasiadas consultas. Espera un momento.' } },
  standardHeaders: true,
  legacyHeaders: false,
});
router.get(
  '/stores/:id/payment-info',
  paymentInfoLimiter,
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0 || id > 2_147_483_647) throw ApiError.badRequest('Tienda inválida');
    res.set('Cache-Control', 'private, no-store');
    return ok(res, await storePaymentInfo(id, req.user ? { id: req.user.id, storeOwnerId: req.user.storeOwnerId } : null));
  }),
);

router.get('/app-version', asyncHandler(publicController.appVersion));

// Promociones de regalo de una tienda (público)
router.get('/sellers/:id/gifts', asyncHandler(giftController.listBySeller));

router.get('/sellers/search', asyncHandler(publicController.searchSellers));
router.get('/brands', asyncHandler(publicController.listBrands));
router.get('/delivery-types', asyncHandler(publicController.listDeliveryTypes));
router.get('/sellers/:id', asyncHandler(publicController.publicSellerProfile));
router.get('/sellers/:id/products', asyncHandler(publicController.sellerProducts));
router.get('/sellers/:id/overview', asyncHandler(publicController.sellerOverview));
router.get('/sellers/:id/reviews', asyncHandler(publicController.sellerReviews));
router.post('/sellers/:id/reviews', authenticate, asyncHandler(publicController.addSellerReview));
router.post('/sellers/:id/tag-vote', authenticate, asyncHandler(publicController.voteSellerTag));
router.get('/sellers/:id/tag-votes/mine', authenticate, asyncHandler(publicController.getMySellerTagVotes));

router.get('/products/:id/reviews', asyncHandler(publicController.productReviews));
router.post('/products/:id/reviews', authenticate, asyncHandler(publicController.addProductReview));

router.get('/wishlist', authenticate, asyncHandler(publicController.getWishlist));
router.post('/wishlist/:id', authenticate, asyncHandler(publicController.addToWishlist));
router.delete('/wishlist/:id', authenticate, asyncHandler(publicController.removeFromWishlist));

// Compradores privilegiados (lado comprador)
router.post('/sellers/:id/privileged-request', authenticate, asyncHandler(publicController.requestPrivileged));
router.get('/sellers/:id/privileged-status', authenticate, asyncHandler(publicController.privilegedStatus));
router.get('/privileged-new-products', authenticate, asyncHandler(publicController.privilegedNewProducts));

// Cupones
router.get('/coupons/:code/validate', asyncHandler(couponController.validateCoupon));

export default router;
