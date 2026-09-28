import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Coins } from 'lucide-react';
import { Box, Typography, Card, CardContent, Chip, Alert, Grid, CircularProgress, Avatar, Stack } from '@mui/material';
import { SecondaryButton } from '../components/redesign/Buttons';
import { api, getErrorMessage, resolveImageUrl } from '../services/api';

export default function ReturnsPage() {
  const { t: tr } = useTranslation();
  const STATUS: Record<string, { label: string; color: any }> = {
    PENDING: { label: tr('returns.status.pending'), color: 'warning' },
    APPROVED: { label: tr('returns.status.approved'), color: 'info' },
    REJECTED: { label: tr('returns.status.rejected'), color: 'error' },
    COMPLETED: { label: tr('returns.status.completed'), color: 'success' },
    CANCELLED: { label: tr('returns.status.cancelled'), color: 'default' },
  };

  const REASONS: Record<string, string> = {
    PRODUCTO_DEFECTUOSO: tr('returns.reasons.defective'),
    PRODUCTO_INCORRECTO: tr('returns.reasons.incorrect'),
    NO_COINCIDE_DESCRIPCION: tr('returns.reasons.notAsDescribed'),
    YA_NO_LO_NECESITO: tr('returns.reasons.noLongerNeeded'),
    OTRO: tr('returns.reasons.other'),
  };

  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/returns/mine');
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

  const cancel = async (id: number) => {
    try {
      await api.post(`/returns/${id}/cancel`);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading) return <CircularProgress sx={{ mt: 6, mx: 'auto', display: 'block' }} />;

  return (
    <Box p={3} maxWidth={900} mx="auto">
      <Typography variant="h5" fontWeight={800} gutterBottom>
        {tr('returns.title')}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Typography variant="body2" color="text.secondary" mb={2}>
        {tr('returns.requestNote')}
      </Typography>

      {returns.length === 0 ? (
        <Alert severity="info">{tr('returns.empty')}</Alert>
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
                  <Grid item xs={10} md={8}>
                    <Typography fontWeight={700}>{r.orderItem?.product?.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {tr('returns.reasonAndStore', { reason: REASONS[r.reason] ?? r.reason, store: r.seller?.storeName })}
                    </Typography>
                    {r.details && (
                      <Typography variant="body2" mt={0.5}>
                        {r.details}
                      </Typography>
                    )}
                    {r.responseNote && (
                      <Typography variant="body2" mt={0.5} color="text.secondary">
                        {tr('returns.sellerResponse', { response: r.responseNote })}
                      </Typography>
                    )}
                    {r.refundAmount != null && (
                      <Typography variant="body2" fontWeight={700} color="success.main" mt={0.5}>
                        {tr('returns.refund', { amount: Number(r.refundAmount).toLocaleString('es-BO') })}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={3} sx={{ textAlign: { md: 'right' } }}>
                    <Chip
                      label={STATUS[r.status]?.label ?? r.status}
                      color={STATUS[r.status]?.color ?? 'default'}
                      size="small"
                    />
                    {r.status === 'PENDING' && (
                      <Box mt={1}>
                        <SecondaryButton size="small" color="error" onClick={() => cancel(r.id)}>
                          {tr('returns.cancel')}
                        </SecondaryButton>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
