import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { Box, Typography, Card, CardContent, Chip, Button, Alert, Grid, CircularProgress, Stack, TextField, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { api, getErrorMessage } from '../../services/api';

const STATUS: Record<string, { label: string; color: any }> = {
  PENDING: { label: 'Pendiente', color: 'warning' },
  APPROVED: { label: 'Aprobada', color: 'info' },
  REJECTED: { label: 'Rechazada', color: 'error' },
  COMPLETED: { label: 'Completada', color: 'success' },
  CANCELLED: { label: 'Cancelada', color: 'default' },
};

export default function AdminReturnsPage() {
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

  if (loading) return <CircularProgress sx={{ mt: 6, mx: 'auto', display: 'block' }} />;

  return (
    <Box p={3} maxWidth={1000} mx="auto">
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Devoluciones (administración)
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {returns.length === 0 ? (
        <Alert severity="info">No hay solicitudes de devolución.</Alert>
      ) : (
        <Stack spacing={2}>
          {returns.map((r) => (
            <Card key={r.id} variant="outlined">
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Typography fontWeight={700}>{r.orderItem?.product?.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Comprador: {r.buyer?.firstName} {r.buyer?.lastName} · Tienda: {r.seller?.storeName}
                    </Typography>
                    <Typography variant="body2" mt={0.5}>
                      Motivo: {r.reason}
                    </Typography>
                    {r.details && (
                      <Typography variant="body2" mt={0.5}>
                        {r.details}
                      </Typography>
                    )}
                    {r.refundAmount != null && (
                      <Typography variant="body2" fontWeight={700} color="success.main" mt={0.5}>
                        Reembolso: Bs {Number(r.refundAmount).toLocaleString('es-BO')}
                      </Typography>
                    )}
                    {r.adminNote && (
                      <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Nota admin: {r.adminNote}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
                    <Chip label={STATUS[r.status]?.label ?? r.status} color={STATUS[r.status]?.color ?? 'default'} size="small" />
                    <Box mt={1}>
                      <Button size="small" variant="contained" onClick={() => openDialog(r)}>
                        Resolver
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Resolver devolución</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            Producto: <b>{dialog?.orderItem?.product?.name}</b>
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Estado</InputLabel>
            <Select value={status} label="Estado" onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="COMPLETED">Completada (reembolso procesado)</MenuItem>
              <MenuItem value="APPROVED">Aprobada</MenuItem>
              <MenuItem value="REJECTED">Rechazada</MenuItem>
              <MenuItem value="CANCELLED">Cancelada</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            size="small"
            label="Monto del reembolso (Bs)"
            type="number"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            size="small"
            label="Nota administrativa"
            multiline
            rows={2}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancelar</Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
