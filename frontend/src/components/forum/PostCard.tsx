import { Card, Box, Typography, Chip, Stack, Button } from '@mui/material';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { MapPin } from 'lucide-react';
import { forumPalette, formatTimeAgo } from '../../theme/forumTheme';
import { CategoryIcon } from '../../theme/forumIcons';
import { useForumStore } from '../../stores/forumStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import type { ForumPost } from '../../services/forum.api';
import PostVoteBar from './PostVoteBar';

interface Props {
  post: ForumPost;
}

export default function PostCard({ post }: Props) {
  const { user } = useAuthStore();
  const { votePost } = useForumStore();
  const navigate = useNavigate();

  const handleVote = (value: 1 | -1) => {
    if (!user) {
      navigate('/login');
      return;
    }
    void votePost(post.id, value);
  };

  return (
    <Card
      sx={{
        display: 'flex',
        bgcolor: forumPalette.bgCard,
        border: `1px solid ${forumPalette.border}`,
        borderRadius: '10px',
        overflow: 'hidden',
        borderLeft: post.status === 'RESOLVED' ? `3px solid ${forumPalette.karmaUp}` : undefined,
        '&:hover': { borderColor: '#444' },
        transition: 'border-color 0.2s',
      }}
    >
      <PostVoteBar score={post.score} userVote={post.userVote} onVote={handleVote} />

      <Box sx={{ flex: 1, p: 2, minWidth: 0 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" mb={1} alignItems="center">
          <Chip
            icon={<CategoryIcon slug={post.category?.slug} />}
            label={post.category?.name ?? ''}
            size="small"
            sx={{ bgcolor: forumPalette.accentMuted, color: forumPalette.accent, border: `1px solid rgba(255,107,53,0.35)`, fontWeight: 600 }}
          />
          <Chip
            icon={<MapPin size={13} strokeWidth={2.2} />}
            label={post.city}
            size="small"
            sx={{ bgcolor: 'rgba(249,168,37,0.1)', color: forumPalette.amarillo, border: `1px solid rgba(249,168,37,0.3)` }}
          />
          {post.type !== 'GENERAL' && (
            <Chip label={post.type} size="small" sx={{ color: forumPalette.textSecondary, fontSize: '0.7rem' }} />
          )}
          <Typography variant="caption" sx={{ color: forumPalette.textMuted }}>
            por <strong style={{ color: forumPalette.textSecondary }}>{post.author?.forumUsername ?? 'eliminado'}</strong>
            {' · '}
            {formatTimeAgo(post.createdAt)}
          </Typography>
        </Stack>

        <Typography
          variant="subtitle1"
          fontWeight={700}
          fontFamily="'Sora', sans-serif"
          sx={{ cursor: 'pointer', color: forumPalette.textPrimary, mb: 1, lineHeight: 1.4, '&:hover': { color: forumPalette.accent } }}
          onClick={() => navigate(`/foro/post/${post.id}`)}
        >
          {post.title}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: forumPalette.textSecondary,
            mb: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            whiteSpace: 'pre-line',
          }}
        >
          {post.body}
        </Typography>

        {post.tags?.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" mb={1.5}>
            {post.tags.slice(0, 5).map((t) => (
              <Chip key={t} label={`#${t}`} size="small" sx={{ bgcolor: forumPalette.bgInput, color: forumPalette.textMuted, fontSize: '0.7rem' }} />
            ))}
          </Stack>
        )}

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Button
            size="small"
            startIcon={<ChatBubbleIcon />}
            sx={{ color: post.status === 'RESOLVED' ? forumPalette.karmaUp : forumPalette.textMuted, textTransform: 'none', fontSize: '0.8rem' }}
            onClick={() => navigate(`/foro/post/${post.id}`)}
          >
            {post.replyCount} {post.status === 'RESOLVED' ? '✓' : ''} {post.replyCount === 1 ? 'respuesta' : 'respuestas'}
          </Button>
          <Button
            size="small"
            startIcon={<ShareIcon />}
            sx={{ color: forumPalette.textMuted, textTransform: 'none', fontSize: '0.8rem' }}
            onClick={() => navigator.clipboard?.writeText(window.location.origin + `/foro/post/${post.id}`)}
          >
            Compartir
          </Button>
          <Button size="small" startIcon={<BookmarkIcon />} sx={{ color: forumPalette.textMuted, textTransform: 'none', fontSize: '0.8rem' }}>
            Guardar
          </Button>
          {post.replyCount === 0 && (
            <Chip
              label="Sin respuesta aún"
              size="small"
              sx={{ bgcolor: forumPalette.accent, color: '#fff', fontWeight: 700, fontSize: '0.7rem' }}
            />
          )}
        </Stack>
      </Box>
    </Card>
  );
}
