import { useState } from 'react';
import { Alert, AlertTitle, Button } from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { pickSafetyTip, SAFETY_TIPS_ES, type SafetyTipId } from '../../lib/paymentSafety';
import { usePayT } from '../../lib/payments';

interface Props {
  /** Monto a pagar en Bs (moneda base), sin importar la moneda que se muestre. */
  amountBs: number | null | undefined;
  /** Para pruebas: RNG inyectable. */
  rng?: () => number;
}

/** Recomendación de seguridad aleatoria antes de pagar o ver los datos de pago. */
export default function PaymentSafetyTip({ amountBs, rng }: Props) {
  const pt = usePayT();
  // Se elige una sola vez por montaje (no cambia en cada render); «Ver otra» elige otra distinta.
  const [tip, setTip] = useState<SafetyTipId>(() => pickSafetyTip(amountBs, rng));
  return (
    <Alert
      severity="warning"
      icon={<ShieldOutlinedIcon />}
      sx={{ mb: 2 }}
      data-testid="payment-safety-tip"
      data-tip={tip}
      action={
        <Button color="inherit" size="small" sx={{ minHeight: 44 }} onClick={() => setTip((prev) => pickSafetyTip(amountBs, rng, prev))}>
          {pt('safety.another')}
        </Button>
      }
    >
      <AlertTitle>{pt('safety.title')}</AlertTitle>
      <span aria-live="polite">{pt(`safety.tips.${tip}`, { defaultValue: SAFETY_TIPS_ES[tip] })}</span>
    </Alert>
  );
}
