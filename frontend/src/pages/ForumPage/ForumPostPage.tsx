import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Chip, Stack, Button, IconButton, TextField, Alert,
  CircularProgress, Divider,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FlagIcon from '@mui/icons-material/Flag';
import {
  getPost, createReply, votePost, voteReply, acceptReply, reportPost, reportReply,
} from '../../services/forum.api';
import { getErrorMessage } from '../../services/api';
import { connectSocket, getSocket, joinForum, leaveForum } from '../../services/socket';
import { useAuthStore } from '../../stores/authStore';
import { ReplyCard } from '../../components/redesign/ReplyCard';
import { PrimaryButton } from '../../components/redesign/Buttons';
import { LoadingState, EmptyState } from '../../components/redesign/States';
import { MapPin, MessageSquare } from 'lucide-react';
import { CategoryIcon } from '../../theme/forumIcons';
import { forumPalette, formatTimeAgo } from '../../theme/forumTheme';

type PostDetail = any;

export function ForumPostPage() {
  const { id } = useParams();
  const postId = Number(id);
  const navigate = useNavigate();
  const { user, token } = useAuthStore();

  const [post, setPost] = useState<PostDetail>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadPost = useCallback(async () => {
    try {
      const data = await getPost(postId);
      setPost(data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  // Socket: unirse a la room del post
  useEffect(() => {
    if (!user) return;
    if (token) connectSocket(token);
    const socket = getSocket();
    joinForum(postId);

    const onNewReply = ({ reply }: any) => {
      setPost((p: PostDetail | null) => p ? { ...p, replies: [...p.replies, reply], replyCount: p.replyCount + 1 } : p);
    };
    const onVote = ({ targetType, targetId, newScore }: any) => {
      setPost((p: PostDetail | null) => {
        if (!p) return p;
        if (targetType === 'POST') return { ...p, score: newScore };
        return {
          ...p,
          replies: p.replies.map((r: any) => r.id === targetId ? { ...r, score: newScore } : r),
        };
      });
    };
    const onResolved = ({ acceptedReplyId }: any) => {
      setPost((p: PostDetail | null) => p ? {
        ...p,
        status: 'RESOLVED',
        replies: p.replies.map((r: any) => r.id === acceptedReplyId ? { ...r, isAccepted: true } : r),
      } : p);
    };

    socket.on('forum:reply:new', onNewReply);
    socket.on('forum:vote', onVote);
    socket.on('forum:post:resolved', onResolved);

    return () => {
      socket.off('forum:reply:new', onNewReply);
      socket.off('forum:vote', onVote);
      socket.off('forum:post:resolved', onResolved);
      leaveForum(postId);
    };
  }, [postId, user, token]);

  const handleVotePost = async (value: 1 | -1) => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await votePost(postId, value);
      setPost((p: PostDetail | null) => p ? { ...p, score: res.newScore, upvotes: res.upvotes, downvotes: res.downvotes, userVote: res.userVote } : p);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleVoteReply = async (replyId: number, value: 1 | -1) => {
    if (!user) { navigate('/login'); return; }
    try {
      await voteReply(replyId, value);
      await loadPost();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleAccept = async (replyId: number) => {
    try {
      await acceptReply(replyId);
      await loadPost();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleSendReply = async () => {
    if (!user) { navigate('/login'); return; }
    if (replyText.trim().length < 10) return;
    setSending(true);
    setError('');
    try {
      await createReply(postId, { body: replyText.trim() });
      setReplyText('');
      await loadPost();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><LoadingState /></Box>;
  }

  if (!post) {
    return <Alert severity="error">{error || 'No se pudo cargar la pregunta.'}</Alert>;
  }

  const canAccept = user != null && post.author != null && post.author.forumUsername === user.forumProfile?.forumUsername;
  const safeAuthor = post.author ?? { forumUsername: 'usuario', tag: 'Novato', karma: 0 };

  return (
    <Box>
      <Button size="small" onClick={() => navigate('/foro')} sx={{ color: forumPalette.textSecondary, mb: 1, textTransform: 'none' }}>
        ← Volver al feed
      </Button>

      {/* Post */}
      <Box sx={{ bgcolor: forumPalette.bgCard, border: `1px solid ${forumPalette.border}`, borderRadius: 2, p: 2, mb: 2 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
          <Chip icon={<CategoryIcon slug={post.category?.slug} />} label={post.category.name} size="small"
            sx={{ bgcolor: forumPalette.accentMuted, color: forumPalette.accent, fontWeight: 600 }} />
          <Chip icon={<MapPin size={13} strokeWidth={2.2} />} label={post.city} size="small"
            sx={{ bgcolor: 'rgba(249,168,37,0.1)', color: forumPalette.amarillo }} />
          {post.type !== 'GENERAL' && <Chip label={post.type} size="small" sx={{ color: forumPalette.textSecondary }} />}
          {post.status === 'RESOLVED' && <Chip label="✓ Resuelta" size="small" sx={{ color: forumPalette.verde }} />}
        </Stack>

        <Typography variant="h5" fontWeight={800} sx={{ color: forumPalette.textPrimary, mb: 0.5 }}>
          {post.title}
        </Typography>
        <Typography variant="caption" sx={{ color: forumPalette.textMuted }}>
          por <strong style={{ color: forumPalette.textSecondary }}>{safeAuthor.forumUsername}</strong>
          {' · '}{formatTimeAgo(post.createdAt)} · {post.viewCount || 0} vistas
        </Typography>

        <Typography variant="body1" sx={{ color: forumPalette.textSecondary, my: 1.5, whiteSpace: 'pre-line' }}>
          {post.body}
        </Typography>

        {post.images?.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
            {post.images.map((img: string) => (
              <Box key={img} component="img" src={img} alt=""
                sx={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 1, border: `1px solid ${forumPalette.border}` }} />
            ))}
          </Stack>
        )}

        <Stack direction="row" spacing={0.5} flexWrap="wrap" mb={1}>
          {post.tags?.map((t: string) => (
            <Chip key={t} label={`#${t}`} size="small" sx={{ bgcolor: forumPalette.bgInput, color: forumPalette.textMuted, fontSize: '0.7rem' }} />
          ))}
        </Stack>

        {/* Votación del post */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton size="small" onClick={() => handleVotePost(1)}
            sx={{ color: post.userVote === 1 ? forumPalette.karmaUp : forumPalette.textMuted }}>
            <ArrowUpwardIcon fontSize="small" />
          </IconButton>
          <Typography fontWeight={700} sx={{ color: forumPalette.textPrimary }}>{post.score}</Typography>
          <IconButton size="small" onClick={() => handleVotePost(-1)}
            sx={{ color: post.userVote === -1 ? forumPalette.karmaDown : forumPalette.textMuted }}>
            <ArrowDownwardIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => reportPost(postId, { reason: 'SPAM' })}
            sx={{ color: forumPalette.textMuted, ml: 'auto' }}>
            <FlagIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* Replies */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ color: forumPalette.textPrimary, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <MessageSquare size={18} strokeWidth={2.2} color={forumPalette.accent} /> {post.replyCount} {post.replyCount === 1 ? 'respuesta' : 'respuestas'}
      </Typography>

      {post.replies?.length === 0 && (
        <EmptyState message="Aún no hay respuestas. ¡Sé el primero!" />
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
        {post.replies?.map((reply: any) => (
          <ReplyCard
            key={reply.id}
            reply={{
              id: reply.id,
              body: reply.body,
              images: reply.images ?? [],
              isBotReply: reply.isBotReply ?? false,
              isAccepted: reply.isAccepted ?? false,
              author: reply.author
                ? { forumUsername: reply.author.forumUsername, tag: reply.author.tag }
                : null,
              positives: reply.score ?? 0,
              createdAt: reply.createdAt,
            }}
            canAccept={Boolean(canAccept) && post.status !== 'RESOLVED'}
            onAccept={handleAccept}
            onPositive={(replyId) => handleVoteReply(replyId, 1)}
          />
        ))}
      </Box>

      <Divider sx={{ borderColor: forumPalette.border, mb: 2 }} />

      {/* Responder — siempre visible; sin login redirige a /login */}
      <Box>
        <TextField
          fullWidth
          multiline
          minRows={3}
          maxRows={8}
          placeholder={
            user
              ? 'Escribe tu respuesta... (mínimo 10 caracteres)'
              : 'Inicia sesión para responder...'
          }
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onFocus={() => {
            if (!user) navigate('/login');
          }}
          sx={{
            '& .MuiOutlinedInput-root': { bgcolor: forumPalette.bgInput, color: forumPalette.textPrimary },
            '& fieldset': { borderColor: forumPalette.border },
          }}
        />
        {error && <Alert severity="error" sx={{ mt: 1, fontSize: '0.85rem' }}>{error}</Alert>}
        <Box sx={{ textAlign: 'right', mt: 1 }}>
          <PrimaryButton
            onClick={handleSendReply}
            disabled={sending || replyText.trim().length < 10}
          >
            {sending ? 'Publicando...' : 'Publicar respuesta'}
          </PrimaryButton>
        </Box>
      </Box>
    </Box>
  );
}
