import { useEffect, useState } from 'react';
import { Truck, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  TextField,
  Divider,
  Alert,
  CircularProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useCartStore } from '../stores/cartStore';
import { useMoney } from '../hooks/useMoney';
import { getErrorMessage } from '../services/api';
import toast from 'react-hot-toast';
import { PrimaryButton, SecondaryButton, GhostButton } from '../components/redesign/Buttons';
import { EmptyState } from '../components/redesign/States';

interface ShippingQuote {
  sellerId: number;
  sellerName: string;
  subtotal: number;
  shippingCost: number;
  total: number;
}

export default function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const money = useMoney();
  const { cart, fetchCart } = useCartStore();

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [fulfillmentType, setFulfillmentType] = useState<'SHIPPING' | 'PICKUP'>('SHIPPING');
  const [pickupAddress, setPickupAddress] = useState('');
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [notes, setNotes] = useState('');
  const [checkingShipping, setCheckingShipping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponInfo, setCouponInfo] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [error, setError] = useState('');
  const [checkedShipping, setCheckedShipping] = useState(false);

  useEffect(() => {
    fetchCart();
    api
      .get('/account/addresses')
      .then((res) => {
        setAddresses(res.data.data);
        const def = res.data.data.find((a: any) => a.isDefault) || res.data.data[0];
        if (def) setSelectedAddress(def.id);
      })
      .catch(() => {});
  }, [fetchCart]);

  const selectedAddr = addresses.find((a) => a.id === selectedAddress);

  const checkShipping = async () => {
    if (fulfillmentType === 'PICKUP') {
      if (!pickupAddress.trim()) {
        setError(t('checkout.errors.pickupAddressRequired'));
        return;
      }
      setQuotes([]);
      setCheckedShipping(true);
      setError('');
      return;
    }
    if (!selectedAddr) {
      setError(t('checkout.errors.shippingAddressRequired'));
      return;
    }
    setCheckingShipping(true);
    setError('');
    try {
      const { data } = await api.post('/orders/calculate-shipping', { buyerPostalCode: selectedAddr.postalCode });
      setQuotes(data.data);
      setCheckedShipping(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCheckingShipping(false);
    }
  };

  const submitOrder = async () => {
    if (!checkedShipping) {
      await checkShipping();
      if (fulfillmentType === 'SHIPPING' && !quotes.length) return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/orders', {
        shippingAddressId: fulfillmentType === 'SHIPPING' ? selectedAddress : undefined,
        fulfillmentType,
        pickupAddress: fulfillmentType === 'PICKUP' ? pickupAddress.trim() : undefined,
        notes,
        couponCode: couponCode || undefined,
      });
      toast.success(t('checkout.orderSuccessToast'));
      const firstOrder = data.data[0];
      navigate(`/checkout/confirmacion/${firstOrder.id}`, { state: { orders: data.data } });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const applyCoupon = async () => {
    setCouponError('');
    try {
      const { data } = await api.get(`/coupons/${couponCode}/validate`);
      setCouponInfo(data.data);
    } catch (err: any) {
      setCouponError(getErrorMessage(err));
      setCouponInfo(null);
    }
  };

  if (!cart || cart.itemCount === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 10 }}>
        <EmptyState
          message={t('cart.emptyMessage')}
          action={<PrimaryButton to="/productos">{t('cart.exploreProducts')}</PrimaryButton>}
        />
      </Container>
    );
  }

  const total = quotes.reduce((acc, q) => acc + q.total, 0);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={3}>
        {t('checkout.title')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              {t('checkout.deliveryType')}
            </Typography>
            <RadioGroup
              row
              value={fulfillmentType}
              onChange={(e) => {
                setFulfillmentType(e.target.value as 'SHIPPING' | 'PICKUP');
                setCheckedShipping(false);
                setQuotes([]);
              }}
            >
              <FormControlLabel value="SHIPPING" control={<Radio />} label={t('checkout.homeDelivery')} />
              <FormControlLabel value="PICKUP" control={<Radio />} label={t('checkout.storePickupFree')} />
            </RadioGroup>
          </Paper>

          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              {fulfillmentType === 'PICKUP' ? t('checkout.pickupAddress') : t('checkout.shippingAddress')}
            </Typography>
            {fulfillmentType === 'PICKUP' ? (
              <TextField
                fullWidth
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder={t('checkout.pickupAddressPlaceholder')}
                helperText={t('checkout.pickupAddressHelper')}
              />
            ) : addresses.length === 0 ? (
              <Alert severity="warning">
                {t('checkout.noAddressesPrefix')} <a href="/cuenta/direcciones">{t('checkout.myAddressesLink')}</a>.
              </Alert>
            ) : (
              <RadioGroup value={selectedAddress} onChange={(e) => setSelectedAddress(Number(e.target.value))}>
                {addresses.map((a) => (
                  <FormControlLabel
                    key={a.id}
                    value={a.id}
                    control={<Radio />}
                    label={`${a.street} ${a.number}${a.floor ? ', ' + a.floor : ''} — ${a.city}, ${a.state} (CP ${a.postalCode})`}
                  />
                ))}
              </RadioGroup>
            )}
            <Box mt={2}>
              <SecondaryButton onClick={checkShipping} disabled={(fulfillmentType === 'SHIPPING' && !selectedAddr) || checkingShipping}>
                {checkingShipping ? <CircularProgress size={20} /> : fulfillmentType === 'PICKUP' ? t('checkout.continueWithoutShipping') : t('checkout.calculateShipping')}
              </SecondaryButton>
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              {t('checkout.sellerNotes')}
            </Typography>
            <TextField fullWidth multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('checkout.sellerNotesPlaceholder')} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, position: 'sticky', top: 80 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              {t('checkout.orderSummary')}
            </Typography>

            {quotes.length > 0 ? (
              <>
                {quotes.map((q) => (
                  <Box key={q.sellerId} mb={2}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {q.sellerName}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" fontSize="body2">
                      <Typography color="text.secondary">{t('checkout.subtotal')}</Typography>
                      <Typography>{money(q.subtotal)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" fontSize="body2">
                      <Typography color="text.secondary">{t('checkout.shipping')}</Typography>
                      <Typography>{money(q.shippingCost)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" fontWeight={700}>
                      <Typography>{t('checkout.storeTotal')}</Typography>
                      <Typography>{money(q.total)}</Typography>
                    </Box>
                  </Box>
                ))}
                <Divider sx={{ my: 2 }} />
                {/* Cupón de descuento */}
                <Box mb={2}>
                  <TextField
                    label={t('checkout.couponLabel')}
                    size="small"
                    fullWidth
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponInfo(null);
                      setCouponError('');
                    }}
                    placeholder={t('checkout.couponPlaceholder')}
                  />
                  {couponInfo && (
                    <Alert severity="success" sx={{ mt: 1 }}>
                      {couponInfo.type === 'PERCENTAGE' && t('checkout.couponAppliedPercentage', { value: couponInfo.value })}
                      {couponInfo.type === 'FIXED' && t('checkout.couponAppliedFixed', { amount: money(couponInfo.value) })}
                      {couponInfo.type === 'GIFT' && (
                        <>
                          {t('checkout.couponAppliedGift', { amount: money(couponInfo.value) })}
                        </>
                      )}
                    </Alert>
                  )}
                  {couponError && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {couponError}
                    </Alert>
                  )}
                  {couponCode && !couponInfo && !couponError && (
                    <Box mt={1}>
                      <GhostButton size="small" onClick={applyCoupon}>
                        {t('checkout.applyCoupon')}
                      </GhostButton>
                    </Box>
                  )}
                </Box>
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">{t('checkout.total')}</Typography>
                  <Typography variant="h6" className="price-color">
                    {money(total)}
                  </Typography>
                </Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  {t('checkout.paymentQrInfoPrefix')} <strong>{t('checkout.paymentQrInfoStrong')}</strong>{t('checkout.paymentQrInfoSuffix')}
                </Alert>
                <PrimaryButton size="large" fullWidth onClick={submitOrder} disabled={submitting || !checkedShipping || (fulfillmentType === 'SHIPPING' && quotes.length === 0)}>
                  {submitting ? <CircularProgress size={22} color="inherit" /> : t('checkout.confirmPurchase')}
                </PrimaryButton>
              </>
            ) : fulfillmentType === 'PICKUP' && checkedShipping ? (
              <>
                <Box display="flex" justifyContent="space-between" mb={1} fontSize="body2">
                  <Typography color="text.secondary">{t('checkout.subtotal')}</Typography>
                  <Typography>{money(cart.subtotal)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1} fontSize="body2">
                  <Typography color="text.secondary">{t('checkout.shipping')}</Typography>
                  <Chip label={t('checkout.freePickup')} size="small" color="success" variant="outlined" />
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">{t('checkout.total')}</Typography>
                  <Typography variant="h6" className="price-color">
                    {money(cart.subtotal)}
                  </Typography>
                </Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  {t('checkout.pickupPaymentInfoPrefix')} <strong>{t('checkout.paymentQrInfoStrong')}</strong>.
                </Alert>
                <PrimaryButton size="large" fullWidth onClick={submitOrder} disabled={submitting || !checkedShipping}>
                  {submitting ? <CircularProgress size={22} color="inherit" /> : t('checkout.confirmPurchase')}
                </PrimaryButton>
              </>
            ) : (
              <Box textAlign="center" py={3}>
                <Typography color="text.secondary">
                  {t('checkout.calculateShippingPrompt')}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
