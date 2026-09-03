import { NextFunction, Response } from 'express';

import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';

import { AuthRequest } from './auth';

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Rol insuficiente'));
    }
    next();
  };
}

export const requireAdmin = requireRole('ADMIN');
export const requireSeller = requireRole('SELLER', 'ADMIN');

/**
 * Solo administradores de tienda (OWNER o ADMIN) o el admin global.
 * Los empleados (EMPLOYEE) no pasan este middleware.
 */
export function requireStoreAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role === 'ADMIN') return next();
  if (req.user.role === 'SELLER' && (req.user.storeRole === 'OWNER' || req.user.storeRole === 'ADMIN')) return next();
  return next(ApiError.forbidden('Solo el administrador de la tienda puede realizar esta acción'));
}

/**
 * La moderación del foro no es un rol de plataforma aparte: es una asignación RBAC
 * (rol `MODERADOR_FORO`, ver prisma/seed.ts) sobre un usuario CUSTOMER o SELLER cualquiera.
 * Esta función es la única fuente de verdad para "¿este usuario modera el foro?".
 */
export async function isForumModerator(userId: number): Promise<boolean> {
  const assignment = await prisma.userRole.findFirst({
    where: { userId, role: { code: 'MODERADOR_FORO', isActive: true } },
  });
  return assignment !== null;
}

/**
 * Solo staff del foro: ADMIN global o un usuario con la asignación RBAC `MODERADOR_FORO`.
 */
export async function requireForumStaff(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role === 'ADMIN') return next();
  try {
    if (await isForumModerator(req.user.id)) return next();
    return next(ApiError.forbidden('Solo el staff del foro puede realizar esta acción'));
  } catch (error) {
    return next(error);
  }
}

/**
 * Moderación por departamento: ADMIN pasa siempre; un moderador asignado (`MODERADOR_FORO`)
 * solo si su propio `ForumProfile.department` coincide con el departamento pedido — un
 * moderador modera el departamento donde vive, no toda Bolivia.
 */
export function requireDepartmentModerator(department: string) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.user.role === 'ADMIN') return next();
    try {
      if (!(await isForumModerator(req.user.id))) {
        return next(ApiError.forbidden('Solo el staff del foro puede realizar esta acción'));
      }
      const profile = await prisma.forumProfile.findUnique({
        where: { userId: req.user.id },
        select: { department: true },
      });
      if (profile && profile.department === department) return next();
      return next(ApiError.forbidden('Solo moderadores de este departamento'));
    } catch (error) {
      return next(error);
    }
  };
}
