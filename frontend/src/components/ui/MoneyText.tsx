import { Typography } from '@mui/material';
import { useMoney } from '../../hooks/useMoney';

interface Props {
  amount: string | number;
  variant?: 'body2' | 'subtitle1' | 'h6' | 'caption' | 'inherit';
  fontWeight?: number | string;
  className?: string;
  color?: string;
}

/** Muestra un monto (guardado en Bs) en la moneda seleccionada por el usuario */
export default function MoneyText({ amount, variant = 'body2', fontWeight, className, color }: Props) {
  const money = useMoney();
  return (
    <Typography variant={variant} fontWeight={fontWeight} className={className} color={color}>
      {money(amount)}
    </Typography>
  );
}
