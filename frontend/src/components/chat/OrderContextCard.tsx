import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Box, Button, Chip, Collapse, IconButton, Stack, Typography } from '@mui/material';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { UnifiedTokens } from '../../theme/unifiedTokens';
import type { OrderSummary } from '../../services/chat.api';
import { resolveImageUrl } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import { useC } from '../../lib/chat/i18n';
import RateBuyerAction from '../reviews/RateBuyerAction';

interface Props {
  order: OrderSummary;
  role: 'BUYER' | 'SELLER';
  tokens: UnifiedTokens;
  busy?: boolean;
  canSend: boolean;
  onSendQr: () => void;
  onSendProof: () => void;
  /** Nombre del comprador (el otro participante cuando role === 'SELLER'), para el diálogo de calificación. */
  buyerName?: string;
  /** true si ya se sabe que el vendedor calificó al comprador de este pedido. */
  buyerRated?: boolean;
  onBuyerRated?: (orderId: number) => void;
}

/** Tarjeta fija del pedido arriba del chat: productos, monto en la moneda elegida, estado y atajo de pago. */
export default function OrderContextCard({ order, role, tokens, busy, canSend, onSendQr, onSendProof, buyerName, buyerRated, onBuyerRated }: Props) {
  const c = useC();
  const [open, setOpen] = useState(false);
  // Monto en la moneda elegida (si su tasa no se conoce, en Bs).
  const money = useMoney();
  const first = order.items.slice(0, 2).map((i) => `${i.quantity}× ${i.name}`).join(', ');
  const rest = order.items.length - 2;
  const panelId = `order-items-${order.id}`;

  return (
    <Box sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${tokens.outline}33`, bgcolor: `${tokens.primary}0D` }} aria-label={c('order.title', { id: order.id })} role="region">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <ReceiptLongOutlinedIcon sx={{ color: tokens.primary }} aria-hidden />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: tokens.onSurface }} noWrap>
            {c('order.title', { id: order.id })} · {money(order.total)}
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.onSurfaceVariant, display: 'block' }} noWrap>
            {first}
            {rest > 0 ? ` ${c('order.more', { count: rest })}` : ''}
          </Typography>
        </Box>
        <IconButton onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={panelId} aria-label={open ? c('order.collapse') : c('order.expand')} sx={{ width: 44, height: 44 }}>
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Stack>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', mt: 0.5 }}>
        <Chip size="small" label={c(`order.status.${order.status}`)} />
        <Chip size="small" variant="outlined" label={c(`order.payment.${order.paymentStatus}`)} />
        <Box sx={{ flex: 1 }} />
        {role === 'SELLER' && (
          <Button size="small" variant="contained" startIcon={<QrCode2Icon />} onClick={onSendQr} disabled={busy || !canSend} sx={{ minHeight: 44 }}>
            {c('order.sendQr')}
          </Button>
        )}
        {role === 'SELLER' && (
          <RateBuyerAction
            orderId={order.id}
            buyerName={buyerName}
            status={order.status}
            paymentStatus={order.paymentStatus}
            rated={!!buyerRated}
            onRated={(id) => onBuyerRated?.(id)}
          />
        )}
        {role === 'BUYER' && (
          <Button size="small" variant="contained" startIcon={<UploadFileIcon />} onClick={onSendProof} disabled={busy || !canSend} sx={{ minHeight: 44 }}>
            {c('order.sendProof')}
          </Button>
        )}
      </Stack>
      <Collapse in={open} id={panelId}>
        <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 1 }}>
          {order.items.map((it, i) => (
            <Box component="li" key={`${it.productId ?? 'x'}-${i}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
              <Avatar variant="rounded" src={it.image ? resolveImageUrl(it.image) : undefined} alt="" sx={{ width: 36, height: 36 }} />
              <Typography variant="caption" sx={{ flex: 1, color: tokens.onSurface }}>
                {it.quantity}× {it.name}
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.onSurfaceVariant }}>
                {money(it.unitPrice * it.quantity)}
              </Typography>
            </Box>
          ))}
        </Box>
        <Button component={Link} to={role === 'BUYER' ? `/cuenta/pedidos/${order.id}` : '/seller/pedidos'} size="small" sx={{ minHeight: 44 }}>
          {c('order.viewOrder')}
        </Button>
      </Collapse>
    </Box>
  );
}
