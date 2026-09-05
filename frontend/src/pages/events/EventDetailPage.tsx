import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Box, Container, Typography, Chip, Paper, Divider, Stack } from '@mui/material';
import { CalendarMonth, Place, Category, ArrowBack } from '@mui/icons-material';
import { api, getErrorMessage } from '../../services/api';
import { LoadingState, EmptyState, ErrorState } from '../../components/redesign/States';
import { PrimaryButton, SecondaryButton } from '../../components/redesign/Buttons';
import { getUnifiedTokens } from '../../theme';

const CATEGORIAS: Record<string, string> = {
  GRATIS: '🎫',
  CONCIERTOS_MUSICA: '🎵',
  GASTRONOMIA: '🍽',
  CULTURA: '🎭',
  MUSEOS: '🏛',
  DEPORTES: '⚽',
  TEATRO: '🎭',
  TALLERES_CURSOS: '📚',
  FERIAS_EXPOSICIONES: '🎪',
  INFANTIL_FAMILIAR: '👨‍👩‍👧',
  VIDA_NOCTURNA: '🌙',
  OTROS: '💬',
};

export default function EventDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const tokens = getUnifiedTokens(false);
  const [evento, setEvento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .get(`/events/${slug}`)
      .then((r) => setEvento(r.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <LoadingState />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </Container>
    );
  }

  if (!evento) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <EmptyState message="No se encontró el evento." action={<SecondaryButton to="/eventos">Ver todos los eventos</SecondaryButton>} />
      </Container>
    );
  }

  const fecha = new Date(evento.startAt).toLocaleDateString('es-BO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const desde = evento.minTicketPrice ? `Desde Bs ${Number(evento.minTicketPrice).toFixed(2)}` : 'Gratis';

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack direction="row" spacing={1} mb={2} alignItems="center">
        <PrimaryButton size="small" onClick={() => navigate('/eventos')} startIcon={<ArrowBack />}>
          Volver a eventos
        </PrimaryButton>
      </Stack>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: tokens.cardShadow, mb: 3 }}>
        <Box
          sx={{
            height: 220,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 90,
            bgcolor: `${tokens.primary}14`,
          }}
        >
          {evento.coverImageUrl ? (
            <Box component="img" src={evento.coverImageUrl} alt={evento.title} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span>{CATEGORIAS[evento.category] ?? '🎟️'}</span>
          )}
        </Box>
        <Box sx={{ p: 3 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
            <Chip label={`${CATEGORIAS[evento.category] ?? '🎟️'} ${evento.category}`} size="small" sx={{ bgcolor: `${tokens.primary}14`, color: tokens.primary, fontWeight: 600 }} />
            <Chip label={evento.status} size="small" color={evento.status === 'PUBLISHED' ? 'success' : 'default'} />
          </Stack>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            {evento.title}
          </Typography>
          <Stack direction="row" spacing={1} mb={2}>
            <Chip icon={<CalendarMonth />} label={fecha} size="small" variant="outlined" />
            <Chip icon={<Place />} label={evento.city} size="small" variant="outlined" />
            <Chip icon={<Category />} label={desde} size="small" variant="outlined" />
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb: 3 }}>
            {evento.description}
          </Typography>
          {evento.isOnline && evento.onlineUrl && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              🖥 Evento en línea: <Link to={evento.onlineUrl}>{evento.onlineUrl}</Link>
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            Organiza: {evento.organization?.name ?? '—'} {evento.organization?.isVerified ? '✅ Verificada' : ''}
          </Typography>
        </Box>
      </Paper>

      <Typography variant="h6" fontWeight={700} gutterBottom>
        Entradas
      </Typography>
      {!evento.ticketTypes?.length ? (
        <EmptyState message="Aún no hay entradas configuradas para este evento." />
      ) : (
        <Stack spacing={2}>
          {evento.ticketTypes.map((tt: any) => (
            <Paper key={tt.id} sx={{ p: 2.5, borderRadius: 2, boxShadow: tokens.cardShadow, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography fontWeight={700}>{tt.name}</Typography>
                {tt.description && (
                  <Typography variant="body2" color="text.secondary">
                    {tt.description}
                  </Typography>
                )}
                {tt.benefits?.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {tt.benefits.join(' · ')}
                  </Typography>
                )}
              </Box>
              <Typography fontWeight={800} sx={{ color: tokens.primary }}>
                {tt.price === 0 ? 'Gratis' : `Bs ${Number(tt.price).toFixed(2)}`}
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <SecondaryButton disabled size="large">
          Reservar entradas (disponible pronto)
        </SecondaryButton>
      </Box>
    </Container>
  );
}