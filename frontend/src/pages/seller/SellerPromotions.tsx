import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Tabs,
  Tab,
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
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';
import { PrimaryButton, GhostButton } from '../../components/redesign/Buttons';
import { EmptyState } from '../../components/redesign/States';
import { useUnifiedTokens } from '../../theme';

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
  const { t } = useTranslation();
  const money = useMoney();
  const tk = useUnifiedTokens();
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
      toast.error(t('seller.promotions.toasts.fillTitleDiscount'));
      return;
    }
    if (selectedProducts.length === 0) {
      toast.error(t('seller.promotions.toasts.selectProduct'));
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
      toast.success(t('seller.promotions.toasts.promoCreated'));
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
      toast.error(t('seller.promotions.toasts.fillCodeValue'));
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
      toast.success(t('seller.promotions.toasts.couponCreated'));
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const saveGift = async () => {
    if (!giftForm.title || giftForm.giftProductIds.length === 0) {
      toast.error(t('seller.promotions.toasts.fillTitleGiftProducts'));
      return;
    }
    try {
      await api.post('/seller/gifts', {
        ...giftForm,
        triggerQuantity: giftForm.triggerQuantity ? Number(giftForm.triggerQuantity) : null,
        triggerAmount: giftForm.triggerAmount ? Number(giftForm.triggerAmount) : null,
        triggerProductId: giftForm.triggerProductId ? Number(giftForm.triggerProductId) : null,
      });
      toast.success(t('seller.promotions.toasts.giftCreated'));
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const deactivate = async (id: number) => {
    try {
      await api.delete(`/seller/promotions/${id}`);
      toast.success(t('seller.promotions.toasts.promoDeactivated'));
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
      <PageHeader
        title={t('seller.promotions.pageTitle')}
        subtitle={t('seller.promotions.pageSubtitle')}
        icon={<LocalOfferIcon />}
        actions={
          <PrimaryButton type="button" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            {t('seller.promotions.newPromotion')}
          </PrimaryButton>
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={t('seller.promotions.tabs.active', { count: active.length })} />
        <Tab label={t('seller.promotions.tabs.finished', { count: finished.length })} />
      </Tabs>

      {tab === 0 && active.length === 0 && (
        <SurfaceCard>
          <EmptyState message={t('seller.promotions.empty.active')} />
        </SurfaceCard>
      )}
      {tab === 1 && finished.length === 0 && (
        <SurfaceCard>
          <EmptyState message={t('seller.promotions.empty.finished')} />
        </SurfaceCard>
      )}

      {(tab === 0 ? active : finished).map((p) => (
        <SurfaceCard key={p.id} sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle1" fontWeight={700} color={tk.onSurface}>
                  {p.title}
                </Typography>
                <Chip
                  size="small"
                  label={
                    p.discountType === 'PERCENTAGE'
                      ? t('seller.promotions.card.percentOff', { value: p.discountValue })
                      : t('seller.promotions.card.amountOff', { value: money(Number(p.discountValue)) })
                  }
                  color={p.discountType === 'PERCENTAGE' ? 'primary' : 'secondary'}
                />
                <Chip
                  size="small"
                  label={tab === 0 ? t('seller.promotions.card.statusActive') : t('seller.promotions.card.statusFinished')}
                  color={tab === 0 ? 'success' : 'default'}
                  variant="outlined"
                />
              </Stack>
              {p.description && (
                <Typography variant="body2" color="text.secondary">
                  {p.description}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {new Date(p.startDate).toLocaleDateString()} → {new Date(p.endDate).toLocaleDateString()}
                {p.minSpend ? ` · ${t('seller.promotions.card.minSpend', { amount: money(Number(p.minSpend)) })}` : ''}
                {p.maxSpend ? ` · ${t('seller.promotions.card.maxSpend', { amount: money(Number(p.maxSpend)) })}` : ''}
                {p.spentAmount ? ` · ${t('seller.promotions.card.spent', { amount: money(Number(p.spentAmount)) })}` : ''}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                {p.products?.map((pp: any) => (
                  <Chip
                    key={pp.product.id}
                    avatar={<Avatar src={pp.product.images?.[0]?.url} />}
                    label={t('seller.promotions.card.productPrice', {
                      name: pp.product.name,
                      price: money(Number(pp.product.originalPrice || pp.product.price)),
                    })}
                    size="small"
                  />
                ))}
              </Stack>
            </Box>
            {tab === 0 && (
              <IconButton color="error" onClick={() => deactivate(p.id)} title={t('seller.promotions.card.deactivateTooltip')}>
                <DeleteIcon />
              </IconButton>
            )}
          </Stack>
        </SurfaceCard>
      ))}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('seller.promotions.dialog.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label={t('seller.promotions.dialog.typeLabel')}
              value={promoType}
              onChange={(e) => setPromoType(e.target.value as any)}
              fullWidth
            >
              <MenuItem value="PRODUCT">
                <Stack direction="row" spacing={1} alignItems="center">
                  <LocalOfferIcon fontSize="small" /> {t('seller.promotions.dialog.typeProduct')}
                </Stack>
              </MenuItem>
              <MenuItem value="COUPON">
                <Stack direction="row" spacing={1} alignItems="center">
                  <ConfirmationNumberIcon fontSize="small" /> {t('seller.promotions.dialog.typeCoupon')}
                </Stack>
              </MenuItem>
              <MenuItem value="GIFT">
                <Stack direction="row" spacing={1} alignItems="center">
                  <RedeemIcon fontSize="small" /> {t('seller.promotions.dialog.typeGift')}
                </Stack>
              </MenuItem>
            </TextField>

            {promoType === 'PRODUCT' && (
              <>
                <TextField
                  label={t('seller.promotions.dialog.product.titleLabel')}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  fullWidth
                  required
                />
                <TextField
                  label={t('seller.promotions.dialog.product.descriptionLabel')}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    select
                    label={t('seller.promotions.dialog.product.discountTypeLabel')}
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                    sx={{ flex: 1 }}
                  >
                    <MenuItem value="PERCENTAGE">{t('seller.promotions.dialog.product.percentageOption')}</MenuItem>
                    <MenuItem value="FIXED">{t('seller.promotions.dialog.product.fixedOption')}</MenuItem>
                  </TextField>
                  <TextField
                    label={
                      form.discountType === 'PERCENTAGE'
                        ? t('seller.promotions.dialog.product.percentageFieldLabel')
                        : t('seller.promotions.dialog.product.amountFieldLabel')
                    }
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                    sx={{ flex: 1 }}
                    required
                  />
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label={t('seller.promotions.dialog.product.minSpendLabel')}
                    value={form.minSpend}
                    onChange={(e) => setForm({ ...form, minSpend: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label={t('seller.promotions.dialog.product.maxSpendLabel')}
                    value={form.maxSpend}
                    onChange={(e) => setForm({ ...form, maxSpend: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label={t('seller.promotions.dialog.product.startDateLabel')}
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    sx={{ flex: 1 }}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label={t('seller.promotions.dialog.product.endDateLabel')}
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
                  getOptionLabel={(o) => t('seller.promotions.dialog.product.productOptionLabel', { name: o.name, price: money(Number(o.price)) })}
                  value={selectedProducts}
                  onChange={(_, v) => setSelectedProducts(v)}
                  renderInput={(params) => <TextField {...params} label={t('seller.promotions.dialog.product.productsLabel')} />}
                />
              </>
            )}

            {promoType === 'COUPON' && (
              <>
                <TextField
                  label={t('seller.promotions.dialog.coupon.codeLabel')}
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                  fullWidth
                  required
                  helperText={t('seller.promotions.dialog.coupon.codeHelper')}
                />
                <TextField
                  label={t('seller.promotions.dialog.coupon.descriptionLabel')}
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    select
                    label={t('seller.promotions.dialog.coupon.typeLabel')}
                    value={couponForm.type}
                    onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}
                    sx={{ flex: 1 }}
                  >
                    <MenuItem value="PERCENTAGE">{t('seller.promotions.dialog.coupon.percentageOption')}</MenuItem>
                    <MenuItem value="FIXED">{t('seller.promotions.dialog.coupon.fixedOption')}</MenuItem>
                    <MenuItem value="GIFT">{t('seller.promotions.dialog.coupon.giftOption')}</MenuItem>
                  </TextField>
                  <TextField
                    label={
                      couponForm.type === 'PERCENTAGE'
                        ? t('seller.promotions.dialog.coupon.percentageFieldLabel')
                        : t('seller.promotions.dialog.coupon.amountFieldLabel')
                    }
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
                  label={t('seller.promotions.dialog.coupon.singleUseLabel')}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label={t('seller.promotions.dialog.coupon.maxUsesLabel')}
                    value={couponForm.maxUses}
                    onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label={t('seller.promotions.dialog.coupon.perUserLimitLabel')}
                    value={couponForm.perUserLimit}
                    onChange={(e) => setCouponForm({ ...couponForm, perUserLimit: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label={t('seller.promotions.dialog.coupon.minSpendLabel')}
                    value={couponForm.minSpend}
                    onChange={(e) => setCouponForm({ ...couponForm, minSpend: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label={t('seller.promotions.dialog.coupon.maxSpendLabel')}
                    value={couponForm.maxSpend}
                    onChange={(e) => setCouponForm({ ...couponForm, maxSpend: e.target.value })}
                    sx={{ flex: 1 }}
                    helperText={t('seller.promotions.dialog.coupon.maxSpendHelper')}
                  />
                </Stack>
              </>
            )}

            {promoType === 'GIFT' && (
              <>
                <TextField
                  label={t('seller.promotions.dialog.gift.titleLabel')}
                  value={giftForm.title}
                  onChange={(e) => setGiftForm({ ...giftForm, title: e.target.value })}
                  fullWidth
                  required
                />
                <TextField
                  label={t('seller.promotions.dialog.gift.descriptionLabel')}
                  value={giftForm.description}
                  onChange={(e) => setGiftForm({ ...giftForm, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                />
                <TextField
                  select
                  label={t('seller.promotions.dialog.gift.triggerLabel')}
                  value={giftForm.triggerType}
                  onChange={(e) => setGiftForm({ ...giftForm, triggerType: e.target.value })}
                  fullWidth
                >
                  <MenuItem value="UNITS">{t('seller.promotions.dialog.gift.triggerUnits')}</MenuItem>
                  <MenuItem value="AMOUNT">{t('seller.promotions.dialog.gift.triggerAmount')}</MenuItem>
                  <MenuItem value="PRODUCT">{t('seller.promotions.dialog.gift.triggerProduct')}</MenuItem>
                </TextField>
                {giftForm.triggerType === 'UNITS' && (
                  <TextField
                    label={t('seller.promotions.dialog.gift.quantityLabel')}
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
                    renderInput={(params) => <TextField {...params} label={t('seller.promotions.dialog.gift.triggerProductLabel')} />}
                  />
                )}
                {giftForm.triggerType === 'AMOUNT' && (
                  <TextField
                    label={t('seller.promotions.dialog.gift.minAmountLabel')}
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
                    renderInput={(params) => <TextField {...params} label={t('seller.promotions.dialog.gift.triggerProductLabel')} />}
                  />
                )}
                <FormControlLabel
                  control={
                    <Switch
                      checked={giftForm.allowChoice}
                      onChange={(e) => setGiftForm({ ...giftForm, allowChoice: e.target.checked })}
                    />
                  }
                  label={t('seller.promotions.dialog.gift.allowChoiceLabel')}
                />
                <Autocomplete
                  multiple
                  options={myProducts}
                  getOptionLabel={(o) => o.name}
                  value={myProducts.filter((p) => giftForm.giftProductIds.includes(p.id))}
                  onChange={(_, v) => setGiftForm({ ...giftForm, giftProductIds: v.map((p) => p.id) })}
                  renderInput={(params) => <TextField {...params} label={t('seller.promotions.dialog.gift.giftProductsLabel')} />}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton type="button" onClick={() => setDialogOpen(false)}>{t('seller.promotions.dialog.cancel')}</GhostButton>
          <PrimaryButton
            type="button"
            onClick={() => (promoType === 'PRODUCT' ? savePromo() : promoType === 'COUPON' ? saveCoupon() : saveGift())}
          >
            {t('seller.promotions.dialog.create')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
