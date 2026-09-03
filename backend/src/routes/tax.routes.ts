import { Router } from 'express';
import * as taxController from '../controllers/tax.controller';
import { authenticate } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/roles';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Público (cálculo de impuesto para checkout)
router.post('/calculate', authenticate, asyncHandler(taxController.calculateTax));

// Admin
router.get('/', authenticate, requireAdmin, asyncHandler(taxController.listTaxRates));
router.post('/', authenticate, requireAdmin, asyncHandler(taxController.createTaxRate));
router.put('/:id', authenticate, requireAdmin, asyncHandler(taxController.updateTaxRate));
router.delete('/:id', authenticate, requireAdmin, asyncHandler(taxController.deleteTaxRate));

export default router;
