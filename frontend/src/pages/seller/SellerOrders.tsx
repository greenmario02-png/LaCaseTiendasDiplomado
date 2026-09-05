import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
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

const STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const PAYMENT_STATUSES = ['PENDING', 'PROOF_SUBMITTED', 'VERIFIED', 'REJECTED'];

export default function SellerOrders() {
  const money = useMoney();
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
      toast.success('Estado actualizado');
      load(page);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const changePayment = async (orderId: number, paymentStatus: string) => {
    try {
      await api.put(`/orders/seller/${orderId}/payment-status`, { paymentStatus });
      toast.success('Estado de pago actualizado');
      load(page);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>
          Pedidos recibidos
        </Typography>
        <Select size="small" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} displayEmpty>
          <MenuItem value="">Todos los estados</MenuItem>
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Comprador</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Entrega</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Pago</TableCell>
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
                      <Chip label="🏬 Retiro" size="small" color="secondary" variant="outlined" />
                      {o.pickupAddress && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {o.pickupAddress}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Chip icon={<Truck size={13} strokeWidth={2.2} />} label="Envío" size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell>
                  <Select size="small" value={o.status} onChange={(e) => changeStatus(o.id, e.target.value)}>
                    {STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  {o.paymentProofUrl ? (
                    <Box>
                      <Chip label={o.paymentStatus} size="small" color={o.paymentStatus === 'VERIFIED' ? 'success' : 'warning'} />
                      <Box mt={0.5}>
                        <a href={o.paymentProofUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                          ver comprobante
                        </a>
                      </Box>
                      {o.paymentStatus === 'PROOF_SUBMITTED' && (
                        <Select size="small" value="" onChange={(e) => changePayment(o.id, e.target.value)} displayEmpty sx={{ mt: 0.5, width: '100%' }}>
                          <MenuItem value="" disabled>
                            Verificar...
                          </MenuItem>
                          {PAYMENT_STATUSES.filter((s) => s !== 'PROOF_SUBMITTED').map((s) => (
                            <MenuItem key={s} value={s}>
                              {s}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    </Box>
                  ) : (
                    <Chip label={o.paymentStatus} size="small" variant="outlined" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {meta?.totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination count={meta.totalPages} page={page} onChange={(_, p) => setPage(p)} />
        </Box>
      )}
    </Box>
  );
}

