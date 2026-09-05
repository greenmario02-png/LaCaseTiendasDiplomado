import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Chip, Paper, Stack } from '@mui/material';
import { Add } from '@mui/icons-material';
import { api, getErrorMessage } from '../../services/api';
import { LoadingState, EmptyState, ErrorState } from '../../components/redesign/States';
import { PrimaryButton } from '../../components/redesign/Buttons';
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

export default function EventsListPage() {
  const navigate = useNavigate();
  const tokens = getUnifiedTokens(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get('/organizations/me/events', { params: { limit: 100 } })
      .then((r) => setEvents(Array.isArray(r.data.data) ? r.data.data : []))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Mis eventos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Crea, edita y administra tus eventos y ventas de entradas.
          </Typography>
        </Box>
        <PrimaryButton startIcon={<Add />} onClick={() => navigate('/organizador/eventos/nuevo')}>
          Crear evento
        </PrimaryButton>
      </Stack>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : events.length === 0 ? (
        <EmptyState message="Todavía no tenés eventos. ¡Creá el primero!" />
      ) : (
        <Stack spacing={2}>
          {events.map((ev) => (
            <Paper key={ev.id} sx={{ p: 2, borderRadius: 2, boxShadow: tokens.cardShadow, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                <Box sx={{ fontSize: 36 }}>{CATEGORIAS[ev.category] ?? '🎟️'}</Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700} noWrap>
                    {ev.title}
                  </Typography>
                  <Stack direction="row" spacing={1} mt={0.5}>
                    <Chip label={ev.status} size="small" color={ev.status === 'PUBLISHED' ? 'success' : ev.status === 'DRAFT' ? 'default' : 'warning'} />
                    <Chip label={ev.city} size="small" variant="outlined" />
                  </Stack>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {new Date(ev.startAt).toLocaleDateString('es-BO')}
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 4 }}>
        Nota: el módulo de eventos está en desarrollo — los datos se completarán con el backend de eventos (Fases 1-5 del plan).
      </Typography>
    </Box>
  );
}