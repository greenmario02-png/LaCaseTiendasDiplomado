import { Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import * as jobService from '../services/job.service';
import * as applicationService from '../services/jobApplication.service';
import { parseCoords } from '../services/geo.service';
import { created, ok, paginated } from '../utils/response';

const actorOf = (req: AuthRequest) => ({ id: req.user!.id, role: req.user!.role, storeOwnerId: req.user!.storeOwnerId ?? null });
const idParam = (req: AuthRequest) => Number(req.params.id);

// Público
export async function listPublic(req: AuthRequest, res: Response) {
  const q = req.query as unknown as jobService.ListFilters;
  const { items, total } = await jobService.listPublicJobs(q, parseCoords(req.query));
  return paginated(res, items, total, q.page, q.limit);
}
export async function detailPublic(req: AuthRequest, res: Response) {
  const job = await jobService.getPublicJob(idParam(req));
  const myApplication = req.user ? await applicationService.myApplicationFor(req.user.id, job.id) : null;
  return ok(res, { ...job, myApplication });
}
export async function categories(_req: AuthRequest, res: Response) {
  return ok(res, await jobService.listCategories());
}

// Vendedor
export async function listMine(req: AuthRequest, res: Response) {
  return ok(res, await jobService.listMyJobs(actorOf(req)));
}
export async function create(req: AuthRequest, res: Response) {
  return created(res, await jobService.createJob(actorOf(req), req.body));
}
export async function update(req: AuthRequest, res: Response) {
  return ok(res, await jobService.updateJob(actorOf(req), idParam(req), req.body));
}
export async function close(req: AuthRequest, res: Response) {
  return ok(res, await jobService.closeJob(actorOf(req), idParam(req)));
}

// Admin
export async function adminList(req: AuthRequest, res: Response) {
  const status = req.query.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLOSED' | undefined;
  return ok(res, await jobService.listAdminJobs(status));
}
export async function adminModerate(req: AuthRequest, res: Response) {
  return ok(res, await jobService.moderateJob(req.user!.id, idParam(req), req.body.action, req.body.reason));
}
export async function adminCategories(_req: AuthRequest, res: Response) {
  return ok(res, await jobService.listAllCategories());
}
export async function adminCreateCategory(req: AuthRequest, res: Response) {
  return created(res, await jobService.upsertCategory(null, req.body));
}
export async function adminUpdateCategory(req: AuthRequest, res: Response) {
  return ok(res, await jobService.upsertCategory(idParam(req), req.body));
}
export async function adminDeleteCategory(req: AuthRequest, res: Response) {
  return ok(res, await jobService.deleteCategory(idParam(req)));
}

// Candidato
export async function apply(req: AuthRequest, res: Response) {
  return created(res, await applicationService.applyToJob(actorOf(req), idParam(req), req.body, req.file));
}
export async function withdraw(req: AuthRequest, res: Response) {
  return ok(res, await applicationService.withdrawApplication(actorOf(req), idParam(req)));
}
export async function myApplications(req: AuthRequest, res: Response) {
  return ok(res, await applicationService.listMyApplications(actorOf(req)));
}

// Tienda
export async function jobApplications(req: AuthRequest, res: Response) {
  return ok(res, await applicationService.listApplicationsForJob(actorOf(req), idParam(req)));
}
export async function updateApplicationStatus(req: AuthRequest, res: Response) {
  return ok(res, await applicationService.updateApplicationStatus(actorOf(req), idParam(req), req.body.status, req.body.note));
}

export async function cvLink(req: AuthRequest, res: Response) {
  return ok(res, await applicationService.createCvLink(actorOf(req), idParam(req)));
}
export async function cvDownload(req: AuthRequest, res: Response) {
  const { filePath, name } = await applicationService.resolveCvDownload(String(req.query.token ?? ''));
  res.set('Cache-Control', 'private, no-store');
  return res.download(filePath, name);
}

export async function adminApplications(req: AuthRequest, res: Response) {
  const num = (v: unknown) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : undefined);
  return ok(
    res,
    await applicationService.listAllApplications({
      status: req.query.status as string | undefined,
      jobId: num(req.query.jobId),
      q: req.query.q as string | undefined,
      page: num(req.query.page),
      limit: num(req.query.limit),
    }),
  );
}
