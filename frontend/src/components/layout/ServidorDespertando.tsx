import { useTranslation } from 'react-i18next';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useServidorStore } from '../../services/warmup';

/** Franja fija que avisa mientras la API gratuita despierta de su inactividad (solo si tarda más de unos segundos). */
export default function ServidorDespertando() {
  const { t } = useTranslation();
  const despertando = useServidorStore((s) => s.despertando);
  if (!despertando) return null;
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: (theme) => theme.zIndex.snackbar,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        maxWidth: 'calc(100vw - 32px)',
        px: 2,
        py: 1.25,
        borderRadius: 2,
        bgcolor: 'grey.900',
        color: 'common.white',
        boxShadow: 6,
      }}
    >
      <CircularProgress size={18} color="inherit" />
      <Typography variant="body2">{t('servidor.despertando')}</Typography>
    </Box>
  );
}
