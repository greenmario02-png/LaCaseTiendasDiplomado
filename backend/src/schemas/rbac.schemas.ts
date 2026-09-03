import { z } from 'zod';

// ===== RBAC — Core de administración dinámico (01-spec-core-rbac.md) =====

export const createRoleSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[A-Z_]+$/, 'El código usa mayúsculas y guion bajo'),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const createPermissionSchema = z.object({
  code: z.string().min(1).max(80).regex(/^[a-z]+\.[a-z0-9.]+$/, 'Formato: modulo.accion'),
  name: z.string().min(1).max(100),
  module: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

export const updatePermissionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const createMenuSchema = z.object({
  code: z.string().min(1).max(80),
  label: z.string().min(1).max(100),
  path: z.string().min(1).max(150),
  icon: z.string().max(80).optional(),
  parentId: z.number().int().positive().nullable().optional(),
  module: z.string().max(50).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateMenuSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  path: z.string().min(1).max(150).optional(),
  icon: z.string().max(80).optional(),
  parentId: z.number().int().positive().nullable().optional(),
  module: z.string().max(50).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const setRolePermissionsSchema = z.object({
  permissionIds: z.array(z.number().int().positive()),
});

export const setRoleMenusSchema = z.object({
  menuIds: z.array(z.number().int().positive()),
});

export const setUserRolesSchema = z.object({
  roleIds: z.array(z.number().int().positive()),
});
