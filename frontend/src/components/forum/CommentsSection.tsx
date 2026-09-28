import { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Stack, Avatar, Chip, CircularProgress } from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import toast from 'react-hot-toast';
import { listComments, createComment, voteComment } from '../../services/forum.api';
import type { GenericComment } from '../../services/forum.api';
import { useAuthStore } from '../../stores/authStore';
import { getErrorMessage } from '../../services/api';
import { useUnifiedTokens } from '../../theme';
import { useModismo } from '../../utils/modismos';

interface Props {
  targetType: string;
  targetId: number;
}

/**
 * Sección de comentarios con votación de credibilidad (de acuerdo / está mamando /
 * creado con IA) — motor genérico reusable en cualquier página de contenido (memes y torneo,
 * QuemadosBolivia, Bolivia en Comunidad). Ver backend/src/services/comments.service.ts.
 */
const PAGE_SIZE = 20;

export default function CommentsSection({ targetType, targetId }: Props) {
  const tokens = useUnifiedTokens();
  const { user } = useAuthStore();
  // "Está mamando" varía por departamento (ver locales/modismos/es-BO.json) — este componente
  // se reusa en memes y torneo, QuemadosBolivia y Bolivia en Comunidad, así que el mismo
  // botón muestra el modismo regional del usuario en cualquiera de esas superficies.
  const fakeLabel = useModismo('comments.credibility.fake');
  const [comments, setComments] = useState<GenericComment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  const load = () => {
    setLoading(true);
    setPage(1);
    listComments(targetType, targetId, 1, PAGE_SIZE)
      .then((r) => { setComments(r.data); setTotal(r.meta.total); })
      .finally(() => setLoading(false));
  };

  useEffect(load, [targetType, targetId]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const r = await listComments(targetType, targetId, nextPage, PAGE_SIZE);
      setComments((prev) => [...prev, ...r.data]);
      setTotal(r.meta.total);
      setPage(nextPage);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  };

  const submit = async () => {
    if (!body.trim()) return;
    setPosting(true);
    try {
      await createComment(targetType, targetId, body.trim());
      setBody('');
      load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setPosting(false);
    }
  };

  const vote = async (commentId: number, type: 'AGREE' | 'FAKE' | 'AI_GENERATED') => {
    try {
      const counts = await voteComment(commentId, type);
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, ...counts } : c)));
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ color: tokens.onSurface, mb: 1 }}>
        Comentarios ({total})
      </Typography>

      {user && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            multiline
            maxRows={4}
            placeholder="Escribe un comentario…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            inputProps={{ maxLength: 500 }}
          />
          <Button variant="contained" onClick={submit} disabled={posting || !body.trim()}>
            Enviar
          </Button>
        </Stack>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={20} /></Box>
      ) : comments.length === 0 ? (
        <Typography variant="body2" sx={{ color: tokens.onSurfaceVariant }}>Todavía no hay comentarios.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {comments.map((c) => (
            <Box key={c.id} sx={{ bgcolor: tokens.surfaceContainerLowest, borderRadius: '10px', p: 1.5, boxShadow: tokens.cardShadow }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                <Avatar src={c.author.avatarUrl ?? undefined} sx={{ width: 22, height: 22, fontSize: '0.7rem' }}>
                  {c.author.forumUsername[0]}
                </Avatar>
                <Typography variant="caption" fontWeight={700} sx={{ color: tokens.onSurface }}>{c.author.forumUsername}</Typography>
                <Chip label={c.author.tag} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
              </Stack>
              <Typography variant="body2" sx={{ color: tokens.onSurface, mb: 1 }}>{c.body}</Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" startIcon={<ThumbUpIcon sx={{ fontSize: 14 }} />} onClick={() => vote(c.id, 'AGREE')} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                  De acuerdo {c.agreeCount > 0 && `(${c.agreeCount})`}
                </Button>
                <Button size="small" color="warning" startIcon={<ReportProblemIcon sx={{ fontSize: 14 }} />} onClick={() => vote(c.id, 'FAKE')} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                  {fakeLabel} {c.fakeCount > 0 && `(${c.fakeCount})`}
                </Button>
                <Button size="small" color="secondary" startIcon={<SmartToyIcon sx={{ fontSize: 14 }} />} onClick={() => vote(c.id, 'AI_GENERATED')} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                  Es IA {c.aiCount > 0 && `(${c.aiCount})`}
                </Button>
              </Stack>
            </Box>
          ))}
          {comments.length < total && (
            <Button
              size="small"
              onClick={loadMore}
              disabled={loadingMore}
              sx={{ alignSelf: 'center', textTransform: 'none' }}
            >
              {loadingMore ? <CircularProgress size={16} /> : `Cargar más (${total - comments.length})`}
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
}
