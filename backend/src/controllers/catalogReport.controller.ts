import { Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import { createCatalogReport } from '../services/catalogReport.service';
import { created } from '../utils/response';

/** POST /api/catalog-reports: denuncia desde la ficha del producto. */
export async function create(req: AuthRequest, res: Response) {
  return created(res, await createCatalogReport(req.user!.id, req.body));
}
