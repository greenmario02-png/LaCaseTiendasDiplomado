import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  MenuItem,
  Typography,
  Alert,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '../../services/api';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import { PrimaryButton, GhostButton } from './Buttons';

type ProductTranslations = Record<string, { name?: string; description?: string }>;

interface Props {
  open: boolean;
  onClose: () => void;
  productId: number;
  translations?: ProductTranslations | null;
  onSaved?: (translations: ProductTranslations) => void;
}

// Idiomas traducibles del catálogo: todos los soportados por la app menos español (idioma base).
const TRANSLATABLE_LANGUAGES = Object.entries(SUPPORTED_LANGUAGES).filter(([code]) => code !== 'es');

/**
 * Modal rápido para que un vendedor cargue el nombre/descripción de UN producto en otro
 * idioma — pensado para completarse en segundos, no un editor completo por idioma.
 */
export function ProductTranslationModal({ open, onClose, productId, translations, onSaved }: Props) {
  const { t } = useTranslation();
  const [locale, setLocale] = useState(TRANSLATABLE_LANGUAGES[0]?.[0] ?? 'en');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const existing = translations?.[locale];
    setName(existing?.name ?? '');
    setDescription(existing?.description ?? '');
  }, [open, locale, translations]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/seller/products/${productId}/translations`, { locale, name, description });
      toast.success(t('seller.productForm.translations.saved', { defaultValue: 'Traducción guardada' }));
      onSaved?.(data.data.translations ?? {});
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const currentLang = SUPPORTED_LANGUAGES[locale];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('seller.productForm.translations.title', { defaultValue: 'Traducir producto' })}</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('seller.productForm.translations.info', {
            defaultValue: 'Completa el nombre y/o la descripción en otro idioma. Los compradores que usen ese idioma verán esta versión en vez de la de español.',
          })}
        </Alert>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            select
            label={t('seller.productForm.translations.language', { defaultValue: 'Idioma' })}
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            fullWidth
          >
            {TRANSLATABLE_LANGUAGES.map(([code, lang]) => (
              <MenuItem key={code} value={code}>
                {lang.nativeName}
              </MenuItem>
            ))}
          </TextField>
          {currentLang?.status === 'stub' && (
            <Typography variant="caption" color="text.secondary">
              {t('seller.productForm.translations.stubHint', {
                defaultValue: 'Este idioma todavía no tiene traducción general de la app, pero tu texto sí se va a mostrar.',
              })}
            </Typography>
          )}
          <TextField
            label={t('seller.productForm.translations.nameLabel', { defaultValue: 'Nombre del producto' })}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            inputProps={{ maxLength: 200 }}
          />
          <TextField
            label={t('seller.productForm.translations.descriptionLabel', { defaultValue: 'Descripción' })}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={4}
            inputProps={{ maxLength: 10000 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <GhostButton onClick={onClose}>{t('seller.productForm.translations.cancel', { defaultValue: 'Cancelar' })}</GhostButton>
        <PrimaryButton onClick={save} disabled={saving}>
          {t('seller.productForm.translations.save', { defaultValue: 'Guardar' })}
        </PrimaryButton>
      </DialogActions>
    </Dialog>
  );
}

export default ProductTranslationModal;
