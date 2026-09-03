import { Router } from 'express';

import * as rbacController from '../controllers/rbac.controller';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

// ===== RBAC — rutas públicas autenticadas (render dinámico para TODOS los roles) =====
// El frontend (AdminLayout, SellerLayout, Navbar) consulta los menús/permisos del
// usuario logueado vía GET /api/rbac/me/* — por eso NO requieren requireAdmin.
// (Las rutas de GESTIÓN siguen en /api/admin/rbac/* con requireAdmin + requirePermission.)

const router = Router();

router.use(authenticate);

router.get('/me/menus', asyncHandler(rbacController.getMyMenus));
router.get('/me/permissions', asyncHandler(rbacController.getMyPermissions));

export default router;
