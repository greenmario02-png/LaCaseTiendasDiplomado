import { create } from 'zustand';
import { api } from '../services/api';

export interface RbacMenu {
  id: number;
  code: string;
  label: string;
  path: string;
  icon?: string | null;
  parentId?: number | null;
  module: string;
  sortOrder: number;
  isActive?: boolean;
}

interface RbacStore {
  menus: RbacMenu[];
  permissions: string[];
  loaded: boolean;
  /** Carga los menús y permisos RBAC del usuario actual (GET /api/rbac/me/menus + /me/permissions). */
  loadRbac: () => Promise<void>;
  /** Limpia el estado (logout). */
  reset: () => void;
}

export const useRbacStore = create<RbacStore>((set) => ({
  menus: [],
  permissions: [],
  loaded: false,

  loadRbac: async () => {
    try {
      const [menusRes, permsRes] = await Promise.all([
        api.get('/rbac/me/menus').then((r) => r.data?.data ?? []),
        api.get('/rbac/me/permissions').then((r) => r.data?.data ?? []),
      ]);
      set({ menus: menusRes, permissions: permsRes, loaded: true });
    } catch {
      // Sin sesión o fallo de red: se deja vacío → los layouts usan el menú estático (fallback).
      set({ menus: [], permissions: [], loaded: true });
    }
  },

  reset: () => set({ menus: [], permissions: [], loaded: false }),
}));
