import { Router } from 'express';

import * as c from '../controllers/catalogReport.controller';
import { authenticate } from '../middlewares/auth';
import { requireForumStaff } from '../middlewares/roles';
import { requirePermission } from '../middlewares/rbac';
import { validate } from '../middlewares/validate';
import { adminListCatalogReportsSchema, adminUpdateCatalogReportSchema } from '../schemas/catalogReport.schemas';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Cola de revisión de las denuncias del catálogo. Solo ADMIN o un usuario con la asignación RBAC
 * `MODERADOR_FORO` que además tenga el permiso `catalog.reports.moderate`.
 * Montado en /api/admin/catalog-reports (antes de /api/admin, que es solo para ADMIN).
 */
const router = Router();

const staff = [authenticate, requireForumStaff, requirePermission('catalog.reports.moderate')];

router.get('/', ...staff, validate(adminListCatalogReportsSchema), asyncHandler(c.adminList));
router.put('/:id', ...staff, validate(adminUpdateCatalogReportSchema), asyncHandler(c.adminUpdate));

export default router;
