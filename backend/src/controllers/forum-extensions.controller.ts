import { Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import { ok, created, paginated } from '../utils/response';
import { ensureForumProfile } from '../services/forum.service';
import * as PS from '../services/professional.service';
import * as US from '../services/university.service';
import * as CS from '../services/comments.service';

// ─── Verificación profesional ───────────────────────────────────────

export async function listFields(_req: AuthRequest, res: Response) {
  return ok(res, await PS.listFields());
}

export async function getFieldQuestions(req: AuthRequest, res: Response) {
  return ok(res, await PS.getFieldQuestions(String(req.params.slug)));
}

export async function submitVerification(req: AuthRequest, res: Response) {
  const profile = await ensureForumProfile(req.user!.id);
  const result = await PS.submitVerification(profile.id, String(req.params.slug), req.body.answers);
  return ok(res, result);
}

export async function getMyVerifications(req: AuthRequest, res: Response) {
  const profile = await ensureForumProfile(req.user!.id);
  return ok(res, await PS.getMyVerifications(profile.id));
}

export async function adminListFields(_req: AuthRequest, res: Response) {
  return ok(res, await PS.adminListFields());
}

export async function adminCreateField(req: AuthRequest, res: Response) {
  return created(res, await PS.adminCreateField(req.body));
}

export async function adminUpdateField(req: AuthRequest, res: Response) {
  return ok(res, await PS.adminUpdateField(Number(req.params.id), req.body));
}

export async function adminCreateQuestion(req: AuthRequest, res: Response) {
  return created(res, await PS.adminCreateQuestion(req.body));
}

export async function adminUpdateQuestion(req: AuthRequest, res: Response) {
  return ok(res, await PS.adminUpdateQuestion(Number(req.params.id), req.body));
}

export async function adminDeleteQuestion(req: AuthRequest, res: Response) {
  return ok(res, await PS.adminDeleteQuestion(Number(req.params.id)));
}

// ─── Universidades ───────────────────────────────────────────────────

export async function listUniversities(req: AuthRequest, res: Response) {
  return ok(res, await US.listUniversities(req.query.department as string | undefined));
}

export async function adminListUniversities(_req: AuthRequest, res: Response) {
  return ok(res, await US.adminListUniversities());
}

export async function adminCreateUniversity(req: AuthRequest, res: Response) {
  return created(res, await US.adminCreateUniversity(req.body));
}

export async function adminUpdateUniversity(req: AuthRequest, res: Response) {
  return ok(res, await US.adminUpdateUniversity(Number(req.params.id), req.body));
}

// ─── Comentarios genéricos ───────────────────────────────────────────

export async function listComments(req: AuthRequest, res: Response) {
  const { targetType, targetId, page, limit } = req.query as unknown as {
    targetType: string; targetId: number; page: number; limit: number;
  };
  const { comments, total } = await CS.listComments(targetType, Number(targetId), Number(page), Number(limit));
  return paginated(res, comments, total, Number(page), Number(limit));
}

export async function createComment(req: AuthRequest, res: Response) {
  const comment = await CS.createComment(req.user!.id, req.body.targetType, req.body.targetId, req.body.body);
  return created(res, comment);
}

export async function deleteComment(req: AuthRequest, res: Response) {
  return ok(res, await CS.deleteComment(req.user!.id, Number(req.params.id)));
}

export async function voteComment(req: AuthRequest, res: Response) {
  return ok(res, await CS.voteComment(req.user!.id, Number(req.params.id), req.body.type));
}
