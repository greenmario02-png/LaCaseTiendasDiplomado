import { useEffect, useState } from 'react';
import { Truck, Gift, Package } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Chip,
  Button,
  Divider,
  Breadcrumbs,
  Alert,
  CircularProgress,
} from '@mui/material';
import { api } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  PREPARING: 'En preparación',
  SHIPPED: 'Enviada',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const money = useMoney();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [proofUrl, setProofUrl] = useState('');

  useEffect(() => {
    api
      .get(`/orders/buyer/${id}`)
      .then((res) => setOrder(res.data.data))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  const uploadProof = async () => {
    if (!proofUrl.trim()) return;
    try {
      const { data } = await api.post(`/orders/${id}/payment-proof`, { proofUrl });
      setOrder((o: any) => ({ ...o, paymentStatus: data.data.paymentStatus, paymentProofUrl: data.data.paymentProofUrl }));
      toast.success('Comprobante enviado');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const confirmDelivery = async () => {
    try {
      const { data } = await api.post(`/orders/${id}/confirm-delivery`);
      setOrder((o: any) => ({ ...o, status: data.data.status }));
      toast.success('¡Gracias! Confirmaste la entrega. El pago se liberó al vendedor');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />;

  if (!order) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5">Orden no encontrada</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Typography component={Link} to="/cuenta/pedidos" sx={{ textDecoration: 'none', color: 'inherit' }}>
          Mis pedidos
        </Typography>
        <Typography color="text.primary">#{order.id}</Typography>
      </Breadcrumbs>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Typography variant="h5" fontWeight={700}>
            Orden #{order.id}
          </Typography>
          <Chip label={STATUS_LABEL[order.status] || order.status} color={order.status === 'DELIVERED' ? 'success' : 'info'} />
          {order.fulfillmentType === 'PICKUP' ? (
            <Chip label="🏬 Retiro en tienda" color="secondary" variant="outlined" />
          ) : (
            <Chip icon={<Truck size={13} strokeWidth={2.2} />} label="Envío a domicilio" color="default" variant="outlined" />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {new Date(order.createdAt).toLocaleString('es-AR')} · Tienda: {order.seller.storeName}
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>
          Productos
        </Typography>
        {order.items?.map((item: any) => (
          <Box key={item.id} display="flex" justifyContent="space-between" py={1} borderBottom={1} borderColor="divider">
            <Box display="flex" gap={1}>
              {item.product.images?.[0] && (
                <img src={item.product.images[0].url} alt="" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} />
              )}
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {item.product.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ×{item.quantity} a {money(item.unitPrice)}
                </Typography>
                {item.isGift && (
                  <Chip size="small" color="success" label={item.giftLabel || 'Regalo'} sx={{ mt: 0.5 }} />
                )}
              </Box>
            </Box>
            <Typography variant="body2" fontWeight={600}>
              {money(Number(item.unitPrice) * item.quantity)}
            </Typography>
          </Box>
        ))}
        <Box mt={2}>
          <Box display="flex" justifyContent="space-between" fontSize="body2">
            <Typography color="text.secondary">Subtotal</Typography>
            <Typography>{money(order.subtotal)}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" fontSize="body2">
            <Typography color="text.secondary">Envío</Typography>
            <Typography>{money(order.shippingCost)}</Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box display="flex" justifyContent="space-between">
            <Typography fontWeight={700}>Total</Typography>
            <Typography fontWeight={700} className="price-color">
              {money(order.total)}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>
          Pago por QR
        </Typography>
        {order.paymentStatus === 'VERIFIED' ? (
          <Alert severity="success">Pago verificado por el vendedor.</Alert>
        ) : order.paymentStatus === 'PROOF_SUBMITTED' ? (          <Alert severity="info">Comprobante enviado. Esperando verificación.</Alert>
        ) : (
          <>
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Box className="image-container" sx={{ width: 140, height: 140, borderRadius: 2, mx: 'auto' }}>
                {order.seller?.paymentQrUrl ? (
                  <img src={order.seller.paymentQrUrl} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <Typography color="text.disabled">QR no disponible</Typography>
                )}
              </Box>
            </Box>
            <Box display="flex" gap={1}>
              <input
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="URL del comprobante de transferencia"
                style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
              />
              <Button variant="contained" onClick={uploadProof} disabled={!proofUrl.trim()}>
                Subir comprobante
              </Button>
            </Box>
          </>
        )}
      </Paper>

      {order.paymentStatus === 'VERIFIED' && ['SHIPPED', 'DELIVERED', 'PENDING', 'PROOF_SUBMITTED'].includes(order.status) && (
        <Paper sx={{ p: 3, mt: 3, bgcolor: 'success.light' }}>
          <Typography variant="h6" fontWeight={700} mb={1}>
            ¿Recibiste tu pedido?
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Confirmar la entrega protege tu compra y libera el pago al vendedor. Es la garantía de confianza de la plataforma.
          </Typography>
          <Button variant="contained" color="success" size="large" onClick={confirmDelivery}>
            Sí, confirmo que recibí el pedido ✓
          </Button>
        </Paper>
      )}

      {order.shippingAddress && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" fontWeight={700} mb={1}>
            Envío a
          </Typography>
          <Typography variant="body2">
            {order.shippingAddress.street} {order.shippingAddress.number}
            {order.shippingAddress.floor ? ', ' + order.shippingAddress.floor : ''} — {order.shippingAddress.city},{' '}
            {order.shippingAddress.state} (CP {order.shippingAddress.postalCode})
          </Typography>
        </Paper>
      )}

      {order.fulfillmentType === 'PICKUP' && (
        <Paper sx={{ p: 3, mt: 3, bgcolor: 'secondary.light' }}>
          <Typography variant="h6" fontWeight={700} mb={1}>
            🏬 Retiro en tienda
          </Typography>
          <Typography variant="body2">
            {order.pickupAddress || 'Retirá el pedido en la tienda del vendedor.'}
          </Typography>
        </Paper>
      )}
    </Container>
  );
}
