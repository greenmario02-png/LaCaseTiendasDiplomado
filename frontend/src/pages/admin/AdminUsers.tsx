import { useEffect, useState } from 'react';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import { Star } from 'lucide-react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Autocomplete from '@mui/material/Autocomplete';
import { api } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

const EMPTY = { email: '', password: '', firstName: '', lastName: '', phone: '', role: 'CUSTOMER', storeName: '' };

export default function AdminUsers() {
  const money = useMoney();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUser, setInviteUser] = useState<any>(null);
  const [inviteRole, setInviteRole] = useState('CUSTOMER');
  const [inviteOptions, setInviteOptions] = useState<any[]>([]);
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviting, setInviting] = useState(false);

  const load = (role?: string) => {
    setLoading(true);
    api
      .get('/admin/users', { params: { limit: 200, ...(role ? { role } : {}) } })
      .then((res) => setUsers(res.data.data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(tab === 1 ? 'SELLER' : tab === 2 ? 'ADMIN' : undefined);
  }, [tab]);

  const update = async (userId: number, data: Record<string, unknown>) => {
    try {
      await api.put(`/admin/users/${userId}`, data);
      toast.success('Usuario actualizado');
      load(tab === 1 ? 'SELLER' : tab === 2 ? 'ADMIN' : undefined);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const createUser = async () => {
    if (!form.email || !form.password || !form.firstName || !form.lastName) {
      toast.error('Completá email, contraseña, nombre y apellido');
      return;
    }
    setCreating(true);
    try {
      await api.post('/admin/users', form);
      toast.success('Usuario creado');
      setCreateOpen(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (userId: number) => {
    try {
      const res = await api.get(`/admin/users/${userId}`);
      setDetail(res.data.data);
      setDetailOpen(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Búsqueda de usuarios existentes para invitar (debounce 300ms)
  useEffect(() => {
    if (!inviteOpen) return;
    const term = inviteSearch.trim();
    if (term.length < 2) {
      setInviteOptions([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .get('/admin/users', { params: { search: term, limit: 10 } })
        .then((res) => setInviteOptions(res.data.data))
        .catch(() => setInviteOptions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [inviteOpen, inviteSearch]);

  const handleInvite = async () => {
    if (!inviteUser) return;
    setInviting(true);
    try {
      await api.put(`/admin/users/${inviteUser.id}`, { role: inviteRole });
      toast.success(`Invitación enviada a ${inviteUser.firstName} ${inviteUser.lastName} como ${inviteRole.toLowerCase()}`);
      setInviteOpen(false);
      setInviteUser(null);
      setInviteRole('CUSTOMER');
      setInviteSearch('');
      setInviteOptions([]);
      load(tab === 1 ? 'SELLER' : tab === 2 ? 'ADMIN' : undefined);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setInviting(false);
    }
  };

  const roleFilter = tab === 0 ? 'Clientes' : tab === 1 ? 'Vendedores' : 'Admins';

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Clientes" />
          <Tab label="Vendedores" />
          <Tab label="Admins" />
        </Tabs>
        <Box display="flex" gap={1}>
          <SecondaryButton startIcon={<PersonAddIcon />} onClick={() => setInviteOpen(true)}>
            Invitar usuario
          </SecondaryButton>
          <PrimaryButton startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Nuevo usuario
          </PrimaryButton>
        </Box>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Usuario</TableCell>
                <TableCell>Email</TableCell>
                <TableCell align="center">Rol</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="right">Puntos</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary">Sin {roleFilter.toLowerCase()}</Typography>
                  </TableCell>
                </TableRow>
              )}
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {u.firstName} {u.lastName}
                    </Typography>
                    {u.storeName && (
                      <Typography variant="caption" color="primary">
                        🏪 {u.storeName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell align="center">
                    <Select
                      size="small"
                      value={u.role}
                      onChange={(e) => update(u.id, { role: e.target.value })}
                      disabled={u.role === 'ADMIN' && u.email === 'admin@pctienda.com'}
                    >
                      <MenuItem value="CUSTOMER">Cliente</MenuItem>
                      <MenuItem value="SELLER">Vendedor</MenuItem>
                      <MenuItem value="ADMIN">Admin</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={u.isActive ? 'Activo' : 'Bloqueado'}
                      size="small"
                      color={u.isActive ? 'success' : 'error'}
                      onClick={() => update(u.id, { isActive: !u.isActive })}
                      sx={{ cursor: 'pointer' }}
                    />
                  </TableCell>
                  <TableCell align="right">{u.gamerCoins}</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => openDetail(u.id)} title="Ver detalle">
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ===== DIALOG INVITAR USUARIO ===== */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invitar usuario</DialogTitle>
        <DialogContent dividers>
          <Box mb={2}>
            <Autocomplete
              options={inviteOptions}
              value={inviteUser}
              onChange={(_, v) => setInviteUser(v)}
              onInputChange={(_, v) => setInviteSearch(v)}
              getOptionLabel={(o: any) => `${o.firstName} ${o.lastName} — ${o.email}`}
              isOptionEqualToValue={(o: any, v: any) => o.id === v.id}
              filterOptions={(x) => x}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Buscar usuario por email o nombre"
                  placeholder="Escribí al menos 2 letras..."
                  fullWidth
                />
              )}
              renderOption={(props, o: any) => (
                <li {...props} key={o.id}>
                  {o.firstName} {o.lastName} — {o.email}
                </li>
              )}
            />
            <Typography variant="caption" color="text.secondary">
              Buscá un usuario ya registrado para invitarlo a la plataforma con el rol que elijas.
            </Typography>
          </Box>
          <TextField
            select
            label="Rol"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            fullWidth
          >
            <MenuItem value="CUSTOMER">Cliente</MenuItem>
            <MenuItem value="SELLER">Vendedor</MenuItem>
            <MenuItem value="ADMIN">Admin</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setInviteOpen(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={handleInvite} disabled={!inviteUser || inviting}>
            {inviting ? <CircularProgress size={20} /> : 'Invitar'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* ===== DIALOG CREAR USUARIO ===== */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo usuario</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField label="Nombre" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} fullWidth required />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Apellido" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} fullWidth required />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth required />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Contraseña" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth required helperText="Mínimo 8 caracteres" />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Rol"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                fullWidth
              >
                <MenuItem value="CUSTOMER">Cliente</MenuItem>
                <MenuItem value="SELLER">Vendedor</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
              </TextField>
            </Grid>
            {form.role === 'SELLER' && (
              <Grid item xs={12}>
                <TextField label="Nombre de la tienda" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} fullWidth />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setCreateOpen(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={createUser} disabled={creating}>
            {creating ? <CircularProgress size={20} /> : 'Crear usuario'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* ===== DIALOG DETALLE ===== */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        {detail && (
          <>
            <DialogTitle>
              {detail.user.firstName} {detail.user.lastName}{' '}
              <Chip label={detail.user.role} size="small" color={detail.user.role === 'ADMIN' ? 'error' : detail.user.role === 'SELLER' ? 'primary' : 'default'} sx={{ ml: 1 }} />
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Email:</strong> {detail.user.email}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Teléfono:</strong> {detail.user.phone || '—'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Registro:</strong> {new Date(detail.user.createdAt).toLocaleDateString('es-BO')}
                  </Typography>
                  {detail.user.storeName && (
                    <Typography variant="body2">
                      <strong>Tienda:</strong> {detail.user.storeName}
                    </Typography>
                  )}
                  {detail.user.storeCategory && (
                    <Typography variant="body2">
                      <strong>Categoría:</strong> {detail.user.storeCategory}
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip label={`Gasto: ${money(detail.totalSpent)}`} color="primary" variant="outlined" />
                    <Chip label={`Pedidos: ${detail.orders.length}`} variant="outlined" />
                    <Chip label={`Direcciones: ${detail.addresses.length}`} variant="outlined" />
                    <Chip label={`Reseñas: ${detail.reviewCount}`} variant="outlined" />
                    <Chip label={`Favoritos: ${detail.wishlistCount}`} variant="outlined" />
                  </Box>
                  {detail.user.role === 'SELLER' && (
                    <Box mt={1}>
                      <Chip label={`${detail.user.rating}`} variant="outlined" />
                      <Chip label={`Ventas: ${detail.user.totalSales}`} variant="outlined" sx={{ ml: 1 }} />
                    </Box>
                  )}
                </Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight={700} mt={3} mb={1}>
                Pedidos recientes
              </Typography>
              {detail.orders.length === 0 ? (
                <Typography color="text.secondary">Sin pedidos.</Typography>
              ) : (
                detail.orders.map((o: any) => (
                  <Box key={o.id} py={1} borderBottom={1} borderColor="divider">
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" fontWeight={600}>
                        #{o.id} — {o.seller?.storeName || o.buyer?.firstName}
                      </Typography>
                      <Typography variant="body2" fontWeight={700} className="price-color">
                        {money(o.total)}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(o.createdAt).toLocaleString('es-BO')} · {o.status}
                    </Typography>
                    <Box mt={0.5}>
                      {o.items?.map((it: any) => (
                        <Typography key={it.id} variant="caption" display="block" color="text.secondary">
                          ×{it.quantity} {it.product?.name}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                ))
              )}
            </DialogContent>
            <DialogActions>
              <GhostButton onClick={() => setDetailOpen(false)}>Cerrar</GhostButton>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
