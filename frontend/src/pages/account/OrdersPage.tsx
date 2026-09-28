import { useEffect, useState } from 'react';
import { Container, Typography, Box, Chip, Pagination, Skeleton } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import { useUnifiedTokens } from '../../theme';
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';
import { PrimaryButton, GhostButton } from '../../components/redesign/Buttons';
import { EmptyState } from '../../components/redesign/States';
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerList';

const STATUS_COLOR: Record<string, any> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PREPARING: 'info',
  SHIPPED: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'error',
};

export default function OrdersPage() {
  const { t: tt } = useTranslation();
  const STATUS_LABEL: Record<string, { label: string; color: any }> = {
    PENDING: { label: tt('orders.status.pending'), color: STATUS_COLOR.PENDING },
    CONFIRMED: { label: tt('orders.status.confirmed'), color: STATUS_COLOR.CONFIRMED },
    PREPARING: { label: tt('orders.status.preparing'), color: STATUS_COLOR.PREPARING },
    SHIPPED: { label: tt('orders.status.shipped'), color: STATUS_COLOR.SHIPPED },
    DELIVERED: { label: tt('orders.status.delivered'), color: STATUS_COLOR.DELIVERED },
    CANCELLED: { label: tt('orders.status.cancelled'), color: STATUS_COLOR.CANCELLED },
  };
  const PAYMENT_LABEL: Record<string, string> = {
    PENDING: tt('orders.paymentStatus.pending'),
    PROOF_SUBMITTED: tt('orders.paymentStatus.proofSubmitted'),
    VERIFIED: tt('orders.paymentStatus.verified'),
    REJECTED: tt('orders.paymentStatus.rejected'),
  };
  const money = useMoney();
  const t = useUnifiedTokens();
  const [orders, setOrders] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/orders/buyer', { params: { page, limit: 10 } })
      .then((res) => {
        setOrders(res.data.data);
        setMeta(res.data.meta);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <PageHeader title={tt('account.myOrders')} subtitle={tt('account.myOrdersSubtitle')} icon={<ReceiptLongIcon />} />

      {loading ? (
        <Skeleton variant="rounded" height={300} />
      ) : orders.length === 0 ? (
        <SurfaceCard>
          <EmptyState
            message={tt('orders.noOrdersYet')}
            action={
              <PrimaryButton to="/productos" type="button">
                {tt('orders.buySomething')}
              </PrimaryButton>
            }
          />
        </SurfaceCard>
      ) : (
        <>
          <StaggerContainer>
          {orders.map((o) => (
            <StaggerItem key={o.id}>
            <SurfaceCard sx={{ p: 2, mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color={t.onSurface}>
                    {tt('orders.orderNumber', { id: o.id })}
                  </Typography>
                  <Typography variant="caption" color={t.onSurfaceVariant}>
                    {new Date(o.createdAt).toLocaleString('es-AR')} · {o.seller.storeName}
                  </Typography>
                </Box>
                <Box display="flex" gap={1}>
                  <Chip label={STATUS_LABEL[o.status]?.label || o.status} size="small" color={STATUS_LABEL[o.status]?.color || 'default'} />
                  <Chip label={PAYMENT_LABEL[o.paymentStatus] || o.paymentStatus} size="small" variant="outlined" />
                </Box>
              </Box>
              <Box mt={1}>
                {o.items?.slice(0, 3).map((item: any) => (
                  <Typography key={item.id} variant="body2" color={t.onSurface}>
                    ×{item.quantity} {item.product.name}
                  </Typography>
                ))}
                {o.items?.length > 3 && <Typography variant="caption" color={t.onSurfaceVariant}>{tt('orders.moreItems', { count: o.items.length - 3 })}</Typography>}
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                <Typography fontWeight={700} color={t.primary}>{money(o.total)}</Typography>
                <GhostButton to={`/cuenta/pedidos/${o.id}`} type="button" size="small">
                  {tt('orders.viewDetail')}
                </GhostButton>
              </Box>
            </SurfaceCard>
            </StaggerItem>
          ))}
          </StaggerContainer>
          {meta && meta.totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination count={meta.totalPages} page={page} onChange={(_, p) => setPage(p)} />
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
