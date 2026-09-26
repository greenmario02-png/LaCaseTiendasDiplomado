import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Box,
  Chip,
  Pagination,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import GavelIcon from '@mui/icons-material/Gavel';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { api } from '../services/api';
import { useMoney } from '../hooks/useMoney';
import { ProductGridSkeleton } from '../components/ui/LoadingSkeleton';
import { useUnifiedTokens } from '../theme';
import { PageHeader, SurfaceCard } from '../components/redesign/PageHeader';
import { EmptyState } from '../components/redesign/States';
import { FadeIn } from '../components/motion/FadeIn';

interface Auction {
  id: number;
  title: string;
  description?: string | null;
  currentPrice: string;
  startingPrice: string;
  bidsCount: number;
  timeLeftMs: number;
  imageUrl?: string | null;
  seller: { storeName: string };
  category?: { name: string } | null;
  buyNowPrice?: string | null;
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'Terminada';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const SORTS = [
  { value: 'interest', label: 'Para vos (interés + ofertas)' },
  { value: 'price_asc', label: 'Precio más bajo' },
  { value: 'price_desc', label: 'Precio más alto' },
  { value: 'ending_soon', label: 'Terminan pronto' },
  { value: 'most_bids', label: 'Más pujas' },
  { value: 'newest', label: '🆕 Más recientes' },
];

export default function AuctionsPage() {
  const money = useMoney();
  const t = useUnifiedTokens();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [hasBids, setHasBids] = useState(false);
  const [sort, setSort] = useState('interest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/products/categories')
      .then((r) => setCategories(r.data.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, unknown> = { page, limit: 12 };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    if (hasBids) params.hasBids = 'true';
    if (sort) params.sort = sort;
    api
      .get('/auctions', { params })
      .then((r) => {
        setAuctions(r.data.data ?? []);
        setMeta(r.data.meta);
      })
      .finally(() => setLoading(false));
  }, [page, search, categoryId, hasBids, sort]);

  const topDeal = auctions.length > 0 && sort === 'interest';

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <PageHeader title="Subastas" subtitle="Pujá por productos únicos y llevate las mejores ofertas" icon={<GavelIcon />} />

      {/* Buscador y filtros */}
      <SurfaceCard sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            placeholder="Buscar subastas... (ej: Game Boy, collar, ryzen)"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            size="small"
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Categoría</InputLabel>
              <Select value={categoryId} label="Categoría" onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
                <MenuItem value="">Todas</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>Ordenar</InputLabel>
              <Select value={sort} label="Ordenar" onChange={(e) => { setSort(e.target.value); setPage(1); }}>
                {SORTS.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Checkbox checked={hasBids} onChange={(e) => { setHasBids(e.target.checked); setPage(1); }} />}
              label="Con ofertas"
            />
          </Stack>
        </Stack>
      </SurfaceCard>

      {topDeal && (
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <WhatshotIcon sx={{ color: t.error }} />
          <Typography variant="body2" color={t.onSurfaceVariant}>
            Ordenadas según tu interés y las mejores ofertas (precios más bajos y activas primero).
          </Typography>
        </Box>
      )}

      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : auctions.length === 0 ? (
        <SurfaceCard>
          <EmptyState message={`No se encontraron subastas${search ? ` para "${search}"` : ''}. Probá con otros términos o quitá los filtros.`} />
        </SurfaceCard>
      ) : (
        <>
          <Grid container spacing={2}>
            {auctions.map((a) => {
              const urgency = Math.max(0, Math.min(1, a.timeLeftMs / (12 * 3600000)));
              const isHot = a.timeLeftMs < 2 * 3600000 && a.timeLeftMs > 0;
              const hasBuyNow = a.buyNowPrice && Number(a.buyNowPrice) > 0;
              return (
                <Grid item xs={6} sm={4} md={3} key={a.id}>
                  <FadeIn>
                  <Card
                    elevation={0}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      borderRadius: '16px',
                      bgcolor: t.surfaceContainerLowest,
                      border: `1px solid ${t.outline}33`,
                      boxShadow: t.cardShadow,
                    }}
                  >
                    {isHot && (
                      <Chip
                        icon={<WhatshotIcon />}
                        label="Últimas horas"
                        size="small"
                        color="error"
                        sx={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}
                      />
                    )}
                    {hasBuyNow && (
                      <Chip
                        icon={<LocalOfferIcon />}
                        label="Comprar ya"
                        size="small"
                        color="primary"
                        sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
                      />
                    )}
                    <CardActionArea component={Link} to={`/subasta/${a.id}`} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                      <Box className="image-container" sx={{ aspectRatio: '1/1' }}>
                        {a.imageUrl ? (
                          <img src={a.imageUrl} alt={a.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: t.surface }}>
                            <GavelIcon color="disabled" sx={{ fontSize: 48 }} />
                          </Box>
                        )}
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 4,
                            bgcolor: `${t.outline}33`,
                          }}
                        >
                          <Box
                            sx={{
                              width: `${urgency * 100}%`,
                              height: '100%',
                              bgcolor: isHot ? t.error : t.secondaryContainer,
                              transition: 'width 1s',
                            }}
                          />
                        </Box>
                      </Box>
                      <CardContent>
                        <Typography variant="body2" fontWeight={600} color={t.onSurface} noWrap>
                          {a.title}
                        </Typography>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                          <Typography fontWeight={800} color={t.primary}>
                            {money(Number(a.currentPrice))}
                          </Typography>
                          <Chip label={`${a.bidsCount} pujas`} size="small" variant="outlined" />
                        </Box>
                        <Box display="flex" justifyContent="space-between" mt={1}>
                          <Typography variant="caption" color={t.onSurfaceVariant}>
                            {a.seller?.storeName}
                          </Typography>
                          <Typography variant="caption" color={isHot ? t.error : t.onSurfaceVariant} fontWeight={600}>
                            ⏱ {formatTimeLeft(a.timeLeftMs)}
                          </Typography>
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                  </FadeIn>
                </Grid>
              );
            })}
          </Grid>
          {meta?.totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination count={meta.totalPages} page={page} onChange={(_, p) => setPage(p)} />
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
