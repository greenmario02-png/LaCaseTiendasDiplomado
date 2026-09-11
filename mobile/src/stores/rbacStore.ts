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

interface RbacState {
  /** Códigos de menú asignados al usuario (p. ej. 'admin.dashboard', 'seller.products'). */
  menuCodes: string[];
  /** Códigos de permiso del usuario (p. ej. 'forum.post', 'admin.rbac.manage'). */
  permissionCodes: string[];
  loaded: boolean;
  loadRbac: () => Promise<void>;
  reset: () => void;
  /** True si el usuario tiene el permiso (o es admin, que pasa siempre). */
  hasPermission: (code: string) => boolean;
}

/**
 * RBAC mínimo del móvil (01-spec-core-rbac.md §6): carga los menús y permisos
 * del usuario desde el backend para ocultar/mostrar ítems según el rol.
 * El backend ya aplica el fallback al rol primario si no hay user_roles.
 */
export const useRbacStore = create<RbacState>((set, get) => ({
  menuCodes: [],
  permissionCodes: [],
  loaded: false,

  loadRbac: async () => {
    try {
      const [m, p] = await Promise.all([
        api.get('/rbac/me/menus').catch(() => ({ data: { data: [] } })),
        api.get('/rbac/me/permissions').catch(() => ({ data: { data: [] } })),
      ]);
      const menus: RbacMenu[] = Array.isArray(m.data?.data) ? m.data.data : [];
      const perms: string[] = Array.isArray(p.data?.data) ? p.data.data : [];
      set({
        menuCodes: menus.map((x) => x.code),
        permissionCodes: perms,
        loaded: true,
      });
    } catch {
      set({ menuCodes: [], permissionCodes: [], loaded: true });
    }
  },

  reset: () => set({ menuCodes: [], permissionCodes: [], loaded: false }),

  hasPermission: (code: string) => {
    const perms = get().permissionCodes;
    return perms.includes('*') || perms.includes(code);
  },
}));
