import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Stack,
  Autocomplete,
  Alert,
  Avatar,
  IconButton,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import RedeemIcon from '@mui/icons-material/Redeem';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { api } from '../../services/api';
import { getErrorMessage } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import toast from 'react-hot-toast';

interface ProductOption {
  id: number;
  name: string;
  sku: string;
  price: string;
  originalPrice?: string | null;
  stock: number;
  images?: Array<{ url: string }>;
}

const EMPTY_PROMO = {
  title: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '10',
  minSpend: '',
  maxSpend: '',
  startDate: '',
  endDate: '',
};

export default function SellerPromotions() {
  const money = useMoney();
  const [tab, setTab] = useState(0);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [promoType, setPromoType] = useState<'PRODUCT' | 'COUPON' | 'GIFT'>('PRODUCT');
  const [form, setForm] = useState(EMPTY_PROMO);
  const [myProducts, setMyProducts] = useState<ProductOption[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<ProductOption[]>([]);
  const [couponForm, setCouponForm] = useState({
    code: '',
    type: 'PERCENTAGE',
    value: '10',
    minSpend: '',
    maxSpend: '',
    maxUses: '',
    perUserLimit: '',
    isSingleUse: false,
    startDate: '',
    endDate: '',
    description: '',
  });
  const [giftForm, setGiftForm] = useState({
    title: '',
    description: '',
    triggerType: 'UNITS',
    triggerQuantity: '2',
    triggerAmount: '',
    triggerProductId: '',
    allowChoice: false,
    giftProductIds: [] as number[],
  });
  const [giftProducts, setGiftProducts] = useState<ProductOption[]>([]);

  const load = () => {
    api
      .get('/seller/promotions')
      .then((res) => setPromotions(res.data.data))
      .catch((err) => toast.error(getErrorMessage(err)));
    api
      .get('/seller/products?limit=100')
      .then((res) => setMyProducts(res.data.data || []))
      .catch(() => {});
    api
      .get('/seller/gifts')
      .then((res) => setGiftProducts(res.data.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const savePromo = async () => {
    if (!form.title || !form.discountValue) {
      toast.error('Completá título y descuento');
      return;
    }
    if (selectedProducts.length === 0) {
      toast.error('Elegí al menos un producto');
      return;
    }
    try {
      await api.post('/seller/promotions', {
        ...form,
        minSpend: form.minSpend ? Number(form.minSpend) : null,
        maxSpend: form.maxSpend ? Number(form.maxSpend) : null,
        discountValue: Number(form.discountValue),
        productIds: selectedProducts.map((p) => p.id),
      });
      toast.success('Promoción creada');
      setDialogOpen(false);
      setForm(EMPTY_PROMO);
      setSelectedProducts([]);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const saveCoupon = async () => {
    if (!couponForm.code || !couponForm.value) {
      toast.error('Completá código y valor');
      return;
    }
    try {
      await api.post('/seller/coupons', {
        ...couponForm,
        minSpend: couponForm.minSpend ? Number(couponForm.minSpend) : null,
        maxSpend: couponForm.maxSpend ? Number(couponForm.maxSpend) : null,
        maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : null,
        perUserLimit: couponForm.perUserLimit ? Number(couponForm.perUserLimit) : null,
        value: Number(couponForm.value),
        isSingleUse: couponForm.isSingleUse,
      });
      toast.success('Cupón creado');
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const saveGift = async () => {
    if (!giftForm.title || giftForm.giftProductIds.length === 0) {
      toast.error('Completá título y productos de regalo');
      return;
    }
    try {
      await api.post('/seller/gifts', {
        ...giftForm,
        triggerQuantity: giftForm.triggerQuantity ? Number(giftForm.triggerQuantity) : null,
        triggerAmount: giftForm.triggerAmount ? Number(giftForm.triggerAmount) : null,
        triggerProductId: giftForm.triggerProductId ? Number(giftForm.triggerProductId) : null,
      });
      toast.success('Promo de regalo creada');
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const deactivate = async (id: number) => {
    try {
      await api.delete(`/seller/promotions/${id}`);
      toast.success('Promoción finalizada');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const [now] = useState(() => Date.now());
  const active = promotions.filter((p) => p.isActive && new Date(p.endDate).getTime() > now);
  const finished = promotions.filter((p) => !p.isActive || new Date(p.endDate).getTime() <= now);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Promociones
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Descuentos en productos, cupones y promos de regalo de tu tienda
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Nueva promoción
        </Button>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Activas (${active.length})`} />
        <Tab label={`Finalizadas (${finished.length})`} />
      </Tabs>

      {tab === 0 && active.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
          No tenés promociones activas. Tocá "Nueva promoción" para crear una.
        </Paper>
      )}
      {tab === 1 && finished.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>No tenés promociones finalizadas.</Paper>
      )}

      {(tab === 0 ? active : finished).map((p) => (
        <Paper key={p.id} sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle1" fontWeight="bold">
                  {p.title}
                </Typography>
                <Chip
                  size="small"
                  label={p.discountType === 'PERCENTAGE' ? `${p.discountValue}% OFF` : `${money(Number(p.discountValue))} OFF`}
                  color={p.discountType === 'PERCENTAGE' ? 'primary' : 'secondary'}
                />
                <Chip size="small" label={tab === 0 ? 'Activa' : 'Finalizada'} color={tab === 0 ? 'success' : 'default'} variant="outlined" />
              </Stack>
              {p.description && (
                <Typography variant="body2" color="text.secondary">
                  {p.description}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {new Date(p.startDate).toLocaleDateString()} → {new Date(p.endDate).toLocaleDateString()}
                {p.minSpend ? ` · mín ${money(Number(p.minSpend))}` : ''}
                {p.maxSpend ? ` · presupuesto ${money(Number(p.maxSpend))}` : ''}
                {p.spentAmount ? ` · usado ${money(Number(p.spentAmount))}` : ''}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                {p.products?.map((pp: any) => (
                  <Chip
                    key={pp.product.id}
                    avatar={<Avatar src={pp.product.images?.[0]?.url} />}
                    label={`${pp.product.name} · ${money(Number(pp.product.originalPrice || pp.product.price))}`}
                    size="small"
                  />
                ))}
              </Stack>
            </Box>
            {tab === 0 && (
              <IconButton color="error" onClick={() => deactivate(p.id)} title="Finalizar promoción">
                <DeleteIcon />
              </IconButton>
            )}
          </Stack>
        </Paper>
      ))}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nueva promoción</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="Tipo de promoción"
              value={promoType}
              onChange={(e) => setPromoType(e.target.value as any)}
              fullWidth
            >
              <MenuItem value="PRODUCT">
                <Stack direction="row" spacing={1} alignItems="center">
                  <LocalOfferIcon fontSize="small" /> Descuento en productos
                </Stack>
              </MenuItem>
              <MenuItem value="COUPON">
                <Stack direction="row" spacing={1} alignItems="center">
                  <ConfirmationNumberIcon fontSize="small" /> Cupón de descuento (código)
                </Stack>
              </MenuItem>
              <MenuItem value="GIFT">
                <Stack direction="row" spacing={1} alignItems="center">
                  <RedeemIcon fontSize="small" /> Promo de regalo (comprá y recibí)
                </Stack>
              </MenuItem>
            </TextField>

            {promoType === 'PRODUCT' && (
              <>
                <TextField label="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth required />
                <TextField
                  label="Descripción"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    select
                    label="Tipo de descuento"
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                    sx={{ flex: 1 }}
                  >
                    <MenuItem value="PERCENTAGE">Porcentaje (%)</MenuItem>
                    <MenuItem value="FIXED">Monto fijo (Bs)</MenuItem>
                  </TextField>
                  <TextField
                    label={form.discountType === 'PERCENTAGE' ? 'Porcentaje' : 'Monto'}
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                    sx={{ flex: 1 }}
                    required
                  />
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Compra mínima (Bs, opcional)"
                    value={form.minSpend}
                    onChange={(e) => setForm({ ...form, minSpend: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Presupuesto total de descuento (Bs, opcional)"
                    value={form.maxSpend}
                    onChange={(e) => setForm({ ...form, maxSpend: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Inicio"
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    sx={{ flex: 1 }}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Fin"
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    sx={{ flex: 1 }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
                <Autocomplete
                  multiple
                  options={myProducts}
                  getOptionLabel={(o) => `${o.name} (${money(Number(o.price))})`}
                  value={selectedProducts}
                  onChange={(_, v) => setSelectedProducts(v)}
                  renderInput={(params) => <TextField {...params} label="Productos en promoción" />}
                />
              </>
            )}

            {promoType === 'COUPON' && (
              <>
                <TextField
                  label="Código único"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                  fullWidth
                  required
                  helperText="Los clientes ingresan este código en el checkout"
                />
                <TextField
                  label="Descripción"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    select
                    label="Tipo"
                    value={couponForm.type}
                    onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}
                    sx={{ flex: 1 }}
                  >
                    <MenuItem value="PERCENTAGE">Porcentaje (%)</MenuItem>
                    <MenuItem value="FIXED">Monto fijo (Bs)</MenuItem>
                    <MenuItem value="GIFT">Ticket de regalo (Bs para gastar)</MenuItem>
                  </TextField>
                  <TextField
                    label={couponForm.type === 'PERCENTAGE' ? 'Porcentaje' : 'Monto'}
                    value={couponForm.value}
                    onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })}
                    sx={{ flex: 1 }}
                    required
                  />
                </Stack>
                <FormControlLabel
                  control={
                    <Switch
                      checked={couponForm.isSingleUse}
                      onChange={(e) => setCouponForm({ ...couponForm, isSingleUse: e.target.checked })}
                    />
                  }
                  label="Un solo uso por cliente"
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Usos totales máximos (opcional)"
                    value={couponForm.maxUses}
                    onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Usos por cliente (opcional)"
                    value={couponForm.perUserLimit}
                    onChange={(e) => setCouponForm({ ...couponForm, perUserLimit: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Compra mínima (Bs, opcional)"
                    value={couponForm.minSpend}
                    onChange={(e) => setCouponForm({ ...couponForm, minSpend: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Presupuesto total de descuento (Bs, opcional)"
                    value={couponForm.maxSpend}
                    onChange={(e) => setCouponForm({ ...couponForm, maxSpend: e.target.value })}
                    sx={{ flex: 1 }}
                    helperText="El cupón deja de funcionar cuando se agota este monto total"
                  />
                </Stack>
              </>
            )}

            {promoType === 'GIFT' && (
              <>
                <TextField
                  label="Título"
                  value={giftForm.title}
                  onChange={(e) => setGiftForm({ ...giftForm, title: e.target.value })}
                  fullWidth
                  required
                />
                <TextField
                  label="Descripción"
                  value={giftForm.description}
                  onChange={(e) => setGiftForm({ ...giftForm, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                />
                <TextField
                  select
                  label="Disparador"
                  value={giftForm.triggerType}
                  onChange={(e) => setGiftForm({ ...giftForm, triggerType: e.target.value })}
                  fullWidth
                >
                  <MenuItem value="UNITS">Al comprar N unidades de un producto</MenuItem>
                  <MenuItem value="AMOUNT">Al superar un monto en la tienda</MenuItem>
                  <MenuItem value="PRODUCT">Al comprar un producto específico</MenuItem>
                </TextField>
                {giftForm.triggerType === 'UNITS' && (
                  <TextField
                    label="Cantidad de unidades"
                    value={giftForm.triggerQuantity}
                    onChange={(e) => setGiftForm({ ...giftForm, triggerQuantity: e.target.value })}
                    fullWidth
                  />
                )}
                {giftForm.triggerType === 'UNITS' && (
                  <Autocomplete
                    options={myProducts}
                    getOptionLabel={(o) => o.name}
                    value={myProducts.find((p) => p.id === Number(giftForm.triggerProductId)) || null}
                    onChange={(_, v) => setGiftForm({ ...giftForm, triggerProductId: v ? String(v.id) : '' })}
                    renderInput={(params) => <TextField {...params} label="Producto disparador" />}
                  />
                )}
                {giftForm.triggerType === 'AMOUNT' && (
                  <TextField
                    label="Monto mínimo (Bs)"
                    value={giftForm.triggerAmount}
                    onChange={(e) => setGiftForm({ ...giftForm, triggerAmount: e.target.value })}
                    fullWidth
                  />
                )}
                {giftForm.triggerType === 'PRODUCT' && (
                  <Autocomplete
                    options={myProducts}
                    getOptionLabel={(o) => o.name}
                    value={myProducts.find((p) => p.id === Number(giftForm.triggerProductId)) || null}
                    onChange={(_, v) => setGiftForm({ ...giftForm, triggerProductId: v ? String(v.id) : '' })}
                    renderInput={(params) => <TextField {...params} label="Producto disparador" />}
                  />
                )}
                <FormControlLabel
                  control={
                    <Switch
                      checked={giftForm.allowChoice}
                      onChange={(e) => setGiftForm({ ...giftForm, allowChoice: e.target.checked })}
                    />
                  }
                  label="Permitir que el cliente elija el regalo"
                />
                <Autocomplete
                  multiple
                  options={myProducts}
                  getOptionLabel={(o) => o.name}
                  value={myProducts.filter((p) => giftForm.giftProductIds.includes(p.id))}
                  onChange={(_, v) => setGiftForm({ ...giftForm, giftProductIds: v.map((p) => p.id) })}
                  renderInput={(params) => <TextField {...params} label="Productos de regalo" />}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => (promoType === 'PRODUCT' ? savePromo() : promoType === 'COUPON' ? saveCoupon() : saveGift())}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
