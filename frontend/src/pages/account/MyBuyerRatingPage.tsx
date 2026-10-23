import { useCallback, useEffect, useState } from 'react';
import { Avatar, Box, Chip, Rating, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage, resolveImageUrl } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/redesign/States';

interface BuyerReviewRow {
  id: number;
  orderId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  seller: { id: number; storeName: string; storeLogo?: string | null };
}

interface BuyerReviewsResponse {
  reviews: BuyerReviewRow[];
  avgRating: number;
  totalReviews: number;
}

/** "Cómo me ven como comprador": calificaciones que los vendedores dejaron sobre el usuario tras sus compras (GET /api/users/:id/buyer-reviews). */
export default function MyBuyerRatingPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<BuyerReviewsResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    setError('');
    api
      .get(`/users/${user.id}/buyer-reviews`)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          {t('myBuyerRating.loginRequired', { defaultValue: 'Inicia sesión para ver tu calificación como comprador.' })}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={t('myBuyerRating.title', { defaultValue: 'Cómo me ven como comprador' })}
        subtitle={t('myBuyerRating.subtitle', {
          defaultValue: 'Calificación promedio y reseñas que te dejaron los vendedores tras tus compras',
        })}
        icon={<StarBorderIcon />}
      />

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && data && (
        <>
          <SurfaceCard sx={{ p: 2.5, mb: 2 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {data.totalReviews > 0 ? data.avgRating.toFixed(1) : '—'}
              </Typography>
              <Box>
                <Rating value={data.avgRating} precision={0.1} readOnly />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('myBuyerRating.totalLabel', { defaultValue: '{{count}} calificaciones', count: data.totalReviews })}
                </Typography>
              </Box>
            </Stack>
          </SurfaceCard>

          <SurfaceCard sx={{ p: 0, overflow: 'hidden' }}>
            {data.reviews.length === 0 ? (
              <EmptyState message={t('myBuyerRating.empty', { defaultValue: 'Todavía ningún vendedor te calificó.' })} />
            ) : (
              <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
                {data.reviews.map((r) => (
                  <Box key={r.id} sx={{ p: 2, display: 'flex', gap: 1.5 }}>
                    <Avatar
                      component={RouterLink}
                      to={`/vendedor/${r.seller.id}`}
                      src={r.seller.storeLogo ? resolveImageUrl(r.seller.storeLogo) : undefined}
                      sx={{ width: 40, height: 40 }}
                    >
                      {r.seller.storeName?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography
                          component={RouterLink}
                          to={`/vendedor/${r.seller.id}`}
                          sx={{ fontWeight: 700, color: 'inherit', textDecoration: 'none' }}
                        >
                          {r.seller.storeName}
                        </Typography>
                        <Chip size="small" variant="outlined" label={`#${r.orderId}`} />
                      </Stack>
                      <Rating value={r.rating} readOnly size="small" />
                      {r.comment && (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {r.comment}
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                        {new Date(r.createdAt).toLocaleDateString('es-BO')}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </SurfaceCard>
        </>
      )}
    </Box>
  );
}
