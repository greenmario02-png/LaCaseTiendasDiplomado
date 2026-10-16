import { useEffect, useRef, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import type { UnifiedTokens } from '../../theme/unifiedTokens';
import { formatBytes, type ChatMessage } from '../../lib/chat/chatModel';
import { ChatFileError, prepareChatFile, type PreparedFile } from '../../lib/chat/imageCompress';
import { previewOf, useC } from '../../lib/chat/i18n';

export interface PendingFile extends PreparedFile {
  previewUrl?: string;
  kind: 'IMAGE' | 'FILE' | 'PAYMENT_PROOF';
}

interface Props {
  tokens: UnifiedTokens;
  placeholder: string;
  disabled: boolean;
  replyTo: ChatMessage | null;
  replyName: string;
  onCancelReply: () => void;
  onSendText: (text: string) => void;
  onSendFile: (file: PendingFile, caption: string) => void;
  onTyping: (text: string) => void;
  onError: (msg: string) => void;
  /** Cambia para pedir abrir el selector como comprobante de pago. */
  proofRequest: number;
  children?: React.ReactNode;
}

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

/** Barra de escritura: adjuntar (con vista previa y texto opcional), cita en curso y envio con Enter. */
export default function ChatComposer({ tokens, placeholder, disabled, replyTo, replyName, onCancelReply, onSendText, onSendFile, onTyping, onError, proofRequest, children }: Props) {
  const c = useC();
  const [text, setText] = useState('');
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [caption, setCaption] = useState('');
  const [preparing, setPreparing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const kindRef = useRef<'IMAGE' | 'PAYMENT_PROOF'>('IMAGE');

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  useEffect(() => {
    if (!proofRequest) return;
    kindRef.current = 'PAYMENT_PROOF';
    fileRef.current?.click();
  }, [proofRequest]);

  const cancelFile = () => {
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
  };

  const pickFile = () => {
    kindRef.current = 'IMAGE';
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setPreparing(true);
    try {
      const prepared = await prepareChatFile(f);
      const kind = kindRef.current === 'PAYMENT_PROOF' ? 'PAYMENT_PROOF' : prepared.isImage ? 'IMAGE' : 'FILE';
      setPending({ ...prepared, kind, previewUrl: prepared.isImage ? URL.createObjectURL(prepared.file) : undefined });
      setCaption('');
    } catch (err) {
      onError(err instanceof ChatFileError && err.code === 'SIZE' ? c('fileSizeError') : c('fileTypeError'));
    } finally {
      setPreparing(false);
    }
  };

  const submit = () => {
    const v = text.trim();
    if (!v || disabled) return;
    onSendText(v);
    setText('');
    onTyping('');
  };

  const confirmFile = () => {
    if (!pending) return;
    // La vista previa local se entrega al mensaje optimista; se libera cuando llega la del servidor.
    onSendFile(pending, caption.trim());
    setPending(null);
  };

  return (
    <>
      {replyTo && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, pl: 1, borderLeft: `3px solid ${tokens.primary}` }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.primary, display: 'block' }}>
              {c('replyingTo', { name: replyName })}
            </Typography>
            <Typography variant="caption" noWrap sx={{ display: 'block', color: tokens.onSurfaceVariant }}>
              {previewOf(replyTo, c)}
            </Typography>
          </Box>
          <IconButton onClick={onCancelReply} aria-label={c('cancelReply')} sx={{ width: 44, height: 44 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      {children}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <input ref={fileRef} type="file" accept={ACCEPT} hidden onChange={onFile} data-testid="chat-file-input" />
        <IconButton onClick={pickFile} disabled={disabled || preparing} aria-label={c('attach')} sx={{ width: 44, height: 44, color: tokens.primary }}>
          <AttachFileIcon />
        </IconButton>
        <TextField
          fullWidth
          size="small"
          multiline
          maxRows={4}
          inputRef={inputRef}
          placeholder={placeholder}
          value={text}
          disabled={disabled}
          slotProps={{ htmlInput: { 'aria-label': placeholder, maxLength: 2000 } }}
          onChange={(e) => {
            setText(e.target.value);
            onTyping(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <IconButton onClick={submit} sx={{ width: 44, height: 44, color: tokens.primary }} disabled={disabled || !text.trim()} aria-label={c('send')}>
          <SendIcon />
        </IconButton>
      </Box>
      {preparing && (
        <Typography variant="caption" role="status" sx={{ color: tokens.onSurfaceVariant }}>
          {c('preparing')}
        </Typography>
      )}

      <Dialog open={!!pending} onClose={cancelFile} fullWidth maxWidth="xs" aria-labelledby="chat-preview-title">
        <DialogTitle id="chat-preview-title">{pending?.kind === 'PAYMENT_PROOF' ? c('previewProofTitle') : c('previewTitle')}</DialogTitle>
        <DialogContent>
          {pending?.previewUrl ? (
            <Box component="img" src={pending.previewUrl} alt="" sx={{ width: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 2, bgcolor: `${tokens.outline}22` }} />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderRadius: 2, bgcolor: `${tokens.outline}1A` }}>
              <PictureAsPdfOutlinedIcon aria-hidden />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {pending?.name}
                </Typography>
                <Typography variant="caption">{pending ? formatBytes(pending.file.size) : ''}</Typography>
              </Box>
            </Box>
          )}
          <TextField
            fullWidth
            size="small"
            sx={{ mt: 2 }}
            label={c('caption')}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                confirmFile();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelFile} sx={{ minHeight: 44 }}>
            {c('cancel')}
          </Button>
          <Button variant="contained" onClick={confirmFile} startIcon={<SendIcon />} sx={{ minHeight: 44 }}>
            {c('send')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
