import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';

// ===== RBAC — requirePermission + caché de permisos (01-spec-core-rbac.md) =====

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map<number, { codes: Set<string>; at: number }>();

/** Permisos (codes) efectivos de un usuario, con caché de 60 s. */
export async function getUserPermissionCodes(userId: number, primaryRole: string): Promise<Set<string>> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.codes;

  // ADMIN (rol primario) siempre pasa.
  if (primaryRole === 'ADMIN') {
    const codes = new Set<string>(['*']);
    cache.set(userId, { codes, at: Date.now() });
    return codes;
  }

  const userRoles = await prisma.userRole.findMany({ where: { userId }, select: { roleId: true } });
  if (userRoles.length > 0) {
    const assigned = await prisma.rolePermission.findMany({
      where: { roleId: { in: userRoles.map((r) => r.roleId) } },
      select: { permission: { select: { code: true, isActive: true } } },
    });
    const codes = new Set(assigned.filter((a) => a.permission.isActive).map((a) => a.permission.code));
    cache.set(userId, { codes, at: Date.now() });
    return codes;
  }

  // Fallback: mapeo estático del rol primario. La moderación de foro nunca sale de acá —
  // siempre requiere una asignación explícita del RbacRole `MODERADOR_FORO` (ver roles.ts).
  const FALLBACK: Record<string, string[]> = {
    SELLER: ['seller.products.manage', 'seller.store.manage', 'forum.post'],
    CUSTOMER: ['forum.post'],
  };
  const codes = new Set(FALLBACK[primaryRole] ?? ['forum.post']);
  cache.set(userId, { codes, at: Date.now() });
  return codes;
}

/** Limpia la caché de un usuario (llamar tras cambiar sus roles). */
export function invalidateUserPermissions(userId: number): void {
  cache.delete(userId);
}

export function invalidateAllPermissions(): void {
  cache.clear();
}

/** Middleware: exige que el usuario tenga TODOS los códigos de permiso indicados. */
export function requirePermission(...codes: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next(ApiError.unauthorized('No autenticado'));
      const effective = await getUserPermissionCodes(req.user.id, req.user.role);
      if (effective.has('*') || codes.every((c) => effective.has(c))) return next();
      return next(ApiError.forbidden('No tenés el permiso necesario para esta acción'));
    } catch (error) {
      return next(error);
    }
  };
}
