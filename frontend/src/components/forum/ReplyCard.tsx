import { Card, Box, Typography, Chip, Button, Stack, Avatar } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { forumPalette, formatTimeAgo } from '../../theme/forumTheme';
import { useAuthStore } from '../../stores/authStore';
import type { ForumReply } from '../../services/forum.api';
import PostVoteBar from './PostVoteBar';

interface Props {
  reply: ForumReply;
  canAccept: boolean;
  onAccept: (id: number) => void;
  onVote: (id: number, value: 1 | -1) => void;
}

export default function ReplyCard({ reply, canAccept, onAccept, onVote }: Props) {
  const { user } = useAuthStore();

  return (
    <Card
      sx={{
        bgcolor: forumPalette.bgCard,
        border: reply.isAccepted ? `1px solid ${forumPalette.karmaUp}` : `1px solid ${forumPalette.border}`,
        borderRadius: '10px',
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      <PostVoteBar score={reply.score} userVote={reply.userVote} onVote={(v) => onVote(reply.id, v)} />

      <Box sx={{ flex: 1, p: 2, minWidth: 0 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" mb={1} alignItems="center">
          {reply.isBotReply ? (
            <Chip
              label="🤖 Bot LaCASE Multitienda"
              size="small"
              sx={{ bgcolor: forumPalette.accentMuted, color: forumPalette.accent, fontWeight: 700 }}
            />
          ) : (
            <>
              <Avatar sx={{ width: 20, height: 20, bgcolor: forumPalette.rankMaestro, fontSize: '0.7rem' }}>
                {(reply.author?.forumUsername ?? '?')[0].toUpperCase()}
              </Avatar>
              <Typography variant="caption" sx={{ color: forumPalette.textSecondary, fontWeight: 600 }}>
                {reply.author?.forumUsername ?? 'eliminado'}
              </Typography>
              <Chip label={reply.author?.tag} size="small" sx={{ bgcolor: forumPalette.bgInput, color: forumPalette.karmaGold, fontSize: '0.65rem' }} />
            </>
          )}
          {reply.isAccepted && (
            <Chip icon={<CheckCircleIcon />} label="Mejor respuesta" size="small" sx={{ bgcolor: 'rgba(76,175,80,0.15)', color: forumPalette.karmaUp, fontWeight: 700 }} />
          )}
          <Typography variant="caption" sx={{ color: forumPalette.textMuted }}>
            · {formatTimeAgo(reply.createdAt)}
          </Typography>
        </Stack>

        <Typography variant="body2" sx={{ color: forumPalette.textPrimary, whiteSpace: 'pre-line', mb: 1 }}>
          {reply.body}
        </Typography>

        {canAccept && !reply.isBotReply && !reply.isAccepted && user && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<CheckCircleIcon />}
            sx={{ color: forumPalette.karmaUp, borderColor: forumPalette.karmaUp, textTransform: 'none', mt: 1 }}
            onClick={() => onAccept(reply.id)}
          >
            Marcar como respuesta
          </Button>
        )}
      </Box>
    </Card>
  );
}
