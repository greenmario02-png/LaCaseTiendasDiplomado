import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, TextField, Alert,
  Avatar, Divider, Paper, IconButton, Grid,
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { getPublicProfile, getProfilePosts, addReputation } from '../../services/forum.api';
import { getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useForumStore } from '../../stores/forumStore';
import { ForumPostCard } from '../../components/redesign/ForumPostCard';
import { KarmaLevelBadge } from '../../components/redesign/KarmaLevelBadge';
import { CoinChip } from '../../components/redesign/CoinChip';
import { StatCard } from '../../components/redesign/StatCard';
import { LoadingState, EmptyState } from '../../components/redesign/States';
import { PrimaryButton, SecondaryButton } from '../../components/redesign/Buttons';
import { KarmaCard } from '../../components/forum/KarmaCard';
import { RedeemKarmaDialog } from '../../components/forum/RedeemKarmaDialog';
import { GeoConfig } from '../../components/forum/GeoConfig';
import { MapPin, ThumbsUp, LocateFixed } from 'lucide-react';
import { forumPalette, getTag, formatTimeAgo } from '../../theme/forumTheme';
import { getUnifiedTokens } from '../../theme';

export function ForumProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { profile, fetchProfile } = useForumStore();
  const tokens = getUnifiedTokens(false);

  const [data, setData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [repComment, setRepComment] = useState('');
  const [repValue, setRepValue] = useState<1 | -1 | null>(null);
  const [repError, setRepError] = useState('');
  const [openRedeem, setOpenRedeem] = useState(false);

  const isSelf = user?.forumProfile?.forumUsername === username;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getPublicProfile(String(username)),
      getProfilePosts(String(username), 1),
    ])
      .then(([p, r]) => {
        setData(p);
        setPosts(r.data ?? []);
      })
      .catch((e) => setRepError(getErrorMessage(e)))
      .finally(() => setLoading(false));
    if (user) fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const handleReputation = async () => {
    if (!user) { navigate('/login'); return; }
    if (!repValue) return;
    setRepError('');
    try {
      await addReputation(String(username), { value: repValue, comment: repComment || undefined });
      setRepComment('');
      setRepValue(null);
      const p = await getPublicProfile(String(username));
      setData(p);
    } catch (e) {
      setRepError(getErrorMessage(e));
    }
  };

  if (loading) {
    return <Box sx={{ py: 6 }}><LoadingState /></Box>;
  }

  if (!data) {
    return <Alert severity="error">No se encontró el perfil del foro.</Alert>;
  }

  const reputationPct = data.reputationScore && data._count?.reputationGot
    ? Math.round((data.reputationScore / data._count.reputationGot) * 100)
    : 0;

  return (
    <Box>
      {/* Banner boliviano */}
      <Box sx={{
        height: 80,
        borderRadius: 2,
        mb: 2,
        background: 'linear-gradient(90deg, #D32F2F 0%, #F9A825 50%, #FDB913 70%, #007A33 100%)',
      }} />

      <Paper elevation={0} sx={{ bgcolor: tokens.surfaceContainerLowest, border: `1px solid ${tokens.outline}22`, borderRadius: 2, p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Avatar sx={{ width: 56, height: 56, bgcolor: tokens.primary, fontSize: '1.4rem', fontWeight: 800 }}>
            {data.forumUsername?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h6" fontWeight={800} sx={{ color: tokens.onSurface }}>
              {data.forumUsername}
            </Typography>
            <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap" alignItems="center">
              <KarmaLevelBadge level={getTag(data.karma)} />
              <ChipMapPin city={data.city} />
              {data.isBanned && <Alert severity="error" sx={{ p: 0.25, py: 0, borderRadius: 2, fontSize: '0.7rem' }}>Baneado</Alert>}
            </Stack>
          </Box>
          {isSelf && (
            <PrimaryButton onClick={() => setOpenRedeem(true)}>Mi karma</PrimaryButton>
          )}
        </Stack>

        <Grid container spacing={1.5} mt={1}>
          <Grid item xs={6} sm={3}><StatCard title="karma" value={data.karma} /></Grid>
          <Grid item xs={6} sm={3}><StatCard title="preguntas" value={data._count?.posts ?? 0} /></Grid>
          <Grid item xs={6} sm={3}><StatCard title="respuestas" value={data._count?.replies ?? 0} /></Grid>
          <Grid item xs={6} sm={3}><StatCard title="días de racha" value={data.streakDays ?? 0} /></Grid>
        </Grid>

        {isSelf && profile && (
          <Box mt={2}>
            <KarmaCard karma={profile.karma} karmaSpent={profile.karmaSpent} tag={profile.tag}
              onRedeem={() => setOpenRedeem(true)} />
          </Box>
        )}

        {isSelf && (
          <Box mt={2} sx={{ borderTop: `1px solid ${tokens.outline}22`, pt: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: tokens.onSurface, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <LocateFixed size={16} strokeWidth={2.2} color={tokens.primary} /> Mi ubicación
            </Typography>
            <GeoConfig onSaved={() => { setLoading(true); getPublicProfile(String(username)).then(setData).finally(() => setLoading(false)); }} />
          </Box>
        )}

        {!isSelf && (
          <Box mt={2}>
            <Divider sx={{ borderColor: tokens.outline + '22', mb: 1.5 }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: tokens.onSurface, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <ThumbsUp size={15} strokeWidth={2.2} color={tokens.tertiaryContainer} /> Reputación: {reputationPct}% positiva ({data._count?.reputationGot ?? 0} valoraciones)
            </Typography>
            {user ? (
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <TextField size="small" placeholder="¿Es confiable? (opcional)"
                  value={repComment} onChange={(e) => setRepComment(e.target.value)}
                  sx={{ '& fieldset': { borderColor: tokens.outline }, flex: 1, minWidth: 180 }}
                  inputProps={{ maxLength: 300 }} />
                <IconButton onClick={() => setRepValue(1)}
                  sx={{ color: repValue === 1 ? tokens.tertiaryContainer : tokens.onSurfaceVariant }}>
                  <ThumbUpIcon />
                </IconButton>
                <IconButton onClick={() => setRepValue(-1)}
                  sx={{ color: repValue === -1 ? tokens.error : tokens.onSurfaceVariant }}>
                  <ThumbDownIcon />
                </IconButton>
                <PrimaryButton disabled={!repValue} onClick={handleReputation}>Valorar</PrimaryButton>
              </Stack>
            ) : (
              <SecondaryButton onClick={() => navigate('/login')}>Inicia sesión para valorar</SecondaryButton>
            )}
            {repError && <Alert severity="error" sx={{ mt: 1, fontSize: '0.85rem' }}>{repError}</Alert>}
          </Box>
        )}
      </Paper>

      {/* Posts del usuario */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ color: tokens.onSurface, mb: 1 }}>
        Últimas preguntas de {data.forumUsername}
      </Typography>
      {posts.length === 0 ? (
        <EmptyState message="Aún no ha publicado preguntas." />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {posts.map((p) => (
            <ForumPostCard key={p.id} post={{
              id: p.id, title: p.title, body: p.body, city: p.city,
              category: { icon: p.category?.icon ?? '💬', name: p.category?.name ?? 'General', color: p.category?.color ?? '#FF6B35' },
              author: { forumUsername: p.author?.forumUsername ?? 'usuario' },
              status: (p.status as 'OPEN' | 'RESOLVED' | 'CLOSED') ?? 'OPEN',
              replyCount: p.replyCount, positives: p.score ?? 0, createdAt: p.createdAt,
            }} onOpen={(id) => { navigate(`/foro/post/${id}`); }} onPositive={() => {}} />
          ))}
        </Box>
      )}

      <RedeemKarmaDialog
        open={openRedeem}
        available={(profile?.karma ?? 0) - (profile?.karmaSpent ?? 0)}
        onClose={() => setOpenRedeem(false)}
        onRedeemed={() => {
          fetchProfile();
        }}
      />
    </Box>
  );
}

function ChipMapPin({ city }: { city: string }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(249,168,37,0.1)', color: '#B45309', borderRadius: '9999px', px: 1, py: 0.25, fontSize: '0.75rem', fontWeight: 600 }}>
      <MapPin size={13} strokeWidth={2.2} /> {city}
    </Box>
  );
}
