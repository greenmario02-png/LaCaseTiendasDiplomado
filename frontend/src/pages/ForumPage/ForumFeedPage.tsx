import { useEffect, useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Home, X } from 'lucide-react';
import { useForumStore } from '../../stores/forumStore';
import { listCities } from '../../services/forum.api';
import NewPostModal from '../../components/forum/NewPostModal';
import { ForumPostCard } from '../../components/redesign/ForumPostCard';
import { FilterBar } from '../../components/redesign/FilterBar';
import { PrimaryButton, SecondaryButton } from '../../components/redesign/Buttons';
import { LoadingState, EmptyState } from '../../components/redesign/States';
import { forumPalette } from '../../theme/forumTheme';

const MODES = [
  { key: 'RECIENTE', label: 'Reciente' },
  { key: 'POPULAR', label: 'Popular' },
  { key: 'SIN_RESPUESTA', label: 'Sin respuesta' },
  { key: 'MI_CIUDAD', label: 'Mi ciudad' },
];

export function ForumFeedPage() {
  const { posts, loading, activeMode, activeCategory, geo, fetchPosts, loadMorePosts, setMode, setCategory, votePost } =
    useForumStore();
  const [openNew, setOpenNew] = useState(false);
  const [cityCategories, setCityCategories] = useState<{ category: { id: number; name: string; slug: string } }[]>([]);

  useEffect(() => {
    fetchPosts({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar los subforos (categorías) de la ciudad activa para mostrarlos como etiquetas.
  useEffect(() => {
    if (!geo?.cityId) {
      setCityCategories([]);
      return;
    }
    listCities()
      .then((cities) => {
        const city = cities.find((c) => c.id === geo.cityId);
        setCityCategories(
          (city?.categories ?? []).filter(
            (cc): cc is { categoryId: number; category: { id: number; name: string; slug: string } } => Boolean(cc.category)
          )
        );
      })
      .catch(() => setCityCategories([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo?.cityId, geo?.city]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" fontWeight={800} sx={{ color: forumPalette.textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Home size={22} strokeWidth={2.4} color={forumPalette.accent} />
          LaCASE — ¿alguien sabe?
        </Typography>
        <PrimaryButton startIcon={<AddIcon />} onClick={() => setOpenNew(true)}>
          Hacer una pregunta
        </PrimaryButton>
      </Box>

      {/* Filtro de modo */}
      <FilterBar options={MODES} active={activeMode} onChange={(v) => setMode(v)} />

      {/* Subforos (etiquetas) de la ciudad activa */}
      {geo?.city && cityCategories.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ color: forumPalette.textMuted, fontWeight: 700 }}>
              Subforos de {geo.city}:
            </Typography>
            {cityCategories.map(({ category }) => {
              const active = activeCategory === category.slug;
              return (
                <Chip
                  key={category.id}
                  size="small"
                  label={category.name}
                  clickable
                  onClick={() => setCategory(active ? '' : category.slug)}
                  sx={{
                    bgcolor: active ? forumPalette.accent : forumPalette.bgCard,
                    color: active ? '#fff' : forumPalette.textSecondary,
                    fontWeight: 600,
                    '&:hover': { bgcolor: active ? forumPalette.accentHover : forumPalette.bgInput },
                  }}
                />
              );
            })}
            {activeCategory && (
              <Chip
                size="small"
                icon={<X size={13} strokeWidth={2.4} />}
                label="Ver todo"
                clickable
                onClick={() => setCategory('')}
                sx={{ color: forumPalette.accent, fontWeight: 600 }}
              />
            )}
          </Box>
        </Box>
      )}

      {/* Feed */}
      {loading && posts.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <LoadingState />
        </Box>
      ) : posts.length === 0 ? (
        <EmptyState message="No hay preguntas aún. ¡Sé el primero en preguntar!" />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {posts.map((post) => (
            <ForumPostCard
              key={post.id}
              post={{
                id: post.id,
                title: post.title,
                body: post.body,
                city: post.city,
                category: {
                  icon: post.category?.icon ?? '💬',
                  name: post.category?.name ?? 'General',
                  color: post.category?.color ?? '#FF6B35',
                },
                author: { forumUsername: post.author?.forumUsername ?? 'usuario' },
                status: (post.status as 'OPEN' | 'RESOLVED' | 'CLOSED') ?? 'OPEN',
                replyCount: post.replyCount,
                positives: post.score ?? 0,
                createdAt: post.createdAt,
              }}
              onOpen={(id) => {
                window.location.href = `/foro/post/${id}`;
              }}
              onPositive={(id) => {
                void votePost(id, 1);
              }}
            />
          ))}
        </Box>
      )}

      {/* Cargar más */}
      {posts.length > 0 && (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <SecondaryButton onClick={loadMorePosts} disabled={loading}>
            {loading ? 'Cargando...' : 'Cargar más'}
          </SecondaryButton>
        </Box>
      )}

      <NewPostModal open={openNew} onClose={() => setOpenNew(false)} />
    </Box>
  );
}
