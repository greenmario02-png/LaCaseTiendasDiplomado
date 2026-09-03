import { Router } from 'express';

import * as auctionController from '../controllers/auction.controller';
import { authenticate, optionalAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { createAuctionSchema, placeBidSchema, auctionParamSchema } from '../schemas/auction.schemas';

const router = Router();

router.get('/', optionalAuth, asyncHandler(auctionController.listAuctions));
router.get('/mine', authenticate, asyncHandler(auctionController.myAuctions));
router.get('/active', authenticate, asyncHandler(auctionController.activeBids));
router.get('/my-bids', authenticate, asyncHandler(auctionController.myBids));
router.get('/my-won', authenticate, asyncHandler(auctionController.myWonAuctions));
router.get('/watchlist', authenticate, asyncHandler(auctionController.myWatchlist));
router.post('/', authenticate, validate(createAuctionSchema), asyncHandler(auctionController.createAuction));
router.get('/:id', optionalAuth, validate(auctionParamSchema), asyncHandler(auctionController.getAuction));
router.post('/:id/bid', authenticate, validate(placeBidSchema), asyncHandler(auctionController.placeBid));
router.post('/:id/buy-now', authenticate, validate(auctionParamSchema), asyncHandler(auctionController.buyItNow));
router.post('/:id/confirm-payment', authenticate, validate(auctionParamSchema), asyncHandler(auctionController.confirmPayment));
router.post('/:id/watch', authenticate, validate(auctionParamSchema), asyncHandler(auctionController.toggleWatch));

export default router;
