import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar } from '@mui/material';
import { getUnifiedTokens } from '../../theme';

interface SuccessToastProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

export function SuccessToast({ open, message, onClose }: SuccessToastProps) {
  return (
    <Snackbar open={open} autoHideDuration={3500} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert severity="success" onClose={onClose} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const tokens = getUnifiedTokens(false);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      {message && (
        <DialogContent>
          <DialogContentText>{message}</DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={onClose} sx={{ color: tokens.primary, textTransform: 'none' }}>
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} variant="contained" color="error" sx={{ textTransform: 'none' }}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
