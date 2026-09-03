import { Router } from 'express';

import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { authLimiter, registerLimiter } from '../middlewares/rateLimiter';
import { loginSchema, registerSchema, refreshSchema, sellerRegisterSchema } from '../schemas/auth.schemas';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/register', registerLimiter, validate(registerSchema), asyncHandler(authController.register));
router.post('/sellers/register', registerLimiter, validate(sellerRegisterSchema), asyncHandler(authController.registerSeller));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login));
router.post('/refresh', validate(refreshSchema), asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', authenticate, asyncHandler(authController.me));
router.post('/verify-password', authenticate, asyncHandler(authController.verifyPassword));

export default router;