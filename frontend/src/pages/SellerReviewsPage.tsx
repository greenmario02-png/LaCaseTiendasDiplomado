import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Avatar,
  Chip,
  Button,
  Rating,
  Divider,
  Stack,
  TextField,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StorefrontIcon from '@mui/icons-material/Storefront';
import VerifiedIcon from '@mui/icons-material/Verified';
import { api, getErrorMessage } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import { LoadingState, EmptyState, ErrorState } from '../components/redesign/States';
import { REVIEW_TAG_PAIRS } from '../data/reviewTags';

interface SellerReview {
  id: number;
  rating: number;
  comment?: string | null;
  tags?: string[];
  createdAt: string;
  user: { id: number; firstName: string; lastName: string };
}

interface SellerInfo {
  id: number;
  storeName: string;
  storeCategory?: string;
  profileImage?: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
}

export default function SellerReviewsPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Formulario de reseña
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [tagSelections, setTagSelections] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Etiquetas votables (12 pares positivo/negativo)
  const [tagVotes, setTagVotes] = useState<Record<string, number>>({});
  const [myVotes, setMyVotes] = useState<string[]>([]);
  const [votingTag, setVotingTag] = useState('');

  const REVIEW_TAGS = ['Calidad', 'Precio', 'Atención', 'Envío', 'Confiable', 'Recomendado'];

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/sellers/${id}`).catch(() => ({ data: { data: null } })),
      api.get(`/sellers/${id}/reviews`).catch(() => ({ data: { data: { reviews: [], tagVotes: {} } } })),
    ])
      .then(async ([sRes, rRes]) => {
        const s: SellerInfo | null = sRes.data.data;
        if (s) {
          setSeller({
            ...s,
            rating: Number(s.rating ?? 0),
            reviewCount: Number(s.reviewCount ?? 0),
          });
        }
        const rData = rRes.data.data;
        setReviews(Array.isArray(rData) ? rData : (rData?.reviews ?? []));
        setTagVotes(rData?.tagVotes ?? {});
        // Etiquetas votadas por mí
        if (user) {
          try {
            const mine = await api.get(`/sellers/${id}/tag-votes/mine`);
            setMyVotes(mine.data.data?.tags ?? []);
          } catch {
            setMyVotes([]);
          }
        }
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleTagVote = async (tag: string) => {
    if (!id) return;
    if (!user) {
      toast.error('Inicia sesión para votar etiquetas');
      return;
    }
    setVotingTag(tag);
    try {
      const res = await api.post(`/sellers/${id}/tag-vote`, { tag });
      const { voted } = res.data.data;
      setMyVotes((prev) => (voted ? [...prev, tag] : prev.filter((t) => t !== tag)));
      setTagVotes((prev) => {
        const delta = voted ? 1 : -1;
        const next = { ...prev, [tag]: (prev[tag] ?? 0) + delta };
        if (next[tag] <= 0) delete next[tag];
        return next;
      });
      toast.success(voted ? `Votaste: ${tag}` : 'Voto retirado');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setVotingTag('');
    }
  };

  const toggleTag = (tag: string) => {
    setTagSelections((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 3)));
  };

  const submitReview = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await api.post(`/sellers/${id}/reviews`, { rating, comment, tags: tagSelections });
      toast.success('¡Gracias por tu valoración!');
      setFormOpen(false);
      setComment('');
      setTagSelections([]);
      setRating(5);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Button component={Link} to={`/vendedor/${id}`} startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Volver a la tienda
      </Button>

      {error && !seller && <ErrorState message={error} onRetry={load} />}

      {seller && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar src={seller.profileImage || undefined} sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
              <StorefrontIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {seller.storeName}
                {seller.isVerified && <VerifiedIcon sx={{ ml: 1, color: 'tertiary.main', verticalAlign: 'middle' }} />}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                <Rating value={seller.rating} readOnly size="small" precision={0.5} />
                <Typography variant="body2" color="text.secondary">
                  {seller.rating.toFixed(1)} · {seller.reviewCount} reseñas
                </Typography>
                {seller.storeCategory && <Chip label={seller.storeCategory} size="small" />}
              </Stack>
            </Box>
          </Stack>
        </Paper>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>
          Reseñas del vendedor ({reviews.length})
        </Typography>
        {user && !formOpen && (
          <Button variant="contained" onClick={() => setFormOpen(true)}>
            Escribir reseña
          </Button>
        )}
      </Box>

      {formOpen && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={1}>
            Tu valoración
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" mb={0.5}>
                Calificación
              </Typography>
              <Rating value={rating} onChange={(_e, v) => setRating(v ?? 5)} />
            </Box>
            <Box>
              <Typography variant="body2" mb={0.5}>
                Etiquetas (máx. 3)
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {REVIEW_TAGS.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    color={tagSelections.includes(tag) ? 'primary' : 'default'}
                    onClick={() => toggleTag(tag)}
                  />
                ))}
              </Stack>
            </Box>
            <TextField
              label="Comentario (opcional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button variant="contained" onClick={submitReview} disabled={saving || rating === 0}>
                {saving ? 'Guardando…' : 'Publicar reseña'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      {!user && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Inicia sesión para dejar tu reseña o votar etiquetas de esta tienda.
        </Alert>
      )}

      {/* Pares de etiquetas votables (positivo/negativo) */}
      {seller && (
        <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={1}>
            ¿Cómo fue tu experiencia con esta tienda?
          </Typography>
          <Stack spacing={1.5}>
            {REVIEW_TAG_PAIRS.map((pair) => {
              const posCount = tagVotes[pair.positive] ?? 0;
              const negCount = tagVotes[pair.negative] ?? 0;
              const posVoted = myVotes.includes(pair.positive);
              const negVoted = myVotes.includes(pair.negative);
              return (
                <Stack key={pair.positive} direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Chip
                    label={`${pair.positive} · ${posCount}`}
                    size="small"
                    color={posVoted ? 'success' : 'default'}
                    disabled={!!votingTag || posVoted}
                    onClick={() => toggleTagVote(pair.positive)}
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    label={`${pair.negative} · ${negCount}`}
                    size="small"
                    color={negVoted ? 'error' : 'default'}
                    disabled={!!votingTag || negVoted}
                    onClick={() => toggleTagVote(pair.negative)}
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
              );
            })}
          </Stack>
        </Paper>
      )}

      {reviews.length === 0 ? (
        <EmptyState message="Esta tienda todavía no tiene reseñas." />
      ) : (
        <Stack spacing={2}>
          {reviews.map((r) => (
            <Paper key={r.id} sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Avatar sx={{ width: 40, height: 40, bgcolor: 'secondary.main' }}>
                  {r.user.firstName?.[0]}
                  {r.user.lastName?.[0]}
                </Avatar>
                <Box flex={1}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="subtitle2" fontWeight={700}>
                      {r.user.firstName} {r.user.lastName}
                    </Typography>
                    <Rating value={r.rating} readOnly size="small" />
                  </Stack>
                  {r.tags && r.tags.length > 0 && (
                    <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap">
                      {r.tags.map((t) => (
                        <Chip key={t} label={t} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  )}
                  {r.comment && (
                    <Typography variant="body2" mt={1} sx={{ whiteSpace: 'pre-line' }}>
                      {r.comment}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                    {new Date(r.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
      <Divider sx={{ my: 3 }} />
    </Container>
  );
}
