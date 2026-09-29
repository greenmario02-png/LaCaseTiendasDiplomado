import { useEffect, useState } from 'react';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { api, getErrorMessage } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface Coupon {
  id: number;
  code: string;
  description?: string;
  type: string;
  value: number;
  minSpend?: number | null;
  maxUses?: number | null;
  usesCount: number;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
}

const emptyForm = {
  code: '',
  description: '',
  type: 'PERCENTAGE',
  value: '',
  minSpend: '',
  maxUses: '',
  endDate: '',
};

export default function AdminCoupons() {
  const { t } = useTranslation();
  const money = useMoney();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/coupons')
      .then((r) => setCoupons(r.data.data ?? []))
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description || '',
      type: c.type,
      value: String(c.value),
      minSpend: c.minSpend ? String(c.minSpend) : '',
      maxUses: c.maxUses ? String(c.maxUses) : '',
      endDate: c.endDate ? c.endDate.slice(0, 10) : '',
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        description: form.description,
        type: form.type,
        value: Number(form.value),
        minSpend: form.minSpend ? Number(form.minSpend) : null,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      };
      if (editing) {
        await api.put(`/admin/coupons/${editing.id}`, payload);
        toast.success(t('admin.coupons.toasts.updated'));
      } else {
        await api.post('/admin/coupons', payload);
        toast.success(t('admin.coupons.toasts.created'));
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`/admin/coupons/${id}`);
      toast.success(t('admin.coupons.toasts.deleted'));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const toggleActive = async (c: Coupon) => {
    try {
      await api.put(`/admin/coupons/${c.id}`, { isActive: !c.isActive });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 6 }} />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <LocalOfferIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            {t('admin.coupons.title')}
          </Typography>
        </Box>
        <PrimaryButton startIcon={<AddIcon />} onClick={openNew}>
          {t('admin.coupons.newCoupon')}
        </PrimaryButton>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>{t('admin.coupons.columns.code')}</TableCell>
              <TableCell>{t('admin.coupons.columns.type')}</TableCell>
              <TableCell>{t('admin.coupons.columns.value')}</TableCell>
              <TableCell>{t('admin.coupons.columns.minSpend')}</TableCell>
              <TableCell>{t('admin.coupons.columns.uses')}</TableCell>
              <TableCell>{t('admin.coupons.columns.expires')}</TableCell>
              <TableCell>{t('admin.coupons.columns.status')}</TableCell>
              <TableCell align="right">{t('admin.coupons.columns.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coupons.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  {t('admin.coupons.empty')}
                </TableCell>
              </TableRow>
            )}
            {coupons.map((c) => (
              <TableRow key={c.id}>
                <TableCell sx={{ fontWeight: 700 }}>{c.code}</TableCell>
                <TableCell>{c.type === 'PERCENTAGE' ? t('admin.coupons.type.percentage') : t('admin.coupons.type.fixed')}</TableCell>
                <TableCell>{c.type === 'PERCENTAGE' ? `${c.value}%` : money(c.value)}</TableCell>
                <TableCell>{c.minSpend ? money(c.minSpend) : '—'}</TableCell>
                <TableCell>
                  {c.usesCount}
                  {c.maxUses ? `/${c.maxUses}` : ''}
                </TableCell>
                <TableCell>{c.endDate ? new Date(c.endDate).toLocaleDateString('es-BO') : '—'}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={c.isActive ? t('admin.common.active') : t('admin.common.inactive')}
                    color={c.isActive ? 'success' : 'default'}
                    onClick={() => toggleActive(c)}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(c)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(c.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('admin.coupons.editCoupon') : t('admin.coupons.newCoupon')}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label={t('admin.coupons.fields.code')} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} fullWidth disabled={Boolean(editing)} />
            <TextField
              label={t('admin.coupons.fields.description')}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder={t('admin.coupons.fields.descriptionPlaceholder')}
            />
            <TextField select label={t('admin.coupons.fields.type')} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} fullWidth>
              <MenuItem value="PERCENTAGE">{t('admin.coupons.type.percentage')} (%)</MenuItem>
              <MenuItem value="FIXED">{t('admin.coupons.type.fixed')} (Bs)</MenuItem>
            </TextField>
            <TextField
              label={form.type === 'PERCENTAGE' ? t('admin.coupons.fields.discountPercentage') : t('admin.coupons.fields.discountFixed')}
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('admin.coupons.fields.minSpend')}
              type="number"
              value={form.minSpend}
              onChange={(e) => setForm({ ...form, minSpend: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('admin.coupons.fields.maxUses')}
              type="number"
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              fullWidth
            />
            <TextField label={t('admin.coupons.fields.endDate')} type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setOpen(false)}>{t('admin.common.cancel')}</GhostButton>
          <PrimaryButton onClick={save} disabled={saving || !form.code || !form.value}>
            {saving ? <CircularProgress size={18} /> : t('admin.common.save')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
