import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  IconButton,
  TextField,
  Divider,
  Chip,
  Alert,
  Skeleton,
  Avatar,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useMoney } from '../hooks/useMoney';
import { PriceDisplay } from '../components/redesign/PriceDisplay';
import { EmptyState } from '../components/redesign/States';
import { PrimaryButton } from '../components/redesign/Buttons';
import { summarizeSelection, useCartSelection } from '../stores/cartSelectionStore';
import { usePayT } from '../lib/payments';
import { resolveImageUrl } from '../services/api';

/** Casilla con área táctil de 44 px. */
const checkSx = { width: 44, height: 44, flexShrink: 0 } as const;

export default function CartPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const money = useMoney();
  const { cart, loading, fetchCart, updateQuantity, removeItem } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const pt = usePayT();
  // Qué se paga: se guarda lo NO seleccionado (lo nuevo entra marcado); el resto se queda en el carrito.
  const excluded = useCartSelection((s) => s.excluded);
  const setSelected = useCartSelection((s) => s.setSelected);
  const toggle = useCartSelection((s) => s.toggle);
  const prune = useCartSelection((s) => s.prune);
  const sel = summarizeSelection(cart, excluded);
  const isSel = (id: number) => !excluded.includes(id);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // La selección guardada solo conserva ids que siguen en el carrito.
  useEffect(() => {
    if (cart) prune((cart.items ?? cart.groupedBySeller.flatMap((g) => g.items)).map((i) => i.id));
  }, [cart, prune]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rounded" height={200} />
      </Container>
    );
  }

  if (!cart || cart.itemCount === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 6, textAlign: 'center' }}>
        <EmptyState
          message={t('cart.emptyMessage')}
          action={<PrimaryButton to="/productos">{t('cart.exploreProducts')}</PrimaryButton>}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>
          {t('cart.title', { count: cart.itemCount })}
        </Typography>
      </Box>

      <Paper sx={{ px: 1, py: 0.5, mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <FormControlLabel
          sx={{ m: 0, minHeight: 44 }}
          control={
            <Checkbox
              sx={checkSx}
              checked={sel.allSelected}
              indeterminate={sel.count > 0 && !sel.allSelected}
              onChange={(e) => setSelected(cart.groupedBySeller.flatMap((g) => g.items.map((i) => i.id)), e.target.checked)}
            />
          }
          label={pt('cart.selectAll')}
        />
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          {pt('cart.selectedSummary', { count: sel.count, total: sel.total })}
        </Typography>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          {cart.groupedBySeller.map((group) => (
            <Paper key={group.seller.id} sx={{ p: 2, mb: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Checkbox
                  sx={checkSx}
                  checked={group.items.every((i) => isSel(i.id))}
                  indeterminate={group.items.some((i) => isSel(i.id)) && !group.items.every((i) => isSel(i.id))}
                  onChange={(e) => setSelected(group.items.map((i) => i.id), e.target.checked)}
                  inputProps={{ 'aria-label': pt('cart.selectStore', { store: group.seller.storeName }) }}
                />
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  <StorefrontIcon fontSize="small" />
                </Avatar>
                <Box flex={1}>
                  <Typography component={Link} to={`/vendedor/${group.seller.id}`} variant="subtitle1" fontWeight={700} sx={{ textDecoration: 'none', color: 'inherit' }}>
                    {group.seller.storeName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {group.seller.locationCity}
                  </Typography>
                </Box>
                <Chip label={t('cart.shippingCalculatedAtCheckout')} size="small" variant="outlined" />
              </Box>

              {group.items.map((item) => (
                <Box key={item.id} display="flex" alignItems="center" gap={2} py={1} borderBottom={1} borderColor="divider" sx={{ opacity: isSel(item.id) ? 1 : 0.6 }}>
                  <Checkbox
                    sx={checkSx}
                    checked={isSel(item.id)}
                    onChange={() => toggle(item.id)}
                    inputProps={{ 'aria-label': pt('cart.selectItem', { name: item.product.name }) }}
                  />
                  <Box className="image-container" sx={{ width: 70, height: 70, borderRadius: 1, flexShrink: 0 }}>
                    {item.product.images?.[0] ? (
                      <img src={resolveImageUrl(item.product.images[0].url)} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        {t('cart.noImage')}
                      </Typography>
                    )}
                  </Box>
                  <Box flex={1}>
                    <Typography component={Link} to={`/producto/${item.product.id}/${item.product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} variant="body2" fontWeight={600} sx={{ textDecoration: 'none', color: 'inherit' }}>
                      {item.product.name}
                    </Typography>
                    {item.variant && <Typography variant="caption" color="text.secondary">{t('cart.variant', { variant: JSON.stringify(item.variant) })}</Typography>}
                    <PriceDisplay price={Number(item.unitPrice)} />
                  </Box>
                  <TextField
                    type="number"
                    size="small"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, Math.max(1, Number(e.target.value)))}
                    inputProps={{ min: 1 }}
                    sx={{ width: 70 }}
                  />
                  <Typography variant="body1" fontWeight={700} sx={{ minWidth: 90, textAlign: 'right' }}>
                    {money(item.lineTotal)}
                  </Typography>
                  <IconButton onClick={() => removeItem(item.id)} color="error" aria-label={t('cart.remove', { defaultValue: 'Quitar del carrito' })} sx={{ width: 44, height: 44 }}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}

              <Box textAlign="right" mt={1}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {t('cart.storeSubtotal', { amount: money(group.subtotal) })}
                </Typography>
              </Box>

              {(group.seller as any).paymentQrUrl && (
                <Box display="flex" alignItems="center" gap={2} mt={2} p={1.5} bgcolor="action.hover" borderRadius={2}>
                  <img
                    src={resolveImageUrl((group.seller as any).paymentQrUrl)}
                    alt={t('cart.qrAlt', { storeName: group.seller.storeName })}
                    style={{ width: 96, height: 96, borderRadius: 8, objectFit: 'cover', background: '#fff', border: '1px solid #ddd' }}
                  />
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      {t('cart.qrTitle', { storeName: group.seller.storeName })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('cart.qrDescription')}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          ))}
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 80 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              {t('cart.summary')}
            </Typography>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography color="text.secondary">{t('cart.subtotal')}</Typography>
              <Typography fontWeight={600}>{money(sel.subtotal)}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography color="text.secondary">{t('cart.shipping')}</Typography>
              <Typography fontWeight={600}>{t('cart.calculatedAtCheckout')}</Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="h6">{t('cart.total')}</Typography>
              <Typography variant="h6" className="price-color">
                {money(sel.subtotal)}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {sel.count === 0 ? pt('cart.noneSelected') : pt('cart.keepHint')}
            </Typography>
            {!user && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Link to="/login">{t('cart.loginLink')}</Link> {t('cart.loginToCheckoutSuffix')}
              </Alert>
            )}
            <PrimaryButton
              size="large"
              fullWidth
              disabled={!user || sel.count === 0}
              onClick={() => navigate('/checkout')}
            >
              {pt('cart.goPay', { count: sel.count })}
            </PrimaryButton>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
