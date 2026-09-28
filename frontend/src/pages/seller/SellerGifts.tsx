import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

export default function SellerGifts() {
  const { t } = useTranslation();
  const TRIGGER_LABELS: Record<string, string> = {
    UNITS: t('seller.gifts.triggerLabels.units'),
    AMOUNT: t('seller.gifts.triggerLabels.amount'),
    PRODUCT: t('seller.gifts.triggerLabels.product'),
  };
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
    if (!form.title.trim()) return toast.error(t('seller.gifts.errors.titleRequired'));
    if (form.productIds.length === 0) return toast.error(t('seller.gifts.errors.giftProductRequired'));
    if (form.triggerType === 'UNITS' && (!form.triggerProductId || !form.triggerQuantity)) {
      return toast.error(t('seller.gifts.errors.unitsFieldsRequired'));
    }
    if (form.triggerType === 'AMOUNT' && !form.triggerAmount) {
      return toast.error(t('seller.gifts.errors.amountFieldRequired'));
    }
    if (form.triggerType === 'PRODUCT' && !form.triggerProductId) {
      return toast.error(t('seller.gifts.errors.productFieldRequired'));
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
      toast.success(editing ? t('seller.gifts.toasts.promoUpdated') : t('seller.gifts.toasts.promoCreated'));
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
    if (!window.confirm(t('seller.gifts.confirmDelete'))) return;
    try {
      await api.delete(`/seller/gifts/${promo.id}`);
      toast.success(t('seller.gifts.toasts.promoDeleted'));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const triggerText = (p: GiftPromo) => {
    if (p.triggerType === 'UNITS') {
      return t('seller.gifts.triggerText.units', {
        quantity: p.triggerQuantity,
        product: p.triggerProduct?.name ?? t('seller.gifts.triggerText.defaultProduct'),
      });
    }
    if (p.triggerType === 'AMOUNT') {
      return t('seller.gifts.triggerText.amount', { amount: Number(p.triggerAmount).toLocaleString('es-BO') });
    }
    return t('seller.gifts.triggerText.product', {
      product: p.triggerProduct?.name ?? t('seller.gifts.triggerText.defaultProductGeneric'),
    });
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />;

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <RedeemIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            {t('seller.gifts.pageTitle')}
          </Typography>
        </Box>
        <PrimaryButton startIcon={<AddIcon />} onClick={openCreate}>
          {t('seller.gifts.newPromoButton')}
        </PrimaryButton>
      </Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        {t('seller.gifts.infoBanner')}
      </Alert>

      {promos.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">{t('seller.gifts.emptyState')}</Typography>
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
                  <Chip size="small" color={promo.isActive ? 'success' : 'default'} label={promo.isActive ? t('seller.gifts.activeChip') : t('seller.gifts.inactiveChip')} />
                </Box>
                {promo.description && <Typography variant="body2" color="text.secondary">{promo.description}</Typography>}
                <Typography variant="body2" mt={1}>
                  <b>{t('seller.gifts.triggerLabelPrefix')}</b> {TRIGGER_LABELS[promo.triggerType]} → <i>{triggerText(promo)}</i>
                </Typography>
                <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" label={t('seller.gifts.giftsLabel', { names: promo.items.map((i) => i.product.name).join(', ') })} />
                  {promo.allowChoice && <Chip size="small" color="primary" label={t('seller.gifts.customerChoosesChip')} />}
                </Stack>
                <Stack direction="row" spacing={1} mt={2}>
                  <SecondaryButton size="small" onClick={() => openEdit(promo)}>
                    {t('seller.gifts.editButton')}
                  </SecondaryButton>
                  <SecondaryButton size="small" color={promo.isActive ? 'warning' : 'success'} onClick={() => toggleActive(promo)}>
                    {promo.isActive ? t('seller.gifts.deactivateButton') : t('seller.gifts.activateButton')}
                  </SecondaryButton>
                  <SecondaryButton size="small" color="error" onClick={() => remove(promo)}>
                    {t('seller.gifts.deleteButton')}
                  </SecondaryButton>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? t('seller.gifts.dialog.editTitle') : t('seller.gifts.dialog.createTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label={t('seller.gifts.dialog.titleLabel')} fullWidth value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('seller.gifts.dialog.titlePlaceholder')} />
            <TextField label={t('seller.gifts.dialog.descriptionLabel')} fullWidth multiline rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <TextField
              select
              label={t('seller.gifts.dialog.triggerTypeLabel')}
              fullWidth
              value={form.triggerType}
              onChange={(e) => setForm({ ...form, triggerType: e.target.value })}
            >
              <MenuItem value="UNITS">{t('seller.gifts.triggerLabels.units')}</MenuItem>
              <MenuItem value="AMOUNT">{t('seller.gifts.triggerLabels.amount')}</MenuItem>
              <MenuItem value="PRODUCT">{t('seller.gifts.triggerLabels.product')}</MenuItem>
            </TextField>

            {form.triggerType !== 'AMOUNT' && (
              <TextField
                select
                label={t('seller.gifts.dialog.triggerProductLabel')}
                fullWidth
                value={form.triggerProductId}
                onChange={(e) => setForm({ ...form, triggerProductId: e.target.value })}
              >
                <MenuItem value="">
                  <em>{t('seller.gifts.dialog.selectPlaceholder')}</em>
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
                label={t('seller.gifts.dialog.minQuantityLabel')}
                type="number"
                fullWidth
                value={form.triggerQuantity}
                onChange={(e) => setForm({ ...form, triggerQuantity: e.target.value })}
                placeholder={t('seller.gifts.dialog.minQuantityPlaceholder')}
              />
            )}

            {form.triggerType === 'AMOUNT' && (
              <TextField
                label={t('seller.gifts.dialog.minAmountLabel')}
                type="number"
                fullWidth
                value={form.triggerAmount}
                onChange={(e) => setForm({ ...form, triggerAmount: e.target.value })}
                placeholder={t('seller.gifts.dialog.minAmountPlaceholder')}
              />
            )}

            <TextField
              select
              label={t('seller.gifts.dialog.giftProductsLabel')}
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
              label={t('seller.gifts.dialog.allowChoiceLabel')}
            />
            <FormControlLabel
              control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />}
              label={t('seller.gifts.dialog.activeLabel')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setOpen(false)}>{t('seller.gifts.dialog.cancelButton')}</GhostButton>
          <PrimaryButton onClick={save} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : t('seller.gifts.dialog.saveButton')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
