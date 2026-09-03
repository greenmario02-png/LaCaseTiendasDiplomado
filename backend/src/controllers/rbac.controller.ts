import { NextFunction, Response } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { ok, created } from '../utils/response';
import {
  createRoleSchema,
  updateRoleSchema,
  createPermissionSchema,
  updatePermissionSchema,
  createMenuSchema,
  updateMenuSchema,
  setRolePermissionsSchema,
  setRoleMenusSchema,
  setUserRolesSchema,
} from '../schemas/rbac.schemas';

// Fallback por rol primario (User.role enum) cuando el usuario NO tiene user_roles configurados.
const FALLBACK_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'admin.dashboard',
    'admin.users.manage',
    'admin.rbac.manage',
    'admin.reports.view',
    'seller.products.manage',
    'seller.store.manage',
    'forum.post',
    'forum.moderate',
    'forum.geo.manage',
  ],
  SELLER: ['seller.products.manage', 'seller.store.manage', 'forum.post'],
  CUSTOMER: ['forum.post'],
};

const FALLBACK_MENU_CODES: Record<string, string[]> = {
  ADMIN: ['admin.*', 'seller.*', 'public.*'],
  SELLER: ['seller.*', 'public.*'],
  CUSTOMER: ['public.*'],
};

/** Devuelve el rol RBAC efectivo del usuario: user_roles configurados o el rol primario mapeado. */
async function rbacRoleIdsForUser(userId: number, primaryRole: string): Promise<number[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: { roleId: true },
  });
  if (userRoles.length > 0) return userRoles.map((r) => r.roleId);
  const role = await prisma.rbacRole.findUnique({ where: { code: primaryRole } });
  return role ? [role.id] : [];
}

// ===== ROLES =====

export async function listRoles(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const roles = await prisma.rbacRole.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { permissions: true, menus: true, users: true } },
        permissions: { select: { permissionId: true } },
        menus: { select: { menuId: true } },
      },
    });
    ok(res, roles);
  } catch (error) {
    next(error);
  }
}

export async function createRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createRoleSchema.parse(req.body);
    const exists = await prisma.rbacRole.findUnique({ where: { code: data.code } });
    if (exists) throw ApiError.badRequest('Ya existe un rol con ese código');
    if (Object.values(Role).includes(data.code as Role)) {
      throw ApiError.badRequest('El código coincide con un rol del sistema; elegí otro');
    }
    const role = await prisma.rbacRole.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        isActive: data.isActive ?? true,
      },
    });
    created(res, role);
  } catch (error) {
    next(error);
  }
}

export async function updateRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw ApiError.badRequest('ID de rol inválido');
    const data = updateRoleSchema.parse(req.body);
    const existing = await prisma.rbacRole.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Rol no encontrado');
    if (data.isActive === false && existing.isSystem) {
      throw ApiError.badRequest('No se puede desactivar un rol del sistema');
    }
    const role = await prisma.rbacRole.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
    ok(res, role);
  } catch (error) {
    next(error);
  }
}

export async function deleteRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw ApiError.badRequest('ID de rol inválido');
    const existing = await prisma.rbacRole.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Rol no encontrado');
    if (existing.isSystem) throw ApiError.forbidden('No se puede eliminar un rol del sistema');
    await prisma.rbacRole.delete({ where: { id } });
    ok(res, { deleted: true });
  } catch (error) {
    next(error);
  }
}

// ===== PERMISOS =====

export async function listPermissions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const module = (req.query.module as string | undefined)?.trim();
    const permissions = await prisma.permission.findMany({
      where: module ? { module } : undefined,
      orderBy: { id: 'asc' },
      include: { _count: { select: { roles: true } } },
    });
    ok(res, permissions);
  } catch (error) {
    next(error);
  }
}

export async function createPermission(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createPermissionSchema.parse(req.body);
    const exists = await prisma.permission.findUnique({ where: { code: data.code } });
    if (exists) throw ApiError.badRequest('Ya existe un permiso con ese código');
    const permission = await prisma.permission.create({
      data: {
        code: data.code,
        name: data.name,
        module: data.module ?? 'core',
        isActive: data.isActive ?? true,
      },
    });
    created(res, permission);
  } catch (error) {
    next(error);
  }
}

export async function updatePermission(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw ApiError.badRequest('ID de permiso inválido');
    const data = updatePermissionSchema.parse(req.body);
    const permission = await prisma.permission.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
    ok(res, permission);
  } catch (error) {
    next(error);
  }
}

export async function deletePermission(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw ApiError.badRequest('ID de permiso inválido');
    await prisma.permission.delete({ where: { id } });
    ok(res, { deleted: true });
  } catch (error) {
    next(error);
  }
}

// ===== MENÚS =====

export async function listMenus(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const menus = await prisma.menu.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { roles: true } } },
    });
    // Árbol por parentId (root = parentId null), children ordenados.
    const byId = new Map<number, any>();
    menus.forEach((m) => byId.set(m.id, { ...m, children: [] }));
    const roots: any[] = [];
    byId.forEach((node) => {
      if (node.parentId != null && byId.has(node.parentId)) {
        byId.get(node.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });
    ok(res, roots);
  } catch (error) {
    next(error);
  }
}

export async function createMenu(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createMenuSchema.parse(req.body);
    const exists = await prisma.menu.findUnique({ where: { code: data.code } });
    if (exists) throw ApiError.badRequest('Ya existe un menú con ese código');
    const menu = await prisma.menu.create({
      data: {
        code: data.code,
        label: data.label,
        path: data.path,
        icon: data.icon ?? null,
        parentId: data.parentId ?? null,
        module: data.module ?? 'core',
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
    created(res, menu);
  } catch (error) {
    next(error);
  }
}

export async function updateMenu(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw ApiError.badRequest('ID de menú inválido');
    const data = updateMenuSchema.parse(req.body);
    const menu = await prisma.menu.update({
      where: { id },
      data: {
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.path !== undefined ? { path: data.path } : {}),
        ...(data.icon !== undefined ? { icon: data.icon ?? null } : {}),
        ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
        ...(data.module !== undefined ? { module: data.module } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
    ok(res, menu);
  } catch (error) {
    next(error);
  }
}

export async function deleteMenu(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw ApiError.badRequest('ID de menú inválido');
    await prisma.menu.delete({ where: { id } });
    ok(res, { deleted: true });
  } catch (error) {
    next(error);
  }
}

// ===== ASIGNACIONES =====

export async function setRolePermissions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleId = Number(req.params.id);
    if (!Number.isInteger(roleId)) throw ApiError.badRequest('ID de rol inválido');
    const { permissionIds } = setRolePermissionsSchema.parse(req.body);
    const role = await prisma.rbacRole.findUnique({ where: { id: roleId } });
    if (!role) throw ApiError.notFound('Rol no encontrado');
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      prisma.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId, permissionId })), skipDuplicates: true }),
    ]);
    ok(res, { roleId, permissionIds });
  } catch (error) {
    next(error);
  }
}

export async function setRoleMenus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleId = Number(req.params.id);
    if (!Number.isInteger(roleId)) throw ApiError.badRequest('ID de rol inválido');
    const { menuIds } = setRoleMenusSchema.parse(req.body);
    const role = await prisma.rbacRole.findUnique({ where: { id: roleId } });
    if (!role) throw ApiError.notFound('Rol no encontrado');
    await prisma.$transaction([
      prisma.roleMenu.deleteMany({ where: { roleId } }),
      prisma.roleMenu.createMany({ data: menuIds.map((menuId) => ({ roleId, menuId })), skipDuplicates: true }),
    ]);
    ok(res, { roleId, menuIds });
  } catch (error) {
    next(error);
  }
}

export async function setUserRoles(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) throw ApiError.badRequest('ID de usuario inválido');
    const { roleIds } = setUserRolesSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('Usuario no encontrado');
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId } }),
      prisma.userRole.createMany({ data: roleIds.map((roleId) => ({ userId, roleId })), skipDuplicates: true }),
    ]);
    ok(res, { userId, roleIds });
  } catch (error) {
    next(error);
  }
}

export async function getUserRoles(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) throw ApiError.badRequest('ID de usuario inválido');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw ApiError.notFound('Usuario no encontrado');
    const rows = await prisma.userRole.findMany({
      where: { userId },
      select: { roleId: true },
    });
    ok(res, { userId, roleIds: rows.map((r) => r.roleId) });
  } catch (error) {
    next(error);
  }
}

// ===== ME (menús y permisos del usuario logueado) =====

export async function getMyMenus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const roleIds = await rbacRoleIdsForUser(userId, req.user!.role);
    if (roleIds.length === 0) return ok(res, []);
    const assigned = await prisma.roleMenu.findMany({
      where: { roleId: { in: roleIds } },
      select: { menuId: true },
    });
    let menus = await prisma.menu.findMany({
      where: { id: { in: assigned.map((r) => r.menuId) }, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    // Fallback al rol primario si el usuario no tiene menús asignados explícitamente.
    if (menus.length === 0 && !(await prisma.userRole.count({ where: { userId } }))) {
      const patterns = FALLBACK_MENU_CODES[req.user!.role] ?? ['public.*'];
      menus = await prisma.menu.findMany({
        where: {
          isActive: true,
          OR: patterns.map((p) => (p.endsWith('.*') ? { code: { startsWith: p.slice(0, -1) } } : { code: p })),
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      });
    }
    ok(res, menus);
  } catch (error) {
    next(error);
  }
}

export async function getMyPermissions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const roleIds = await rbacRoleIdsForUser(userId, req.user!.role);
    if (roleIds.length === 0) return ok(res, []);
    const assigned = await prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      select: { permissionId: true },
    });
    let permissions = await prisma.permission.findMany({
      where: { id: { in: assigned.map((r) => r.permissionId) }, isActive: true },
      orderBy: { id: 'asc' },
    });
    if (permissions.length === 0 && !(await prisma.userRole.count({ where: { userId } }))) {
      const codes = FALLBACK_PERMISSIONS[req.user!.role] ?? ['forum.post'];
      permissions = await prisma.permission.findMany({
        where: { code: { in: codes }, isActive: true },
        orderBy: { id: 'asc' },
      });
    }
    ok(res, permissions.map((p) => p.code));
  } catch (error) {
    next(error);
  }
}
