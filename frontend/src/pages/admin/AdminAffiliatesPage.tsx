import { useEffect, useState } from 'react';
import { Box, Typography, Card, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Alert, Chip, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import { api, getErrorMessage } from '../../services/api';

export default function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<any>(null);
  const [pct, setPct] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/affiliates');
      setAffiliates(data.data ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!dialog) return;
    setSaving(true);
    try {
      await api.put(`/affiliates/${dialog.id}/commission`, { commissionPct: Number(pct) });
      setDialog(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={800} mb={2}>
        Afiliados
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Card} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Afiliado</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Código</TableCell>
              <TableCell align="right">Comisión %</TableCell>
              <TableCell align="right">Balance</TableCell>
              <TableCell align="right">Referidos</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {affiliates.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  {a.user?.firstName} {a.user?.lastName}
                </TableCell>
                <TableCell>{a.user?.email}</TableCell>
                <TableCell>
                  <Chip label={a.referralCode} size="small" />
                </TableCell>
                <TableCell align="right">{a.commissionPct}%</TableCell>
                <TableCell align="right">
                  <Typography fontWeight={700} color="success.main">
                    Bs {Number(a.balance).toLocaleString('es-BO')}
                  </Typography>
                </TableCell>
                <TableCell align="right">{a._count?.referrals ?? 0}</TableCell>
                <TableCell align="right">
                  <GhostButton size="small" onClick={() => { setDialog(a); setPct(String(a.commissionPct)); }}>
                    Editar %
                  </GhostButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar comisión</DialogTitle>
        <DialogContent>
          <TextField
            label="Porcentaje de comisión (%)"
            type="number"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            size="small"
            fullWidth
            sx={{ mt: 1 }}
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
