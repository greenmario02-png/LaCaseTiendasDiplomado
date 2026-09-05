import { useEffect, useState } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { listCategories, getCitiesStats } from '../../services/forum.api';
import { useForumStore } from '../../stores/forumStore';
import { MapPin } from 'lucide-react';
import { LoadingState, EmptyState } from '../../components/redesign/States';
import { FilterBar } from '../../components/redesign/FilterBar';
import { getUnifiedTokens } from '../../theme';

export function ForumCategoriesPage() {
  const navigate = useNavigate();
  const { setCategory, setMode } = useForumStore();
  const [categories, setCategories] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const tokens = getUnifiedTokens(false);

  useEffect(() => {
    Promise.all([listCategories(), getCitiesStats()])
      .then(([cats, cits]) => {
        setCategories(cats);
        setCities(cits);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Box sx={{ py: 6 }}><LoadingState /></Box>;
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={800} sx={{ color: tokens.onSurface, mb: 2 }}>
        📂 Subforos
      </Typography>
      {categories.filter((c) => c.isActive).length === 0 ? (
        <EmptyState message="No hay subforos todavía." />
      ) : (
        <Grid container spacing={1.5}>
          {categories.filter((c) => c.isActive).map((c) => (
            <Grid key={c.id} item xs={6} sm={4} md={3}>
              <Box
                onClick={() => { setCategory(c.slug); navigate('/foro'); }}
                sx={{
                  bgcolor: tokens.surfaceContainerLowest,
                  border: `1px solid ${tokens.outline}22`,
                  borderRadius: '12px',
                  boxShadow: tokens.cardShadow,
                  p: 1.5,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: tokens.primary },
                }}
              >
                <Typography sx={{ fontSize: '1.8rem' }}>{c.icon}</Typography>
                <Typography sx={{ color: tokens.onSurface, fontWeight: 600, fontSize: '0.85rem' }}>{c.name}</Typography>
                <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: '0.7rem' }}>{c._count?.posts ?? 0} posts</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      <Typography variant="h6" fontWeight={800} sx={{ color: tokens.onSurface, my: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <MapPin size={20} strokeWidth={2.4} color={tokens.primary} /> Ciudades
      </Typography>
      {cities.length === 0 ? (
        <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: '0.85rem' }}>Aún no hay preguntas por ciudad.</Typography>
      ) : (
        <FilterBar
          options={cities.map((c) => ({ key: c.city, label: `${c.city} (${c._count.posts ?? c.posts})` }))}
          active=""
          onChange={(city) => { setCity(city); navigate('/foro'); }}
        />
      )}
    </Box>
  );
}

function setCity(city: string) {
  useForumStore.getState().setCity(city);
}
