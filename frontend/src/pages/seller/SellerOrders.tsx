import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  Chip,
  Pagination,
} from '@mui/material';
import { api } from '../../services/api';
import { Truck } from 'lucide-react';
import { useMoney } from '../../hooks/useMoney';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';
import { EmptyState } from '../../components/redesign/States';
import { useUnifiedTokens } from '../../theme';

const STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const PAYMENT_STATUSES = ['PENDING', 'PROOF_SUBMITTED', 'VERIFIED', 'REJECTED'];
// Claves de traducción de cada estado (los códigos del servidor están en inglés; la interfaz nunca debe mostrarlos).
const PAYMENT_KEY: Record<string, string> = { PENDING: 'pending', PROOF_SUBMITTED: 'proofSubmitted', VERIFIED: 'verified', REJECTED: 'rejected' };

export default function SellerOrders() {
  const { t } = useTranslation();
  const money = useMoney();
  const t2 = useUnifiedTokens();
  const statusLabel = (s: string) => t(`orders.status.${s.toLowerCase()}`);
  const paymentLabel = (s: string) => t(`orders.paymentStatus.${PAYMENT_KEY[s] ?? s.toLowerCase()}`);
  const [orders, setOrders] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const load = (p = 1) => {
    api
      .get('/orders/seller', { params: { page: p, limit: 20, ...(statusFilter ? { status: statusFilter } : {}) } })
      .then((res) => {
        setOrders(res.data.data);
        setMeta(res.data.meta);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load(page);
  }, [page, statusFilter]);

  const changeStatus = async (orderId: number, status: string) => {
    try {
      await api.put(`/orders/seller/${orderId}/status`, { status });
      toast.success(t('seller.orders.toasts.statusUpdated'));
      load(page);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const changePayment = async (orderId: number, paymentStatus: string) => {
    try {
      await api.put(`/orders/seller/${orderId}/payment-status`, { paymentStatus });
      toast.success(t('seller.orders.toasts.paymentStatusUpdated'));
      load(page);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Box>
      <PageHeader
        title={t('seller.orders.pageTitle')}
        icon={<ReceiptLongIcon />}
        actions={
          <Select size="small" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} displayEmpty>
            <MenuItem value="">{t('seller.orders.allStatuses')}</MenuItem>
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {statusLabel(s)}
              </MenuItem>
            ))}
          </Select>
        }
      />

      <SurfaceCard sx={{ p: 0, overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: t2.surface, '& th': { color: t2.onSurfaceVariant, fontWeight: 700 } }}>
              <TableCell>#</TableCell>
              <TableCell>{t('seller.orders.columns.buyer')}</TableCell>
              <TableCell align="right">{t('seller.orders.columns.total')}</TableCell>
              <TableCell>{t('seller.orders.columns.delivery')}</TableCell>
              <TableCell>{t('seller.orders.columns.status')}</TableCell>
              <TableCell>{t('seller.orders.columns.payment')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell>{o.id}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {o.buyer?.firstName} {o.buyer?.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(o.createdAt).toLocaleString('es-AR')}
                  </Typography>
                </TableCell>
                <TableCell align="right">{money(Number(o.total))}</TableCell>
                <TableCell>
                  {o.fulfillmentType === 'PICKUP' ? (
                    <Box>
                      <Chip label={t('seller.orders.pickupChip')} size="small" color="secondary" variant="outlined" />
                      {o.pickupAddress && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {o.pickupAddress}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Chip icon={<Truck size={13} strokeWidth={2.2} />} label={t('seller.orders.shippingChip')} size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell>
                  <Select size="small" value={o.status} onChange={(e) => changeStatus(o.id, e.target.value)}>
                    {STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {statusLabel(s)}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  {o.paymentProofUrl ? (
                    <Box>
                      <Chip label={paymentLabel(o.paymentStatus)} size="small" color={o.paymentStatus === 'VERIFIED' ? 'success' : 'warning'} />
                      <Box mt={0.5}>
                        <a href={o.paymentProofUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                          {t('seller.orders.viewProofLink')}
                        </a>
                      </Box>
                      {o.paymentStatus === 'PROOF_SUBMITTED' && (
                        <Select size="small" value="" onChange={(e) => changePayment(o.id, e.target.value)} displayEmpty sx={{ mt: 0.5, width: '100%' }}>
                          <MenuItem value="" disabled>
                            {t('seller.orders.verifyPlaceholder')}
                          </MenuItem>
                          {PAYMENT_STATUSES.filter((s) => s !== 'PROOF_SUBMITTED').map((s) => (
                            <MenuItem key={s} value={s}>
                              {paymentLabel(s)}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    </Box>
                  ) : (
                    <Chip label={paymentLabel(o.paymentStatus)} size="small" variant="outlined" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {orders.length === 0 && <EmptyState message={t('seller.orders.emptyState')} />}
      </SurfaceCard>

      {meta?.totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination count={meta.totalPages} page={page} onChange={(_, p) => setPage(p)} />
        </Box>
      )}
    </Box>
  );
}
