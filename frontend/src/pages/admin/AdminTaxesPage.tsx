import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Card, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Alert, Chip, Stack, TextField, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, IconButton } from '@mui/material';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { api, getErrorMessage } from '../../services/api';

const COUNTRIES = [
  { code: 'BO', name: 'Bolivia' },
  { code: 'AR', name: 'Argentina' },
  { code: 'PE', name: 'Perú' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'CL', name: 'Chile' },
];

export default function AdminTaxesPage() {
  const { t } = useTranslation();
  const [rates, setRates] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    country: 'BO',
    state: '',
    ratePercent: '',
    appliesTo: 'ALL',
    categoryId: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [r, c] = await Promise.all([api.get('/taxes'), api.get('/products/categories')]);
      setRates(r.data.data ?? []);
      setCategories(c.data.data ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', country: 'BO', state: '', ratePercent: '', appliesTo: 'ALL', categoryId: '', isActive: true });
    setDialog(true);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      name: r.name,
      country: r.country,
      state: r.state ?? '',
      ratePercent: String(r.ratePercent),
      appliesTo: r.appliesTo,
      categoryId: r.categoryId ? String(r.categoryId) : '',
      isActive: r.isActive,
    });
    setDialog(true);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        ratePercent: Number(form.ratePercent),
        categoryId: form.categoryId ? Number(form.categoryId) : null,
      };
      if (editing) await api.put(`/taxes/${editing.id}`, payload);
      else await api.post('/taxes', payload);
      setDialog(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`/taxes/${id}`);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={800}>
          {t('admin.taxes.title')}
        </Typography>
        <PrimaryButton startIcon={<AddIcon />} onClick={openCreate}>
          {t('admin.taxes.newRate')}
        </PrimaryButton>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Card} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('admin.taxes.columns.name')}</TableCell>
              <TableCell>{t('admin.taxes.columns.country')}</TableCell>
              <TableCell>{t('admin.taxes.columns.state')}</TableCell>
              <TableCell>{t('admin.taxes.columns.rate')}</TableCell>
              <TableCell>{t('admin.taxes.columns.appliesTo')}</TableCell>
              <TableCell>{t('admin.taxes.columns.status')}</TableCell>
              <TableCell align="right">{t('admin.taxes.columns.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rates.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.country}</TableCell>
                <TableCell>{r.state || '—'}</TableCell>
                <TableCell>
                  <Chip label={`${r.ratePercent}%`} color="primary" size="small" />
                </TableCell>
                <TableCell>
                  {r.appliesTo === 'ALL'
                    ? t('admin.taxes.appliesToGeneral')
                    : r.appliesTo === 'CATEGORY'
                    ? t('admin.taxes.appliesToCategory', { category: r.category?.name ?? r.categoryId })
                    : t('admin.taxes.appliesToProduct')}
                </TableCell>
                <TableCell>
                  <Chip label={r.isActive ? t('admin.common.active') : t('admin.common.inactive')} color={r.isActive ? 'success' : 'default'} size="small" />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(r)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(r.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('admin.taxes.editTitle') : t('admin.taxes.createTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label={t('admin.taxes.form.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} size="small" />
            <FormControl size="small" fullWidth>
              <InputLabel>{t('admin.taxes.form.country')}</InputLabel>
              <Select value={form.country} label={t('admin.taxes.form.country')} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                {COUNTRIES.map((c) => (
                  <MenuItem key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label={t('admin.taxes.form.state')} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} size="small" />
            <TextField label={t('admin.taxes.form.ratePercent')} type="number" value={form.ratePercent} onChange={(e) => setForm({ ...form, ratePercent: e.target.value })} size="small" />
            <FormControl size="small" fullWidth>
              <InputLabel>{t('admin.taxes.form.appliesTo')}</InputLabel>
              <Select value={form.appliesTo} label={t('admin.taxes.form.appliesTo')} onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}>
                <MenuItem value="ALL">{t('admin.taxes.appliesToOptions.all')}</MenuItem>
                <MenuItem value="CATEGORY">{t('admin.taxes.appliesToOptions.category')}</MenuItem>
                <MenuItem value="PRODUCT">{t('admin.taxes.appliesToOptions.product')}</MenuItem>
              </Select>
            </FormControl>
            {form.appliesTo === 'CATEGORY' && (
              <FormControl size="small" fullWidth>
                <InputLabel>{t('admin.taxes.form.category')}</InputLabel>
                <Select value={form.categoryId} label={t('admin.taxes.form.category')} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setDialog(false)}>{t('admin.common.cancel')}</GhostButton>
          <PrimaryButton onClick={save} disabled={saving}>
            {saving ? t('admin.common.saving') : t('admin.common.save')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
