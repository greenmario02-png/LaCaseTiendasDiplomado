import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Alert,
  Grid,
  Divider,
  Chip,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useMoney } from '../hooks/useMoney';
import { getErrorMessage } from '../services/api';
import toast from 'react-hot-toast';
import { PrimaryButton, SecondaryButton } from '../components/redesign/Buttons';

export default function OrderConfirmationPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const money = useMoney();
  const orders = (location.state as any)?.orders || [];
  const [proofUrl, setProofUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<Record<number, string>>({});

  const uploadProof = async (orderId: number) => {
    if (!proofUrl.trim()) {
      toast.error(t('orders.errors.proofUrlRequired'));
      return;
    }
    setUploading(true);
    try {
      await api.post(`/orders/${orderId}/payment-proof`, { proofUrl });
      setPaymentStatus((s) => ({ ...s, [orderId]: 'PROOF_SUBMITTED' }));
      toast.success(t('orders.proofSentToast'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Box textAlign="center" mb={4}>
        <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main' }} />
        <Typography variant="h4" fontWeight={700} mt={1}>
          {t('orders.confirmation.title')}
        </Typography>
        <Typography color="text.secondary">
          {t('orders.confirmation.subtitle', { count: orders.length })}
        </Typography>
      </Box>

      {orders.map((order: any) => (
        <Paper key={order.id} sx={{ p: 3, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={700}>
              {t('orders.orderNumber', { id: order.id })}
            </Typography>
            <Chip label={order.seller?.storeName || t('orders.defaultStoreName')} color="primary" variant="outlined" />
          </Box>

          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography color="text.secondary">{t('orders.subtotal')}</Typography>
            <Typography>{money(order.subtotal)}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography color="text.secondary">{t('orders.shipping')}</Typography>
            <Typography>{money(order.shippingCost)}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography fontWeight={700}>{t('orders.total')}</Typography>
            <Typography fontWeight={700} className="price-color">
              {money(order.total)}
            </Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            <QrCode2Icon sx={{ verticalAlign: 'middle', mr: 0.5, fontSize: 18 }} />
            {t('orders.qrPaymentTitle', { storeName: order.seller?.storeName })}
          </Typography>

          {order.paymentStatus === 'VERIFIED' ? (
            <Alert severity="success">{t('orders.paymentVerified')}</Alert>
          ) : order.paymentStatus === 'PROOF_SUBMITTED' || paymentStatus[order.id] === 'PROOF_SUBMITTED' ? (
            <Alert severity="info">{t('orders.proofSubmittedWaiting')}</Alert>
          ) : (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                {t('orders.scanQrInstructions')}
              </Alert>
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Box className="image-container" sx={{ width: 160, height: 160, borderRadius: 2, mx: 'auto' }}>
                  {order.seller?.paymentQrUrl ? (
                    <img src={order.seller.paymentQrUrl} alt={t('orders.qrAlt')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <QrCode2Icon sx={{ fontSize: 80, color: '#999' }} />
                  )}
                </Box>
              </Box>
              <Box display="flex" gap={1}>
                <input
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder={t('orders.proofUrlPlaceholder')}
                  style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
                />
                <PrimaryButton onClick={() => uploadProof(order.id)} disabled={uploading}>
                  {uploading ? <CircularProgress size={20} /> : t('orders.uploadProof')}
                </PrimaryButton>
              </Box>
            </Box>
          )}
        </Paper>
      ))}

      <Box textAlign="center" mt={3} display="flex" justifyContent="center" gap={1}>
        <PrimaryButton to="/cuenta/pedidos">{t('orders.viewMyOrders')}</PrimaryButton>
        <SecondaryButton to="/productos">{t('orders.continueShopping')}</SecondaryButton>
      </Box>
    </Container>
  );
}
