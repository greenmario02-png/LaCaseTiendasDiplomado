import { Router } from 'express';
import * as auditController from '../controllers/audit.controller';
import { authenticate } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/roles';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Listado global (solo admin global) — dashboard /admin/logs
router.get('/', authenticate, requireAdmin, asyncHandler(auditController.listAllAudits));
// Historial de un producto (dueño de la tienda o admin)
router.get('/product/:id', authenticate, asyncHandler(auditController.listProductAudits));
// Actividad reciente del usuario (mis acciones)
router.get('/mine', authenticate, asyncHandler(auditController.listMyProductsAudits));

export default router;
