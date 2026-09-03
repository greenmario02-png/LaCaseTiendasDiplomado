import { Router } from 'express';

import * as sellerController from '../controllers/seller.controller';
import * as couponController from '../controllers/coupon.controller';
import * as payoutController from '../controllers/payout.controller';
import * as giftController from '../controllers/gift.controller';
import * as sellerPromotionController from '../controllers/sellerPromotion.controller';
import * as knownProductController from '../controllers/knownProduct.controller';
import * as calendarController from '../controllers/calendar.controller';
import { authenticate } from '../middlewares/auth';
import { requireSeller, requireStoreAdmin } from '../middlewares/roles';
import { uploadSingleAuthenticated } from '../middlewares/upload';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate, requireSeller);

router.post('/upload', uploadSingleAuthenticated('image'));
router.get('/dashboard', asyncHandler(sellerController.getSellerDashboard));
router.get('/calendar-events', asyncHandler(calendarController.sellerCalendarEvents));
router.get('/sales-today', asyncHandler(calendarController.sellerSalesToday));
router.get('/known-products', requireStoreAdmin, asyncHandler(knownProductController.sellerListKnownProducts));
router.post('/known-products', requireStoreAdmin, asyncHandler(knownProductController.sellerCreateKnownProduct));
router.put('/known-products/:id', requireStoreAdmin, asyncHandler(knownProductController.sellerUpdateKnownProduct));
router.delete('/known-products/:id', requireStoreAdmin, asyncHandler(knownProductController.sellerDeleteKnownProduct));
router.post('/attributes', requireStoreAdmin, asyncHandler(knownProductController.sellerCreateAttributes));
router.get('/products', asyncHandler(sellerController.listSellerProducts));
router.post('/products', asyncHandler(sellerController.createProduct));
router.post('/products/copy', asyncHandler(sellerController.copyProduct));
router.put('/products/:id', asyncHandler(sellerController.updateProduct));
router.delete('/products/:id', asyncHandler(sellerController.deleteProduct));
router.post('/products/:id/reactivate', asyncHandler(sellerController.reactivateProduct));
router.put('/profile', requireStoreAdmin, asyncHandler(sellerController.updateSellerProfile));

// Compradores privilegiados (lado vendedor)
router.get('/privileged/requests', asyncHandler(sellerController.listPrivilegedRequests));
router.get('/privileged/buyers', asyncHandler(sellerController.listPrivilegedBuyers));
router.put('/privileged/:id', asyncHandler(sellerController.respondPrivilegedRequest));

// Sello de vendedor verificado
router.post('/verification/request', asyncHandler(sellerController.requestVerification));
router.get('/verification/status', asyncHandler(sellerController.verificationStatus));

// Cupones de la tienda
router.get('/coupons', asyncHandler(couponController.listSellerCoupons));
router.post('/coupons', requireStoreAdmin, asyncHandler(couponController.createSellerCoupon));
router.put('/coupons/:id', requireStoreAdmin, asyncHandler(couponController.updateSellerCoupon));
router.delete('/coupons/:id', requireStoreAdmin, asyncHandler(couponController.deleteSellerCoupon));

// Payouts (escrow y retiros)
router.get('/payouts/summary', asyncHandler(payoutController.summary));
router.put('/payouts/account', asyncHandler(payoutController.saveAccount));
router.post('/payouts/request', asyncHandler(payoutController.requestPayout));

// Promociones de regalo de la tienda
router.get('/gifts', asyncHandler(giftController.listMine));
router.post('/gifts', requireStoreAdmin, asyncHandler(giftController.create));
router.put('/gifts/:id', requireStoreAdmin, asyncHandler(giftController.update));
router.delete('/gifts/:id', requireStoreAdmin, asyncHandler(giftController.remove));

router.get('/promotions', asyncHandler(sellerPromotionController.listSellerPromotions));
router.post('/promotions', requireStoreAdmin, asyncHandler(sellerPromotionController.createSellerPromotion));
router.put('/promotions/:id', requireStoreAdmin, asyncHandler(sellerPromotionController.updateSellerPromotion));
router.delete('/promotions/:id', requireStoreAdmin, asyncHandler(sellerPromotionController.deleteSellerPromotion));
router.get('/promotions/stats', asyncHandler(sellerPromotionController.sellerPromotionStats));

export default router;
