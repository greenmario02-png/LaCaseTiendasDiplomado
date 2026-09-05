import { useState, useEffect } from 'react';
import { Box, Container, Typography, Grid, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../../services/api';
import { LoadingState, EmptyState } from '../../components/redesign/States';
import { PrimaryButton } from '../../components/redesign/Buttons';
import { getUnifiedTokens } from '../../theme';

const CATEGORIAS = [
  { key: 'GRATIS', label: '🎫 Gratis' },
  { key: 'CONCIERTOS_MUSICA', label: '🎵 Conciertos' },
  { key: 'GASTRONOMIA', label: '🍽 Gastronomía' },
  { key: 'CULTURA', label: '🎭 Cultura' },
  { key: 'MUSEOS', label: '🏛 Museos' },
  { key: 'DEPORTES', label: '⚽ Deportes' },
  { key: 'TEATRO', label: '🎭 Teatro' },
  { key: 'TALLERES_CURSOS', label: '📚 Talleres' },
  { key: 'FERIAS_EXPOSICIONES', label: '🎪 Ferias' },
  { key: 'INFANTIL_FAMILIAR', label: '👨‍👩‍👧 Familia' },
  { key: 'VIDA_NOCTURNA', label: '🌙 Nocturna' },
  { key: 'OTROS', label: '💬 Otros' },
];

export default function EventsPage() {
  const tokens = getUnifiedTokens(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<{ destacados: any[]; porCategoria: Record<string, any[]>; cercaDeTi: any[]; proximos7dias: any[] } | null>(null);
  const [activeCat, setActiveCat] = useState('');

  useEffect(() => {
    api
      .get('/events/feed')
      .then((r) => setFeed(r.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ py: 10 }}>
        <LoadingState />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <EmptyState message={`No se pudieron cargar los eventos: ${error}`} />
      </Container>
    );
  }

  const renderCard = (e: any) => (
    <Box
      key={e.id}
      sx={{
        borderRadius: '12px',
        boxShadow: tokens.cardShadow,
        bgcolor: tokens.surfaceContainerLowest,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-2px)' },
      }}
      onClick={() => navigate(`/eventos/${e.slug}`)}
    >
      <Box sx={{ height: 140, bgcolor: `${tokens.primary}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
        {e.coverImageUrl ? <img src={e.coverImageUrl} alt={e.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🎟️'}
      </Box>
      <Box sx={{ p: 2 }}>
        <Chip size="small" label={e.category?.replace('_', ' ') ?? 'Evento'} sx={{ bgcolor: `${tokens.primary}14`, color: tokens.primary, fontWeight: 600, fontSize: 11, mb: 1 }} />
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5, lineHeight: 1.3 }}>
          {e.title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          📅 {e.startAt ? new Date(e.startAt).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'} · 📍 {e.city ?? 'Bolivia'}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" fontWeight={800}>
          🎟️ Eventos en Bolivia
        </Typography>
        <PrimaryButton onClick={() => navigate('/organizador')}>Soy organizador</PrimaryButton>
      </Box>

      {/* Filtros por categoría */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        <Chip
          label="Todos"
          onClick={() => setActiveCat('')}
          sx={{ bgcolor: activeCat === '' ? tokens.primary : tokens.surfaceContainerLowest, color: activeCat === '' ? '#fff' : tokens.onSurface, fontWeight: 600 }}
        />
        {CATEGORIAS.map((c) => (
          <Chip
            key={c.key}
            label={c.label}
            onClick={() => setActiveCat(activeCat === c.key ? '' : c.key)}
            sx={{ bgcolor: activeCat === c.key ? tokens.primary : tokens.surfaceContainerLowest, color: activeCat === c.key ? '#fff' : tokens.onSurface, fontWeight: 600 }}
          />
        ))}
      </Box>

      {!feed || (feed.destacados.length === 0 && feed.cercaDeTi.length === 0 && feed.proximos7dias.length === 0) ? (
        <EmptyState message="Aún no hay eventos publicados. ¡Sé el primero en organizar uno!" />
      ) : (
        <>
          {/* Destacados */}
          {feed.destacados.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
                ⭐ Destacados
              </Typography>
              <Grid container spacing={2}>
                {feed.destacados.filter((e) => !activeCat || e.category === activeCat).map(renderCard)}
              </Grid>
            </Box>
          )}

          {/* Cerca de ti */}
          {feed.cercaDeTi.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
                📍 Cerca de ti
              </Typography>
              <Grid container spacing={2}>
                {feed.cercaDeTi.filter((e) => !activeCat || e.category === activeCat).map(renderCard)}
              </Grid>
            </Box>
          )}

          {/* Próximos 7 días */}
          {feed.proximos7dias.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
                🗓 Este fin de semana
              </Typography>
              <Grid container spacing={2}>
                {feed.proximos7dias.filter((e) => !activeCat || e.category === activeCat).map(renderCard)}
              </Grid>
            </Box>
          )}
        </>
      )}
    </Container>
  );
}