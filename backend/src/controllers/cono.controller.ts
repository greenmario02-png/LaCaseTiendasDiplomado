import { Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import { ok, created } from '../utils/response';
import * as CS from '../services/cono.service';

export async function createTheme(req: AuthRequest, res: Response) {
  return created(res, await CS.createTheme(req.user!.id, req.body));
}

export async function listThemes(req: AuthRequest, res: Response) {
  return ok(res, await CS.listThemes(req.query.type as 'MEME' | 'TOURNAMENT' | undefined));
}

export async function getThemeBySlug(req: AuthRequest, res: Response) {
  return ok(res, await CS.getThemeBySlug(String(req.params.slug)));
}

export async function createEntry(req: AuthRequest, res: Response) {
  return created(res, await CS.createEntry(req.user!.id, Number(req.params.themeId), req.body));
}

export async function getEntry(req: AuthRequest, res: Response) {
  return ok(res, await CS.getEntry(Number(req.params.id)));
}

export async function listEntries(req: AuthRequest, res: Response) {
  const window = req.query.window as 'daily' | 'weekly' | 'monthly' | undefined;
  return ok(res, await CS.listEntries(Number(req.params.themeId), window));
}

export async function voteEntry(req: AuthRequest, res: Response) {
  return ok(res, await CS.voteEntry(req.user!.id, Number(req.params.id), req.body.value));
}

export async function createMatch(req: AuthRequest, res: Response) {
  return created(res, await CS.createMatch(req.user!.id, req.body));
}

export async function listMatches(req: AuthRequest, res: Response) {
  return ok(res, await CS.listMatches(Number(req.params.themeId)));
}

export async function voteMatch(req: AuthRequest, res: Response) {
  return ok(res, await CS.voteMatch(req.user!.id, Number(req.params.id), req.body.choice));
}
