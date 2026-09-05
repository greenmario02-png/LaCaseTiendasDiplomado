import { useEffect, useState } from 'react';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Autocomplete,
  CircularProgress,
  Divider,
  Alert,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { api, getErrorMessage } from '../../services/api';
import { toast } from 'react-hot-toast';

interface RbacRole {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  _count: { permissions: number; menus: number; users: number };
  permissions: { permissionId: number }[];
  menus: { menuId: number }[];
}

interface RbacPermission {
  id: number;
  code: string;
  name: string;
  module: string;
  isActive: boolean;
}

interface RbacMenu {
  id: number;
  code: string;
  label: string;
  path: string;
  icon?: string | null;
  parentId?: number | null;
  module: string;
  sortOrder: number;
  isActive: boolean;
  children?: RbacMenu[];
}

const EMPTY_ROLE = { code: '', name: '', description: '', isActive: true };
const EMPTY_PERM = { code: '', name: '', module: 'core', isActive: true };
const EMPTY_MENU = { code: '', label: '', path: '', icon: '', parentId: '', module: 'core', sortOrder: '0', isActive: true };

function flatMenus(menus: RbacMenu[], depth = 0): (RbacMenu & { depth: number })[] {
  const out: (RbacMenu & { depth: number })[] = [];
  for (const m of menus) {
    out.push({ ...m, depth });
    if (m.children?.length) out.push(...flatMenus(m.children, depth + 1));
  }
  return out;
}

export default function AdminRbac() {
  const [tab, setTab] = useState(0);

  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [permissions, setPermissions] = useState<RbacPermission[]>([]);
  const [menus, setMenus] = useState<RbacMenu[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [roleOpen, setRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RbacRole | null>(null);
  const [roleForm, setRoleForm] = useState({ ...EMPTY_ROLE });

  const [permOpen, setPermOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState<RbacPermission | null>(null);
  const [permForm, setPermForm] = useState({ ...EMPTY_PERM });

  const [menuOpen, setMenuOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<RbacMenu | null>(null);
  const [menuForm, setMenuForm] = useState({ ...EMPTY_MENU });

  // Asignaciones
  const [selRoleId, setSelRoleId] = useState<number | ''>('');
  const [rolePermSel, setRolePermSel] = useState<Set<number>>(new Set());
  const [roleMenuSel, setRoleMenuSel] = useState<Set<number>>(new Set());
  const [savingAssign, setSavingAssign] = useState(false);
  const [selUserId, setSelUserId] = useState<any | null>(null);
  const [userRolesSel, setUserRolesSel] = useState<Set<number>>(new Set());
  const [savingUserRoles, setSavingUserRoles] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [r, p, m, u] = await Promise.all([
        api.get('/admin/rbac/roles').then((x) => x.data?.data ?? []),
        api.get('/admin/rbac/permissions').then((x) => x.data?.data ?? []),
        api.get('/admin/rbac/menus').then((x) => x.data?.data ?? []),
        api.get('/admin/users', { params: { limit: 50 } }).then((x) => x.data?.data ?? []),
      ]);
      setRoles(r);
      setPermissions(p);
      setMenus(m);
      setUsers(u);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab !== 3) return;
    if (selRoleId === '') {
      setRolePermSel(new Set());
      setRoleMenuSel(new Set());
      return;
    }
    const role = roles.find((x) => x.id === selRoleId);
    if (role) {
      setRolePermSel(new Set(role.permissions.map((x) => x.permissionId)));
      setRoleMenuSel(new Set(role.menus.map((x) => x.menuId)));
    }
  }, [tab, selRoleId, roles]);

  // ===== Roles =====
  const openRole = (role?: RbacRole) => {
    setEditingRole(role ?? null);
    setRoleForm(role ? { code: role.code, name: role.name, description: role.description ?? '', isActive: role.isActive } : { ...EMPTY_ROLE });
    setRoleOpen(true);
  };

  const saveRole = async () => {
    try {
      if (!/^[A-Z_]+$/.test(roleForm.code)) {
        toast.error('El código solo puede contener letras mayúsculas y guión bajo (ej: SOPORTE)');
        return;
      }
      if (!roleForm.name.trim()) {
        toast.error('Escribí el nombre del rol');
        return;
      }
      const payload = { ...roleForm, description: roleForm.description?.trim() || undefined };
      if (editingRole) {
        await api.put(`/admin/rbac/roles/${editingRole.id}`, { name: payload.name, description: payload.description, isActive: payload.isActive });
        toast.success('Rol actualizado');
      } else {
        await api.post('/admin/rbac/roles', payload);
        toast.success('Rol creado');
      }
      setRoleOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const deleteRole = async (role: RbacRole) => {
    if (!window.confirm(`¿Eliminar el rol "${role.name}"?`)) return;
    try {
      await api.delete(`/admin/rbac/roles/${role.id}`);
      toast.success('Rol eliminado');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // ===== Permisos =====
  const openPerm = (perm?: RbacPermission) => {
    setEditingPerm(perm ?? null);
    setPermForm(perm ? { code: perm.code, name: perm.name, module: perm.module, isActive: perm.isActive } : { ...EMPTY_PERM });
    setPermOpen(true);
  };

  const savePerm = async () => {
    try {
      if (!/^[a-z]+\.[a-z0-9.]+$/.test(permForm.code)) {
        toast.error('El código del permiso debe ser tipo "modulo.accion" (ej: users.manage)');
        return;
      }
      if (!permForm.name.trim()) {
        toast.error('Escribí el nombre del permiso');
        return;
      }
      const payload = { ...permForm, module: permForm.module || 'core' };
      if (editingPerm) {
        await api.put(`/admin/rbac/permissions/${editingPerm.id}`, { name: payload.name, isActive: payload.isActive });
        toast.success('Permiso actualizado');
      } else {
        await api.post('/admin/rbac/permissions', payload);
        toast.success('Permiso creado');
      }
      setPermOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const deletePerm = async (perm: RbacPermission) => {
    if (!window.confirm(`¿Eliminar el permiso "${perm.code}"?`)) return;
    try {
      await api.delete(`/admin/rbac/permissions/${perm.id}`);
      toast.success('Permiso eliminado');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // ===== Menús =====
  const openMenu = (menu?: RbacMenu) => {
    setEditingMenu(menu ?? null);
    setMenuForm(
      menu
        ? {
            code: menu.code,
            label: menu.label,
            path: menu.path,
            icon: menu.icon ?? '',
            parentId: menu.parentId ? String(menu.parentId) : '',
            module: menu.module,
            sortOrder: String(menu.sortOrder),
            isActive: menu.isActive,
          }
        : { ...EMPTY_MENU },
    );
    setMenuOpen(true);
  };

  const saveMenu = async () => {
    try {
      if (!menuForm.code.trim() || !menuForm.label.trim() || !menuForm.path.trim()) {
        toast.error('Código, nombre y ruta son obligatorios');
        return;
      }
      const payload = {
        code: menuForm.code.trim(),
        label: menuForm.label.trim(),
        path: menuForm.path.trim(),
        icon: menuForm.icon?.trim() || undefined,
        parentId: menuForm.parentId ? Number(menuForm.parentId) : undefined,
        module: menuForm.module || 'core',
        sortOrder: Number(menuForm.sortOrder) || 0,
        isActive: menuForm.isActive,
      };
      if (editingMenu) {
        await api.put(`/admin/rbac/menus/${editingMenu.id}`, payload);
        toast.success('Menú actualizado');
      } else {
        await api.post('/admin/rbac/menus', payload);
        toast.success('Menú creado');
      }
      setMenuOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const deleteMenu = async (menu: RbacMenu) => {
    if (!window.confirm(`¿Eliminar el menú "${menu.label}" (con sus hijos)?`)) return;
    try {
      await api.delete(`/admin/rbac/menus/${menu.id}`);
      toast.success('Menú eliminado');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // ===== Asignaciones =====
  const saveRoleAssignments = async () => {
    setSavingAssign(true);
    try {
      await api.put(`/admin/rbac/roles/${selRoleId}/permissions`, { permissionIds: [...rolePermSel] });
      await api.put(`/admin/rbac/roles/${selRoleId}/menus`, { menuIds: [...roleMenuSel] });
      toast.success('Asignaciones del rol guardadas');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingAssign(false);
    }
  };

  const pickUser = async (user: any) => {
    setSelUserId(user);
    setUserRolesSel(new Set());
    if (!user) return;
    try {
      const res = await api.get(`/admin/rbac/users/${user.id}/roles`);
      setUserRolesSel(new Set(res.data?.data?.roleIds ?? []));
    } catch {
      setUserRolesSel(new Set());
    }
  };

  const saveUserRoles = async () => {
    if (!selUserId) return;
    setSavingUserRoles(true);
    try {
      await api.put(`/admin/rbac/users/${selUserId.id}/roles`, { roleIds: [...userRolesSel] });
      toast.success(`Roles asignados a ${selUserId.firstName} ${selUserId.lastName}`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingUserRoles(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Roles y permisos
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Core de administración dinámico: roles, permisos, menús y asignaciones (rol→permiso, rol→menú, usuario→rol).
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Roles" />
        <Tab label="Permisos" />
        <Tab label="Menús" />
        <Tab label="Asignaciones" />
      </Tabs>

      {/* ===== TAB ROLES ===== */}
      {tab === 0 && (
        <Paper sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Roles ({roles.length})</Typography>
            <PrimaryButton startIcon={<AddIcon />} onClick={() => openRole()}>
              Nuevo rol
            </PrimaryButton>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Sistema</TableCell>
                  <TableCell>Activo</TableCell>
                  <TableCell align="center">Permisos</TableCell>
                  <TableCell align="center">Menús</TableCell>
                  <TableCell align="center">Usuarios</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell sx={{ fontWeight: 700 }}>{role.code}</TableCell>
                    <TableCell>{role.name}</TableCell>
                    <TableCell>{role.description || '—'}</TableCell>
                    <TableCell>
                      {role.isSystem ? <Chip label="Sistema" size="small" color="primary" /> : <Chip label="Personalizado" size="small" variant="outlined" />}
                    </TableCell>
                    <TableCell>
                      <Chip label={role.isActive ? 'Activo' : 'Inactivo'} size="small" color={role.isActive ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="center">{role._count?.permissions ?? 0}</TableCell>
                    <TableCell align="center">{role._count?.menus ?? 0}</TableCell>
                    <TableCell align="center">{role._count?.users ?? 0}</TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => openRole(role)} title="Editar">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      {!role.isSystem && (
                        <IconButton size="small" color="error" onClick={() => deleteRole(role)} title="Eliminar">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ===== TAB PERMISOS ===== */}
      {tab === 1 && (
        <Paper sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Permisos ({permissions.length})</Typography>
            <PrimaryButton startIcon={<AddIcon />} onClick={() => openPerm()}>
              Nuevo permiso
            </PrimaryButton>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Módulo</TableCell>
                  <TableCell>Activo</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {permissions.map((perm) => (
                  <TableRow key={perm.id}>
                    <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{perm.code}</TableCell>
                    <TableCell>{perm.name}</TableCell>
                    <TableCell>
                      <Chip label={perm.module} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip label={perm.isActive ? 'Activo' : 'Inactivo'} size="small" color={perm.isActive ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => openPerm(perm)} title="Editar">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => deletePerm(perm)} title="Eliminar">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ===== TAB MENÚS ===== */}
      {tab === 2 && (
        <Paper sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Menús ({flatMenus(menus).length})</Typography>
            <PrimaryButton startIcon={<AddIcon />} onClick={() => openMenu()}>
              Nuevo menú
            </PrimaryButton>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Ruta</TableCell>
                  <TableCell>Módulo</TableCell>
                  <TableCell>Orden</TableCell>
                  <TableCell>Activo</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {flatMenus(menus).map((menu) => (
                  <TableRow key={menu.id}>
                    <TableCell sx={{ fontFamily: 'monospace', pl: 2 + menu.depth * 2 }}>
                      {menu.depth > 0 ? '↳ ' : ''}
                      {menu.code}
                    </TableCell>
                    <TableCell>{menu.label}</TableCell>
                    <TableCell>{menu.path}</TableCell>
                    <TableCell>
                      <Chip label={menu.module} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{menu.sortOrder}</TableCell>
                    <TableCell>
                      <Chip label={menu.isActive ? 'Activo' : 'Inactivo'} size="small" color={menu.isActive ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => openMenu(menu)} title="Editar">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => deleteMenu(menu)} title="Eliminar">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ===== TAB ASIGNACIONES ===== */}
      {tab === 3 && (
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={1}>
              Asignar permisos y menús a un rol
            </Typography>
            <TextField select label="Rol" value={selRoleId} onChange={(e) => setSelRoleId(Number(e.target.value))} size="small" sx={{ mb: 2, minWidth: 260 }}>
              <MenuItem value="">Seleccioná un rol…</MenuItem>
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </MenuItem>
              ))}
            </TextField>

            {selRoleId !== '' && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" mb={1}>
                  Permisos
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
                  {permissions.map((p) => (
                    <FormControlLabel
                      key={p.id}
                      control={
                        <Checkbox
                          size="small"
                          checked={rolePermSel.has(p.id)}
                          onChange={(e) => {
                            const next = new Set(rolePermSel);
                            if (e.target.checked) next.add(p.id);
                            else next.delete(p.id);
                            setRolePermSel(next);
                          }}
                        />
                      }
                      label={`${p.name} (${p.code})`}
                    />
                  ))}
                </Box>
                <Typography variant="subtitle2" mb={1}>
                  Menús
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
                  {flatMenus(menus).map((m) => (
                    <FormControlLabel
                      key={m.id}
                      control={
                        <Checkbox
                          size="small"
                          checked={roleMenuSel.has(m.id)}
                          onChange={(e) => {
                            const next = new Set(roleMenuSel);
                            if (e.target.checked) next.add(m.id);
                            else next.delete(m.id);
                            setRoleMenuSel(next);
                          }}
                        />
                      }
                      label={`${m.depth > 0 ? '↳ ' : ''}${m.label} (${m.path})`}
                    />
                  ))}
                </Box>
                <PrimaryButton disabled={savingAssign} onClick={saveRoleAssignments}>
                  {savingAssign ? 'Guardando…' : 'Guardar asignaciones del rol'}
                </PrimaryButton>
              </>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={1}>
              Asignar roles a un usuario
            </Typography>
            <Autocomplete
              options={users}
              getOptionLabel={(u: any) => `${u.firstName} ${u.lastName} — ${u.email} (${u.role})`}
              isOptionEqualToValue={(a: any, b: any) => a.id === b.id}
              value={selUserId}
              onChange={(_e, v) => pickUser(v)}
              size="small"
              sx={{ mb: 2, minWidth: 320 }}
              renderInput={(params) => <TextField {...params} label="Buscar usuario" />}
            />
            {selUserId && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" mb={1}>
                  Roles de {selUserId.firstName} {selUserId.lastName}
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
                  {roles.map((r) => (
                    <FormControlLabel
                      key={r.id}
                      control={
                        <Checkbox
                          size="small"
                          checked={userRolesSel.has(r.id)}
                          onChange={(e) => {
                            const next = new Set(userRolesSel);
                            if (e.target.checked) next.add(r.id);
                            else next.delete(r.id);
                            setUserRolesSel(next);
                          }}
                        />
                      }
                      label={`${r.name} (${r.code})`}
                    />
                  ))}
                </Box>
                <PrimaryButton disabled={savingUserRoles} onClick={saveUserRoles}>
                  {savingUserRoles ? 'Guardando…' : 'Guardar roles del usuario'}
                </PrimaryButton>
                <Alert severity="info" sx={{ mt: 2 }}>
                  El rol primario ({selUserId.role}) del usuario se mantiene; estos roles se suman y amplían sus permisos y menús.
                </Alert>
              </>
            )}
          </Paper>
        </Stack>
      )}

      {/* ===== DIALOG ROL ===== */}
      <Dialog open={roleOpen} onClose={() => setRoleOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingRole ? 'Editar rol' : 'Nuevo rol'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Código"
              value={roleForm.code}
              onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value })}
              disabled={!!editingRole}
              helperText="Solo mayúsculas y guión bajo (ej: SOPORTE)"
              fullWidth
              size="small"
            />
            <TextField label="Nombre" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} fullWidth size="small" />
            <TextField
              label="Descripción"
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              fullWidth
              size="small"
              multiline
              minRows={2}
            />
            <FormControlLabel
              control={
                <Checkbox checked={roleForm.isActive} onChange={(e) => setRoleForm({ ...roleForm, isActive: e.target.checked })} disabled={!!editingRole && editingRole.isSystem} />
              }
              label="Activo"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setRoleOpen(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={saveRole}>
            {editingRole ? 'Guardar cambios' : 'Crear rol'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* ===== DIALOG PERMISO ===== */}
      <Dialog open={permOpen} onClose={() => setPermOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingPerm ? 'Editar permiso' : 'Nuevo permiso'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Código"
              value={permForm.code}
              onChange={(e) => setPermForm({ ...permForm, code: e.target.value })}
              disabled={!!editingPerm}
              helperText={'Tipo "modulo.accion" (ej: users.manage)'}
              fullWidth
              size="small"
            />
            <TextField label="Nombre" value={permForm.name} onChange={(e) => setPermForm({ ...permForm, name: e.target.value })} fullWidth size="small" />
            <TextField
              select
              label="Módulo"
              value={permForm.module}
              onChange={(e) => setPermForm({ ...permForm, module: e.target.value })}
              fullWidth
              size="small"
            >
              {['core', 'admin', 'seller', 'forum'].map((mod) => (
                <MenuItem key={mod} value={mod}>
                  {mod}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel control={<Checkbox checked={permForm.isActive} onChange={(e) => setPermForm({ ...permForm, isActive: e.target.checked })} />} label="Activo" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setPermOpen(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={savePerm}>
            {editingPerm ? 'Guardar cambios' : 'Crear permiso'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* ===== DIALOG MENÚ ===== */}
      <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingMenu ? 'Editar menú' : 'Nuevo menú'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Código" value={menuForm.code} onChange={(e) => setMenuForm({ ...menuForm, code: e.target.value })} disabled={!!editingMenu} helperText="ej: admin.dashboard" fullWidth size="small" />
            <TextField label="Nombre" value={menuForm.label} onChange={(e) => setMenuForm({ ...menuForm, label: e.target.value })} fullWidth size="small" />
            <TextField label="Ruta" value={menuForm.path} onChange={(e) => setMenuForm({ ...menuForm, path: e.target.value })} helperText="ej: /admin" fullWidth size="small" />
            <TextField label="Ícono" value={menuForm.icon} onChange={(e) => setMenuForm({ ...menuForm, icon: e.target.value })} helperText="Nombre del ícono MUI (opcional)" fullWidth size="small" />
            <TextField
              select
              label="Menú padre"
              value={menuForm.parentId}
              onChange={(e) => setMenuForm({ ...menuForm, parentId: e.target.value })}
              fullWidth
              size="small"
            >
              <MenuItem value="">— Sin padre (raíz) —</MenuItem>
              {flatMenus(menus)
                .filter((m) => m.id !== editingMenu?.id)
                .map((m) => (
                  <MenuItem key={m.id} value={String(m.id)}>
                    {m.label} ({m.code})
                  </MenuItem>
                ))}
            </TextField>
            <TextField select label="Módulo" value={menuForm.module} onChange={(e) => setMenuForm({ ...menuForm, module: e.target.value })} fullWidth size="small">
              {['core', 'admin', 'seller', 'forum', 'public'].map((mod) => (
                <MenuItem key={mod} value={mod}>
                  {mod}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Orden"
              type="number"
              value={menuForm.sortOrder}
              onChange={(e) => setMenuForm({ ...menuForm, sortOrder: e.target.value })}
              fullWidth
              size="small"
            />
            <FormControlLabel control={<Checkbox checked={menuForm.isActive} onChange={(e) => setMenuForm({ ...menuForm, isActive: e.target.checked })} />} label="Activo" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setMenuOpen(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={saveMenu}>
            {editingMenu ? 'Guardar cambios' : 'Crear menú'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
