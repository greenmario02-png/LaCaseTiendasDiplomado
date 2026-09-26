import { useEffect, useState } from 'react';
import { Box, Typography, Chip, Grid, Stack, TextField, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import { api, getErrorMessage } from '../../services/api';
import { useUnifiedTokens } from '../../theme';
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';
import { PrimaryButton, GhostButton } from '../../components/redesign/Buttons';
import { EmptyState, LoadingState, ErrorState } from '../../components/redesign/States';
import { FadeIn } from '../../components/motion/FadeIn';

const STATUS: Record<string, { label: string; color: any }> = {
  PENDING: { label: 'Pendiente', color: 'warning' },
  APPROVED: { label: 'Aprobada', color: 'info' },
  REJECTED: { label: 'Rechazada', color: 'error' },
  COMPLETED: { label: 'Completada', color: 'success' },
  CANCELLED: { label: 'Cancelada', color: 'default' },
};

export default function AdminReturnsPage() {
  const t = useUnifiedTokens();
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
      <PageHeader title="Devoluciones (administración)" icon={<AssignmentReturnIcon />} />
      {error && <ErrorState message={error} onRetry={() => setError('')} />}

      {returns.length === 0 ? (
        <EmptyState message="No hay solicitudes de devolución." />
      ) : (
        <FadeIn>
        <Stack spacing={2}>
          {returns.map((r) => (
            <SurfaceCard key={r.id} sx={{ p: 2.5 }}>
              <Box>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Typography fontWeight={700}>{r.orderItem?.product?.name}</Typography>
                    <Typography variant="body2" color={t.onSurfaceVariant}>
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
                      <Typography variant="body2" color={t.onSurfaceVariant} mt={0.5}>
                        Nota admin: {r.adminNote}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
                    <Chip label={STATUS[r.status]?.label ?? r.status} color={STATUS[r.status]?.color ?? 'default'} size="small" />
                    <Box mt={1}>
                      <PrimaryButton type="button" size="small" onClick={() => openDialog(r)}>
                        Resolver
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
          <GhostButton type="button" onClick={() => setDialog(null)}>Cancelar</GhostButton>
          <PrimaryButton type="button" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
