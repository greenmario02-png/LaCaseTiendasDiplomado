import { useEffect, useState } from 'react';
import { Truck, ShieldCheck } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import {
  Container,
  Grid,
  Box,
  Typography,
  Chip,
  Button,
  Divider,
  Paper,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Breadcrumbs,
  Rating,
  Avatar,
  Alert,
  Snackbar,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import ImageIcon from '@mui/icons-material/Image';
import StorefrontIcon from '@mui/icons-material/Storefront';
import VerifiedIcon from '@mui/icons-material/Verified';
import ChatIcon from '@mui/icons-material/Chat';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useMoney } from '../hooks/useMoney';
import { getErrorMessage } from '../services/api';
import { PriceDisplay } from '../components/redesign/PriceDisplay';
import { ProductCard } from '../components/redesign/ProductCard';
import { PrimaryButton, SecondaryButton } from '../components/redesign/Buttons';
import { ProductGridSkeleton } from '../components/ui/LoadingSkeleton';

export default function ProductDetailPage() {
  const { id } = useParams();
  const money = useMoney();
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const user = useAuthStore((s) => s.user);

  const [product, setProduct] = useState<any>(null);
  const [offers, setOffers] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainImage, setMainImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reloadReviews, setReloadReviews] = useState(0);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'good' | 'neutral' | 'bad'>('all');

  useEffect(() => {
    setLoading(true);
    api
      .get(`/products/${id}`)
      .then((res) => {
        setProduct(res.data.data);
        const first = res.data.data.images?.find((i: any) => i.isPrimary)?.url || res.data.data.images?.[0]?.url;
        setMainImage(first || '');
        // Registrar vista para recomendaciones
        api.post(`/tracking/products/${id}/view`).catch(() => {});
        // Ofertas del mismo producto de otros vendedores (comparación de precios)
        api
          .get(`/products/${id}/offers`)
          .then((o) => setOffers(o.data.data))
          .catch(() => {});
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!product) return;
    api
      .get(`/products/${product.id}/related`)
      .then((res) => setRelated(res.data.data))
      .catch(() => {});
    api
      .get(`/products/${product.id}/reviews`)
      .then((res) => setReviews(res.data.data))
      .catch(() => {});
  }, [product, reloadReviews]);

  if (loading) return <ProductGridSkeleton count={3} />;

  if (!product) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5">Producto no encontrado</Typography>
        <Button component={Link} to="/productos" sx={{ mt: 2 }}>
          Volver al catálogo
        </Button>
      </Container>
    );
  }

  const slug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const handleAddToCart = async () => {
    try {
      await addItem(product.id, quantity);
      setToast({ type: 'success', msg: 'Agregado al carrito' });
    } catch (err) {
      setToast({ type: 'error', msg: getErrorMessage(err) });
    }
  };

  const startChat = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post('/chat', { sellerId: product.seller.id, productId: product.id });
      navigate(`/mensajes/${data.data.id}`);
    } catch (err) {
      setToast({ type: 'error', msg: getErrorMessage(err) });
    }
  };

  const submitReview = async () => {
    try {
      await api.post(`/products/${product.id}/reviews`, { rating: reviewRating, comment: reviewText });
      setReviewText('');
      setReloadReviews((n) => n + 1);
      setToast({ type: 'success', msg: 'Reseña publicada' });
    } catch (err) {
      setToast({ type: 'error', msg: getErrorMessage(err) });
    }
  };

  const attributes = product.attributes || [];
  const images = product.images || [];
  const outOfStock = product.stock <= 0;

  /** Resumen de reseñas client-side + veredicto comercial. */
  const avgRating = reviews.length ? reviews.reduce((a: number, r: any) => a + r.rating, 0) / reviews.length : 0;
  const veredicto = (rating: number): { label: string; color: 'success' | 'info' | 'warning' } => {
    if (rating >= 4.5) return { label: 'Muy recomendado', color: 'success' };
    if (rating >= 3.5) return { label: 'Recomendado', color: 'info' };
    return { label: 'No recomendado', color: 'warning' };
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Typography component={Link} to="/" color="inherit" sx={{ textDecoration: 'none' }}>
          Inicio
        </Typography>
        <Typography component={Link} to={`/categoria/${product.category.slug}`} color="inherit" sx={{ textDecoration: 'none' }}>
          {product.category.name}
        </Typography>
        <Typography color="text.primary">{product.name}</Typography>
      </Breadcrumbs>

      <Grid container spacing={3}>
        {/* Galería */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 1 }}>
            <Box className="image-container" sx={{ aspectRatio: '1/1', borderRadius: 2 }}>
              {mainImage ? (
                <img src={mainImage} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Typography color="text.disabled">Sin imagen</Typography>
              )}
            </Box>
            {images.length > 1 && (
              <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                {images.map((img: any) => (
                  <Box
                    key={img.id}
                    className="image-container"
                    onClick={() => setMainImage(img.url)}
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: mainImage === img.url ? 2 : 1,
                      borderColor: mainImage === img.url ? 'primary.main' : 'divider',
                    }}
                  >
                    <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Info */}
        <Grid item xs={12} md={6}>
          <Typography variant="h5" fontWeight={700}>
            {product.name}
          </Typography>
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            {product.condition === 'NEW' && <Chip label="Nuevo" size="small" color="success" />}
            {product.condition === 'USED' && <Chip label={`Usado (${product.conditionScore}/10)`} size="small" color="warning" />}
            {product.condition === 'REFURBISHED' && <Chip label="Reacondicionado" size="small" color="info" />}
            {product.stock > 0 && product.stock <= 5 && <Chip label={`Últimas ${product.stock}`} size="small" color="warning" />}
            {product.stock === 1 && <Chip label="Última unidad" size="small" color="error" />}
            {outOfStock && <Chip label="Sin stock" size="small" color="error" />}
          </Box>

          {/* Prueba social: personas viendo + vistas totales */}
          {(product.viewingNow > 0 || product.viewCount > 0) && (
            <Box display="flex" flexDirection="column" gap={0.5} my={1.5}>
              {product.viewingNow > 0 && (
                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#4caf50', animation: 'pulse 1.5s infinite' }} />
                  {product.viewingNow} {product.viewingNow === 1 ? 'persona está viendo' : 'personas están viendo'} este producto ahora
                </Typography>
              )}
              {product.viewCount > 0 && (
                <Typography variant="caption" color="text.secondary">
                  Visto por {product.viewCount} {product.viewCount === 1 ? 'persona' : 'personas'}
                </Typography>
              )}
            </Box>
          )}

          <Box my={2}>
            <PriceDisplay
              price={Number(product.originalPrice ?? product.price)}
              salePrice={product.originalPrice ? Number(product.price) : undefined}
              priceUsd={product.priceUsd ? Number(product.priceUsd) : undefined}
            />
          </Box>

          {/* Vendedor */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Avatar>
                <StorefrontIcon />
              </Avatar>
              <Box flex={1}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Typography component={Link} to={`/vendedor/${product.seller.id}`} variant="subtitle1" fontWeight={700} sx={{ textDecoration: 'none', color: 'inherit' }}>
                    {product.seller.storeName}
                  </Typography>
                  {product.seller.isVerified && <VerifiedIcon color="primary" fontSize="small" />}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {product.seller.locationCity}, {product.seller.locationState} · Rating {product.seller.rating}
                </Typography>
                {(product.seller as any).freeShippingThreshold != null && Number((product.seller as any).freeShippingThreshold) > 0 && (
                  <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                    Envío gratis en compras mayores a {money(Number((product.seller as any).freeShippingThreshold))}
                  </Typography>
                )}
              </Box>
              <Rating value={Number(product.seller.rating)} readOnly precision={0.1} size="small" />
            </Box>
          </Paper>

          {product.warrantyInfo && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              {product.warrantyInfo}
            </Typography>
          )}

          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <TextField
              type="number"
              size="small"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              inputProps={{ min: 1, max: product.stock || 1 }}
              sx={{ width: 80 }}
            />
            <Box sx={{ flex: 1 }}>
              <PrimaryButton onClick={handleAddToCart} disabled={outOfStock} startIcon={<AddShoppingCartIcon />} fullWidth>
                {outOfStock ? 'Sin stock' : 'Agregar al carrito'}
              </PrimaryButton>
            </Box>
            <SecondaryButton onClick={startChat} startIcon={<ChatIcon />}>
              Consultar
            </SecondaryButton>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Vendido y despachado por {product.seller.storeName}. El costo de envío se calcula en el checkout según tu ubicación.
          </Typography>
        </Grid>
      </Grid>

      {/* Ofertas del mismo producto en otras tiendas */}
      {offers && offers.count > 1 && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" fontWeight={700} mb={1}>
            Compará precios — {offers.count} tiendas venden este producto
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            El mejor precio es {money(offers.bestPrice)}. Elegí la tienda que más te convenga.
          </Typography>
          <Box>
            {offers.offers.map((o: any) => {
              const isCurrent = o.id === product.id;
              const isBest = Number(o.price) === Number(offers.bestPrice);
              return (
                <Box
                  key={o.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    mb: 1,
                    borderRadius: 1,
                    border: isCurrent ? '2px solid' : '1px solid',
                    borderColor: isCurrent ? 'primary.main' : 'divider',
                    bgcolor: isCurrent ? 'action.hover' : 'transparent',
                  }}
                >
                  <Box sx={{ width: 48, height: 48, borderRadius: 1, overflow: 'hidden', flexShrink: 0 }}>
                    {o.images?.[0]?.url ? (
                      <img src={o.images[0].url} alt={o.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: '#eee', fontSize: 20 }}><ImageIcon sx={{ fontSize: 28, color: '#999' }} /></Box>
                    )}
                  </Box>
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography variant="body2" fontWeight={600}>
                        {o.seller.storeName}
                      </Typography>
                      {o.seller.isVerified && <VerifiedIcon color="primary" fontSize="small" />}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {o.seller.locationCity}, {o.seller.locationState} · Rating {o.seller.rating}
                    </Typography>
                    {o.stock <= 0 && <Chip label="Sin stock" size="small" color="error" sx={{ mt: 0.5 }} />}
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="body1" className="price-color" fontWeight={700}>
                      {money(o.price)}
                    </Typography>
                    <Box display="flex" gap={0.5} justifyContent="flex-end" mt={0.5}>
                      {isBest && <Chip label="Mejor precio" size="small" color="success" />}
                      {isCurrent && <Chip label="Estás viendo" size="small" color="primary" />}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Paper>
      )}

      {/* Specs dinámicas */}
      {attributes.length > 0 && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Especificaciones
          </Typography>
          <Table size="small">
            <TableBody>
              {attributes.map((attr: any) => {
                const def = attr.attributeDefinition;
                const value =
                  attr.valueText ?? (attr.valueNumber !== null ? `${attr.valueNumber}${def.unit ? ' ' + def.unit : ''}` : '—');
                return (
                  <TableRow key={attr.id}>
                    <TableCell sx={{ width: '40%', fontWeight: 600 }}>{def.name}</TableCell>
                    <TableCell>{value}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Descripción */}
      {product.description && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" fontWeight={700} mb={1}>
            Descripción
          </Typography>
          <Typography variant="body2" color="text.secondary" whiteSpace="pre-wrap">
            {product.description}
          </Typography>
        </Paper>
      )}

      {/* Reviews */}
      <Paper sx={{ mt: 3, p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>
            Reseñas ({reviews.length})
          </Typography>
          {reviews.length > 0 && (
            <Button size="small" variant="outlined" onClick={() => setReviewsOpen(true)}>
              Ver todas las reseñas
            </Button>
          )}
        </Box>

        {reviews.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Aún no hay reseñas. Sé el primero.</Typography>
        ) : (
          <>
            {/* Resumen de calificación */}
            <Box display="flex" gap={3} flexWrap="wrap" mb={2}>
              <Box textAlign="center">
                <Typography variant="h2" fontWeight={800} lineHeight={1}>
                  {avgRating.toFixed(1)}
                </Typography>
                <Rating value={avgRating} readOnly precision={0.1} size="small" sx={{ mt: 0.5 }} />
                <Box mt={0.5}>
                  <Chip label={veredicto(avgRating).label} color={veredicto(avgRating).color} size="small" sx={{ fontWeight: 700 }} />
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  {reviews.length} reseña(s)
                </Typography>
              </Box>
              <Box flexGrow={1} minWidth={200}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter((r: any) => r.rating === star).length;
                  const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
                  return (
                    <Box key={star} display="flex" alignItems="center" gap={1}>
                      <Typography variant="caption" sx={{ width: 24 }}>{star}★</Typography>
                      <LinearProgress variant="determinate" value={pct} sx={{ flexGrow: 1, height: 8, borderRadius: 4 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ width: 28, textAlign: 'right' }}>{pct}%</Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Reseñas destacadas */}
            {reviews.slice(0, 3).map((r: any) => (
              <Box key={r.id} mb={2}>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <Rating value={r.rating} readOnly size="small" />
                  <Chip label={veredicto(r.rating).label} color={veredicto(r.rating).color} size="small" variant="outlined" />
                  <Typography variant="caption" fontWeight={600}>
                    {r.user.firstName} {r.user.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(r.createdAt).toLocaleDateString('es-AR')}
                  </Typography>
                </Box>
                {r.tags && r.tags.length > 0 && (
                  <Box mt={0.5} display="flex" flexWrap="wrap" gap={0.5}>
                    {r.tags.map((tag: string) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" color="info" />
                    ))}
                  </Box>
                )}
                {r.comment && <Typography variant="body2">{r.comment}</Typography>}
              </Box>
            ))}
          </>
        )}

        <Divider sx={{ my: 2 }} />
        {user ? (
          <Box>
            <Rating value={reviewRating} onChange={(_, v) => setReviewRating(v || 5)} />
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              placeholder="Escribí tu reseña..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              sx={{ mt: 1, mb: 1 }}
            />
            <Button variant="contained" size="small" onClick={submitReview} disabled={!reviewText.trim()}>
              Publicar reseña
            </Button>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            <Link to="/login">Iniciá sesión</Link> para dejar una reseña.
          </Typography>
        )}
      </Paper>

      {/* Modal de todas las reseñas */}
      <Dialog open={reviewsOpen} onClose={() => setReviewsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Reseñas del producto ({reviews.length})</DialogTitle>
        <DialogContent dividers>
          <Tabs value={reviewFilter} onChange={(_e, v) => setReviewFilter(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
            <Tab label="Todas" value="all" />
            <Tab label="Muy recomendado" value="good" />
            <Tab label="Recomendado" value="neutral" />
            <Tab label="No recomendado" value="bad" />
          </Tabs>
          {reviews
            .filter((r: any) => {
              if (reviewFilter === 'good') return r.rating >= 4.5;
              if (reviewFilter === 'neutral') return r.rating >= 3.5 && r.rating < 4.5;
              if (reviewFilter === 'bad') return r.rating < 3.5;
              return true;
            })
            .map((r: any) => (
              <Box key={r.id} mb={2}>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <Rating value={r.rating} readOnly size="small" />
                  <Chip label={veredicto(r.rating).label} color={veredicto(r.rating).color} size="small" variant="outlined" />
                  <Typography variant="caption" fontWeight={600}>
                    {r.user.firstName} {r.user.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(r.createdAt).toLocaleDateString('es-AR')}
                  </Typography>
                </Box>
                {r.tags && r.tags.length > 0 && (
                  <Box mt={0.5} display="flex" flexWrap="wrap" gap={0.5}>
                    {r.tags.map((tag: string) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" color="info" />
                    ))}
                  </Box>
                )}
                {r.comment && <Typography variant="body2">{r.comment}</Typography>}
              </Box>
            ))}
          {reviews.filter((r: any) => {
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

      {/* Relacionados */}
      {related.length > 0 && (
        <>
          <Typography variant="h6" fontWeight={700} mt={4} mb={2}>
            Productos relacionados
          </Typography>
          <Grid container spacing={2}>
          {related.slice(0, 5).map((p) => (
            <Grid item xs={6} sm={4} md={2.4} key={p.id}>
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
        </>
      )}

      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast?.type} onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Container>
  );
}
