import { useEffect, useState } from 'react';
import { Box, Typography, Button, List, ListItem, Chip, Divider, Avatar } from '@mui/material';
import { PencilLine, Trophy, Medal, Star, TrendingUp, MessageCircle, Coins } from 'lucide-react';
import { forumPalette } from '../../theme/forumTheme';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { getTrending, getTopUsers } from '../../services/forum.api';

export default function ForumSidebarRight() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [trending, setTrending] = useState<{ tag: string; count: number }[]>([]);
  const [topUsers, setTopUsers] = useState<{ id: number; forumUsername: string; karma: number; tag: string; reputationScore: number }[]>([]);

  useEffect(() => {
    getTrending().then(setTrending).catch(() => {});
    getTopUsers()
      .then((res) => setTopUsers(Array.isArray(res) ? res : res.topByKarma ?? []))
      .catch(() => {});
  }, []);

  return (
    <Box sx={{ display: { xs: 'none', xl: 'block' }, width: 280, flexShrink: 0, pl: 2 }}>
      {user && (
        <Button
          fullWidth
          variant="contained"
          startIcon={<PencilLine size={16} strokeWidth={2.2} />}
          sx={{ bgcolor: forumPalette.accent, '&:hover': { bgcolor: forumPalette.accentHover }, mb: 1.5, fontWeight: 700 }}
          onClick={() => navigate('/foro')}
        >
          Hacer una pregunta
        </Button>
      )}

      <Box sx={{ bgcolor: forumPalette.bgCard, borderRadius: '10px', border: `1px solid ${forumPalette.border}`, p: 1.5, mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: forumPalette.textPrimary, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Trophy size={16} strokeWidth={2.2} color={forumPalette.karmaGold} /> Top colaboradores
        </Typography>
        <List dense disablePadding>
          {topUsers.slice(0, 5).map((u, i) => (
            <ListItem key={u.id} disableGutters sx={{ gap: 1, cursor: 'pointer' }} onClick={() => navigate(`/foro/u/${u.forumUsername}`)}>
              <Typography sx={{ color: forumPalette.textMuted, width: 20, fontWeight: 700, fontSize: '0.8rem' }}>
                {i < 3 ? <Medal size={16} strokeWidth={2.2} color={i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32'} /> : `${i + 1}`}
              </Typography>
              <Avatar sx={{ width: 22, height: 22, bgcolor: forumPalette.rankMaestro, fontSize: '0.65rem' }}>
                {u.forumUsername[0].toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ color: forumPalette.textPrimary, fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {u.forumUsername}
                </Typography>
              </Box>
              <Chip icon={<Star size={11} strokeWidth={2.4} color={forumPalette.karmaGold} />} label={`${u.karma}`} size="small" sx={{ fontSize: '0.65rem', color: forumPalette.karmaGold }} />
            </ListItem>
          ))}
        </List>
      </Box>

      <Box sx={{ bgcolor: forumPalette.bgCard, borderRadius: '10px', border: `1px solid ${forumPalette.border}`, p: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: forumPalette.textPrimary, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <TrendingUp size={16} strokeWidth={2.2} color={forumPalette.accent} /> Tendencia (24h)
        </Typography>
        {trending.length === 0 ? (
          <Typography variant="caption" sx={{ color: forumPalette.textMuted }}>Sin datos aún</Typography>
        ) : (
          trending.slice(0, 8).map((t) => (
            <Chip key={t.tag} label={`#${t.tag}`} size="small" sx={{ mr: 0.5, mb: 0.5, bgcolor: forumPalette.bgInput, color: forumPalette.accent, fontSize: '0.7rem' }} />
          ))
        )}
        <Divider sx={{ my: 1.2 }} />
        <Typography variant="caption" sx={{ color: forumPalette.textMuted, display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
          <MessageCircle size={13} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>El foro funciona con tu cuenta de LaCase Multi Tiendas. Tu karma se puede canjear por monedas <Coins size={12} strokeWidth={2.4} style={{ verticalAlign: '-2px' }} />.</span>
        </Typography>
      </Box>
    </Box>
  );
}
