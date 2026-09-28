import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Chip, Stack, CircularProgress, Avatar, Alert } from '@mui/material';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { api, getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
      toast.success(
        decision === 'APPROVED'
          ? t('seller.privileged.approvedToast')
          : t('seller.privileged.rejectedToast'),
      );
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
          {t('seller.privileged.title')}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {t('seller.privileged.subtitle')}
      </Typography>

      <Typography variant="h6" fontWeight={700} mb={1}>
        {t('seller.privileged.pendingRequestsTitle', { count: requests.length })}
      </Typography>
      {requests.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', mb: 3 }}>
          <Typography color="text.secondary">{t('seller.privileged.noPendingRequests')}</Typography>
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
                    {t('seller.privileged.requestMeta', {
                      email: r.buyer.email,
                      totalSales: r.buyer.totalSales,
                      date: new Date(r.createdAt).toLocaleDateString('es-BO'),
                    })}
                  </Typography>
                </Box>
              </Box>
              <Stack direction="row" spacing={1}>
                <PrimaryButton size="small" color="success" startIcon={<CheckIcon />} onClick={() => decide(r.id, 'APPROVED')}>
                  {t('seller.privileged.approveButton')}
                </PrimaryButton>
                <SecondaryButton size="small" color="error" startIcon={<CloseIcon />} onClick={() => decide(r.id, 'REJECTED')}>
                  {t('seller.privileged.rejectButton')}
                </SecondaryButton>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Typography variant="h6" fontWeight={700} mb={1}>
        {t('seller.privileged.buyersTitle', { count: buyers.length })}
      </Typography>
      {buyers.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Alert severity="info" sx={{ maxWidth: 480, mx: 'auto' }}>
            {t('seller.privileged.noBuyers')}
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
                  {t('seller.privileged.buyerMeta', {
                    email: b.buyer.email,
                    date: b.approvedAt ? new Date(b.approvedAt).toLocaleDateString('es-BO') : '',
                  })}
                </Typography>
              </Box>
              <Chip label={t('seller.privileged.privilegedChip')} size="small" color="secondary" sx={{ ml: 'auto' }} />
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
