import { Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import { adminListCatalogReports, adminUpdateCatalogReportStatus, createCatalogReport, type AdminListCatalogReportsFilters } from '../services/catalogReport.service';
import { created, ok, paginated } from '../utils/response';

/** POST /api/catalog-reports: denuncia desde la ficha del producto. */
export async function create(req: AuthRequest, res: Response) {
  return created(res, await createCatalogReport(req.user!.id, req.body));
}

/** GET /api/admin/catalog-reports: cola de revisión. */
export async function adminList(req: AuthRequest, res: Response) {
  const q = req.query as unknown as AdminListCatalogReportsFilters;
  const { items, total } = await adminListCatalogReports(q);
  return paginated(res, items, total, q.page, q.limit);
}

/** PUT /api/admin/catalog-reports/:id: marca la denuncia como revisada o descartada. */
export async function adminUpdate(req: AuthRequest, res: Response) {
  return ok(res, await adminUpdateCatalogReportStatus(req.user!.id, Number(req.params.id), req.body));
}
