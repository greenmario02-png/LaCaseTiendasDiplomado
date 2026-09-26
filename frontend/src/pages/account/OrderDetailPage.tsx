import { useEffect, useState } from 'react';
import { Truck, Gift, Package } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Chip,
  Divider,
  Breadcrumbs,
  Alert,
} from '@mui/material';
import { api } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useUnifiedTokens } from '../../theme';
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';
import { PrimaryButton } from '../../components/redesign/Buttons';
import { LoadingState } from '../../components/redesign/States';
import { FadeIn } from '../../components/motion/FadeIn';

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
  const t = useUnifiedTokens();
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

  if (loading) return <LoadingState />;

  if (!order) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={700} color={t.onSurface}>
          Orden no encontrada
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Typography component={Link} to="/cuenta/pedidos" sx={{ textDecoration: 'none', color: t.onSurfaceVariant }}>
          Mis pedidos
        </Typography>
        <Typography color={t.onSurface}>#{order.id}</Typography>
      </Breadcrumbs>

      <PageHeader
        title={`Orden #${order.id}`}
        subtitle={`${new Date(order.createdAt).toLocaleString('es-AR')} · Tienda: ${order.seller.storeName}`}
        icon={<ReceiptLongIcon />}
        actions={
          <>
          <Chip label={STATUS_LABEL[order.status] || order.status} color={order.status === 'DELIVERED' ? 'success' : 'info'} />
          {order.fulfillmentType === 'PICKUP' ? (
            <Chip label="🏬 Retiro en tienda" color="secondary" variant="outlined" />
          ) : (
            <Chip icon={<Truck size={13} strokeWidth={2.2} />} label="Envío a domicilio" color="default" variant="outlined" />
          )}
          </>
        }
      />

      <FadeIn>
      <SurfaceCard sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={700} mb={2} color={t.onSurface}>
          Productos
        </Typography>
        {order.items?.map((item: any) => (
          <Box key={item.id} display="flex" justifyContent="space-between" py={1} borderBottom={1} borderColor={`${t.outline}33`}>
            <Box display="flex" gap={1}>
              {item.product.images?.[0] && (
                <img src={item.product.images[0].url} alt="" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} />
              )}
              <Box>
                <Typography variant="body2" fontWeight={600} color={t.onSurface}>
                  {item.product.name}
                </Typography>
                <Typography variant="caption" color={t.onSurfaceVariant}>
                  ×{item.quantity} a {money(item.unitPrice)}
                </Typography>
                {item.isGift && (
                  <Chip size="small" color="success" label={item.giftLabel || 'Regalo'} sx={{ mt: 0.5 }} />
                )}
              </Box>
            </Box>
            <Typography variant="body2" fontWeight={600} color={t.onSurface}>
              {money(Number(item.unitPrice) * item.quantity)}
            </Typography>
          </Box>
        ))}
        <Box mt={2}>
          <Box display="flex" justifyContent="space-between" fontSize="body2">
            <Typography color={t.onSurfaceVariant}>Subtotal</Typography>
            <Typography color={t.onSurface}>{money(order.subtotal)}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" fontSize="body2">
            <Typography color={t.onSurfaceVariant}>Envío</Typography>
            <Typography color={t.onSurface}>{money(order.shippingCost)}</Typography>
          </Box>
          <Divider sx={{ my: 1, borderColor: `${t.outline}33` }} />
          <Box display="flex" justifyContent="space-between">
            <Typography fontWeight={700} color={t.onSurface}>Total</Typography>
            <Typography fontWeight={700} color={t.primary}>
              {money(order.total)}
            </Typography>
          </Box>
        </Box>
      </SurfaceCard>

      <SurfaceCard>
        <Typography variant="h6" fontWeight={700} mb={2} color={t.onSurface}>
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
                  <Typography color={t.onSurfaceVariant}>QR no disponible</Typography>
                )}
              </Box>
            </Box>
            <Box display="flex" gap={1}>
              <input
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="URL del comprobante de transferencia"
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: `1px solid ${t.outline}`,
                  background: t.surfaceContainerLowest,
                  color: t.onSurface,
                }}
              />
              <PrimaryButton type="button" onClick={uploadProof} disabled={!proofUrl.trim()}>
                Subir comprobante
              </PrimaryButton>
            </Box>
          </>
        )}
      </SurfaceCard>

      {order.paymentStatus === 'VERIFIED' && ['SHIPPED', 'DELIVERED', 'PENDING', 'PROOF_SUBMITTED'].includes(order.status) && (
        <SurfaceCard sx={{ mt: 3, bgcolor: 'success.light' }}>
          <Typography variant="h6" fontWeight={700} mb={1} color="text.primary">
            ¿Recibiste tu pedido?
          </Typography>
          <Typography variant="body2" color="text.primary" mb={2}>
            Confirmar la entrega protege tu compra y libera el pago al vendedor. Es la garantía de confianza de la plataforma.
          </Typography>
          <PrimaryButton type="button" color="success" size="large" onClick={confirmDelivery}>
            Sí, confirmo que recibí el pedido ✓
          </PrimaryButton>
        </SurfaceCard>
      )}

      {order.shippingAddress && (
        <SurfaceCard sx={{ mt: 3 }}>
          <Typography variant="h6" fontWeight={700} mb={1} color={t.onSurface}>
            Envío a
          </Typography>
          <Typography variant="body2" color={t.onSurfaceVariant}>
            {order.shippingAddress.street} {order.shippingAddress.number}
            {order.shippingAddress.floor ? ', ' + order.shippingAddress.floor : ''} — {order.shippingAddress.city},{' '}
            {order.shippingAddress.state} (CP {order.shippingAddress.postalCode})
          </Typography>
        </SurfaceCard>
      )}

      {order.fulfillmentType === 'PICKUP' && (
        <SurfaceCard sx={{ mt: 3, bgcolor: 'secondary.light' }}>
          <Typography variant="h6" fontWeight={700} mb={1} color="text.primary">
            🏬 Retiro en tienda
          </Typography>
          <Typography variant="body2" color="text.primary">
            {order.pickupAddress || 'Retirá el pedido en la tienda del vendedor.'}
          </Typography>
        </SurfaceCard>
      )}
      </FadeIn>
    </Container>
  );
}
