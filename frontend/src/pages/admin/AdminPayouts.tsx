import { useEffect, useState } from 'react';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PaidIcon from '@mui/icons-material/Paid';
import { api, getErrorMessage } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import toast from 'react-hot-toast';

interface Payout {
  id: number;
  amount: number;
  status: string;
  method: string;
  note?: string;
  createdAt: string;
  seller: { id: number; storeName: string; email: string };
}

const STATUS_COLOR: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'info',
  PAID: 'success',
  REJECTED: 'error',
};

export default function AdminPayouts() {
  const money = useMoney();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/payouts')
      .then((r) => setPayouts(r.data.data ?? []))
      .catch(() => setPayouts([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const process = async (id: number, status: string) => {
    try {
      await api.put(`/admin/payouts/${id}`, { status });
      toast.success(status === 'PAID' ? 'Payout marcado como pagado' : status === 'APPROVED' ? 'Payout aprobado' : 'Payout rechazado');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const pending = payouts.filter((p) => p.status === 'PENDING' || p.status === 'APPROVED');
  const done = payouts.filter((p) => p.status === 'PAID' || p.status === 'REJECTED');

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 6 }} />;

  const renderTable = (items: Payout[], interactive: boolean) => (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell>Tienda</TableCell>
            <TableCell>Monto</TableCell>
            <TableCell>Método</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Fecha</TableCell>
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center">
                No hay solicitudes.
              </TableCell>
            </TableRow>
          )}
          {items.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>
                  {p.seller.storeName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {p.seller.email}
                </Typography>
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{money(p.amount)}</TableCell>
              <TableCell>{p.method}</TableCell>
              <TableCell>
                <Chip size="small" label={p.status} color={STATUS_COLOR[p.status]} />
              </TableCell>
              <TableCell>{new Date(p.createdAt).toLocaleDateString('es-BO')}</TableCell>
              <TableCell align="right">
                {interactive ? (
                  <Box display="flex" gap={0.5} justifyContent="flex-end">
                    {p.status === 'PENDING' && (
                      <>
                        <PrimaryButton size="small" color="warning" startIcon={<CheckCircleIcon />} onClick={() => process(p.id, 'APPROVED')}>
                          Aprobar
                        </PrimaryButton>
                        <SecondaryButton size="small" color="error" startIcon={<CancelIcon />} onClick={() => process(p.id, 'REJECTED')}>
                          Rechazar
                        </SecondaryButton>
                      </>
                    )}
                    {p.status === 'APPROVED' && (
                      <PrimaryButton size="small" color="success" startIcon={<PaidIcon />} onClick={() => process(p.id, 'PAID')}>
                        Marcar pagado
                      </PrimaryButton>
                    )}
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    {p.note || '—'}
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <PaymentsIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Payouts a vendedores
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Por procesar (${pending.length})`} />
        <Tab label={`Historial (${done.length})`} />
      </Tabs>

      {tab === 0 && renderTable(pending, true)}
      {tab === 1 && renderTable(done, false)}
    </Box>
  );
}
