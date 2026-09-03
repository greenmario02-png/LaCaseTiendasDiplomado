import { Router } from 'express';

import * as publicController from '../controllers/public.controller';
import * as couponController from '../controllers/coupon.controller';
import * as giftController from '../controllers/gift.controller';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

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
