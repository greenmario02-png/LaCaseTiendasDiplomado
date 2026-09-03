import { Router } from 'express';

import * as productController from '../controllers/product.controller';
import { productQuerySchema } from '../schemas/product.schemas';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', validate(productQuerySchema), asyncHandler(productController.list));
router.get('/featured', asyncHandler(productController.featured));
router.get('/categories', asyncHandler(productController.listCategories));
router.get('/categories/:id/attributes', asyncHandler(productController.categoryAttributes));
router.get('/attribute-definitions', asyncHandler(productController.searchAttributeDefinitions));
router.get('/attribute-values', asyncHandler(productController.attributeValues));
router.get('/:id/related', asyncHandler(productController.related));
router.get('/:id/offers', asyncHandler(productController.offers));
router.get('/:id', asyncHandler(productController.detail));

export default router;
