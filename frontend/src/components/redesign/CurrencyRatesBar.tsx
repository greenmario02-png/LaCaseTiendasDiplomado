import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import { Link } from 'react-router-dom';
import { getUnifiedTokens } from '../../theme';

export type CurrencyRates = {
  usd?: number;
  eur?: number;
  jpy?: number;
  usdt?: number;
};

type Props = {
  rates: CurrencyRates;
};

const fmt = (n?: number) => (typeof n === 'number' ? n.toFixed(2).replace('.', ',') : '—');

export function CurrencyRatesBar({ rates }: Props) {
  const tokens = getUnifiedTokens(false);
  const items: { key: string; label: string; value: number | undefined }[] = [
    { key: 'usd', label: 'USD', value: rates.usd },
    { key: 'eur', label: 'EUR', value: rates.eur },
    { key: 'jpy', label: 'JPY', value: rates.jpy },
    { key: 'usdt', label: 'USDT', value: rates.usdt },
  ];
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" alignItems="center">
      {items.map((it) => (
        <Chip
          key={it.key}
          size="small"
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" fontWeight={700} color={tokens.primary}>
                {it.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {fmt(it.value)} Bs
              </Typography>
            </Box>
          }
          sx={{ bgcolor: `${tokens.primary}10`, borderRadius: '999px' }}
        />
      ))}
      <Typography
        component={Link}
        to="/ayuda"
        variant="caption"
        sx={{ color: tokens.primary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
      >
        <CurrencyExchangeIcon sx={{ fontSize: 14 }} /> Calculadora
      </Typography>
    </Stack>
  );
}
