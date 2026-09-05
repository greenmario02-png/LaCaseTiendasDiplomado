import { Chip } from '@mui/material';
import { getUnifiedTokens, type KarmaLevel } from '../../theme';

interface KarmaLevelBadgeProps {
  level?: string;
}

/** Insignia pill del nivel de karma del foro (sin números, anti-Reddit). */
export function KarmaLevelBadge({ level = 'Novato' }: KarmaLevelBadgeProps) {
  const tokens = getUnifiedTokens(false);
  const badge = tokens.karmaBadges[level as KarmaLevel] ?? tokens.karmaBadges.Novato;
  return (
    <Chip
      label={level}
      size="small"
      sx={{
        bgcolor: badge.bg,
        color: badge.text,
        fontWeight: 700,
        borderRadius: '9999px',
        ...(badge.gradient ? { backgroundImage: badge.gradient } : {}),
      }}
    />
  );
}
