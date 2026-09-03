import { Request, Response } from 'express';

import * as authService from '../services/auth.service';
import * as affiliateController from './affiliate.controller';
import * as coinsController from './coins.controller';
import { AuthRequest } from '../middlewares/auth';
import { ok, created } from '../utils/response';
import { ApiError } from '../utils/errors';

export async function register(req: Request, res: Response) {
  const user = await authService.registerUser(req.body);
  const referralCode = (req.body as any).referralCode;
  if (referralCode && user.id) {
    await affiliateController.applyReferral(user.id, referralCode);
    await coinsController.applyInviteCode(user.id, referralCode);
  }
  return created(res, user);
}

export async function registerSeller(req: Request, res: Response) {
  const user = await authService.registerSeller(req.body);
  const referralCode = (req.body as any).referralCode;
  if (referralCode && user.id) {
    await affiliateController.applyReferral(user.id, referralCode);
    await coinsController.applyInviteCode(user.id, referralCode);
  }
  return created(res, user);
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body.email, req.body.password);
  return ok(res, result);
}

export async function refresh(req: Request, res: Response) {
  const accessToken = await authService.refresh(req.body.refreshToken);
  return ok(res, { accessToken });
}

export async function logout(req: Request, res: Response) {
  if (!req.body.refreshToken) throw ApiError.badRequest('refreshToken obligatorio');
  await authService.logout(req.body.refreshToken);
  return ok(res, { message: 'Sesión cerrada' });
}

export async function me(req: AuthRequest, res: Response) {
  const user = await authService.findUserById(req.user!.id);
  return ok(res, user);
}

export async function verifyPassword(req: AuthRequest, res: Response) {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    throw ApiError.badRequest('La contraseña es obligatoria');
  }
  const valid = await authService.verifyPassword(req.user!.id, password);
  if (!valid) throw ApiError.unauthorized('Contraseña incorrecta');
  return ok(res, { verified: true });
}
