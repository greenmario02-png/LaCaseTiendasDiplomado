import { Router } from 'express';

import * as adminController from '../controllers/admin.controller';
import * as currencyController from '../controllers/currency.controller';
import * as couponController from '../controllers/coupon.controller';
import * as payoutController from '../controllers/payout.controller';
import * as knownProductController from '../controllers/knownProduct.controller';
import * as calendarController from '../controllers/calendar.controller';
import * as rbacController from '../controllers/rbac.controller';
import { authenticate } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/roles';
import { requirePermission } from '../middlewares/rbac';
import { uploadSingle } from '../middlewares/upload';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate, requireAdmin);

router.post('/upload', uploadSingle('image'));

router.get('/currencies', asyncHandler(currencyController.getCurrencies));
router.post('/currencies/refresh', asyncHandler(currencyController.refreshRates));
router.post('/currencies/manual-rate', asyncHandler(currencyController.setManualRate));
router.post('/currencies/default', asyncHandler(currencyController.setDefaultCurrency));

router.get('/dashboard', asyncHandler(adminController.dashboard));
router.get('/stats', asyncHandler(adminController.stats));
router.get('/calendar-events', asyncHandler(calendarController.adminCalendarEvents));
router.get('/sales-today', asyncHandler(calendarController.adminSalesToday));
router.get('/sellers/verification', asyncHandler(adminController.verificationRequests));
router.get('/sellers/pending', asyncHandler(adminController.pendingSellers));
router.get('/copies/alerts', asyncHandler(adminController.copyAlerts));
router.get('/sellers/:id', asyncHandler(adminController.sellerDetail));
router.put('/sellers/:id/pause', asyncHandler(adminController.pauseSeller));
router.get('/users', asyncHandler(adminController.listUsers));
router.post('/users', asyncHandler(adminController.createUser));
router.put('/users/:id', asyncHandler(adminController.updateUser));
router.get('/users/:id', asyncHandler(adminController.userDetail));

router.get('/sellers/pending', asyncHandler(adminController.pendingSellers));
router.get('/products/pending', asyncHandler(adminController.pendingProducts));
router.put('/products/:id/moderate', asyncHandler(adminController.moderateProduct));

router.get('/orders', asyncHandler(adminController.listOrders));
router.put('/orders/:id/status', asyncHandler(adminController.updateOrderStatus));

router.get('/categories', asyncHandler(adminController.listCategories));
router.post('/categories', asyncHandler(adminController.createCategory));
router.put('/categories/:id', asyncHandler(adminController.updateCategory));
router.delete('/categories/:id', asyncHandler(adminController.deleteCategory));

router.get('/attributes', asyncHandler(adminController.listAttributes));
router.post('/attributes', asyncHandler(adminController.createAttribute));
router.put('/attributes/:id', asyncHandler(adminController.updateAttribute));
router.delete('/attributes/:id', asyncHandler(adminController.deleteAttribute));

router.get('/known-products', asyncHandler(knownProductController.adminListKnownProducts));
router.post('/known-products', asyncHandler(knownProductController.adminCreateKnownProduct));
router.put('/known-products/:id', asyncHandler(knownProductController.adminUpdateKnownProduct));
router.delete('/known-products/:id', asyncHandler(knownProductController.adminDeleteKnownProduct));

router.get('/banners', asyncHandler(adminController.listBanners));
router.post('/banners', asyncHandler(adminController.createBanner));
router.put('/banners/:id', asyncHandler(adminController.updateBanner));
router.delete('/banners/:id', asyncHandler(adminController.deleteBanner));

router.get('/promotions', asyncHandler(adminController.listPromotions));
router.post('/promotions', asyncHandler(adminController.createPromotion));
router.put('/promotions/:id', asyncHandler(adminController.updatePromotion));
router.delete('/promotions/:id', asyncHandler(adminController.deletePromotion));

router.get('/tags', asyncHandler(adminController.listTags));
router.post('/tags', asyncHandler(adminController.createTag));
router.put('/tags/:id', asyncHandler(adminController.updateTag));
router.delete('/tags/:id', asyncHandler(adminController.deleteTag));

// Cupones
router.get('/coupons', asyncHandler(couponController.listCoupons));
router.post('/coupons', asyncHandler(couponController.createCoupon));
router.put('/coupons/:id', asyncHandler(couponController.updateCoupon));
router.delete('/coupons/:id', asyncHandler(couponController.deleteCoupon));

// Payouts (administración de retiros)
router.get('/payouts', asyncHandler(payoutController.listAllPayouts));
router.put('/payouts/:id', asyncHandler(payoutController.processPayout));

// Contenido del sitio (FAQs, garantías, alcances)
router.get('/content/faqs', asyncHandler(adminController.listFaqs));
router.post('/content/faqs', asyncHandler(adminController.createFaq));
router.put('/content/faqs/:id', asyncHandler(adminController.updateFaq));
router.delete('/content/faqs/:id', asyncHandler(adminController.deleteFaq));
router.get('/content/warranties', asyncHandler(adminController.listWarranties));
router.post('/content/warranties', asyncHandler(adminController.createWarranty));
router.put('/content/warranties/:id', asyncHandler(adminController.updateWarranty));
router.delete('/content/warranties/:id', asyncHandler(adminController.deleteWarranty));
router.get('/content/reaches', asyncHandler(adminController.listReaches));
router.post('/content/reaches', asyncHandler(adminController.createReach));
router.put('/content/reaches/:id', asyncHandler(adminController.updateReach));
router.delete('/content/reaches/:id', asyncHandler(adminController.deleteReach));

// Productos: edición y listado completo por el admin
router.get('/products', asyncHandler(adminController.listAllProducts));
router.put('/products/:id', asyncHandler(adminController.updateAnyProduct));
router.delete('/products/:id', asyncHandler(adminController.deleteAnyProduct));

// Comisiones de la plataforma
router.get('/commission', asyncHandler(adminController.getCommission));
router.put('/commission', asyncHandler(adminController.setCommission));

// Reportes económicos
router.get('/reports/sales', asyncHandler(adminController.salesReport));
router.get('/reports/commissions', asyncHandler(adminController.commissionReport));
router.get('/reports/sellers', asyncHandler(adminController.sellerReport));
router.get('/reports/categories', asyncHandler(adminController.categoryReport));

// Reseñas: solo el super admin puede editarlas o eliminarlas
router.get('/reviews', asyncHandler(adminController.listReviews));
router.put('/reviews/:id', asyncHandler(adminController.updateReview));
router.delete('/reviews/:id', asyncHandler(adminController.deleteReview));

// Configuración global del sitio (tabla Setting key/value)
router.get('/settings', asyncHandler(adminController.getSettings));
router.put('/settings/:key', asyncHandler(adminController.updateSetting));
router.put('/settings', asyncHandler(adminController.updateSettings));
router.delete('/settings/:key', asyncHandler(adminController.deleteSetting));

// ===== RBAC — Core de administración dinámico (01-spec-core-rbac.md) =====
// Gestión de roles/permisos/menús: requireAdmin + requirePermission('admin.rbac.manage')
router.get('/rbac/roles', requirePermission('admin.rbac.manage'), asyncHandler(rbacController.listRoles));
router.post('/rbac/roles', requirePermission('admin.rbac.manage'), asyncHandler(rbacController.createRole));
router.put('/rbac/roles/:id', requirePermission('admin.rbac.manage'), asyncHandler(rbacController.updateRole));
router.delete('/rbac/roles/:id', requirePermission('admin.rbac.manage'), asyncHandler(rbacController.deleteRole));

router.get('/rbac/permissions', requirePermission('admin.rbac.manage'), asyncHandler(rbacController.listPermissions));
router.post('/rbac/permissions', requirePermission('admin.rbac.manage'), asyncHandler(rbacController.createPermission));
router.put('/rbac/permissions/:id', requirePermission('admin.rbac.manage'), asyncHandler(rbacController.updatePermission));
router.delete('/rbac/permissions/:id', requirePermission('admin.rbac.manage'), asyncHandler(rbacController.deletePermission));

router.get('/rbac/menus', requirePermission('admin.rbac.manage'), asyncHandler(rbacController.listMenus));
router.post('/rbac/menus', requirePermission('admin.rbac.manage'), asyncHandler(rbacController.createMenu));
router.put('/rbac/menus/:id', requirePermission('admin.rbac.manage'), asyncHandler(rbacController.updateMenu));
router.delete('/rbac/menus/:id', requirePermission('admin.rbac.manage'), asyncHandler(rbacController.deleteMenu));

router.put('/rbac/roles/:id/permissions', requirePermission('admin.rbac.manage'), asyncHandler(rbacController.setRolePermissions));
router.put('/rbac/roles/:id/menus', requirePermission('admin.rbac.manage'), asyncHandler(rbacController.setRoleMenus));
router.put('/rbac/users/:id/roles', requirePermission('admin.rbac.manage'), asyncHandler(rbacController.setUserRoles));
router.get('/rbac/users/:id/roles', requirePermission('admin.rbac.manage'), asyncHandler(rbacController.getUserRoles));

// Nota: GET /rbac/me/menus y GET /rbac/me/permissions viven en /api/rbac/me/*
// (routes/rbac.routes.ts, autenticado sin requireAdmin) para el render dinámico de
// menús en TODOS los roles. Acá NO se duplican.

export default router;
