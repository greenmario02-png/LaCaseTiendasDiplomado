import { useState } from 'react';
import { Box, IconButton, Paper, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import { Link } from 'react-router-dom';
import { usePayT, useStorePaymentInfo, type StorePaymentInfo } from '../../lib/payments';
import { resolveImageUrl } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import PaymentSafetyTip from './PaymentSafetyTip';

interface Props {
  storeId: number;
  storeName?: string | null;
  /** Variante compacta (ficha de producto). */
  compact?: boolean;
  /** Para pruebas o cuando el padre ya cargó los datos. */
  info?: StorePaymentInfo | null;
  /** Si se pasa, muestra antes de los datos una recomendación de seguridad para ese monto (en Bs). */
  tipAmountBs?: number | null;
}

const srOnly = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' } as const;

function CopyRow({ label, value }: { label: string; value: string }) {
  const pt = usePayT();
  const [done, setDone] = useState(false);
  // Un dato enmascarado por el servidor no se ofrece para copiar.
  const canCopy = !value.includes('•');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      window.setTimeout(() => setDone(false), 2000);
    } catch {
      /* portapapeles bloqueado: el dato sigue visible para copiarlo a mano */
    }
  };
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 44 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {label}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', wordBreak: 'break-all' }}>
          {value}
        </Typography>
      </Box>
      {canCopy && (
        <Tooltip title={done ? pt('info.copied') : pt('info.copy')}>
          <IconButton onClick={copy} aria-label={pt('info.copyLabel', { field: label })} sx={{ width: 44, height: 44 }}>
            {done ? <CheckIcon color="success" /> : <ContentCopyIcon />}
          </IconButton>
        </Tooltip>
      )}
      <span aria-live="polite" style={srOnly}>
        {done ? pt('info.copied') : ''}
      </span>
    </Box>
  );
}

/**
 * Tarjeta «Datos de pago» de la tienda: QR, titular, banco y número de cuenta con botón copiar.
 * El número completo solo se muestra a quien tiene algo que pagarle (lo decide el servidor con `full`).
 */
export default function StorePaymentCard({ storeId, storeName, compact = false, info, tipAmountBs }: Props) {
  const pt = usePayT();
  const user = useAuthStore((s) => s.user);
  const fetched = useStorePaymentInfo(info === undefined ? storeId : null);
  const data = info === undefined ? fetched.data : info;
  const loading = info === undefined && fetched.loading;
  const name = storeName ?? data?.storeName ?? '';
  const titleId = `pay-info-${storeId}`;

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-labelledby={titleId}
      sx={{ p: compact ? 1.5 : 2, borderWidth: 2, borderColor: 'primary.main', mb: 2 }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <AccountBalanceOutlinedIcon color="primary" aria-hidden />
        <Typography id={titleId} variant="subtitle1" component="h3" sx={{ fontWeight: 800 }}>
          {pt('info.title')}
          {name ? ` · ${name}` : ''}
        </Typography>
      </Stack>
      {loading ? (
        <Skeleton variant="rounded" height={compact ? 80 : 140} />
      ) : !data || !data.available ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {pt('info.none')}
        </Typography>
      ) : (
        <>
          {tipAmountBs !== undefined && <PaymentSafetyTip amountBs={tipAmountBs} />}
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            {pt('info.subtitle')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {data.qrUrl && (
              <Box
                sx={{
                  width: compact ? 120 : 180,
                  height: compact ? 120 : 180,
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: '#fff',
                  border: 1,
                  borderColor: 'divider',
                  flexShrink: 0,
                }}
              >
                <Box
                  component="img"
                  src={resolveImageUrl(data.qrUrl)}
                  alt={pt('info.qrAlt', { store: name })}
                  loading="lazy"
                  sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              </Box>
            )}
            <Box sx={{ flex: 1, minWidth: 200 }}>
              {data.method && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {pt(`info.method.${data.method}`)}
                </Typography>
              )}
              {data.accountHolder && <CopyRow label={pt('info.holder')} value={data.accountHolder} />}
              {data.bankName && (
                <Box sx={{ minHeight: 44, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {pt('info.bank')}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {data.bankName}
                  </Typography>
                </Box>
              )}
              {data.accountNumber && <CopyRow label={pt('info.account')} value={data.accountNumber} />}
              {data.phoneQr && <CopyRow label={pt('info.phoneQr')} value={data.phoneQr} />}
              {!data.full && (data.accountNumber || data.accountHolder || data.phoneQr) && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                  {user ? pt('info.masked') : <Link to="/login">{pt('info.loginToSee')}</Link>}
                </Typography>
              )}
            </Box>
          </Box>
        </>
      )}
    </Paper>
  );
}
