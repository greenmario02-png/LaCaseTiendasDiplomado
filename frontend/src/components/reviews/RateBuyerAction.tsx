import { useState } from 'react';
import { Button, Chip } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useTranslation } from 'react-i18next';
import RateBuyerDialog from './RateBuyerDialog';

interface Props {
  orderId: number;
  buyerName?: string;
  /** Mismo gating que el backend (assertReviewWindow): solo DELIVERED + pago VERIFIED. */
  status: string;
  paymentStatus: string;
  /** true si ya se sabe (201 previo o 409 del backend) que esta orden ya fue calificada por el vendedor. */
  rated: boolean;
  onRated: (orderId: number) => void;
}

/**
 * Acción "Calificar comprador" (POST /api/orders/:id/buyer-review). Un solo componente para la fila del
 * pedido en SellerOrders.tsx y la tarjeta del pedido en el chat (OrderContextCard).
 */
export default function RateBuyerAction({ orderId, buyerName, status, paymentStatus, rated, onRated }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (rated) {
    return (
      <Chip
        size="small"
        color="success"
        icon={<StarIcon fontSize="small" />}
        label={t('rateBuyer.alreadyRatedBadge', { defaultValue: 'Comprador calificado ✓' })}
      />
    );
  }
  if (status !== 'DELIVERED' || paymentStatus !== 'VERIFIED') return null;

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<StarBorderIcon />}
        onClick={() => setOpen(true)}
        sx={{ minHeight: 36 }}
      >
        {t('rateBuyer.action', { defaultValue: 'Calificar comprador' })}
      </Button>
      <RateBuyerDialog
        open={open}
        orderId={orderId}
        buyerName={buyerName}
        onClose={() => setOpen(false)}
        onRated={() => {
          onRated(orderId);
          setOpen(false);
        }}
      />
    </>
  );
}
