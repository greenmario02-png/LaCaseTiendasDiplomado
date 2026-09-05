import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Typography, Paper, Box, Chip, Button, Pagination, Skeleton } from '@mui/material';
import { api } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';

const STATUS_LABEL: Record<string, { label: string; color: any }> = {
  PENDING: { label: 'Pendiente', color: 'warning' },
  CONFIRMED: { label: 'Confirmada', color: 'info' },
  PREPARING: { label: 'En preparación', color: 'info' },
  SHIPPED: { label: 'Enviada', color: 'primary' },
  DELIVERED: { label: 'Entregada', color: 'success' },
  CANCELLED: { label: 'Cancelada', color: 'error' },
};

const PAYMENT_LABEL: Record<string, string> = {
  PENDING: 'Pago pendiente',
  PROOF_SUBMITTED: 'Comprobante enviado',
  VERIFIED: 'Pago verificado',
  REJECTED: 'Pago rechazado',
};

export default function OrdersPage() {
  const money = useMoney();
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
      <Typography variant="h5" fontWeight={700} mb={3}>
        Mis pedidos
      </Typography>

      {loading ? (
        <Skeleton variant="rounded" height={300} />
      ) : orders.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No tenés pedidos aún.</Typography>
          <Button component={Link} to="/productos" variant="contained" sx={{ mt: 2 }}>
            Comprar algo
          </Button>
        </Paper>
      ) : (
        <>
          {orders.map((o) => (
            <Paper key={o.id} sx={{ p: 2, mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Orden #{o.id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
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
                  <Typography key={item.id} variant="body2">
                    ×{item.quantity} {item.product.name}
                  </Typography>
                ))}
                {o.items?.length > 3 && <Typography variant="caption" color="text.secondary">+{o.items.length - 3} más</Typography>}
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                <Typography fontWeight={700}>{money(o.total)}</Typography>
                <Button component={Link} to={`/cuenta/pedidos/${o.id}`} size="small">
                  Ver detalle
                </Button>
              </Box>
            </Paper>
          ))}
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
