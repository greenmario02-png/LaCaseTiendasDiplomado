import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Autocomplete,
  Button,
  IconButton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StarIcon from '@mui/icons-material/Star';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import { useUnifiedTokens } from '../../theme';
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';
import { PrimaryButton } from '../../components/redesign/Buttons';
import { EmptyState } from '../../components/redesign/States';
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerList';
import { BOLIVIA_DEPARTMENTS, canonicalDepartment } from '../../lib/boliviaDepartments';

/** Formato de Bolivia: `state` es el DEPARTAMENTO (uno de los 9) y el código postal es opcional. */
const EMPTY_FORM = { street: '', number: '', floor: '', city: '', state: '', postalCode: '', isDefault: false };

export default function AddressesPage() {
  const { t: tt } = useTranslation();
  const t = useUnifiedTokens();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [departmentError, setDepartmentError] = useState('');

  const load = () => api.get('/account/addresses').then((res) => setAddresses(res.data.data));
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setDepartmentError('');
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (a: any) => {
    setForm({
      street: a.street,
      number: a.number,
      floor: a.floor || '',
      city: a.city,
      // Direcciones antiguas pueden tener "la paz" o una provincia: se muestra el nombre oficial si es uno de los 9.
      state: canonicalDepartment(a.state) ?? a.state ?? '',
      postalCode: a.postalCode ?? '',
      isDefault: a.isDefault,
    });
    setDepartmentError('');
    setEditingId(a.id);
    setDialogOpen(true);
  };

  const save = async () => {
    const department = canonicalDepartment(form.state);
    if (!department) {
      setDepartmentError(tt('account.addresses.departmentError'));
      return;
    }
    setDepartmentError('');
    const payload = { ...form, state: department, postalCode: form.postalCode.trim() || null };
    try {
      if (editingId) {
        await api.put(`/account/addresses/${editingId}`, payload);
      } else {
        await api.post('/account/addresses', payload);
      }
      toast.success(tt('account.addresses.saved'));
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`/account/addresses/${id}`);
      toast.success(tt('account.addresses.deleted'));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <PageHeader
        title={tt('account.addresses.title')}
        subtitle={tt('account.addresses.subtitle')}
        icon={<LocationOnIcon />}
        actions={
          <PrimaryButton type="button" startIcon={<AddIcon />} onClick={openNew}>
            {tt('account.addresses.newAddress')}
          </PrimaryButton>
        }
      />

      {addresses.length === 0 && (
        <SurfaceCard>
          <EmptyState message={tt('account.addresses.emptyMessage')} />
        </SurfaceCard>
      )}

      <StaggerContainer>
      {addresses.map((a) => (
        <StaggerItem key={a.id}>
        <SurfaceCard sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box flex={1}>
            <Typography fontWeight={600} color={t.onSurface}>
              {a.street} {a.number}
              {a.floor ? ', ' + a.floor : ''}
            </Typography>
            <Typography variant="body2" color={t.onSurfaceVariant}>
              {a.city}, {a.state}
              {a.postalCode ? ` — CP ${a.postalCode}` : ''}
            </Typography>
            {a.isDefault && (
              <Typography variant="caption" color={t.primary} fontWeight={600} display="inline-flex" alignItems="center" gap={0.5}>
                <StarIcon sx={{ fontSize: 14 }} /> {tt('account.addresses.defaultAddress')}
              </Typography>
            )}
          </Box>
          <IconButton onClick={() => openEdit(a)}>
            <EditIcon />
          </IconButton>
          <IconButton color="error" onClick={() => remove(a.id)}>
            <DeleteIcon />
          </IconButton>
        </SurfaceCard>
        </StaggerItem>
      ))}
      </StaggerContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? tt('account.addresses.editAddress') : tt('account.addresses.newAddress')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={0}>
            <Grid item xs={8}>
              <TextField label={tt('account.addresses.street')} value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={4}>
              <TextField label={tt('account.addresses.number')} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <TextField label={tt('account.addresses.floor')} value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label={tt('account.addresses.city')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Autocomplete
                options={[...BOLIVIA_DEPARTMENTS]}
                value={canonicalDepartment(form.state)}
                onChange={(_, v) => {
                  setDepartmentError('');
                  setForm({ ...form, state: v ?? '' });
                }}
                renderInput={(params) => (
                  <TextField {...params} label={tt('account.addresses.state')} error={!!departmentError} helperText={departmentError} fullWidth />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label={tt('account.addresses.postalCodeOptional')} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Checkbox checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />}
                label={tt('account.addresses.useAsDefault')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{tt('account.addresses.cancel')}</Button>
          <Button variant="contained" onClick={save}>
            {tt('account.addresses.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
