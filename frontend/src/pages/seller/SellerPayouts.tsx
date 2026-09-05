import { useEffect, useState } from 'react';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Chip,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SavingsIcon from '@mui/icons-material/Savings';
import PaymentsIcon from '@mui/icons-material/Payments';
import QrCodeIcon from '@mui/icons-material/QrCode';
import { api, getErrorMessage } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import toast from 'react-hot-toast';

const STATUS_COLOR: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'info',
  PAID: 'success',
  REJECTED: 'error',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  PAID: 'Pagado',
  REJECTED: 'Rechazado',
};

export default function SellerPayouts() {
  const money = useMoney();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [account, setAccount] = useState({ method: 'BNB', accountHolder: '', accountNumber: '', bankName: '', phoneQr: '' });
  const [savingAccount, setSavingAccount] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/seller/payouts/summary')
      .then((r) => {
        setSummary(r.data.data);
        if (r.data.data.account) {
          setAccount({
            method: r.data.data.account.method || 'BNB',
            accountHolder: r.data.data.account.accountHolder || '',
            accountNumber: r.data.data.account.accountNumber || '',
            bankName: r.data.data.account.bankName || '',
            phoneQr: r.data.data.account.phoneQr || '',
          });
        }
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const saveAccount = async () => {
    setSavingAccount(true);
    try {
      await api.put('/seller/payouts/account', account);
      toast.success('Cuenta de cobro guardada');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingAccount(false);
    }
  };

  const requestPayout = async () => {
    setRequesting(true);
    try {
      await api.post('/seller/payouts/request', { amount: Number(amount), note });
      toast.success('Retiro solicitado. El administrador lo revisará.');
      setOpen(false);
      setAmount('');
      setNote('');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 6 }} />;

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <PaymentsIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Mis pagos
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        🔒 El dinero de tus ventas queda <strong>retenido (escrow)</strong> hasta que el comprador recibe el producto y
        el pago se verifica. Después de la entrega, el saldo se libera y podés retirarlo a tu cuenta BNB, banco o QR.
      </Alert>

      {/* Balance */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} color="success.main">
                <SavingsIcon />
                <Typography variant="body2" color="text.secondary">
                  Balance disponible
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={700} className="price-color" mt={0.5}>
                {money(summary?.available ?? 0)}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <PrimaryButton size="small" disabled={!summary?.available} onClick={() => setOpen(true)}>
                  Retirar
                </PrimaryButton>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} color="info.main">
                <AccountBalanceWalletIcon />
                <Typography variant="body2" color="text.secondary">
                  Escrow liberado
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={700} mt={0.5}>
                {money(summary?.liberated ?? 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ventas entregadas y pagadas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} color="warning.main">
                <QrCodeIcon />
                <Typography variant="body2" color="text.secondary">
                  En proceso
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={700} mt={0.5}>
                {money(summary?.pending ?? 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Retiros pendientes/aprobados
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cuenta de cobro */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>
          Cuenta de cobro
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField select label="Método" value={account.method} onChange={(e) => setAccount({ ...account, method: e.target.value })} fullWidth>
              <MenuItem value="BNB">BNB (Billetera móvil)</MenuItem>
              <MenuItem value="BANK">Transferencia bancaria</MenuItem>
              <MenuItem value="QR">QR / Alias</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField label="Titular" value={account.accountHolder} onChange={(e) => setAccount({ ...account, accountHolder: e.target.value })} fullWidth />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label={account.method === 'BNB' ? 'Número de celular BNB' : account.method === 'BANK' ? 'Número de cuenta' : 'Alias / QR'}
              value={account.accountNumber}
              onChange={(e) => setAccount({ ...account, accountNumber: e.target.value })}
              fullWidth
            />
          </Grid>
          {account.method === 'BANK' && (
            <Grid item xs={12} md={3}>
              <TextField label="Banco" value={account.bankName} onChange={(e) => setAccount({ ...account, bankName: e.target.value })} fullWidth />
            </Grid>
          )}
          {account.method === 'BNB' && (
            <Grid item xs={12} md={3}>
              <TextField label="Cédula de identidad" value={account.phoneQr} onChange={(e) => setAccount({ ...account, phoneQr: e.target.value })} fullWidth />
            </Grid>
          )}
        </Grid>
        <Box sx={{ mt: 2 }}>
          <SecondaryButton onClick={saveAccount} disabled={savingAccount}>
            {savingAccount ? <CircularProgress size={18} /> : 'Guardar cuenta'}
          </SecondaryButton>
        </Box>
      </Paper>

      {/* Historial */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>
          Historial de retiros
        </Typography>
        {!summary?.payouts?.length ? (
          <Typography color="text.secondary">Aún no solicitaste retiros.</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Monto</TableCell>
                  <TableCell>Método</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Nota</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.payouts.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.createdAt).toLocaleDateString('es-BO')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{money(p.amount)}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell>
                      <Chip size="small" label={STATUS_LABEL[p.status]} color={STATUS_COLOR[p.status]} />
                    </TableCell>
                    <TableCell>{p.note || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Dialog de retiro */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Solicitar retiro</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Balance disponible: <strong>{money(summary?.available ?? 0)}</strong>
          </Typography>
          <TextField label="Monto a retirar (Bs)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} fullWidth autoFocus />
          <TextField label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} fullWidth multiline rows={2} sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setOpen(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={requestPayout} disabled={requesting || !amount || Number(amount) <= 0}>
            {requesting ? <CircularProgress size={18} /> : 'Solicitar'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
