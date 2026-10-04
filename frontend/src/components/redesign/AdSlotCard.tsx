import { Box, Typography } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import { useTranslation } from 'react-i18next';
import { useUnifiedTokens } from '../../theme';
import { SurfaceCard } from './PageHeader';

/**
 * Espacio reservado para anuncios pagados (todavía no implementado — por ahora es un
 * placeholder visual en el mismo lugar donde va a vivir la sección de anuncios).
 */
export function AdSlotCard() {
  const { t } = useTranslation();
  const tokens = useUnifiedTokens();

  return (
    <SurfaceCard
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 1,
        minHeight: 180,
        border: `1px dashed ${tokens.outline}80`,
        bgcolor: 'transparent',
      }}
    >
      <CampaignIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
        {t('home.adSlot.title', { defaultValue: 'Pon tu anuncio aquí' })}
      </Typography>
      <Typography variant="caption" color="text.disabled" sx={{ maxWidth: 220 }}>
        {t('home.adSlot.subtitle', { defaultValue: 'Espacio publicitario — próximamente' })}
      </Typography>
    </SurfaceCard>
  );
}

export default AdSlotCard;
