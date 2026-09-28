import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { Box, Typography, Card, CardContent, Chip, Alert, Grid, CircularProgress, Avatar, Stack, TextField, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import { api, getErrorMessage } from '../../services/api';
import { resolveImageUrl } from '../../services/api';

const STATUS_META: Record<string, { key: string; color: any }> = {
  PENDING: { key: 'pending', color: 'warning' },
  APPROVED: { key: 'approved', color: 'info' },
  REJECTED: { key: 'rejected', color: 'error' },
  COMPLETED: { key: 'completed', color: 'success' },
  CANCELLED: { key: 'cancelled', color: 'default' },
};

const REASON_KEYS: Record<string, string> = {
  PRODUCTO_DEFECTUOSO: 'productoDefectuoso',
  PRODUCTO_INCORRECTO: 'productoIncorrecto',
  NO_COINCIDE_DESCRIPCION: 'noCoincideDescripcion',
  YA_NO_LO_NECESITO: 'yaNoLoNecesito',
  OTRO: 'otro',
};

export default function SellerReturnsPage() {
  const { t } = useTranslation();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<{ id: number; name: string } | null>(null);
  const [decision, setDecision] = useState('APPROVED');
  const [refundAmount, setRefundAmount] = useState('');
  const [responseNote, setResponseNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/returns/seller');
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
    setDialog({ id: r.id, name: r.orderItem?.product?.name });
    setDecision('APPROVED');
    setRefundAmount(String(r.orderItem?.unitPrice ?? ''));
    setResponseNote('');
  };

  const save = async () => {
    if (!dialog) return;
    setSaving(true);
    try {
      await api.post(`/returns/${dialog.id}/respond`, {
        decision,
        refundAmount: decision === 'APPROVED' && refundAmount ? Number(refundAmount) : undefined,
        responseNote,
      });
      setDialog(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress sx={{ mt: 6, mx: 'auto', display: 'block' }} />;

  return (
    <Box p={3} maxWidth={1000} mx="auto">
      <Typography variant="h5" fontWeight={800} gutterBottom>
        {t('seller.returns.title')}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {returns.length === 0 ? (
        <Alert severity="info">{t('seller.returns.empty')}</Alert>
      ) : (
        <Stack spacing={2}>
          {returns.map((r) => (
            <Card key={r.id} variant="outlined">
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={2} md={1}>
                    {r.orderItem?.product?.images?.[0]?.url ? (
                      <Avatar src={resolveImageUrl(r.orderItem.product.images[0].url)} variant="rounded" sx={{ width: 48, height: 48 }} />
                    ) : (
                      <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: 'grey.300' }}><Package size={22} /></Avatar>
                    )}
                  </Grid>
                  <Grid item xs={10} md={7}>
                    <Typography fontWeight={700}>{r.orderItem?.product?.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(REASON_KEYS[r.reason] ? t(`seller.returns.reasons.${REASON_KEYS[r.reason]}`) : r.reason)} · {t('seller.returns.buyerLabel')} {r.buyer?.firstName} {r.buyer?.lastName}
                    </Typography>
                    {r.details && (
                      <Typography variant="body2" mt={0.5}>
                        {r.details}
                      </Typography>
                    )}
                    <Typography variant="body2" mt={0.5}>
                      {t('seller.returns.itemAmount', { amount: Number(r.orderItem?.unitPrice ?? 0).toLocaleString('es-BO') })}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
                    <Chip label={STATUS_META[r.status] ? t(`seller.returns.status.${STATUS_META[r.status].key}`) : r.status} color={STATUS_META[r.status]?.color ?? 'default'} size="small" />
                    {r.status === 'PENDING' && (
                      <Box mt={1}>
                        <PrimaryButton size="small" onClick={() => openDialog(r)}>
                          {t('seller.returns.respond')}
                        </PrimaryButton>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('seller.returns.dialog.title')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            {t('seller.returns.dialog.productLabel')} <b>{dialog?.name}</b>
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>{t('seller.returns.dialog.decisionLabel')}</InputLabel>
            <Select value={decision} label={t('seller.returns.dialog.decisionLabel')} onChange={(e) => setDecision(e.target.value)}>
              <MenuItem value="APPROVED">{t('seller.returns.dialog.decisionApprove')}</MenuItem>
              <MenuItem value="REJECTED">{t('seller.returns.dialog.decisionReject')}</MenuItem>
            </Select>
          </FormControl>
          {decision === 'APPROVED' && (
            <TextField
              fullWidth
              size="small"
              label={t('seller.returns.dialog.refundAmountLabel')}
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}
          <TextField
            fullWidth
            size="small"
            label={t('seller.returns.dialog.responseNoteLabel')}
            multiline
            rows={2}
            value={responseNote}
            onChange={(e) => setResponseNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setDialog(null)}>{t('seller.returns.dialog.cancel')}</GhostButton>
          <PrimaryButton onClick={save} disabled={saving}>
            {saving ? t('seller.returns.dialog.saving') : t('seller.returns.dialog.save')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
