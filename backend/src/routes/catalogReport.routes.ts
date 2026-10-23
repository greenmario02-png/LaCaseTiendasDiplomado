import { Router } from 'express';

import * as c from '../controllers/catalogReport.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createCatalogReportSchema } from '../schemas/catalogReport.schemas';
import { asyncHandler } from '../utils/asyncHandler';

/** Denuncias del catálogo (vendedor, tienda o producto). Montado en /api/catalog-reports. */
const router = Router();

router.post('/', authenticate, validate(createCatalogReportSchema), asyncHandler(c.create));

export default router;
