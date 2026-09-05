import { useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useMoney } from '../hooks/useMoney';
import { PriceDisplay } from '../components/redesign/PriceDisplay';
import { EmptyState } from '../components/redesign/States';
import { PrimaryButton } from '../components/redesign/Buttons';

export default function CartPage() {
  const navigate = useNavigate();
  const money = useMoney();
  const { cart, loading, fetchCart, updateQuantity, removeItem } = useCartStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

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
          message="Tu carrito está vacío"
          action={<PrimaryButton to="/productos">Explorar productos</PrimaryButton>}
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
          Carrito ({cart.itemCount} ítems)
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          {cart.groupedBySeller.map((group) => (
            <Paper key={group.seller.id} sx={{ p: 2, mb: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
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
                <Chip label="Envío se calcula en checkout" size="small" variant="outlined" />
              </Box>

              {group.items.map((item) => (
                <Box key={item.id} display="flex" alignItems="center" gap={2} py={1} borderBottom={1} borderColor="divider">
                  <Box className="image-container" sx={{ width: 70, height: 70, borderRadius: 1, flexShrink: 0 }}>
                    {item.product.images?.[0] ? (
                      <img src={item.product.images[0].url} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        sin img
                      </Typography>
                    )}
                  </Box>
                  <Box flex={1}>
                    <Typography component={Link} to={`/producto/${item.product.id}/${item.product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} variant="body2" fontWeight={600} sx={{ textDecoration: 'none', color: 'inherit' }}>
                      {item.product.name}
                    </Typography>
                    {item.variant && <Typography variant="caption" color="text.secondary">Variante: {JSON.stringify(item.variant)}</Typography>}
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
                  <IconButton onClick={() => removeItem(item.id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}

              <Box textAlign="right" mt={1}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Subtotal tienda: {money(group.subtotal)}
                </Typography>
              </Box>

              {(group.seller as any).paymentQrUrl && (
                <Box display="flex" alignItems="center" gap={2} mt={2} p={1.5} bgcolor="#f5f5f5" borderRadius={2}>
                  <img
                    src={(group.seller as any).paymentQrUrl}
                    alt={`QR de ${group.seller.storeName}`}
                    style={{ width: 96, height: 96, borderRadius: 8, objectFit: 'cover', background: '#fff', border: '1px solid #ddd' }}
                  />
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      QR de pago de {group.seller.storeName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Escaneá este QR para pagar el total de esta tienda. El comprobante lo confirmás en el checkout.
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
              Resumen
            </Typography>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography color="text.secondary">Subtotal</Typography>
              <Typography fontWeight={600}>{money(cart.subtotal)}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography color="text.secondary">Envío</Typography>
              <Typography fontWeight={600}>Calculado en checkout</Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Total</Typography>
              <Typography variant="h6" className="price-color">
                {money(cart.subtotal)}
              </Typography>
            </Box>
            {!user && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Link to="/login">Iniciá sesión</Link> para finalizar la compra
              </Alert>
            )}
            <PrimaryButton
              size="large"
              fullWidth
              disabled={!user}
              onClick={() => navigate('/checkout')}
            >
              Finalizar compra
            </PrimaryButton>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
