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
        setError('Indicá la dirección de retiro');
        return;
      }
      setQuotes([]);
      setCheckedShipping(true);
      setError('');
      return;
    }
    if (!selectedAddr) {
      setError('Seleccioná una dirección de envío');
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
      toast.success('Compra realizada. Pagá con el QR del vendedor.');
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
          message="Tu carrito está vacío"
          action={<PrimaryButton to="/productos">Explorar productos</PrimaryButton>}
        />
      </Container>
    );
  }

  const total = quotes.reduce((acc, q) => acc + q.total, 0);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Checkout
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
              Tipo de entrega
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
              <FormControlLabel value="SHIPPING" control={<Radio />} label="Envío a domicilio" />
              <FormControlLabel value="PICKUP" control={<Radio />} label="🏬 Retiro en tienda (gratis)" />
            </RadioGroup>
          </Paper>

          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              {fulfillmentType === 'PICKUP' ? 'Dirección de retiro' : 'Dirección de envío'}
            </Typography>
            {fulfillmentType === 'PICKUP' ? (
              <TextField
                fullWidth
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="Ej: Av. 16 de Julio 1523, tienda LaCase, La Paz"
                helperText="Indicá dónde retirarás el pedido (punto de venta de la tienda)."
              />
            ) : addresses.length === 0 ? (
              <Alert severity="warning">
                No tenés direcciones guardadas. Agregalas en <a href="/cuenta/direcciones">Mis direcciones</a>.
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
                {checkingShipping ? <CircularProgress size={20} /> : fulfillmentType === 'PICKUP' ? 'Continuar sin envío' : 'Calcular envío'}
              </SecondaryButton>
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Notas para el vendedor (opcional)
            </Typography>
            <TextField fullWidth multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: llamar antes de entregar" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, position: 'sticky', top: 80 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Resumen de la compra
            </Typography>

            {quotes.length > 0 ? (
              <>
                {quotes.map((q) => (
                  <Box key={q.sellerId} mb={2}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {q.sellerName}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" fontSize="body2">
                      <Typography color="text.secondary">Subtotal</Typography>
                      <Typography>{money(q.subtotal)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" fontSize="body2">
                      <Typography color="text.secondary">Envío</Typography>
                      <Typography>{money(q.shippingCost)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" fontWeight={700}>
                      <Typography>Total tienda</Typography>
                      <Typography>{money(q.total)}</Typography>
                    </Box>
                  </Box>
                ))}
                <Divider sx={{ my: 2 }} />
                {/* Cupón de descuento */}
                <Box mb={2}>
                  <TextField
                    label="Código de descuento"
                    size="small"
                    fullWidth
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponInfo(null);
                      setCouponError('');
                    }}
                    placeholder="Ej: BIENVENIDO10"
                  />
                  {couponInfo && (
                    <Alert severity="success" sx={{ mt: 1 }}>
                      {couponInfo.type === 'PERCENTAGE' && `${couponInfo.value}% de descuento aplicado`}
                      {couponInfo.type === 'FIXED' && `${money(couponInfo.value)} de descuento aplicado`}
                      {couponInfo.type === 'GIFT' && (
                        <>
                          Cupón de regalo de {money(couponInfo.value)}. Si gastás menos, la tienda te devuelve el
                          saldo en efectivo.
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
                        Aplicar cupón
                      </GhostButton>
                    </Box>
                  )}
                </Box>
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" className="price-color">
                    {money(total)}
                  </Typography>
                </Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  El pago se realiza por <strong>QR del vendedor</strong>. Al confirmar verás el QR y deberás subir el
                  comprobante de la transferencia.
                </Alert>
                <PrimaryButton size="large" fullWidth onClick={submitOrder} disabled={submitting || !checkedShipping || (fulfillmentType === 'SHIPPING' && quotes.length === 0)}>
                  {submitting ? <CircularProgress size={22} color="inherit" /> : 'Confirmar compra'}
                </PrimaryButton>
              </>
            ) : fulfillmentType === 'PICKUP' && checkedShipping ? (
              <>
                <Box display="flex" justifyContent="space-between" mb={1} fontSize="body2">
                  <Typography color="text.secondary">Subtotal</Typography>
                  <Typography>{money(cart.subtotal)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1} fontSize="body2">
                  <Typography color="text.secondary">Envío</Typography>
                  <Chip label="Gratis (retiro en tienda)" size="small" color="success" variant="outlined" />
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" className="price-color">
                    {money(cart.subtotal)}
                  </Typography>
                </Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Retirás el pedido en la dirección que indicaste. El pago se realiza por <strong>QR del vendedor</strong>.
                </Alert>
                <PrimaryButton size="large" fullWidth onClick={submitOrder} disabled={submitting || !checkedShipping}>
                  {submitting ? <CircularProgress size={22} color="inherit" /> : 'Confirmar compra'}
                </PrimaryButton>
              </>
            ) : (
              <Box textAlign="center" py={3}>
                <Typography color="text.secondary">
                  Calculá el envío o elegí retiro en tienda para ver el detalle
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
