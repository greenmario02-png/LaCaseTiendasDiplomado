import { Box, IconButton, Typography } from '@mui/material';
import { ArrowBigUp, ArrowBigDown } from 'lucide-react';
import { forumPalette } from '../../theme/forumTheme';

interface Props {
  score: number;
  userVote: 1 | -1 | 0;
  onVote: (value: 1 | -1) => void;
  size?: 'small' | 'medium';
}

/**
 * Barra de votos (karma) del foro.
 * Columna compacta a la izquierda: positivo arriba, puntaje en el medio, negativo abajo.
 * Iconos de la librería Lucide (reemplazan las flechas/emojis de antes).
 */
export default function PostVoteBar({ score, userVote, onVote, size = 'small' }: Props) {
  const fs = size === 'small' ? 18 : 22;
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.25,
        px: size === 'small' ? 0.75 : 1,
        py: 1,
        minWidth: size === 'small' ? 46 : 58,
        borderRight: `1px solid ${forumPalette.border}`,
        alignSelf: 'stretch',
        bgcolor: 'rgba(255,255,255,0.02)',
      }}
    >
      <IconButton
        size="small"
        onClick={() => onVote(1)}
        aria-label="Votar positivo"
        sx={{
          color: userVote === 1 ? forumPalette.karmaUp : forumPalette.textMuted,
          p: 0.25,
          '&:hover': { color: forumPalette.karmaUp, bgcolor: 'rgba(0,209,42,0.08)' },
        }}
      >
        <ArrowBigUp size={fs} strokeWidth={2} />
      </IconButton>
      <Typography
        variant={size === 'small' ? 'body2' : 'subtitle2'}
        fontWeight={800}
        fontFamily="'Sora', sans-serif"
        sx={{
          lineHeight: 1.1,
          color: score > 0 ? forumPalette.karmaUp : score < 0 ? forumPalette.karmaDown : forumPalette.textSecondary,
        }}
      >
        {Math.round(score)}
      </Typography>
      <IconButton
        size="small"
        onClick={() => onVote(-1)}
        aria-label="Votar negativo"
        sx={{
          color: userVote === -1 ? forumPalette.karmaDown : forumPalette.textMuted,
          p: 0.25,
          '&:hover': { color: forumPalette.karmaDown, bgcolor: 'rgba(244,0,37,0.08)' },
        }}
      >
        <ArrowBigDown size={fs} strokeWidth={2} />
      </IconButton>
    </Box>
  );
}
