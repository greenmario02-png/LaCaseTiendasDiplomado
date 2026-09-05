import { Typography } from '@mui/material';
import { useCurrencyStore, convertPrice, formatMoney, getRate } from '../../stores/currencyStore';

interface Props {
  amount: string | number;
  variant?: 'body2' | 'subtitle1' | 'h6' | 'caption' | 'inherit';
  fontWeight?: number | string;
  className?: string;
  color?: string;
}

/** Muestra un monto (guardado en Bs) en la moneda seleccionada por el usuario */
export default function MoneyText({ amount, variant = 'body2', fontWeight, className, color }: Props) {
  const currencies = useCurrencyStore((s) => s.currencies);
  const selected = useCurrencyStore((s) => s.selected);
  const rate = getRate(currencies, selected);
  const converted = convertPrice(Number(amount), selected, rate);

  return (
    <Typography variant={variant} fontWeight={fontWeight} className={className} color={color}>
      {formatMoney(converted, selected)}
    </Typography>
  );
}
