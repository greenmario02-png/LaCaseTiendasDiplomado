import { memo, useState } from 'react';
import { Box, Button, ButtonBase, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ReplyIcon from '@mui/icons-material/Reply';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import BlockIcon from '@mui/icons-material/Block';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PhotoOutlinedIcon from '@mui/icons-material/PhotoOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { UnifiedTokens } from '../../theme/unifiedTokens';
import { canDeleteForAll, formatBytes, statusOf, type ChatMessage } from '../../lib/chat/chatModel';
import { systemText, timeOf, useC } from '../../lib/chat/i18n';
import { fileUrl } from '../../services/chat.api';
import { resolveImageUrl } from '../../services/api';
import MessageTicks from './MessageTicks';
import PaymentProofQuickAction from './PaymentProofQuickAction';

interface Props {
  msg: ChatMessage;
  myId: number | undefined;
  otherName: string;
  tokens: UnifiedTokens;
  readColor: string;
  compact?: boolean;
  onReply?: (m: ChatMessage) => void;
  onDelete?: (m: ChatMessage, scope: 'me' | 'all') => void;
  onRetry?: (m: ChatMessage) => void;
  onOpenImage?: (src: string, alt: string) => void;
  /** true si quien ve el chat es el vendedor de la orden de esta conversacion (habilita la accion rapida del comprobante). */
  isSellerOfOrder?: boolean;
  /** Estado de pago vigente de la orden (de la conversacion, no del mensaje) para decidir boton vs. insignia. */
  orderPaymentStatus?: string | null;
  onPaymentStatusChange?: (orderId: number, status: 'VERIFIED' | 'REJECTED') => void;
}

/** Burbuja de mensaje: mismo estilo que el chat anterior; anade adjuntos, QR, comprobante, cita, estados y acciones. */
function MessageBubble({ msg: m, myId, otherName, tokens, readColor, compact, onReply, onDelete, onRetry, onOpenImage, isSellerOfOrder, orderPaymentStatus, onPaymentStatusChange }: Props) {
  const c = useC();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const mine = m.senderId === myId;

  if (m.kind === 'SYSTEM') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
        <Typography
          variant="caption"
          sx={{ px: 1.5, py: 0.5, borderRadius: 2, bgcolor: `${tokens.outline}1F`, color: tokens.onSurface, textAlign: 'center', maxWidth: '85%' }}
        >
          {systemText(m.meta, m.content, c)} · {timeOf(m.createdAt)}
        </Typography>
      </Box>
    );
  }

  const status = statusOf(m, myId);
  const fg = mine ? tokens.onPrimary : tokens.onSurface;
  const att = m.attachment;
  const imgSrc = m.localUrl ?? (att?.url ? fileUrl(att.url) : '');
  const isImage = !!att && att.mime.startsWith('image/');
  const qrSrc = m.kind === 'PAYMENT_QR' && m.meta?.qrUrl ? resolveImageUrl(m.meta.qrUrl) : '';
  const altText = m.content || c(`kind.${m.kind}`);
  const canAll = canDeleteForAll(m, myId);

  const image = (src: string, w?: number | null, h?: number | null) => (
    <ButtonBase
      onClick={() => onOpenImage?.(src, altText)}
      aria-label={c('openImage')}
      sx={{ display: 'block', borderRadius: 2, overflow: 'hidden', mb: m.content ? 0.75 : 0, maxWidth: '100%', bgcolor: `${tokens.outline}22` }}
    >
      <Box
        component="img"
        src={src}
        alt={altText}
        loading="lazy"
        decoding="async"
        width={w ?? undefined}
        height={h ?? undefined}
        sx={{ display: 'block', width: compact ? 200 : 260, maxWidth: '100%', height: 'auto', aspectRatio: w && h ? `${w} / ${h}` : undefined, objectFit: 'cover', maxHeight: 320 }}
      />
    </ButtonBase>
  );

  const body = () => {
    if (m.deleted) {
      return (
        <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.85, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <BlockIcon sx={{ fontSize: 16 }} aria-hidden /> {c('deleted')}
        </Typography>
      );
    }
    return (
      <>
        {m.kind === 'PAYMENT_PROOF' && (
          <>
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700, mb: 0.5 }}>
              <ReceiptLongOutlinedIcon sx={{ fontSize: 16 }} aria-hidden /> {m.orderId ? c('proofFor', { id: m.orderId }) : c('kind.PAYMENT_PROOF')}
            </Typography>
            {isSellerOfOrder && m.orderId != null && (
              <PaymentProofQuickAction orderId={m.orderId} paymentStatus={orderPaymentStatus} onChanged={onPaymentStatusChange} />
            )}
          </>
        )}
        {m.kind === 'PAYMENT_QR' && (
          <Box sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700, mb: 0.75 }}>
              <QrCode2Icon sx={{ fontSize: 16 }} aria-hidden /> {c('qrTitle')}
            </Typography>
            {qrSrc && (
              <ButtonBase onClick={() => onOpenImage?.(qrSrc, c('qrTitle'))} aria-label={c('openImage')} sx={{ display: 'block', borderRadius: 2, overflow: 'hidden', bgcolor: '#fff', p: 1 }}>
                <Box component="img" src={qrSrc} alt={c('qrTitle')} loading="lazy" sx={{ display: 'block', width: compact ? 160 : 200, height: 'auto' }} />
              </ButtonBase>
            )}
            <Typography variant="caption" sx={{ display: 'block', mt: 0.75, opacity: 0.9 }}>
              {c('qrHint')}
            </Typography>
          </Box>
        )}
        {isImage && imgSrc && image(imgSrc, att?.width, att?.height)}
        {isImage && !imgSrc && (
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PhotoOutlinedIcon fontSize="small" aria-hidden /> {c('kind.IMAGE')}
          </Typography>
        )}
        {att && !isImage && (
          <Box
            component={att.url ? 'a' : 'div'}
            href={att.url ? fileUrl(att.url) : undefined}
            download={att.name ?? 'documento.pdf'}
            rel="noopener"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, minHeight: 44, borderRadius: 2, bgcolor: `${tokens.outline}1A`, color: 'inherit', textDecoration: 'none', mb: m.content ? 0.75 : 0 }}
          >
            <PictureAsPdfOutlinedIcon aria-hidden />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600, maxWidth: compact ? 160 : 220 }}>
                {att.name ?? c('kind.FILE')}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                PDF · {formatBytes(att.size)} · {c('download')}
              </Typography>
            </Box>
          </Box>
        )}
        {m.kind !== 'PAYMENT_QR' && m.content && (
          <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
            {m.content}
          </Typography>
        )}
      </>
    );
  };

  const showActions = !!(onReply || onDelete) && m.id > 0;

  return (
    <Box
      data-message-id={m.id}
      sx={{
        display: 'flex',
        justifyContent: mine ? 'flex-end' : 'flex-start',
        alignItems: 'center',
        flexDirection: mine ? 'row-reverse' : 'row',
        gap: 0.25,
        mb: 1,
        '& .msg-actions': { opacity: { xs: 1, md: 0 } },
        '&:hover .msg-actions, &:focus-within .msg-actions': { opacity: 1 },
      }}
    >
      <Box
        sx={{
          maxWidth: compact ? '85%' : { xs: '85%', md: '75%' },
          p: 1.5,
          borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          bgcolor: mine ? tokens.primary : tokens.surfaceContainerLowest,
          color: fg,
          border: mine ? 'none' : `1px solid ${tokens.outline}33`,
          boxShadow: tokens.cardShadow,
          opacity: m.localStatus === 'pending' ? 0.85 : 1,
        }}
      >
        {m.replyTo && !m.deleted && (
          <Box sx={{ borderLeft: `3px solid ${mine ? tokens.onPrimary : tokens.primary}`, pl: 1, mb: 0.75, opacity: 0.9 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
              {m.replyTo.senderId === myId ? c('you') : otherName}
            </Typography>
            <Typography variant="caption" noWrap sx={{ display: 'block', maxWidth: 240, fontStyle: m.replyTo.deleted ? 'italic' : undefined }}>
              {m.replyTo.deleted ? c('deleted') : m.replyTo.preview || c(`kind.${m.replyTo.kind}`)}
            </Typography>
          </Box>
        )}
        {body()}
        <Typography variant="caption" component="div" sx={{ opacity: 0.85, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 0.5 }}>
          {timeOf(m.createdAt)}
          {status && <MessageTicks status={status} readColor={readColor} />}
        </Typography>
        {m.localStatus === 'failed' && onRetry && (
          <Button size="small" onClick={() => onRetry(m)} startIcon={<RefreshIcon />} sx={{ mt: 0.5, minHeight: 36, color: fg, borderColor: fg }} variant="outlined">
            {c('retry')}
          </Button>
        )}
      </Box>
      {showActions && (
        <>
          <IconButton className="msg-actions" aria-label={c('messageActions')} aria-haspopup="menu" onClick={(e) => setAnchor(e.currentTarget)} sx={{ width: 44, height: 44, color: tokens.onSurfaceVariant }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
            {onReply && !m.deleted && (
              <MenuItem onClick={() => { setAnchor(null); onReply(m); }} sx={{ minHeight: 44 }}>
                <ReplyIcon fontSize="small" sx={{ mr: 1 }} /> {c('replyTo')}
              </MenuItem>
            )}
            {onDelete && (
              <MenuItem onClick={() => { setAnchor(null); onDelete(m, 'me'); }} sx={{ minHeight: 44 }}>
                <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} /> {c('deleteForMe')}
              </MenuItem>
            )}
            {onDelete && canAll && (
              <MenuItem onClick={() => { setAnchor(null); onDelete(m, 'all'); }} sx={{ minHeight: 44 }}>
                <DeleteForeverOutlinedIcon fontSize="small" sx={{ mr: 1 }} /> {c('deleteForAll')}
              </MenuItem>
            )}
          </Menu>
        </>
      )}
    </Box>
  );
}

export default memo(MessageBubble);
