import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Chip, Stack, CircularProgress, Avatar, Alert } from '@mui/material';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { api, getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

interface RequestItem {
  id: number;
  status: string;
  createdAt: string;
  buyer: { id: number; firstName: string; lastName: string; email: string; totalSales: number };
}

interface BuyerItem {
  id: number;
  approvedAt: string | null;
  buyer: { id: number; firstName: string; lastName: string; email: string };
}

export default function SellerPrivileged() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [buyers, setBuyers] = useState<BuyerItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/seller/privileged/requests').then((r) => r.data.data).catch(() => []),
      api.get('/seller/privileged/buyers').then((r) => r.data.data).catch(() => []),
    ])
      .then(([req, buy]) => {
        setRequests(req);
        setBuyers(buy);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const decide = async (id: number, decision: 'APPROVED' | 'REJECTED') => {
    try {
      await api.put(`/seller/privileged/${id}`, { decision });
      toast.success(decision === 'APPROVED' ? 'Comprador privilegiado aprobado' : 'Solicitud rechazada');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 6 }} />;

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <WorkspacePremiumIcon color="secondary" />
        <Typography variant="h5" fontWeight={700}>
          Compradores privilegiados
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Estos compradores ven tus productos nuevos antes que el público general y pueden reservarlos. Vos decidís quiénes son privilegiados.
      </Typography>

      <Typography variant="h6" fontWeight={700} mb={1}>
        Solicitudes pendientes ({requests.length})
      </Typography>
      {requests.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', mb: 3 }}>
          <Typography color="text.secondary">No hay solicitudes pendientes.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5} mb={3}>
          {requests.map((r) => (
            <Paper key={r.id} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>{r.buyer.firstName[0]}</Avatar>
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    {r.buyer.firstName} {r.buyer.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.buyer.email} · {r.buyer.totalSales} compras · solicitó el {new Date(r.createdAt).toLocaleDateString('es-BO')}
                  </Typography>
                </Box>
              </Box>
              <Stack direction="row" spacing={1}>
                <PrimaryButton size="small" color="success" startIcon={<CheckIcon />} onClick={() => decide(r.id, 'APPROVED')}>
                  Aprobar
                </PrimaryButton>
                <SecondaryButton size="small" color="error" startIcon={<CloseIcon />} onClick={() => decide(r.id, 'REJECTED')}>
                  Rechazar
                </SecondaryButton>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Typography variant="h6" fontWeight={700} mb={1}>
        Compradores privilegiados ({buyers.length})
      </Typography>
      {buyers.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Alert severity="info" sx={{ maxWidth: 480, mx: 'auto' }}>
            Aún no tenés compradores privilegiados. Cuando apruebes solicitudes, esos compradores verán tus productos nuevos con acceso anticipado.
          </Alert>
        </Paper>
      ) : (
        <Stack spacing={1}>
          {buyers.map((b) => (
            <Paper key={b.id} sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>{b.buyer.firstName[0]}</Avatar>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {b.buyer.firstName} {b.buyer.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {b.buyer.email} · desde {b.approvedAt ? new Date(b.approvedAt).toLocaleDateString('es-BO') : ''}
                </Typography>
              </Box>
              <Chip label="Privilegiado" size="small" color="secondary" sx={{ ml: 'auto' }} />
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
