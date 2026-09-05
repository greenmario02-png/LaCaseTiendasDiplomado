import { Box, Typography } from '@mui/material';
import { getUnifiedTokens } from '../../theme';
import { useCurrencyStore, convertPrice, getRate } from '../../stores/currencyStore';

interface PriceDisplayProps {
  price: number;
  salePrice?: number;
  priceUsd?: number;
  currency?: string;
}

/** Formatea número como '1.234,56' (manual, independiente de ICU). */
export function fmtBs(n: number): string {
  const neg = n < 0 ? '-' : '';
  const rounded = Math.round(Math.abs(n) * 100) / 100;
  const [int, dec] = rounded.toFixed(2).split('.');
  const withTh = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg}${withTh},${dec}`;
}

/**
 * Muestra el precio convertido a la moneda seleccionada (currencyStore),
 * con oferta tachada en esmeralda y USD opcional. El precio de entrada
 * SIEMPRE está en Bs (moneda base del sistema).
 */
export function PriceDisplay({ price, salePrice, priceUsd, currency }: PriceDisplayProps) {
  const tokens = getUnifiedTokens(false);
  const currencies = useCurrencyStore((s) => s.currencies);
  const selected = useCurrencyStore((s) => s.selected);

  const target = currency ?? selected ?? 'BOB';
  const rate = getRate(currencies, target);
  const symbol = target === 'BOB' ? 'Bs' : (currencies.find((c) => c.code === target)?.symbol ?? target);

  const conv = (n: number) => convertPrice(n, target, rate);
  const shown = conv(salePrice ?? price);

  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
      {salePrice != null && salePrice < price && (
        <Typography component="s" variant="body2" sx={{ color: 'text.secondary' }}>
          {`${symbol} ${fmtBs(conv(price))}`}
        </Typography>
      )}
      <Typography variant="h6" sx={{ color: tokens.tertiaryContainer, fontWeight: 700 }}>
        {`${symbol} ${fmtBs(shown)}`}
      </Typography>
      {priceUsd != null && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {`(~US$ ${fmtBs(priceUsd)})`}
        </Typography>
      )}
    </Box>
  );
}
