import { useEffect, useState } from 'react';
import { Truck, Package, MapPin, Lock } from 'lucide-react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  Box,
  Paper,
  Avatar,
  Rating,
  Chip,
  Divider,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import VerifiedIcon from '@mui/icons-material/Verified';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ChatIcon from '@mui/icons-material/Chat';
import GroupIcon from '@mui/icons-material/Group';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StarIcon from '@mui/icons-material/Star';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { api, getErrorMessage } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { ProductCard } from '../components/redesign/ProductCard';
import { EmptyState } from '../components/redesign/States';
import { PrimaryButton, SecondaryButton } from '../components/redesign/Buttons';
import { ProductGridSkeleton } from '../components/ui/LoadingSkeleton';
import MiniMap from '../components/ui/MiniMap';
import toast from 'react-hot-toast';
import { REVIEW_TAG_PAIRS } from '../data/reviewTags';

interface SellerReview {
  id: number;
  rating: number;
  comment?: string | null;
  tags?: string[];
  createdAt: string;
  user: { firstName: string; lastName: string };
}

interface SellerData {
  id: number;
  storeName: string;
  storeDescription?: string;
  storeCategory?: string;
  profileImage?: string;
  bio?: string;
  country?: string;
  locationCity?: string;
  locationState?: string;
  latitude?: number | null;
  longitude?: number | null;
  locationVerified?: boolean;
  youtubeUrl?: string;
  tiktokUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  whatsappPhone?: string;
  rating: number;
  totalSales: number;
  reviewCount: number;
  productCount: number;
  activeCount: number;
  monthlySales: number;
  createdAt?: string;
  isVerified: boolean;
  freeShippingThreshold?: number | null;
  recentBuyers?: Array<{ id: number; total: number; updatedAt: string; buyer: { firstName: string; lastName: string } }>;
}

export default function SellerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [seller, setSeller] = useState<SellerData | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [privStatus, setPrivStatus] = useState<string | null>(null);
  const [privilegedProducts, setPrivilegedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'good' | 'neutral' | 'bad'>('all');

  // Etiquetas votables (12 pares positivo/negativo)
  const [tagVotes, setTagVotes] = useState<Record<string, number>>({});
  const [myVotes, setMyVotes] = useState<string[]>([]);
  const [votingTag, setVotingTag] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/sellers/${id}`).catch(() => ({ data: { data: null } })),
      api.get(`/sellers/${id}/products`).catch(() => ({ data: { data: [] } })),
      api.get(`/sellers/${id}/overview`).catch(() => ({ data: { data: { reviews: [] } } })),
      user ? api.get(`/sellers/${id}/privileged-status`).catch(() => ({ data: { data: { status: null } } })) : Promise.resolve({ data: { data: { status: null } } }),
      api.get(`/sellers/${id}/reviews`).catch(() => ({ data: { data: { reviews: [], tagVotes: {} } } })),
      user ? api.get(`/sellers/${id}/tag-votes/mine`).catch(() => ({ data: { data: { tags: [] } } })) : Promise.resolve({ data: { data: { tags: [] } } }),
    ])
      .then(([s, p, ov, ps, rv, mv]) => {
        setSeller(s.data.data);
        setProducts(p.data.data);
        setOverview(ov.data.data);
        setReviews(ov.data.data?.reviews ?? []);
        setPrivStatus(ps.data.data?.status ?? null);
        setTagVotes(rv.data.data?.tagVotes ?? {});
        setMyVotes(mv.data.data?.tags ?? []);
      })
      .finally(() => setLoading(false));
  }, [id, user]);

  const toggleTagVote = async (tag: string) => {
    if (!user) {
      navigate('/login');
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
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setVotingTag('');
    }
  };

  // Si el usuario es comprador privilegiado aprobado, traer productos con acceso anticipado
  useEffect(() => {
    if (user && privStatus === 'APPROVED') {
      api
        .get('/privileged-new-products')
        .then((r) => setPrivilegedProducts(r.data.data ?? []))
        .catch(() => setPrivilegedProducts([]));
    } else {
      setPrivilegedProducts([]);
    }
  }, [user, privStatus]);

  const requestPrivilege = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/sellers/${id}/privileged-request`);
      setPrivStatus(data.data.status);
      toast.success(data.data.message || 'Solicitud enviada');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  /** Veredicto comercial según el rating promedio (estilo marketplace). */
  const veredicto = (rating: number): { label: string; color: 'success' | 'info' | 'warning' } => {
    if (rating >= 4.5) return { label: 'Muy recomendado', color: 'success' };
    if (rating >= 3.5) return { label: 'Recomendado', color: 'info' };
    return { label: 'No recomendado', color: 'warning' };
  };

  if (loading) return <ProductGridSkeleton count={3} />;

  if (!seller) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5">Vendedor no encontrado</Typography>
      </Container>
    );
  }

  const memberSince = seller.createdAt ? new Date(seller.createdAt).toLocaleDateString('es-BO') : '';

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Typography component={Link} to="/" color="inherit" sx={{ textDecoration: 'none' }}>
          Inicio
        </Typography>
        <Typography color="text.primary">{seller.storeName}</Typography>
      </Breadcrumbs>

      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Box
          sx={{
            height: 160,
            bgcolor: 'primary.main',
            backgroundImage: (seller as any).storeBanner ? `url(${(seller as any).storeBanner})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <Box p={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar src={(seller as any).profileImage} sx={{ width: 80, height: 80, fontSize: 32, bgcolor: 'primary.main' }}>
              {seller.storeName?.[0]?.toUpperCase() ?? <StorefrontIcon />}
            </Avatar>
            <Box flex={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h5" fontWeight={700}>
                  {seller.storeName}
                </Typography>
                {seller.isVerified && <VerifiedIcon color="primary" />}
                {seller.totalSales > 0 && <Chip label={`${seller.totalSales} ventas`} size="small" variant="outlined" />}
              </Box>
              <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                <Rating value={Number(seller.rating)} readOnly precision={0.1} size="small" />
                <Typography variant="body2" color="text.secondary">
                  {seller.rating}
                </Typography>
                <LocationOnIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {seller.locationCity}, {seller.locationState}
                  {seller.country ? ` · ${seller.country}` : ''}
                </Typography>
              </Box>
              {/* Métricas de confianza */}
              <Stack direction="row" spacing={1.5} mt={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" icon={<StarIcon />} label={`${seller.reviewCount ?? 0} reseñas`} />
                <Chip size="small" icon={<GroupIcon />} label={`${seller.activeCount ?? 0} productos activos`} />
                {seller.monthlySales > 0 && <Chip size="small" label={`${seller.monthlySales} ventas este mes`} />}
                {seller.freeShippingThreshold && Number(seller.freeShippingThreshold) > 0 && (
                  <Chip size="small" color="success" label={`Envío gratis desde ${seller.freeShippingThreshold} Bs`} />
                )}
              </Stack>
            </Box>
            <Box display="flex" flexDirection="column" gap={1}>
              {user && user.id !== seller.id && (
                <>
                  <PrimaryButton
                    startIcon={<ChatIcon />}
                    onClick={async () => {
                      try {
                        const { data } = await api.post('/chat', { sellerId: seller.id });
                        navigate(`/mensajes/${data.data.id}`);
                      } catch (err: any) {
                        toast.error(getErrorMessage(err));
                      }
                    }}
                  >
                    Contactar
                  </PrimaryButton>
                  {privStatus === 'APPROVED' ? (
                    <PrimaryButton
                      color="warning"
                      startIcon={<WorkspacePremiumIcon />}
                      onClick={requestPrivilege}
                    >
                      ✓ Comprador privilegiado
                    </PrimaryButton>
                  ) : (
                    <SecondaryButton
                      startIcon={<WorkspacePremiumIcon />}
                      disabled={privStatus === 'PENDING'}
                      onClick={requestPrivilege}
                    >
                      {privStatus === 'PENDING' ? 'Solicitud pendiente' : 'Solicitar acceso privilegiado'}
                    </SecondaryButton>
                  )}
                </>
              )}
            </Box>
          </Box>
          {seller.storeDescription && (
            <Typography variant="body2" color="text.secondary" mt={2}>
              {seller.storeDescription}
            </Typography>
          )}
          {(seller as any).bio && (
            <Typography variant="body2" mt={1}>
              {(seller as any).bio}
            </Typography>
          )}
          {seller.storeCategory && (
            <Chip label={seller.storeCategory} size="small" variant="outlined" sx={{ mt: 1 }} />
          )}

          {/* Redes sociales y WhatsApp (solo si la tienda los especificó) */}
          {(seller.instagramUrl || seller.facebookUrl || seller.tiktokUrl || seller.youtubeUrl || seller.whatsappPhone) && (
            <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
              {seller.whatsappPhone && (
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<WhatsAppIcon />}
                  href={`https://wa.me/${seller.whatsappPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${seller.storeName}, vi tu tienda en LaCase Multi Tiendas y quiero hacer una consulta.`)}`}
                  target="_blank"
                  rel="noopener"
                >
                  WhatsApp
                </Button>
              )}
              {seller.instagramUrl && (
                <IconButton href={seller.instagramUrl} target="_blank" rel="noopener" color="secondary" aria-label="Instagram">
                  <InstagramIcon />
                </IconButton>
              )}
              {seller.facebookUrl && (
                <IconButton href={seller.facebookUrl} target="_blank" rel="noopener" color="primary" aria-label="Facebook">
                  <FacebookIcon />
                </IconButton>
              )}
              {seller.tiktokUrl && (
                <IconButton href={seller.tiktokUrl} target="_blank" rel="noopener" aria-label="TikTok">
                  <MusicNoteIcon />
                </IconButton>
              )}
              {seller.youtubeUrl && (
                <IconButton href={seller.youtubeUrl} target="_blank" rel="noopener" color="error" aria-label="YouTube">
                  <YouTubeIcon />
                </IconButton>
              )}
            </Stack>
          )}
        </Box>
      </Paper>

      {/* Mapa de la tienda */}
      <Box mt={3}>
        <Typography variant="h6" fontWeight={700} mb={1}>
          Ubicación de la tienda
        </Typography>
        {seller.latitude != null && seller.longitude != null ? (
          <>
            <MiniMap lat={Number(seller.latitude)} lng={Number(seller.longitude)} storeName={seller.storeName} locationVerified={seller.locationVerified} />
            {seller.locationVerified && (
              <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1 }}>
                Ubicación verificada por el administrador (tienda física comprobada)
              </Typography>
            )}
          </>
        ) : (
          <Typography color="text.disabled">Ubicación no especificada</Typography>
        )}
      </Box>

      {/* Acceso anticipado para compradores privilegiados */}
      {privilegedProducts.length > 0 && (
        <Box mb={4}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <WorkspacePremiumIcon color="secondary" />
            <Typography variant="h6" fontWeight={700}>
              Productos nuevos — solo para compradores privilegiados 🔑
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Estos productos aún no se publican al público general. Sos de los primeros en verlos.
          </Typography>
          <Grid container spacing={2}>
            {privilegedProducts.map((p) => (
              <Grid item xs={6} sm={4} md={3} lg={2.4} key={p.id}>
                <ProductCard
                  product={{
                    id: p.id,
                    name: p.name,
                    price: Number(p.price),
                    salePrice: p.salePrice ? Number(p.salePrice) : undefined,
                    stock: p.stock,
                    storeName: p.seller?.storeName,
                    rating: p.rating,
                    image: p.images?.[0]?.url,
                  }}
                  onClick={() => navigate(`/producto/${p.id}/${p.slug ?? ''}`)}
                />
              </Grid>
            ))}
          </Grid>
          <Divider sx={{ my: 4 }} />
        </Box>
      )}

      <Typography variant="h6" fontWeight={700} mb={2}>
        Productos de {seller.storeName}
      </Typography>
      {products.length === 0 ? (
        <EmptyState message="Esta tienda aún no publica productos." />
      ) : (
        <Grid container spacing={2} mb={4}>
          {products.map((p) => (
            <Grid item xs={6} sm={4} md={3} lg={2.4} key={p.id}>
              <ProductCard
                product={{
                  id: p.id,
                  name: p.name,
                  price: Number(p.price),
                  salePrice: p.salePrice ? Number(p.salePrice) : undefined,
                  stock: p.stock,
                  storeName: p.seller?.storeName,
                  rating: p.rating,
                  image: p.images?.[0]?.url,
                }}
                onClick={() => navigate(`/producto/${p.id}/${p.slug ?? ''}`)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Referencias: quiénes compraron */}
      {seller.recentBuyers && seller.recentBuyers.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" fontWeight={700} mb={2}>
            Referencias — compras recientes
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            La calificación post-compra es obligatoria: estas personas recibieron su compra y calificaron a esta tienda.
          </Typography>
          <Grid container spacing={2} mb={2}>
            {seller.recentBuyers.slice(0, 8).map((b) => (
              <Grid item xs={12} sm={6} md={3} key={b.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.main' }}>{b.buyer.firstName[0]}</Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {b.buyer.firstName} {b.buyer.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Compró · {new Date(b.updatedAt).toLocaleDateString('es-BO')}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* ===== Reseñas y confianza (comercial) ===== */}
      <Divider sx={{ my: 3 }} />
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>
          Reseñas y confianza
        </Typography>
        {reviews.length > 0 && (
          <Button size="small" variant="outlined" component={Link} to={`/vendedor/${id}/resenas`}>
            Ver todas las reseñas
          </Button>
        )}
      </Box>

      {reviews.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Aún no hay reseñas. Las reseñas solo aparecen después de una compra entregada — generan confianza en la comunidad.
          </Typography>
        </Paper>
      ) : (
        <>
          <Grid container spacing={2} mb={2}>
            {/* Resumen de calificación */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box textAlign="center">
                    <Typography variant="h2" fontWeight={800} lineHeight={1}>
                      {overview?.summary?.avg != null ? Number(overview.summary.avg).toFixed(1) : '—'}
                    </Typography>
                    <Rating
                      value={overview?.summary?.avg ?? 0}
                      readOnly
                      precision={0.1}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                    <Box mt={1}>
                      <Chip
                        label={veredicto(overview?.summary?.avg ?? 0).label}
                        color={veredicto(overview?.summary?.avg ?? 0).color}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      {overview?.summary?.total ?? 0} persona(s) calificaron
                    </Typography>
                  </Box>
                  {/* Distribución */}
                  <Box mt={2}>
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = overview?.dist?.[String(star)] ?? 0;
                      const total = overview?.summary?.total ?? 0;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <Box key={star} display="flex" alignItems="center" gap={1}>
                          <Typography variant="caption" sx={{ width: 24 }}>{star}★</Typography>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ width: 28, textAlign: 'right' }}>
                            {pct}%
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Ventas y últimas ventas */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700}>Ventas</Typography>
                  <Box display="flex" justifyContent="space-between" mt={1}>
                    <Typography variant="body2" color="text.secondary">Ventas totales</Typography>
                    <Typography variant="body2" fontWeight={700}>{overview?.storeStats?.totalOrders ?? 0}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mt={0.5}>
                    <Typography variant="body2" color="text.secondary">Ventas del mes</Typography>
                    <Typography variant="body2" fontWeight={700}>{overview?.storeStats?.monthOrders ?? 0}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mt={0.5}>
                    <Typography variant="body2" color="text.secondary">Ingresos del mes</Typography>
                    <Typography variant="body2" fontWeight={700}>Bs {Number(overview?.storeStats?.monthSales ?? 0).toLocaleString('es-BO')}</Typography>
                  </Box>
                  <Typography variant="subtitle2" fontWeight={700} mt={2}>Últimas ventas</Typography>
                  {(overview?.storeStats?.lastOrders ?? []).length === 0 ? (
                    <Typography variant="caption" color="text.secondary">Sin ventas todavía</Typography>
                  ) : (
                    (overview?.storeStats?.lastOrders ?? []).slice(0, 5).map((o: any) => (
                      <Box key={o.id} display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                        <Typography variant="caption" noWrap sx={{ maxWidth: '60%' }}>{o.productName}</Typography>
                        <Typography variant="caption" fontWeight={700}>Bs {Number(o.total).toLocaleString('es-BO')}</Typography>
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Etiquetas estilo Couchsurfing */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700}>¿Cómo es tratar con este vendedor?</Typography>
                  {(overview?.topTags ?? []).length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      Aún no hay etiquetas. Aparecerán cuando los compradores califiquen su experiencia.
                    </Typography>
                  ) : (
                    <Box mt={1} display="flex" flexWrap="wrap" gap={0.5}>
                      {(overview?.topTags ?? []).map((t: any) => (
                        <Chip key={t.name} label={`${t.name} (${t.count})`} size="small" variant="outlined" />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Etiquetas votables (12 pares positivo/negativo) */}
          <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              ¿Cómo fue tu experiencia con esta tienda?
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Votá cada par según tu experiencia. El conteo muestra cuántas personas eligieron cada etiqueta.
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {REVIEW_TAG_PAIRS.map((pair) => {
                const posCount = tagVotes[pair.positive] ?? 0;
                const negCount = tagVotes[pair.negative] ?? 0;
                const posVoted = myVotes.includes(pair.positive);
                const negVoted = myVotes.includes(pair.negative);
                return (
                  <Box key={pair.positive} display="flex" alignItems="center" gap={0.5}>
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
                  </Box>
                );
              })}
            </Box>
          </Paper>

          {/* Reseñas destacadas (últimas 3) */}
          {reviews.slice(0, 3).map((r) => (
            <Paper key={r.id} sx={{ p: 2, mb: 2 }}>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Rating value={r.rating} readOnly size="small" />
                <Chip label={veredicto(r.rating).label} color={veredicto(r.rating).color} size="small" variant="outlined" />
                <Typography variant="caption" color="text.secondary">
                  por {r.user.firstName} {r.user.lastName}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  · {new Date(r.createdAt).toLocaleDateString('es-BO')}
                </Typography>
              </Box>
              {r.tags && r.tags.length > 0 && (
                <Box mt={0.5} display="flex" flexWrap="wrap" gap={0.5}>
                  {r.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" color="info" />
                  ))}
                </Box>
              )}
              {r.comment && <Typography variant="body2" mt={0.5}>{r.comment}</Typography>}
            </Paper>
          ))}
        </>
      )}

      {/* Modal de todas las reseñas */}
      <Dialog open={reviewsOpen} onClose={() => setReviewsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Reseñas del vendedor ({reviews.length})</DialogTitle>
        <DialogContent dividers>
          <Tabs
            value={reviewFilter}
            onChange={(_e, v) => setReviewFilter(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2 }}
          >
            <Tab label="Todas" value="all" />
            <Tab label="Muy recomendado" value="good" />
            <Tab label="Recomendado" value="neutral" />
            <Tab label="No recomendado" value="bad" />
          </Tabs>
          {reviews
            .filter((r) => {
              if (reviewFilter === 'good') return r.rating >= 4.5;
              if (reviewFilter === 'neutral') return r.rating >= 3.5 && r.rating < 4.5;
              if (reviewFilter === 'bad') return r.rating < 3.5;
              return true;
            })
            .map((r) => (
              <Paper key={r.id} sx={{ p: 2, mb: 1.5 }}>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <Rating value={r.rating} readOnly size="small" />
                  <Chip label={veredicto(r.rating).label} color={veredicto(r.rating).color} size="small" variant="outlined" />
                  <Typography variant="caption" color="text.secondary">
                    por {r.user.firstName} {r.user.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    · {new Date(r.createdAt).toLocaleDateString('es-BO')}
                  </Typography>
                </Box>
                {r.tags && r.tags.length > 0 && (
                  <Box mt={0.5} display="flex" flexWrap="wrap" gap={0.5}>
                    {r.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" color="info" />
                    ))}
                  </Box>
                )}
                {r.comment && <Typography variant="body2" mt={0.5}>{r.comment}</Typography>}
              </Paper>
            ))}
          {reviews.filter((r) => {
            if (reviewFilter === 'good') return r.rating >= 4.5;
            if (reviewFilter === 'neutral') return r.rating >= 3.5 && r.rating < 4.5;
            if (reviewFilter === 'bad') return r.rating < 3.5;
            return true;
          }).length === 0 && (
            <Typography color="text.secondary" textAlign="center" py={3}>
              No hay reseñas en esta categoría.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewsOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
