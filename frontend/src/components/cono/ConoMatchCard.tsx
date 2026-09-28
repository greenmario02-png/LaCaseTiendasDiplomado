import { useState } from 'react';
import { Box, Card, CardContent, Typography, Button, LinearProgress, Chip, Collapse } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { voteConoMatch } from '../../services/cono.api';
import type { ConoMatch } from '../../services/cono.api';
import { getErrorMessage, resolveImageUrl } from '../../services/api';
import { useUnifiedTokens } from '../../theme';
import CommentsSection from '../forum/CommentsSection';
import { useModismo } from '../../utils/modismos';

interface Props {
  match: ConoMatch;
}

export function ConoMatchCard({ match: initial }: Props) {
  const { t } = useTranslation();
  const tokens = useUnifiedTokens();
  const [match, setMatch] = useState(initial);
  const [expanded, setExpanded] = useState<'A' | 'B' | null>(null);
  // Botón de voto del enfrentamiento, pasado por la misma capa de modismos regionales que el
  // resto de memes y torneo (ver useModismo) — hoy `cono.tournament.vote` no tiene
  // variantes por departamento en es-BO.json, así que siempre resuelve al texto de es.json
  // ("Votar"), pero queda cableado igual que positiveLabel/negativeLabel/fakeLabel para cuando
  // se agreguen. `CommentsSection` (más abajo) ya aplica el modismo real de "Está mamando" a
  // los comentarios de cada competidor.
  const voteLabel = useModismo('cono.tournament.vote');

  const total = match.votesA + match.votesB;
  const pctA = total > 0 ? Math.round((match.votesA / total) * 100) : 50;

  const vote = async (choice: 'A' | 'B') => {
    if (match.status !== 'ACTIVE') {
      toast.error(t('cono.matchCard.votingClosed'));
      return;
    }
    try {
      const counts = await voteConoMatch(match.id, choice);
      setMatch((m) => ({ ...m, ...counts }));
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <Card sx={{ bgcolor: tokens.surfaceContainerLowest, borderRadius: '14px', boxShadow: tokens.cardShadow }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Chip label={t('cono.matchCard.round', { round: match.round })} size="small" />
          <Chip
            label={match.status === 'ACTIVE' ? t('cono.matchCard.statusOpen') : match.status === 'RESOLVED' ? t('cono.matchCard.statusClosed') : t('cono.matchCard.statusPending')}
            size="small"
            color={match.status === 'ACTIVE' ? 'success' : match.status === 'RESOLVED' ? 'default' : 'warning'}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1 }}>
          {(['A', 'B'] as const).map((side) => {
            const entry = side === 'A' ? match.entryA : match.entryB;
            const votes = side === 'A' ? match.votesA : match.votesB;
            const isWinner = match.winnerId === entry.id;
            return (
              <Box key={side} sx={{ flex: 1, textAlign: 'center' }}>
                <Box
                  component="img"
                  src={resolveImageUrl(entry.imageUrl)}
                  alt={entry.label}
                  sx={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: '10px', border: isWinner ? `2px solid ${tokens.primary}` : 'none' }}
                />
                <Typography fontWeight={700} sx={{ color: tokens.onSurface, mt: 0.5 }}>
                  {entry.label} {isWinner && <EmojiEventsIcon sx={{ fontSize: 16, color: '#F9A825', verticalAlign: 'middle' }} />}
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.onSurfaceVariant }}>{t('cono.matchCard.votes', { count: votes })}</Typography>
                <Box sx={{ mt: 1 }}>
                  <Button
                    fullWidth size="small" variant="outlined"
                    disabled={match.status !== 'ACTIVE'}
                    onClick={() => vote(side)}
                  >
                    {voteLabel}
                  </Button>
                  <Button
                    fullWidth size="small"
                    endIcon={<ExpandMoreIcon sx={{ transform: expanded === side ? 'rotate(180deg)' : 'none' }} />}
                    onClick={() => setExpanded(expanded === side ? null : side)}
                    sx={{ mt: 0.5, textTransform: 'none' }}
                  >
                    {t('cono.matchCard.infoComments')}
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Box>

        {total > 0 && (
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: tokens.onSurfaceVariant, minWidth: 32 }}>{pctA}%</Typography>
            <LinearProgress variant="determinate" value={pctA} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
            <Typography variant="caption" sx={{ color: tokens.onSurfaceVariant, minWidth: 32, textAlign: 'right' }}>{100 - pctA}%</Typography>
          </Box>
        )}

        <Collapse in={expanded === 'A'}><CommentsSection targetType="CONO_ENTRY" targetId={match.entryA.id} /></Collapse>
        <Collapse in={expanded === 'B'}><CommentsSection targetType="CONO_ENTRY" targetId={match.entryB.id} /></Collapse>
      </CardContent>
    </Card>
  );
}
