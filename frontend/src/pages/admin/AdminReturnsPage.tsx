import { useEffect, useState } from 'react';
import { Box, Typography, Chip, Grid, Stack, TextField, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import { api, getErrorMessage } from '../../services/api';
import { useUnifiedTokens } from '../../theme';
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';
import { PrimaryButton, GhostButton } from '../../components/redesign/Buttons';
import { EmptyState, LoadingState, ErrorState } from '../../components/redesign/States';
import { FadeIn } from '../../components/motion/FadeIn';
import { useTranslation } from 'react-i18next';

const STATUS_COLOR: Record<string, any> = {
  PENDING: 'warning',
  APPROVED: 'info',
  REJECTED: 'error',
  COMPLETED: 'success',
  CANCELLED: 'default',
};

export default function AdminReturnsPage() {
  const tokens = useUnifiedTokens();
  const { t } = useTranslation();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<any>(null);
  const [status, setStatus] = useState('COMPLETED');
  const [refundAmount, setRefundAmount] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/returns/admin');
      setReturns(data.data ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openDialog = (r: any) => {
    setDialog(r);
    setStatus(r.status === 'PENDING' ? 'COMPLETED' : r.status);
    setRefundAmount(r.refundAmount != null ? String(r.refundAmount) : String(r.orderItem?.unitPrice ?? ''));
    setAdminNote('');
  };

  const save = async () => {
    if (!dialog) return;
    setSaving(true);
    try {
      await api.put(`/returns/admin/${dialog.id}`, {
        status,
        refundAmount: refundAmount ? Number(refundAmount) : undefined,
        adminNote,
      });
      setDialog(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <Box p={3} maxWidth={1000} mx="auto">
      <PageHeader title={t('admin.returns.title')} icon={<AssignmentReturnIcon />} />
      {error && <ErrorState message={error} onRetry={() => setError('')} />}

      {returns.length === 0 ? (
        <EmptyState message={t('admin.returns.empty')} />
      ) : (
        <FadeIn>
        <Stack spacing={2}>
          {returns.map((r) => (
            <SurfaceCard key={r.id} sx={{ p: 2.5 }}>
              <Box>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Typography fontWeight={700}>{r.orderItem?.product?.name}</Typography>
                    <Typography variant="body2" color={tokens.onSurfaceVariant}>
                      {t('admin.returns.buyerLine', {
                        firstName: r.buyer?.firstName,
                        lastName: r.buyer?.lastName,
                        storeName: r.seller?.storeName,
                      })}
                    </Typography>
                    <Typography variant="body2" mt={0.5}>
                      {t('admin.returns.reasonLine', { reason: r.reason })}
                    </Typography>
                    {r.details && (
                      <Typography variant="body2" mt={0.5}>
                        {r.details}
                      </Typography>
                    )}
                    {r.refundAmount != null && (
                      <Typography variant="body2" fontWeight={700} color="success.main" mt={0.5}>
                        {t('admin.returns.refundLine', { amount: Number(r.refundAmount).toLocaleString('es-BO') })}
                      </Typography>
                    )}
                    {r.adminNote && (
                      <Typography variant="body2" color={tokens.onSurfaceVariant} mt={0.5}>
                        {t('admin.returns.adminNoteLine', { note: r.adminNote })}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
                    <Chip
                      label={STATUS_COLOR[r.status] ? t(`admin.returns.status.${r.status.toLowerCase()}`) : r.status}
                      color={STATUS_COLOR[r.status] ?? 'default'}
                      size="small"
                    />
                    <Box mt={1}>
                      <PrimaryButton type="button" size="small" onClick={() => openDialog(r)}>
                        {t('admin.returns.resolve')}
                      </PrimaryButton>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </SurfaceCard>
          ))}
        </Stack>
        </FadeIn>
      )}

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('admin.returns.resolveDialog.title')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            {t('admin.returns.resolveDialog.product')} <b>{dialog?.orderItem?.product?.name}</b>
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>{t('admin.returns.resolveDialog.statusLabel')}</InputLabel>
            <Select value={status} label={t('admin.returns.resolveDialog.statusLabel')} onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="COMPLETED">{t('admin.returns.resolveDialog.statusOptions.completed')}</MenuItem>
              <MenuItem value="APPROVED">{t('admin.returns.status.approved')}</MenuItem>
              <MenuItem value="REJECTED">{t('admin.returns.status.rejected')}</MenuItem>
              <MenuItem value="CANCELLED">{t('admin.returns.status.cancelled')}</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            size="small"
            label={t('admin.returns.resolveDialog.refundAmountLabel')}
            type="number"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            size="small"
            label={t('admin.returns.resolveDialog.adminNoteLabel')}
            multiline
            rows={2}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <GhostButton type="button" onClick={() => setDialog(null)}>{t('admin.common.cancel')}</GhostButton>
          <PrimaryButton type="button" onClick={save} disabled={saving}>
            {saving ? t('admin.common.saving') : t('admin.common.save')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
