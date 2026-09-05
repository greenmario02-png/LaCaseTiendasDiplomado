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
        toast.success('Cupón actualizado');
      } else {
        await api.post('/admin/coupons', payload);
        toast.success('Cupón creado');
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
      toast.success('Cupón eliminado');
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
            Cupones de descuento
          </Typography>
        </Box>
        <PrimaryButton startIcon={<AddIcon />} onClick={openNew}>
          Nuevo cupón
        </PrimaryButton>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Código</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Valor</TableCell>
              <TableCell>Mínimo</TableCell>
              <TableCell>Usos</TableCell>
              <TableCell>Vence</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coupons.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No hay cupones. Creá uno para ofrecer descuentos.
                </TableCell>
              </TableRow>
            )}
            {coupons.map((c) => (
              <TableRow key={c.id}>
                <TableCell sx={{ fontWeight: 700 }}>{c.code}</TableCell>
                <TableCell>{c.type === 'PERCENTAGE' ? 'Porcentaje' : 'Monto fijo'}</TableCell>
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
                    label={c.isActive ? 'Activo' : 'Inactivo'}
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
        <DialogTitle>{editing ? 'Editar cupón' : 'Nuevo cupón'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} fullWidth disabled={Boolean(editing)} />
            <TextField
              label="Descripción"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="Ej: 10% de descuento en la primera compra"
            />
            <TextField select label="Tipo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} fullWidth>
              <MenuItem value="PERCENTAGE">Porcentaje (%)</MenuItem>
              <MenuItem value="FIXED">Monto fijo (Bs)</MenuItem>
            </TextField>
            <TextField
              label={form.type === 'PERCENTAGE' ? 'Descuento (%)' : 'Descuento (Bs)'}
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              fullWidth
            />
            <TextField
              label="Pedido mínimo (Bs, opcional)"
              type="number"
              value={form.minSpend}
              onChange={(e) => setForm({ ...form, minSpend: e.target.value })}
              fullWidth
            />
            <TextField
              label="Límite de usos (opcional)"
              type="number"
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              fullWidth
            />
            <TextField label="Vence (opcional)" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setOpen(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={save} disabled={saving || !form.code || !form.value}>
            {saving ? <CircularProgress size={18} /> : 'Guardar'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
