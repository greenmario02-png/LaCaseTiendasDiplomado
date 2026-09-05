import { useEffect, useState } from 'react';
import { Package, Coins } from 'lucide-react';
import { Box, Typography, Card, CardContent, Chip, Alert, Grid, CircularProgress, Avatar, Stack } from '@mui/material';
import { SecondaryButton } from '../components/redesign/Buttons';
import { api, getErrorMessage, resolveImageUrl } from '../services/api';

const STATUS: Record<string, { label: string; color: any }> = {
  PENDING: { label: 'Pendiente', color: 'warning' },
  APPROVED: { label: 'Aprobada', color: 'info' },
  REJECTED: { label: 'Rechazada', color: 'error' },
  COMPLETED: { label: 'Completada', color: 'success' },
  CANCELLED: { label: 'Cancelada', color: 'default' },
};

const REASONS: Record<string, string> = {
  PRODUCTO_DEFECTUOSO: 'Producto defectuoso',
  PRODUCTO_INCORRECTO: 'Producto incorrecto',
  NO_COINCIDE_DESCRIPCION: 'No coincide con la descripción',
  YA_NO_LO_NECESITO: 'Ya no lo necesito',
  OTRO: 'Otro motivo',
};

export default function ReturnsPage() {
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
        Mis devoluciones
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Typography variant="body2" color="text.secondary" mb={2}>
        Solo podés solicitar una devolución después de recibir la compra con el pago verificado.
      </Typography>

      {returns.length === 0 ? (
        <Alert severity="info">No tenés solicitudes de devolución.</Alert>
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
                      {REASONS[r.reason] ?? r.reason} · Tienda: {r.seller?.storeName}
                    </Typography>
                    {r.details && (
                      <Typography variant="body2" mt={0.5}>
                        {r.details}
                      </Typography>
                    )}
                    {r.responseNote && (
                      <Typography variant="body2" mt={0.5} color="text.secondary">
                        Respuesta del vendedor: {r.responseNote}
                      </Typography>
                    )}
                    {r.refundAmount != null && (
                      <Typography variant="body2" fontWeight={700} color="success.main" mt={0.5}>
                        Reembolso: Bs {Number(r.refundAmount).toLocaleString('es-BO')}
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
                          Cancelar
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
