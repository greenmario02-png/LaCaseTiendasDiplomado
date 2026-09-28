import { Chip } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useTranslation } from 'react-i18next';
import { useForumPalette } from '../../theme/forumTheme';

export function BotReplyBadge() {
  const { t } = useTranslation();
  const forumPalette = useForumPalette();
  return (
    <Chip
      icon={<SmartToyIcon fontSize="small" />}
      label={t('forum.botReplyBadge.label')}
      size="small"
      sx={{
        bgcolor: forumPalette.accentMuted,
        color: forumPalette.accent,
        border: `1px solid rgba(255,107,53,0.35)`,
        fontWeight: 700,
        fontSize: '0.72rem',
      }}
    />
  );
}
