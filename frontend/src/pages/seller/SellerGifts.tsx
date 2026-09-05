import { useEffect, useState } from 'react';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import { Gift } from 'lucide-react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
} from '@mui/material';
import RedeemIcon from '@mui/icons-material/Redeem';
import AddIcon from '@mui/icons-material/Add';
import { api, getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

interface GiftProduct {
  id: number;
  name: string;
  price: string;
  images?: { url: string }[];
}

interface GiftPromo {
  id: number;
  title: string;
  description?: string | null;
  triggerType: string;
  triggerProductId?: number | null;
  triggerQuantity?: number | null;
  triggerAmount?: string | null;
  allowChoice: boolean;
  isActive: boolean;
  items: { product: GiftProduct }[];
  triggerProduct?: { id: number; name: string } | null;
}

const TRIGGER_LABELS: Record<string, string> = {
  UNITS: 'Por cantidad de un producto',
  AMOUNT: 'Por monto de compra',
  PRODUCT: 'Por comprar un producto específico',
};

export default function SellerGifts() {
  const [promos, setPromos] = useState<GiftPromo[]>([]);
  const [products, setProducts] = useState<GiftProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GiftPromo | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    triggerType: 'UNITS',
    triggerProductId: '',
    triggerQuantity: '',
    triggerAmount: '',
    allowChoice: false,
    isActive: true,
    productIds: [] as number[],
  });

  const load = async () => {
    setLoading(true);
    try {
      const [g, p] = await Promise.all([api.get('/seller/gifts'), api.get('/seller/products', { params: { limit: 500 } })]);
      setPromos(g.data.data ?? []);
      setProducts(p.data.data ?? []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', triggerType: 'UNITS', triggerProductId: '', triggerQuantity: '', triggerAmount: '', allowChoice: false, isActive: true, productIds: [] });
    setOpen(true);
  };

  const openEdit = (promo: GiftPromo) => {
    setEditing(promo);
    setForm({
      title: promo.title,
      description: promo.description || '',
      triggerType: promo.triggerType,
      triggerProductId: promo.triggerProductId ? String(promo.triggerProductId) : '',
      triggerQuantity: promo.triggerQuantity ? String(promo.triggerQuantity) : '',
      triggerAmount: promo.triggerAmount ? String(promo.triggerAmount) : '',
      allowChoice: promo.allowChoice,
      isActive: promo.isActive,
      productIds: promo.items.map((i) => i.product.id),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error('El título es obligatorio');
    if (form.productIds.length === 0) return toast.error('Elegí al menos un producto de regalo');
    if (form.triggerType === 'UNITS' && (!form.triggerProductId || !form.triggerQuantity)) {
      return toast.error('Para el tipo "por cantidad" indicá el producto y la cantidad');
    }
    if (form.triggerType === 'AMOUNT' && !form.triggerAmount) {
      return toast.error('Para el tipo "por monto" indicá el monto mínimo');
    }
    if (form.triggerType === 'PRODUCT' && !form.triggerProductId) {
      return toast.error('Para el tipo "por producto" indicá el producto');
    }

    const payload = {
      title: form.title,
      description: form.description,
      triggerType: form.triggerType,
      triggerProductId: form.triggerProductId ? Number(form.triggerProductId) : null,
      triggerQuantity: form.triggerQuantity ? Number(form.triggerQuantity) : null,
      triggerAmount: form.triggerAmount ? Number(form.triggerAmount) : null,
      allowChoice: form.allowChoice,
      isActive: form.isActive,
      productIds: form.productIds,
    };

    setSaving(true);
    try {
      if (editing) await api.put(`/seller/gifts/${editing.id}`, payload);
      else await api.post('/seller/gifts', payload);
      toast.success(editing ? 'Promoción actualizada' : 'Promoción creada');
      setOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (promo: GiftPromo) => {
    try {
      await api.put(`/seller/gifts/${promo.id}`, { isActive: !promo.isActive });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async (promo: GiftPromo) => {
    if (!window.confirm('¿Eliminar esta promoción de regalo?')) return;
    try {
      await api.delete(`/seller/gifts/${promo.id}`);
      toast.success('Promoción eliminada');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const triggerText = (p: GiftPromo) => {
    if (p.triggerType === 'UNITS') return `Comprando ${p.triggerQuantity} un. de ${p.triggerProduct?.name ?? 'producto'}`;
    if (p.triggerType === 'AMOUNT') return `Compras desde ${Number(p.triggerAmount).toLocaleString('es-BO')} Bs`;
    return `Comprando ${p.triggerProduct?.name ?? 'un producto'}`;
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />;

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <RedeemIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Promos de regalo
          </Typography>
        </Box>
        <PrimaryButton startIcon={<AddIcon />} onClick={openCreate}>
          Nueva promo
        </PrimaryButton>
      </Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Ofrecé regalos a tus clientes con lógica de ticket de regalo: al comprar una cantidad de un producto, al
        superar un monto o al comprar un producto específico, el cliente recibe un producto de tu tienda de regalo.
        También podés dejar que elija entre varios regalos.
      </Alert>

      {promos.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No creaste promos de regalo todavía.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {promos.map((promo) => (
            <Card key={promo.id} sx={{ border: promo.isActive ? '1px solid #4caf50' : '1px solid #ddd', opacity: promo.isActive ? 1 : 0.6 }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6" fontWeight={700}>
                    {promo.title}
                  </Typography>
                  <Chip size="small" color={promo.isActive ? 'success' : 'default'} label={promo.isActive ? 'Activa' : 'Inactiva'} />
                </Box>
                {promo.description && <Typography variant="body2" color="text.secondary">{promo.description}</Typography>}
                <Typography variant="body2" mt={1}>
                  <b>Disparador:</b> {TRIGGER_LABELS[promo.triggerType]} → <i>{triggerText(promo)}</i>
                </Typography>
                <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" label={`Regalo(s): ${promo.items.map((i) => i.product.name).join(', ')}`} />
                  {promo.allowChoice && <Chip size="small" color="primary" label="El cliente elige" />}
                </Stack>
                <Stack direction="row" spacing={1} mt={2}>
                  <SecondaryButton size="small" onClick={() => openEdit(promo)}>
                    Editar
                  </SecondaryButton>
                  <SecondaryButton size="small" color={promo.isActive ? 'warning' : 'success'} onClick={() => toggleActive(promo)}>
                    {promo.isActive ? 'Desactivar' : 'Activar'}
                  </SecondaryButton>
                  <SecondaryButton size="small" color="error" onClick={() => remove(promo)}>
                    Eliminar
                  </SecondaryButton>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Editar promo de regalo' : 'Nueva promo de regalo'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Título" fullWidth value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Comprá 2 y llevate 1 de regalo" />
            <TextField label="Descripción (opcional)" fullWidth multiline rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <TextField
              select
              label="Tipo de disparador"
              fullWidth
              value={form.triggerType}
              onChange={(e) => setForm({ ...form, triggerType: e.target.value })}
            >
              <MenuItem value="UNITS">Por cantidad de un producto</MenuItem>
              <MenuItem value="AMOUNT">Por monto de compra</MenuItem>
              <MenuItem value="PRODUCT">Por comprar un producto específico</MenuItem>
            </TextField>

            {form.triggerType !== 'AMOUNT' && (
              <TextField
                select
                label="Producto que dispara"
                fullWidth
                value={form.triggerProductId}
                onChange={(e) => setForm({ ...form, triggerProductId: e.target.value })}
              >
                <MenuItem value="">
                  <em>Seleccionar...</em>
                </MenuItem>
                {products.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {form.triggerType === 'UNITS' && (
              <TextField
                label="Cantidad mínima"
                type="number"
                fullWidth
                value={form.triggerQuantity}
                onChange={(e) => setForm({ ...form, triggerQuantity: e.target.value })}
                placeholder="Ej: 2"
              />
            )}

            {form.triggerType === 'AMOUNT' && (
              <TextField
                label="Monto mínimo (Bs)"
                type="number"
                fullWidth
                value={form.triggerAmount}
                onChange={(e) => setForm({ ...form, triggerAmount: e.target.value })}
                placeholder="Ej: 3000"
              />
            )}

            <TextField
              select
              label="Productos de regalo (elegí uno o más)"
              fullWidth
              SelectProps={{ multiple: true }}
              value={form.productIds}
              onChange={(e) => setForm({ ...form, productIds: (e.target.value as unknown) as number[] })}
            >
              {products.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} — {Number(p.price).toLocaleString('es-BO')} Bs
                </MenuItem>
              ))}
            </TextField>

            <FormControlLabel
              control={
                <Switch checked={form.allowChoice} onChange={(e) => setForm({ ...form, allowChoice: e.target.checked })} />
              }
              label="El cliente puede elegir entre los productos de regalo"
            />
            <FormControlLabel
              control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />}
              label="Promoción activa"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setOpen(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={save} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Guardar'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
