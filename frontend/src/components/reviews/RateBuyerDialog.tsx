import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Rating, TextField, Typography } from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ordersApi } from '../../services/orders.api';
import { getErrorMessage } from '../../services/api';

interface Props {
  open: boolean;
  orderId: number;
  buyerName?: string;
  onClose: () => void;
  /** Se llama tanto si la calificacion se crea (201) como si ya existia (409): en ambos casos queda calificada. */
  onRated: () => void;
}

/** Formulario de estrellas+comentario para que el vendedor califique al comprador (mismo patron visual que las reseñas comprador->vendedor). */
export default function RateBuyerDialog({ open, orderId, buyerName, onClose, onRated }: Props) {
  const { t } = useTranslation();
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await ordersApi.addBuyerReview(orderId, { rating: rating || 5, comment: comment.trim() || undefined });
      toast.success(t('rateBuyer.toastSuccess', { defaultValue: 'Calificación enviada' }));
      setComment('');
      setRating(5);
      onRated();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast.error(t('rateBuyer.toastAlreadyRated', { defaultValue: 'Ya habías calificado a este comprador' }));
        onRated();
      } else {
        toast.error(getErrorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {buyerName
          ? t('rateBuyer.title', { defaultValue: 'Calificar a {{name}}', name: buyerName })
          : t('rateBuyer.titleGeneric', { defaultValue: 'Calificar al comprador' })}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary' }}>
          {t('rateBuyer.ratingLabel', { defaultValue: 'Calificación' })}
        </Typography>
        <Rating
          value={rating}
          onChange={(_, v) => setRating(v || 5)}
          aria-label={t('rateBuyer.ratingLabel', { defaultValue: 'Calificación' })}
        />
        <TextField
          fullWidth
          size="small"
          multiline
          rows={3}
          sx={{ mt: 2 }}
          label={t('rateBuyer.commentLabel', { defaultValue: 'Comentario (opcional)' })}
          placeholder={t('rateBuyer.commentPlaceholder', { defaultValue: 'Cuéntanos cómo fue la compra...' })}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} sx={{ minHeight: 44 }}>
          {t('rateBuyer.cancel', { defaultValue: 'Cancelar' })}
        </Button>
        <Button variant="contained" onClick={submit} disabled={saving} sx={{ minHeight: 44 }}>
          {t('rateBuyer.submit', { defaultValue: 'Enviar calificación' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
