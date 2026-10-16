import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { chatApi } from '../../services/chat.api';
import { getErrorMessage } from '../../services/api';
import { useC } from '../../lib/chat/i18n';

/** Ajustes del chat: privacidad de "ultima vez / en linea" y usuarios bloqueados. */
export function ChatSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useC();
  const [hide, setHide] = useState(false);
  const [blocks, setBlocks] = useState<Awaited<ReturnType<typeof chatApi.blocks>>>([]);

  useEffect(() => {
    if (!open) return;
    chatApi.settings().then((s) => setHide(s.hideLastSeen)).catch(() => {});
    chatApi.blocks().then(setBlocks).catch(() => {});
  }, [open]);

  const toggle = async (v: boolean) => {
    setHide(v);
    try {
      await chatApi.saveSettings(v);
    } catch (e) {
      setHide(!v);
      toast.error(getErrorMessage(e));
    }
  };

  const unblock = async (userId: number) => {
    try {
      await chatApi.unblock(userId);
      setBlocks((b) => b.filter((x) => x.userId !== userId));
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="chat-settings-title">
      <DialogTitle id="chat-settings-title">{c('settingsTitle')}</DialogTitle>
      <DialogContent>
        <FormControlLabel control={<Switch checked={hide} onChange={(e) => toggle(e.target.checked)} />} label={c('hideLastSeen')} sx={{ minHeight: 44 }} />
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 2 }}>
          {c('hideLastSeenHelp')}
        </Typography>
        <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700 }}>
          {c('blockedTitle')}
        </Typography>
        {blocks.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            {c('noBlocked')}
          </Typography>
        ) : (
          <List dense>
            {blocks.map((b) => (
              <ListItem key={b.userId} secondaryAction={<Button onClick={() => unblock(b.userId)} sx={{ minHeight: 44 }}>{c('unblock')}</Button>}>
                <ListItemText primary={b.user?.storeName || `${b.user?.firstName ?? ''} ${b.user?.lastName ?? ''}`.trim() || `#${b.userId}`} />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ minHeight: 44 }}>
          {c('close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const REASONS = ['SPAM', 'FRAUD', 'ABUSE', 'INAPPROPRIATE', 'OTHER'] as const;

export function ReportDialog({ open, conversationId, onClose, onBlocked }: { open: boolean; conversationId: number | null; onClose: () => void; onBlocked: () => void }) {
  const c = useC();
  const [reason, setReason] = useState<(typeof REASONS)[number]>('SPAM');
  const [details, setDetails] = useState('');
  const [block, setBlock] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!conversationId) return;
    setBusy(true);
    try {
      await chatApi.report(conversationId, { reason, details: details.trim() || undefined, block });
      toast.success(c('reportDone'));
      if (block) onBlocked();
      onClose();
      setDetails('');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="chat-report-title">
      <DialogTitle id="chat-report-title">{c('reportTitle')}</DialogTitle>
      <DialogContent>
        <TextField select fullWidth size="small" label={c('reportReason')} value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])} sx={{ mt: 1 }}>
          {REASONS.map((r) => (
            <MenuItem key={r} value={r} sx={{ minHeight: 44 }}>
              {c(`reason.${r}`)}
            </MenuItem>
          ))}
        </TextField>
        <TextField fullWidth multiline minRows={2} size="small" label={c('reportDetails')} value={details} onChange={(e) => setDetails(e.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} sx={{ mt: 2 }} />
        <FormControlLabel control={<Checkbox checked={block} onChange={(e) => setBlock(e.target.checked)} />} label={c('reportAlsoBlock')} sx={{ mt: 1, minHeight: 44 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ minHeight: 44 }}>
          {c('cancel')}
        </Button>
        <Button variant="contained" color="error" onClick={send} disabled={busy} sx={{ minHeight: 44 }}>
          {c('reportSend')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
