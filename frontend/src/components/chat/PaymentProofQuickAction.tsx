import { useState } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import toast from 'react-hot-toast';
import { ordersApi } from '../../services/orders.api';
import { getErrorMessage } from '../../services/api';
import { useC } from '../../lib/chat/i18n';

type Decision = 'VERIFIED' | 'REJECTED';

interface Props {
  orderId: number;
  /** Estado actual del pago de la orden (viene de la conversación, no del mensaje: así refleja cambios en vivo). */
  paymentStatus: string | null | undefined;
  onChanged?: (orderId: number, status: Decision) => void;
}

/**
 * Acción rápida junto al comprobante de pago: el vendedor confirma el pago o rechaza el comprobante sin salir
 * del chat, tras confirmar. Usa el mismo PUT /orders/seller/:id/payment-status que la página de pedidos.
 */
export default function PaymentProofQuickAction({ orderId, paymentStatus, onChanged }: Props) {
  const c = useC();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<Decision | null>(null);

  if (paymentStatus === 'VERIFIED') {
    return <Chip size="small" color="success" icon={<CheckCircleOutlineIcon />} label={c('order.paymentConfirmedBadge')} sx={{ mt: 0.75 }} />;
  }
  if (paymentStatus === 'REJECTED') {
    return <Chip size="small" color="error" icon={<HighlightOffIcon />} label={c('order.paymentRejectedBadge')} sx={{ mt: 0.75 }} />;
  }
  if (paymentStatus !== 'PROOF_SUBMITTED') return null;

  const act = async (status: Decision) => {
    setBusy(true);
    try {
      await ordersApi.updateSellerPaymentStatus(orderId, status);
      setConfirming(null);
      onChanged?.(orderId, status);
      toast.success(status === 'VERIFIED' ? c('order.paymentConfirmedToast') : c('order.paymentRejectedToast'));
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const label = (d: Decision) => (d === 'VERIFIED' ? c('order.markPaid') : c('order.rejectProof'));

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, mt: 0.75, flexWrap: 'wrap' }}>
        <Button size="small" variant="contained" color="success" startIcon={<CheckCircleOutlineIcon />} disabled={busy} onClick={() => setConfirming('VERIFIED')} sx={{ minHeight: 36 }}>
          {c('order.markPaid')}
        </Button>
        <Button size="small" variant="outlined" color="error" startIcon={<HighlightOffIcon />} disabled={busy} onClick={() => setConfirming('REJECTED')} sx={{ minHeight: 36 }}>
          {c('order.rejectProof')}
        </Button>
      </Box>
      <Dialog open={confirming !== null} onClose={() => !busy && setConfirming(null)} maxWidth="xs" fullWidth aria-labelledby={`pay-confirm-${orderId}`}>
        {confirming && (
          <>
            <DialogTitle id={`pay-confirm-${orderId}`}>{label(confirming)}</DialogTitle>
            <DialogContent>
              <DialogContentText>{confirming === 'VERIFIED' ? c('order.markPaidConfirm') : c('order.rejectProofConfirm')}</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirming(null)} disabled={busy}>
                {c('cancel')}
              </Button>
              <Button variant="contained" color={confirming === 'VERIFIED' ? 'success' : 'error'} disabled={busy} onClick={() => act(confirming)}>
                {label(confirming)}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
