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
import { useTranslation } from 'react-i18next';

const EMPTY = { email: '', password: '', firstName: '', lastName: '', phone: '', role: 'CUSTOMER', storeName: '' };

export default function AdminUsers() {
  const { t } = useTranslation();
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
      toast.success(t('admin.users.toast.updated'));
      load(tab === 1 ? 'SELLER' : tab === 2 ? 'ADMIN' : undefined);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const createUser = async () => {
    if (!form.email || !form.password || !form.firstName || !form.lastName) {
      toast.error(t('admin.users.toast.createValidation'));
      return;
    }
    setCreating(true);
    try {
      await api.post('/admin/users', form);
      toast.success(t('admin.users.toast.created'));
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
      toast.success(t('admin.users.toast.inviteSent', { name: `${inviteUser.firstName} ${inviteUser.lastName}`, role: inviteRole.toLowerCase() }));
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

  const emptyLabel = tab === 0 ? t('admin.users.emptyCustomers') : tab === 1 ? t('admin.users.emptySellers') : t('admin.users.emptyAdmins');

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={t('admin.users.tabs.customers')} />
          <Tab label={t('admin.users.tabs.sellers')} />
          <Tab label={t('admin.users.tabs.admins')} />
        </Tabs>
        <Box display="flex" gap={1}>
          <SecondaryButton startIcon={<PersonAddIcon />} onClick={() => setInviteOpen(true)}>
            {t('admin.users.inviteUserButton')}
          </SecondaryButton>
          <PrimaryButton startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            {t('admin.users.newUserButton')}
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
                <TableCell>{t('admin.users.table.user')}</TableCell>
                <TableCell>{t('admin.users.table.email')}</TableCell>
                <TableCell align="center">{t('admin.users.table.role')}</TableCell>
                <TableCell align="center">{t('admin.users.table.status')}</TableCell>
                <TableCell align="right">{t('admin.users.table.points')}</TableCell>
                <TableCell align="center">{t('admin.users.table.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary">{emptyLabel}</Typography>
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
                      <MenuItem value="CUSTOMER">{t('admin.users.role.customer')}</MenuItem>
                      <MenuItem value="SELLER">{t('admin.users.role.seller')}</MenuItem>
                      <MenuItem value="ADMIN">{t('admin.users.role.admin')}</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={u.isActive ? t('admin.common.active') : t('admin.users.status.blocked')}
                      size="small"
                      color={u.isActive ? 'success' : 'error'}
                      onClick={() => update(u.id, { isActive: !u.isActive })}
                      sx={{ cursor: 'pointer' }}
                    />
                  </TableCell>
                  <TableCell align="right">{u.gamerCoins}</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => openDetail(u.id)} title={t('admin.common.viewDetail')}>
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
        <DialogTitle>{t('admin.users.inviteUserButton')}</DialogTitle>
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
                  label={t('admin.users.searchUserLabel')}
                  placeholder={t('admin.users.searchPlaceholder')}
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
              {t('admin.users.searchHelperText')}
            </Typography>
          </Box>
          <TextField
            select
            label={t('admin.users.roleSelectLabel')}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            fullWidth
          >
            <MenuItem value="CUSTOMER">{t('admin.users.role.customer')}</MenuItem>
            <MenuItem value="SELLER">{t('admin.users.role.seller')}</MenuItem>
            <MenuItem value="ADMIN">{t('admin.users.role.admin')}</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setInviteOpen(false)}>{t('admin.common.cancel')}</GhostButton>
          <PrimaryButton onClick={handleInvite} disabled={!inviteUser || inviting}>
            {inviting ? <CircularProgress size={20} /> : t('admin.users.inviteConfirmButton')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* ===== DIALOG CREAR USUARIO ===== */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('admin.users.newUserButton')}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField label={t('admin.users.form.firstName')} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} fullWidth required />
            </Grid>
            <Grid item xs={6}>
              <TextField label={t('admin.users.form.lastName')} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} fullWidth required />
            </Grid>
            <Grid item xs={12}>
              <TextField label={t('admin.users.form.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth required />
            </Grid>
            <Grid item xs={12}>
              <TextField label={t('admin.users.form.password')} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth required helperText={t('admin.users.form.passwordHelper')} />
            </Grid>
            <Grid item xs={6}>
              <TextField label={t('admin.users.form.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label={t('admin.users.roleSelectLabel')}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                fullWidth
              >
                <MenuItem value="CUSTOMER">{t('admin.users.role.customer')}</MenuItem>
                <MenuItem value="SELLER">{t('admin.users.role.seller')}</MenuItem>
                <MenuItem value="ADMIN">{t('admin.users.role.admin')}</MenuItem>
              </TextField>
            </Grid>
            {form.role === 'SELLER' && (
              <Grid item xs={12}>
                <TextField label={t('admin.users.form.storeName')} value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} fullWidth />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setCreateOpen(false)}>{t('admin.common.cancel')}</GhostButton>
          <PrimaryButton onClick={createUser} disabled={creating}>
            {creating ? <CircularProgress size={20} /> : t('admin.users.createUserButton')}
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
                    <strong>{t('admin.users.detail.email')}</strong> {detail.user.email}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{t('admin.users.detail.phone')}</strong> {detail.user.phone || '—'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{t('admin.users.detail.registered')}</strong> {new Date(detail.user.createdAt).toLocaleDateString('es-BO')}
                  </Typography>
                  {detail.user.storeName && (
                    <Typography variant="body2">
                      <strong>{t('admin.users.detail.store')}</strong> {detail.user.storeName}
                    </Typography>
                  )}
                  {detail.user.storeCategory && (
                    <Typography variant="body2">
                      <strong>{t('admin.users.detail.category')}</strong> {detail.user.storeCategory}
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip label={t('admin.users.detail.spent', { amount: money(detail.totalSpent) })} color="primary" variant="outlined" />
                    <Chip label={t('admin.users.detail.orders', { count: detail.orders.length })} variant="outlined" />
                    <Chip label={t('admin.users.detail.addresses', { count: detail.addresses.length })} variant="outlined" />
                    <Chip label={t('admin.users.detail.reviews', { count: detail.reviewCount })} variant="outlined" />
                    <Chip label={t('admin.users.detail.favorites', { count: detail.wishlistCount })} variant="outlined" />
                  </Box>
                  {detail.user.role === 'SELLER' && (
                    <Box mt={1}>
                      <Chip label={`${detail.user.rating}`} variant="outlined" />
                      <Chip label={t('admin.users.detail.sales', { count: detail.user.totalSales })} variant="outlined" sx={{ ml: 1 }} />
                    </Box>
                  )}
                </Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight={700} mt={3} mb={1}>
                {t('admin.users.detail.recentOrders')}
              </Typography>
              {detail.orders.length === 0 ? (
                <Typography color="text.secondary">{t('admin.users.detail.noOrders')}</Typography>
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
                      {new Date(o.createdAt).toLocaleString('es-BO')} · {t(`orders.status.${String(o.status).toLowerCase()}`)}
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
              <GhostButton onClick={() => setDetailOpen(false)}>{t('admin.users.closeButton')}</GhostButton>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
