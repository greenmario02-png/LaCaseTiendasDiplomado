import { useEffect, useState } from 'react';
import { Box, Typography, Button, Stack, CircularProgress, Alert, Chip } from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { useParams, Link as RouterLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { getConoEntry, voteConoEntry } from '../../services/cono.api';
import type { ConoEntry } from '../../services/cono.api';
import { getErrorMessage, resolveImageUrl } from '../../services/api';
import { useUnifiedTokens } from '../../theme';
import CommentsSection from '../../components/forum/CommentsSection';
import { useModismo } from '../../utils/modismos';

export default function ConoEntryDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const tokens = useUnifiedTokens();
  const [entry, setEntry] = useState<ConoEntry | null>(null);
  const [loading, setLoading] = useState(true);
  // "Nica" (voto negativo) también vive en la capa de modismos regionales — hoy todos los
  // departamentos comparten el mismo valor en es-BO.json, pero queda cableado para cuando se
  // agreguen variantes (ver locales/README.md).
  const positiveLabel = useModismo('cono.vote.positive');
  const negativeLabel = useModismo('cono.vote.negative');

  useEffect(() => {
    if (!id) return;
    getConoEntry(Number(id)).then(setEntry).finally(() => setLoading(false));
  }, [id]);

  const vote = async (value: 'POSITIVE' | 'NEGATIVE') => {
    if (!entry) return;
    try {
      const counts = await voteConoEntry(entry.id, value);
      setEntry((e) => (e ? { ...e, ...counts } : e));
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!entry) return <Alert severity="error">{t('cono.entryDetail.entryNotFound')}</Alert>;

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', p: 2 }}>
      {entry.theme && (
        <Typography variant="caption" component={RouterLink} to={`/cono/${entry.theme.slug}`}
          sx={{ color: tokens.primary, textDecoration: 'none' }}>
          ← {entry.theme.title}
        </Typography>
      )}
      <Box
        component="img"
        src={resolveImageUrl(entry.imageUrl)}
        alt={entry.label}
        sx={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: '12px', bgcolor: '#000', mt: 1 }}
      />
      <Typography variant="h6" fontWeight={800} sx={{ color: tokens.onSurface, mt: 1 }}>{entry.label}</Typography>
      {entry.submittedBy && (
        <Typography variant="caption" sx={{ color: tokens.onSurfaceVariant }}>{t('cono.entryDetail.byAuthor', { username: entry.submittedBy.forumUsername })}</Typography>
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="outlined" startIcon={<ThumbUpIcon />} onClick={() => vote('POSITIVE')}>
          {positiveLabel} ({entry.positiveCount})
        </Button>
        <Button variant="outlined" color="warning" startIcon={<ThumbDownIcon />} onClick={() => vote('NEGATIVE')}>
          {negativeLabel} ({entry.negativeCount})
        </Button>
        <Chip label={t('cono.entryDetail.net', { value: entry.positiveCount - entry.negativeCount })} sx={{ alignSelf: 'center' }} />
      </Stack>

      <CommentsSection targetType="CONO_ENTRY" targetId={entry.id} />
    </Box>
  );
}
