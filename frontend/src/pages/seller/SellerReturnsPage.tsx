import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { Box, Typography, Card, CardContent, Chip, Alert, Grid, CircularProgress, Avatar, Stack, TextField, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import { api, getErrorMessage } from '../../services/api';
import { resolveImageUrl } from '../../services/api';

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

export default function SellerReturnsPage() {
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
        Solicitudes de devolución
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

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
                  <Grid item xs={10} md={7}>
                    <Typography fontWeight={700}>{r.orderItem?.product?.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {REASONS[r.reason] ?? r.reason} · Comprador: {r.buyer?.firstName} {r.buyer?.lastName}
                    </Typography>
                    {r.details && (
                      <Typography variant="body2" mt={0.5}>
                        {r.details}
                      </Typography>
                    )}
                    <Typography variant="body2" mt={0.5}>
                      Monto del item: Bs {Number(r.orderItem?.unitPrice ?? 0).toLocaleString('es-BO')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
                    <Chip label={STATUS[r.status]?.label ?? r.status} color={STATUS[r.status]?.color ?? 'default'} size="small" />
                    {r.status === 'PENDING' && (
                      <Box mt={1}>
                        <PrimaryButton size="small" onClick={() => openDialog(r)}>
                          Responder
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
        <DialogTitle>Responder devolución</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            Producto: <b>{dialog?.name}</b>
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Decisión</InputLabel>
            <Select value={decision} label="Decisión" onChange={(e) => setDecision(e.target.value)}>
              <MenuItem value="APPROVED">Aprobar (reembolsar)</MenuItem>
              <MenuItem value="REJECTED">Rechazar</MenuItem>
            </Select>
          </FormControl>
          {decision === 'APPROVED' && (
            <TextField
              fullWidth
              size="small"
              label="Monto del reembolso (Bs)"
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}
          <TextField
            fullWidth
            size="small"
            label="Nota al comprador"
            multiline
            rows={2}
            value={responseNote}
            onChange={(e) => setResponseNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setDialog(null)}>Cancelar</GhostButton>
          <PrimaryButton onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
