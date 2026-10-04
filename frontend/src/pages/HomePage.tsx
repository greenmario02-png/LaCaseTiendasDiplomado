import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Grid,
  Typography,
  Box,
  Card,
  CardActionArea,
  Chip,
  Skeleton,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import GavelIcon from '@mui/icons-material/Gavel';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { JobCard, type Job } from '../components/redesign/JobCard';
import { AdSlotCard } from '../components/redesign/AdSlotCard';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { getCategoryIcon } from '../data/categoryIcons';
import { useMoney } from '../hooks/useMoney';
import { ProductGridSkeleton } from '../components/ui/LoadingSkeleton';
import EmptyState from '../components/ui/EmptyState';
import CountdownTimer from '../components/ui/CountdownTimer';
import { PrimaryButton, SecondaryButton, GhostButton } from '../components/redesign/Buttons';
import { ProductCard } from '../components/redesign/ProductCard';
import { useLocationStore } from '../stores/locationStore';
import { NearMeButton } from '../components/redesign/NearMeButton';

interface Banner {
  id: number;
  title?: string | null;
  imageDesktop: string;
  link?: string | null;
  backgroundColor?: string | null;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  icon?: string | null;
  productCount: number;
  children: Array<{ id: number; name: string; slug: string; productCount: number }>;
}

interface Sale {
  id: number;
  productId?: number | null;
  slug?: string;
  image?: string | null;
  productName: string;
  storeName: string;
  city: string;
  amount: number;
  createdAt: string;
}

const toCardProduct = (p: any) => ({
  id: p.id,
  name: p.name,
  price: Number(p.price),
  salePrice: p.salePrice ? Number(p.salePrice) : undefined,
  stock: p.stock,
  storeName: p.seller?.storeName,
  rating: p.rating,
  image: p.images?.[0]?.url,
});

export default function HomePage() {
  const { t } = useTranslation();
  const money = useMoney();
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);

  const [recommended, setRecommended] = useState<any[]>([]);
  const [recommendReason, setRecommendReason] = useState<string>('');

  // Feed personalizado (GET /api/tracking/feed)
  const [nearYou, setNearYou] = useState<any[]>([]);
  const [categoryCarousels, setCategoryCarousels] = useState<any[]>([]);
  const [forYou, setForYou] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [userCity, setUserCity] = useState<string>('');
  const [auctions, setAuctions] = useState<any[]>([]);

  // Letrero de compras en tiempo real
  const [sales, setSales] = useState<Sale[]>([]);
  const salesRef = useRef<Sale[]>([]);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const geo = useLocationStore((st) => st.coords);

  useEffect(() => {
    api
      .get('/jobs', { params: { limit: 6 } })
      .then((r) => setJobs(r.data.data ?? []))
      .catch(() => setJobs([]));
  }, []);

  useEffect(() => {
    Promise.all([
      api.get('/banners').catch(() => ({ data: { data: [] } })),
      api.get('/products/categories').catch(() => ({ data: { data: [] } })),
      api.get('/products/featured').catch(() => ({ data: { data: [] } })),
      api.get('/promotions').catch(() => ({ data: { data: [] } })),
      api.get('/tracking/me/recommended').catch(() => ({ data: { data: { recommendations: [], reason: '' } } })),
      api.get('/tracking/feed', { params: geo ? { lat: geo.lat, lng: geo.lng } : undefined }).catch(() => ({ data: { data: { nearYou: [], categoryCarousels: [], forYou: [], trending: [], userCity: '' } } })),
      api.get('/orders/recent-sales').catch(() => ({ data: { data: [] } })),
      api.get('/auctions', { params: { limit: 6, sort: 'ending_soon' } }).catch(() => ({ data: { data: [] } })),
    ]).then(([b, c, f, p, r, feed, s, auc]) => {
      setBanners(b.data.data);
      setCategories(c.data.data);
      setFeatured(f.data.data);
      setPromotions(p.data.data);
      setRecommended(r.data.data.recommendations || []);
      setRecommendReason(r.data.data.reason || '');
      setNearYou(feed.data.data?.nearYou ?? []);
      setCategoryCarousels(feed.data.data?.categoryCarousels ?? []);
      setForYou(feed.data.data?.forYou ?? []);
      setTrending(feed.data.data?.trending ?? []);
      setUserCity(feed.data.data?.userCity ?? '');
      const initialSales = s.data.data ?? [];
      setSales(initialSales);
      salesRef.current = initialSales;
      setAuctions(auc.data.data ?? []);
      setLoading(false);
    });

    // Escuchar compras en tiempo real (evento global 'order:created')
    let socket: any = null;
    try {
      socket = getSocket();
    } catch {
      socket = null;
    }
    const onOrder = (data: any) => {
      if (!data?.productName) return;
      const sale: Sale = {
        id: data.orderId ?? Date.now(),
        productName: data.productName,
        storeName: data.storeName ?? '',
        city: data.city ?? 'Bolivia',
        amount: Number(data.amount ?? 0),
        createdAt: data.createdAt ?? new Date().toISOString(),
      };
      salesRef.current = [sale, ...salesRef.current].slice(0, 20);
      setSales(salesRef.current);
    };
    socket?.on('order:created', onOrder);
    return () => {
      socket?.off('order:created', onOrder);
    };
  }, [geo]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Skeleton variant="rounded" height={300} />
        <Skeleton variant="text" sx={{ mt: 3 }} />
        <ProductGridSkeleton count={8} />
      </Container>
    );
  }

  const openProduct = (p: any) => navigate(`/producto/${p.id}/${p.slug ?? ''}`);

  const tickerItems = [
    ...(Array.isArray(sales) ? sales : []).map((sl) => ({
      key: `venta-${sl.id}`,
      tag: t('home.ticker.sold'),
      title: sl.productName,
      detail: t('home.ticker.soldIn', { store: sl.storeName, city: sl.city, amount: money(sl.amount) }),
      image: sl.image ?? null,
      to: sl.productId ? `/producto/${sl.productId}/${sl.slug ?? ''}` : '/productos',
    })),
    ...(Array.isArray(auctions) ? auctions : []).slice(0, 6).map((a) => ({
      key: `subasta-${a.id}`,
      tag: t('home.ticker.auction'),
      title: a.title,
      detail: t('home.ticker.currentBid', { amount: money(Number(a.currentPrice)) }),
      image: a.imageUrl ?? null,
      to: `/subasta/${a.id}`,
    })),
    ...(Array.isArray(jobs) ? jobs : []).slice(0, 6).map((j) => ({
      key: `empleo-${j.id}`,
      tag: t('home.ticker.job'),
      title: j.title,
      detail: [j.city, j.salaryMin ? `Bs ${Number(j.salaryMin).toLocaleString('es-BO')}` : null].filter(Boolean).join(' · '),
      image: null as string | null,
      to: '/empleos',
    })),
  ];

  return (
    <Box>
      {/* LETRERO EN TIEMPO REAL: compras recientes, subastas activas y empleos; cada elemento lleva a su página */}
      {tickerItems.length > 0 && (
        <Box
          sx={{
            bgcolor: 'primary.dark',
            color: 'common.white',
            overflow: 'hidden',
            position: 'relative',
            py: 0.75,
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              gap: 4,
              width: 'max-content',
              animation: 'saleTicker 60s linear infinite',
              '&:hover': { animationPlayState: 'paused' },
              whiteSpace: 'nowrap',
              '@keyframes saleTicker': { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
            }}
          >
            {[...tickerItems, ...tickerItems].map((it, i) => (
              <Box
                key={`${it.key}-${i}`}
                component={Link}
                to={it.to}
                display="flex"
                alignItems="center"
                gap={1}
                sx={{ minWidth: 'max-content', color: 'inherit', textDecoration: 'none', '&:hover .ticker-title': { textDecoration: 'underline' } }}
              >
                {it.image && (
                  <Box component="img" src={it.image} alt="" loading="lazy" sx={{ width: 26, height: 26, borderRadius: 0.75, objectFit: 'cover', bgcolor: 'rgba(255,255,255,0.2)' }} />
                )}
                <Typography variant="caption" component="span" sx={{ px: 0.75, py: 0.1, borderRadius: 0.75, bgcolor: 'rgba(255,255,255,0.22)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {it.tag}
                </Typography>
                <Typography className="ticker-title" variant="body2" fontWeight={700} component="span">
                  {it.title}
                </Typography>
                <Typography variant="body2" component="span" sx={{ opacity: 0.9 }}>
                  {it.detail}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* HERO */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography variant="h4" gutterBottom>
                {t('home.hero.title')}
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {t('home.hero.subtitle')}
              </Typography>
              <Box display="flex" gap={1}>
                <PrimaryButton to="/productos">
                  {t('home.hero.exploreProducts')}
                </PrimaryButton>
                <SecondaryButton to="/subastas" startIcon={<GavelIcon />}>
                  {t('home.hero.auctions')}
                </SecondaryButton>
                <GhostButton to="/registro-vendedor">
                  {t('home.hero.openYourStore')}
                </GhostButton>
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box className="image-container" sx={{ borderRadius: 2, p: 4, textAlign: 'center' }}>
                <StorefrontIcon sx={{ fontSize: 80, color: 'primary.main' }} />
                <Typography variant="body2" color="text.secondary" mt={1}>
                  {t('home.hero.categoriesAndFeatured', { categories: categories.length, featured: featured.length })}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {jobs.length > 0 && (
        <Container maxWidth="lg" sx={{ pt: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" fontWeight={700}>
              {t('home.jobs.title')}
            </Typography>
            <Typography component={Link} to="/empleos" variant="body2" color="primary" sx={{ textDecoration: 'none' }}>
              {t('home.jobs.viewAll')}
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {jobs.slice(0, 6).map((job) => (
              <Grid item xs={12} sm={6} md={4} key={job.id}>
                <JobCard job={job} onClick={() => navigate('/empleos')} />
              </Grid>
            ))}
            <Grid item xs={12} sm={6} md={4}>
              <AdSlotCard />
            </Grid>
          </Grid>
        </Container>
      )}

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* PRODUCTOS CERCA DE TI */}
        {nearYou.length > 0 && (
          <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h5" fontWeight={700}>
                  {userCity ? t('home.nearYou.titleWithCity', { city: userCity }) : t('home.nearYou.title')}
                </Typography>
                <NearMeButton />
              </Box>
              <Typography component={Link} to="/productos" variant="body2" color="primary" sx={{ textDecoration: 'none' }}>
                {t('home.common.viewAll')}
              </Typography>
            </Box>
            <Grid container spacing={2} mb={4}>
              {nearYou.slice(0, 10).map((p) => (
                <Grid item xs={6} sm={4} md={3} lg={2.4} key={p.id}>
                  <ProductCard product={toCardProduct(p)} onClick={() => openProduct(p)} />
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* BANNERS */}
        {banners.length > 0 && (
          <Box mb={4}>
            <Grid container spacing={2}>
              {banners.slice(0, 3).map((b) => (
                <Grid item xs={12} md={banners.length === 1 ? 12 : 4} key={b.id}>
                  <Card sx={{ bgcolor: b.backgroundColor || 'primary.main', position: 'relative', overflow: 'hidden' }}>
                    <CardActionArea component={Link} to={b.link || '/productos'}>
                      <Box sx={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {b.imageDesktop && (
                          <img src={b.imageDesktop} alt={b.title || t('home.banners.fallbackAlt')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                        )}
                      </Box>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* CATEGORÍAS — slider */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight={700}>
            {t('home.categories.title')}
          </Typography>
          <Typography component={Link} to="/productos" variant="body2" color="primary" sx={{ textDecoration: 'none' }}>
            {t('home.common.viewAll')}
          </Typography>
        </Box>
        <Box mb={4} sx={{ overflow: 'hidden' }}>
          <Swiper
            modules={[Navigation, Pagination]}
            spaceBetween={16}
            slidesPerView={2.2}
            breakpoints={{
              600: { slidesPerView: 3.2 },
              900: { slidesPerView: 4.2 },
              1200: { slidesPerView: 5.5 },
            }}
            navigation
            pagination={{ clickable: true }}
            style={{ paddingBottom: 32 }}
          >
            {categories.map((cat) => {
              const Icon = getCategoryIcon(cat.icon);
              return (
                <SwiperSlide key={cat.id}>
                  <Card sx={{ height: 180, position: 'relative', overflow: 'hidden' }}>
                    <CardActionArea component={Link} to={`/categoria/${cat.slug}`} sx={{ height: '100%' }}>
                      {cat.imageUrl ? (
                        <>
                          <Box className="image-container" sx={{ position: 'absolute', inset: 0 }}>
                            <img src={cat.imageUrl} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                          </Box>
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              background: 'linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.1))',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'flex-end',
                              p: 1.5,
                            }}
                          >
                            <Typography variant="h6" fontWeight={700} color="white" noWrap>
                              {cat.name}
                            </Typography>
                            <Typography variant="caption" color="rgba(255,255,255,0.85)">
                              {t('home.categories.productCount', { count: cat.productCount })}
                            </Typography>
                          </Box>
                        </>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1 }}>
                          {Icon ? (
                            <Icon sx={{ fontSize: 48, color: 'primary.main' }} />
                          ) : (
                            <Typography color="primary" fontSize="3rem">
                              {cat.name[0]}
                            </Typography>
                          )}
                          <Typography variant="body1" fontWeight={700} noWrap>
                            {cat.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('home.categories.productCount', { count: cat.productCount })}
                          </Typography>
                        </Box>
                      )}
                    </CardActionArea>
                  </Card>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </Box>

        {/* CARRUSELES POR CATEGORÍA — productos agregados recientemente */}
        {categoryCarousels.length > 0 &&
          categoryCarousels.map((cc) => {
            const cat = cc.category ?? {};
            const prods = cc.products ?? [];
            if (!prods.length) return null;
            return (
              <Box key={cat.id ?? cat.slug ?? String(cc.categoryId)} mb={4}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h5" fontWeight={700}>
                    {cat.icon ? `${cat.icon} ` : ''}
                    {cat.name ?? t('home.categories.fallbackName')}
                  </Typography>
                  <Typography component={Link} to={`/categoria/${cat.slug ?? ''}`} variant="body2" color="primary" sx={{ textDecoration: 'none' }}>
                    {t('home.common.viewAll')}
                  </Typography>
                </Box>
                <Box sx={{ '& .swiper-slide': { width: { xs: 260, md: 300 } } }}>
                  <Swiper
                    modules={[Navigation, Pagination]}
                    spaceBetween={16}
                    slidesPerView="auto"
                    navigation
                    pagination={{ clickable: true }}
                    style={{ paddingBottom: 28 }}
                  >
                    {prods.map((p: any) => (
                      <SwiperSlide key={p.id}>
                        <ProductCard product={toCardProduct(p)} onClick={() => openProduct(p)} />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </Box>
              </Box>
            );
          })}

        {/* OFERTAS RELÁMPAGO */}
        {promotions.length > 0 && (
          <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h5" fontWeight={700}>
                  {t('home.promotions.title')}
                </Typography>
                <Chip label={t('home.promotions.limitedTime')} size="small" color="error" />
              </Box>
              <Typography component={Link} to="/promociones" variant="body2" color="primary" sx={{ textDecoration: 'none' }}>
                {t('home.promotions.viewAllFeminine')}
              </Typography>
            </Box>
            <Box mb={4} sx={{ '& .swiper-slide': { width: { xs: 280, md: 340 } } }}>
              <Swiper
                modules={[Navigation, Pagination]}
                spaceBetween={16}
                slidesPerView="auto"
                navigation
                pagination={{ clickable: true }}
              >
                {promotions.map((promo) => {
                  const pimg = promo.products?.[0]?.product?.images?.[0]?.url;
                  return (
                    <SwiperSlide key={promo.id}>
                      <Box
                        component={Link}
                        to="/promociones"
                        sx={{
                          display: 'block',
                          textDecoration: 'none',
                          color: 'inherit',
                          border: 1,
                          borderColor: 'error.main',
                          borderRadius: 3,
                          overflow: 'hidden',
                          bgcolor: 'background.paper',
                          position: 'relative',
                          transition: 'transform 0.2s',
                          '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 },
                        }}
                      >
                        {pimg && (
                          <Box sx={{ position: 'relative', height: 140, overflow: 'hidden' }}>
                            <Box
                              component="img"
                              src={pimg}
                              alt={promo.title}
                              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <Chip
                              label={t('home.promotions.offLabel', { value: promo.discountType === 'PERCENTAGE' ? promo.discountValue + '%' : money(promo.discountValue) })}
                              color="error"
                              size="small"
                              sx={{ position: 'absolute', top: 8, left: 8 }}
                            />
                          </Box>
                        )}
                        <Box sx={{ p: 2 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
                            <Typography variant="h6" fontWeight={700} noWrap>
                              {promo.title}
                            </Typography>
                            <CountdownTimer targetDate={promo.endDate} compact />
                          </Box>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {promo.products?.[0]?.product?.name ?? promo.description}
                          </Typography>
                          {promo.seller?.storeName && (
                            <Typography variant="caption" color="text.disabled">
                              {t('home.promotions.storeLabel', { store: promo.seller.storeName })}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            </Box>
          </>
        )}

        {/* PARA VOS — recomendaciones dinámicas */}
        {(forYou.length > 0 || recommended.length > 0) && (
          <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5" fontWeight={700}>
                {t('home.forYou.title')}
              </Typography>
              <Typography component={Link} to="/productos" variant="body2" color="primary" sx={{ textDecoration: 'none' }}>
                {t('home.common.viewAll')}
              </Typography>
            </Box>
            {recommendReason && (
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                {recommendReason === 'historial' ? t('home.forYou.reasonHistory') : t('home.forYou.reasonPopular')}
              </Typography>
            )}
            <Grid container spacing={2} mb={4}>
              {(forYou.length > 0 ? forYou : recommended).slice(0, 10).map((p) => (
                <Grid item xs={6} sm={4} md={3} lg={2.4} key={p.id}>
                  <ProductCard product={toCardProduct(p)} onClick={() => openProduct(p)} />
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* SUBASTAS ACTIVAS */}
        {auctions.length > 0 && (
          <Box mb={4}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: 'secondary.main',
                color: 'secondary.contrastText',
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <GavelIcon />
                <Typography variant="h6" fontWeight={700}>
                  {t('home.auctions.title')}
                </Typography>
              </Box>
              <Typography component={Link} to="/subastas" variant="body2" sx={{ color: 'inherit', textDecoration: 'underline' }}>
                {t('home.promotions.viewAllFeminine')}
              </Typography>
            </Box>
            <Grid container spacing={2}>
              {auctions.slice(0, 6).map((a) => (
                <Grid item xs={6} sm={4} md={2} key={a.id}>
                  <Card
                    component={Link}
                    to={`/subasta/${a.id}`}
                    sx={{ textDecoration: 'none', height: '100%', display: 'flex', flexDirection: 'column' }}
                  >
                    <CardActionArea sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                      <Box sx={{ aspectRatio: '1/1', bgcolor: 'action.hover' }}>
                        {a.imageUrl && (
                          <img src={a.imageUrl} alt={a.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </Box>
                      <Box p={1.5}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {a.title}
                        </Typography>
                        <Typography variant="body1" fontWeight={800} color="primary.main">
                          {money(Number(a.currentPrice))}
                        </Typography>
                        <CountdownTimer targetDate={a.endDate} compact />
                      </Box>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* DESTACADOS — más vistos de la semana */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h5" fontWeight={700}>
              {t('home.featured.title')}
            </Typography>
            <Chip icon={<LocalFireDepartmentIcon />} label={t('home.featured.mostViewed')} size="small" color="warning" />
          </Box>
          <Typography component={Link} to="/productos" variant="body2" color="primary" sx={{ textDecoration: 'none' }}>
            {t('home.featured.viewAll')}
          </Typography>
        </Box>
        {(trending.length > 0 ? trending : featured).length > 0 ? (
          <Grid container spacing={2}>
            {(trending.length > 0 ? trending : featured).slice(0, 10).map((p) => (
              <Grid item xs={6} sm={4} md={3} lg={2.4} key={p.id}>
                <ProductCard product={toCardProduct(p)} onClick={() => openProduct(p)} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <EmptyState message={t('home.featured.empty')} />
        )}
      </Container>
    </Box>
  );
}
