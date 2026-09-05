import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import {
  Box,
  Typography,
  Paper,
  Button,
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
  Checkbox,
  ListItemText,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import RedeemIcon from '@mui/icons-material/Redeem';
import { api, getErrorMessage } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import toast from 'react-hot-toast';

interface CouponProduct {
  productId: number;
  product: { id: number; name: string; price: number };
}

interface Coupon {
  id: number;
  code: string;
  description?: string;
  type: string;
  value: number;
  spentAmount?: number | null;
  minSpend?: number | null;
  maxUses?: number | null;
  usesCount: number;
  endDate?: string | null;
  isActive: boolean;
  products?: CouponProduct[];
}

const emptyForm = {
  code: '',
  description: '',
  type: 'PERCENTAGE',
  value: '',
  minSpend: '',
  maxUses: '',
  endDate: '',
  productIds: [] as number[],
};

export default function SellerCoupons() {
  const money = useMoney();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/seller/coupons').then((r) => r.data.data).catch(() => []),
      api.get('/seller/products').then((r) => r.data.data).catch(() => []),
    ])
      .then(([c, p]) => {
        setCoupons(c);
        setMyProducts(p);
      })
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
      productIds: c.products?.map((p) => p.productId) ?? [],
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
        productIds: form.productIds,
      };
      if (editing) {
        await api.put(`/seller/coupons/${editing.id}`, payload);
        toast.success('Cupón actualizado');
      } else {
        await api.post('/seller/coupons', payload);
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
      await api.delete(`/seller/coupons/${id}`);
      toast.success('Cupón eliminado');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const toggleActive = async (c: Coupon) => {
    try {
      await api.put(`/seller/coupons/${c.id}`, { isActive: !c.isActive });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const typeLabel = (t: string) => (t === 'PERCENTAGE' ? 'Porcentaje' : t === 'FIXED' ? 'Monto fijo' : 'Regalo');

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 6 }} />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <LocalOfferIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Cupones de mi tienda
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openNew}>
          Crear cupón
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Creá cupones de descuento para tus productos o cupones de regalo. Elegí los productos de tu tienda a los que aplica el cupón.
      </Typography>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Código</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Valor</TableCell>
              <TableCell>Productos</TableCell>
              <TableCell>Usos</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coupons.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No tenés cupones. Creá uno para incentivar tus ventas.
                </TableCell>
              </TableRow>
            )}
            {coupons.map((c) => (
              <TableRow key={c.id}>
                <TableCell sx={{ fontWeight: 700 }}>{c.code}</TableCell>
                <TableCell>{typeLabel(c.type)}</TableCell>
                <TableCell>
                  {c.type === 'PERCENTAGE' ? `${c.value}%` : c.type === 'GIFT' ? `${money(c.value)} (gastado ${money(c.spentAmount ?? 0)})` : money(c.value)}
                </TableCell>
                <TableCell>
                  {c.products && c.products.length > 0 ? (
                    <Chip size="small" label={`${c.products.length} producto(s)`} />
                  ) : (
                    <Chip size="small" label="Todos" variant="outlined" />
                  )}
                </TableCell>
                <TableCell>
                  {c.usesCount}
                  {c.maxUses ? `/${c.maxUses}` : ''}
                </TableCell>
                <TableCell>
                  <Chip size="small" label={c.isActive ? 'Activo' : 'Inactivo'} color={c.isActive ? 'success' : 'default'} onClick={() => toggleActive(c)} />
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
        <DialogTitle>{editing ? 'Editar cupón' : 'Crear cupón'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Código único" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} fullWidth disabled={Boolean(editing)} />
            <TextField
              label="Descripción"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="Ej: 10% en la compra de un S7 Edge / Regalo de 100 Bs para gastar en mi tienda"
            />
            <TextField select label="Tipo de cupón" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} fullWidth>
              <MenuItem value="PERCENTAGE">Porcentaje de descuento (%)</MenuItem>
              <MenuItem value="FIXED">Monto fijo de descuento (Bs)</MenuItem>
              <MenuItem value="GIFT">Regalo (monto para gastar, se devuelve el saldo)</MenuItem>
            </TextField>
            <TextField
              label={form.type === 'PERCENTAGE' ? 'Descuento (%)' : form.type === 'GIFT' ? 'Monto del regalo (Bs)' : 'Descuento (Bs)'}
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              fullWidth
            />
            {form.type === 'GIFT' && (
              <Typography variant="caption" color="text.secondary">
                El comprador puede gastar este monto en tu tienda. Si gasta menos, le devolvés el saldo en efectivo.
              </Typography>
            )}
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
            <Autocomplete
              multiple
              options={myProducts}
              getOptionLabel={(p) => `${p.name} — ${p.price} Bs`}
              value={myProducts.filter((p) => form.productIds.includes(p.id))}
              onChange={(_, v) => setForm({ ...form, productIds: v.map((p) => p.id) })}
              renderInput={(params) => <TextField {...params} label="Productos a los que aplica (vacío = todos)" />}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={save} disabled={saving || !form.code || !form.value}>
            {saving ? <CircularProgress size={18} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
