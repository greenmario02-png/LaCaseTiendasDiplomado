import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
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
import { api } from '../../services/api';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import { useUnifiedTokens } from '../../theme';
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';
import { PrimaryButton } from '../../components/redesign/Buttons';
import { EmptyState } from '../../components/redesign/States';
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerList';

const EMPTY_FORM = { street: '', number: '', floor: '', city: '', state: '', postalCode: '', isDefault: false };

export default function AddressesPage() {
  const t = useUnifiedTokens();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = () => api.get('/account/addresses').then((res) => setAddresses(res.data.data));
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (a: any) => {
    setForm({
      street: a.street,
      number: a.number,
      floor: a.floor || '',
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
      isDefault: a.isDefault,
    });
    setEditingId(a.id);
    setDialogOpen(true);
  };

  const save = async () => {
    try {
      if (editingId) {
        await api.put(`/account/addresses/${editingId}`, form);
      } else {
        await api.post('/account/addresses', form);
      }
      toast.success('Dirección guardada');
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`/account/addresses/${id}`);
      toast.success('Dirección eliminada');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <PageHeader
        title="Mis direcciones"
        subtitle="Administra tus direcciones de envío"
        icon={<LocationOnIcon />}
        actions={
          <PrimaryButton type="button" startIcon={<AddIcon />} onClick={openNew}>
            Nueva dirección
          </PrimaryButton>
        }
      />

      {addresses.length === 0 && (
        <SurfaceCard>
          <EmptyState message="No tienes direcciones guardadas." />
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
              {a.city}, {a.state} — CP {a.postalCode}
            </Typography>
            {a.isDefault && (
              <Typography variant="caption" color={t.primary} fontWeight={600} display="inline-flex" alignItems="center" gap={0.5}>
                <StarIcon sx={{ fontSize: 14 }} /> Dirección por defecto
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
        <DialogTitle>{editingId ? 'Editar dirección' : 'Nueva dirección'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={0}>
            <Grid item xs={8}>
              <TextField label="Calle" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={4}>
              <TextField label="Número" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Piso/Dpto" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Ciudad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Provincia" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="CP" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Checkbox checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />}
                label="Usar como dirección por defecto"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={save}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
