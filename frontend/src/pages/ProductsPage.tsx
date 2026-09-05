import { useEffect, useState, useCallback, useRef } from 'react';
import { Star } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Container,
  Grid,
  Box,
  Typography,
  Drawer,
  IconButton,
  Slider,
  Chip,
  Badge,
  Button,
  TextField,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Paper,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Avatar,
  Tabs,
  Tab,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ClearIcon from '@mui/icons-material/Clear';
import { api } from '../services/api';
import { useMoney } from '../hooks/useMoney';
import { useCurrencyStore } from '../stores/currencyStore';
import { useAuthStore } from '../stores/authStore';
import { getDivisions, COUNTRIES } from '../data/geo';
import { ProductCard } from '../components/redesign/ProductCard';
import { EmptyState } from '../components/redesign/States';
import { ProductGridSkeleton } from '../components/ui/LoadingSkeleton';
import InfiniteScrollGrid from '../components/ui/InfiniteScrollGrid';
import { useNavigate } from 'react-router-dom';

interface Category {
  id: number;
  name: string;
  slug: string;
  children: Array<{ id: number; name: string; slug: string; productCount: number }>;
}

interface DeliveryType {
  code: string;
  label: string;
}

interface SellerHit {
  id: number;
  storeName: string;
  storeLogo?: string | null;
  storeCategory?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  country?: string | null;
  rating: number;
  totalSales: number;
}

interface Filters {
  search?: string;
  categoryIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  state?: string;
  location?: string;
  deliveryTypes?: string[];
  acceptsTrade?: boolean;
  brand?: string;
  sellerId?: number;
  tag?: string;
  sort?: string;
}

type SearchMode = 'productos' | 'marcas' | 'vendedores' | 'categorias';

const MAX_PRICE_BS = 30000;

export default function ProductsPage() {
  const money = useMoney();
  const selectedCurrency = useCurrencyStore((s) => s.selected);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const moneyFormat = selectedCurrency === 'USD' ? 'US$' : 'Bs';

  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [deliveryTypes, setDeliveryTypes] = useState<DeliveryType[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, MAX_PRICE_BS]);

  // Buscador superior
  const [searchMode, setSearchMode] = useState<SearchMode>('productos');
  const [quickTerm, setQuickTerm] = useState('');
  const [sellerResults, setSellerResults] = useState<SellerHit[]>([]);
  const [searchingSellers, setSearchingSellers] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar metadatos
  useEffect(() => {
    api.get('/products/categories').then((res) => setCategories(res.data.data)).catch(() => {});
    api.get('/brands').then((res) => setBrands(res.data.data)).catch(() => {});
    api.get('/delivery-types').then((res) => setDeliveryTypes(res.data.data)).catch(() => {});
    const bo = COUNTRIES.find((c) => c.code === 'BO');
    if (bo) setDepartments(bo.divisions.map((d) => d.name));
  }, []);

  // Sincronizar filtros desde URL
  useEffect(() => {
    const f: Filters = {};
    const search = searchParams.get('search');
    if (search) f.search = search;
    const categoryIds = searchParams.get('categoryIds');
    if (categoryIds) f.categoryIds = categoryIds.split(',').map(Number).filter(Boolean);
    const minPrice = searchParams.get('minPrice');
    if (minPrice) f.minPrice = Number(minPrice);
    const maxPrice = searchParams.get('maxPrice');
    if (maxPrice) f.maxPrice = Number(maxPrice);
    const condition = searchParams.get('condition');
    if (condition) f.condition = condition;
    const state = searchParams.get('state');
    if (state) f.state = state;
    const deliveryTypes = searchParams.get('deliveryType');
    if (deliveryTypes) f.deliveryTypes = deliveryTypes.split(',');
    const acceptsTrade = searchParams.get('acceptsTrade');
    if (acceptsTrade) f.acceptsTrade = acceptsTrade === 'true';
    const brand = searchParams.get('brand');
    if (brand) f.brand = brand;
    const sellerId = searchParams.get('sellerId');
    if (sellerId) f.sellerId = Number(sellerId);
    const tag = searchParams.get('tag');
    if (tag) f.tag = tag;
    const sort = searchParams.get('sort');
    if (sort) f.sort = sort;
    setFilters(f);
    setQuickTerm(search || '');
  }, [searchParams]);

  // Búsqueda de vendedores con debounce
  const searchSellers = useCallback(
    (term: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (term.trim().length < 2) {
        setSellerResults([]);
        return;
      }
      setSearchingSellers(true);
      debounceRef.current = setTimeout(() => {
        api
          .get('/sellers/search', { params: { q: term.trim() } })
          .then((res) => setSellerResults(res.data.data))
          .catch(() => setSellerResults([]))
          .finally(() => setSearchingSellers(false));
      }, 300);
    },
    []
  );

  // Enviar búsqueda del modo actual
  const handleQuickSearch = (term: string) => {
    const params = new URLSearchParams(searchParams);
    if (searchMode === 'productos') {
      if (term.trim()) params.set('search', term.trim());
      else params.delete('search');
      params.delete('brand');
      params.delete('sellerId');
    } else if (searchMode === 'marcas') {
      if (term.trim()) params.set('brand', term.trim());
      else params.delete('brand');
      params.delete('search');
      params.delete('sellerId');
    }
    setSearchParams(params);
  };

  const selectSeller = (seller: SellerHit) => {
    const params = new URLSearchParams(searchParams);
    params.set('sellerId', String(seller.id));
    params.delete('search');
    params.delete('brand');
    setSearchParams(params);
    setSellerResults([]);
    setQuickTerm('');
  };

  // Construir query para la API
  const buildQuery = useCallback(
    (withCursor?: string) => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.categoryIds?.length) params.set('categoryIds', filters.categoryIds.join(','));
      if (filters.minPrice) params.set('minPrice', String(filters.minPrice));
      if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
      if (filters.condition) params.set('condition', filters.condition);
      if (filters.state) params.set('state', filters.state);
      if (filters.deliveryTypes?.length) params.set('deliveryType', filters.deliveryTypes.join(','));
      if (filters.acceptsTrade !== undefined) params.set('acceptsTrade', String(filters.acceptsTrade));
      if (filters.brand) params.set('brand', filters.brand);
      if (filters.sellerId) params.set('sellerId', String(filters.sellerId));
      if (filters.tag) params.set('tag', filters.tag);
      if (filters.sort) params.set('sort', filters.sort);
      params.set('limit', '24');
      if (withCursor) params.set('cursor', withCursor);
      return params.toString();
    },
    [filters]
  );

  useEffect(() => {
    setLoading(true);
    setProducts([]);
    setNextCursor(null);
    api
      .get(`/products?${buildQuery()}`)
      .then((res) => {
        setProducts(res.data.data);
        setHasMore(res.data.meta.hasMore);
        setNextCursor(res.data.meta.nextCursor);
        setTotal(res.data.meta.total);
      })
      .finally(() => setLoading(false));
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.get(`/products?${buildQuery(nextCursor)}`);
      setProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newItems = res.data.data.filter((p: any) => !existingIds.has(p.id));
        return [...prev, ...newItems];
      });
      setHasMore(res.data.meta.hasMore);
      setNextCursor(res.data.meta.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, buildQuery]);

  const setFilter = (key: keyof Filters, value: any, deleteIfEmpty = true) => {
    const params = new URLSearchParams(searchParams);
    const isEmpty = Array.isArray(value) ? value.length === 0 : value === undefined || value === '' || value === false;
    if (isEmpty && deleteIfEmpty) {
      // limpiar la key correspondiente
      const map: Record<string, string> = {
        categoryIds: 'categoryIds',
        minPrice: 'minPrice',
        maxPrice: 'maxPrice',
        condition: 'condition',
        state: 'state',
        location: 'location',
        deliveryTypes: 'deliveryType',
        acceptsTrade: 'acceptsTrade',
        brand: 'brand',
        sellerId: 'sellerId',
      };
      params.delete(map[key]);
      if (key === 'acceptsTrade') params.delete('acceptsTrade');
    } else {
      if (key === 'deliveryTypes') params.set('deliveryType', (value as string[]).join(','));
      else if (key === 'categoryIds') params.set('categoryIds', (value as number[]).join(','));
      else if (key === 'acceptsTrade') params.set('acceptsTrade', String(Boolean(value)));
      else params.set(key as string, String(value));
    }
    setSearchParams(params);
  };

  const toggleCategory = (id: number) => {
    const current = filters.categoryIds ?? [];
    const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
    setFilter('categoryIds', next);
  };

  const toggleDelivery = (code: string) => {
    const current = filters.deliveryTypes ?? [];
    const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
    setFilter('deliveryTypes', next);
  };

  const applyPrice = () => {
    setFilter('minPrice', priceRange[0] > 0 ? priceRange[0] : undefined);
    setFilter('maxPrice', priceRange[1] < MAX_PRICE_BS ? priceRange[1] : undefined);
    setDrawerOpen(false);
  };

  const clearAll = () => {
    setPriceRange([0, MAX_PRICE_BS]);
    setSearchParams(new URLSearchParams());
    setQuickTerm('');
  };

  const activeFilterCount =
    (filters.categoryIds?.length ? 1 : 0) +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.condition ? 1 : 0) +
    (filters.state ? 1 : 0) +
    (filters.deliveryTypes?.length ? 1 : 0) +
    (filters.acceptsTrade ? 1 : 0) +
    (filters.brand ? 1 : 0) +
    (filters.sellerId ? 1 : 0);

  const activeSeller = null;

  const filterContent = (
    <Box p={2} width={{ xs: 300, md: 260 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Filtros</Typography>
        <IconButton onClick={() => setDrawerOpen(false)} sx={{ display: { md: 'none' } }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* PRECIO */}
      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        Precio ({moneyFormat})
      </Typography>
      <Slider
        value={priceRange}
        onChange={(_, v) => setPriceRange(v as [number, number])}
        min={0}
        max={MAX_PRICE_BS}
        step={500}
        valueLabelDisplay="auto"
        valueLabelFormat={(v) => money(v)}
      />
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="caption">{money(priceRange[0])}</Typography>
        <Typography variant="caption">{money(priceRange[1])}</Typography>
      </Box>

      {/* CATEGORÍAS */}
      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        Categorías
      </Typography>
      <Box sx={{ maxHeight: 220, overflow: 'auto', mb: 2 }}>
        <FormGroup>
          {categories.map((cat) => (
            <Box key={cat.id}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={filters.categoryIds?.includes(cat.id) ?? false}
                    onChange={() => toggleCategory(cat.id)}
                  />
                }
                label={<Typography variant="body2">{cat.name}</Typography>}
              />
              {cat.children.slice(0, 6).map((child) => (
                <FormControlLabel
                  key={child.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={filters.categoryIds?.includes(child.id) ?? false}
                      onChange={() => toggleCategory(child.id)}
                    />
                  }
                  label={
                    <Typography variant="caption" color="text.secondary">
                      ↳ {child.name}
                    </Typography>
                  }
                  sx={{ pl: 3, display: 'flex' }}
                />
              ))}
            </Box>
          ))}
        </FormGroup>
      </Box>

      {/* CONDICIÓN */}
      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        Condición
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
        {[
          { label: 'Nuevo', value: 'NEW' },
          { label: 'Usado', value: 'USED' },
          { label: 'Reacondicionado', value: 'REFURBISHED' },
        ].map((c) => (
          <Chip
            key={c.value}
            label={c.label}
            size="small"
            onClick={() => setFilter('condition', filters.condition === c.value ? undefined : c.value)}
            color={filters.condition === c.value ? 'primary' : 'default'}
            variant={filters.condition === c.value ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      {/* DEPARTAMENTO */}
      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        Departamento
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
        {departments.map((d) => (
          <Chip
            key={d}
            label={d}
            size="small"
            onClick={() => setFilter('state', filters.state === d ? undefined : d)}
            color={filters.state === d ? 'primary' : 'default'}
            variant={filters.state === d ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      {/* REGIÓN / KILÓMETROS */}
      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        Región / Ciudad
      </Typography>
      <Box display="flex" gap={0.5} mb={2}>
        <TextField
          size="small"
          fullWidth
          placeholder="Ciudad (ej: La Paz, Tarija...)"
          value={filters.location ?? ''}
          onChange={(e) => setFilter('location', e.target.value || undefined, true)}
        />
      </Box>

      {/* TIPO DE ENTREGA */}
      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        Tipo de entrega
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
        {deliveryTypes.map((dt) => (
          <Chip
            key={dt.code}
            label={dt.label}
            size="small"
            onClick={() => toggleDelivery(dt.code)}
            color={filters.deliveryTypes?.includes(dt.code) ? 'primary' : 'default'}
            variant={filters.deliveryTypes?.includes(dt.code) ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      {/* MARCA */}
      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        Marca
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
        {brands.slice(0, 20).map((b) => (
          <Chip
            key={b}
            label={b}
            size="small"
            onClick={() => setFilter('brand', filters.brand === b ? undefined : b)}
            color={filters.brand === b ? 'primary' : 'default'}
            variant={filters.brand === b ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      {/* PERMUTA */}
      <FormControlLabel
        control={<Checkbox size="small" checked={filters.acceptsTrade ?? false} onChange={(e) => setFilter('acceptsTrade', e.target.checked)} />}
        label={<Typography variant="body2">Acepta permuta</Typography>}
      />

      <Box mt={2} display="flex" gap={1}>
        <Button variant="contained" fullWidth onClick={applyPrice}>
          Aplicar filtros
        </Button>
      </Box>
      {activeFilterCount > 0 && (
        <Button variant="text" fullWidth sx={{ mt: 1 }} onClick={clearAll}>
          Limpiar filtros ({activeFilterCount})
        </Button>
      )}
    </Box>
  );

  const isSellerMode = Boolean(filters.sellerId);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* ===== BUSCADOR SUPERIOR ===== */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Tabs value={searchMode} onChange={(_, v) => { setSearchMode(v); setSellerResults([]); }} sx={{ mb: 1 }}>
          <Tab value="productos" label="Productos" />
          <Tab value="marcas" label="Marcas" />
          <Tab value="vendedores" label="Vendedores" />
          <Tab value="categorias" label="Categorías" />
        </Tabs>
        <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
          <TextField
            fullWidth
            size="small"
            value={quickTerm}
            placeholder={
              searchMode === 'productos'
                ? 'Buscar productos... (ej: RTX, celular, juego)'
                : searchMode === 'marcas'
                ? 'Buscar marca... (ej: Samsung, Sony, Logitech)'
                : 'Buscar vendedor o ciudad... (ej: La Paz, "Tech Store")'
            }
            onChange={(e) => {
              setQuickTerm(e.target.value);
              if (searchMode === 'vendedores') searchSellers(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchMode !== 'vendedores') handleQuickSearch(quickTerm);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: quickTerm ? (
                <IconButton size="small" onClick={() => { setQuickTerm(''); if (searchMode === 'vendedores') setSellerResults([]); }}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              ) : null,
            }}
          />
          {searchMode !== 'vendedores' && (
            <Button variant="contained" onClick={() => handleQuickSearch(quickTerm)}>
              Buscar
            </Button>
          )}
        </Box>

        {/* Resultados de vendedores */}
        {searchMode === 'vendedores' && (
          <Box mt={1}>
            {searchingSellers && <CircularProgress size={20} />}
            {sellerResults.length > 0 && (
              <List dense>
                {sellerResults.map((s) => (
                  <ListItemButton key={s.id} onClick={() => selectSeller(s)}>
                    <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                      {s.storeLogo ? <img src={s.storeLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <StorefrontIcon fontSize="small" />}
                    </Avatar>
                    <ListItemText
                      primary={s.storeName}
                      secondary={`${s.locationCity}, ${s.locationState}${s.storeCategory ? ' · ' + s.storeCategory : ''} · ⭐ ${s.rating}`}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
            {!searchingSellers && sellerResults.length === 0 && quickTerm.length >= 2 && (
              <Typography variant="caption" color="text.secondary">
                Sin vendedores que coincidan con "{quickTerm}"
              </Typography>
            )}
          </Box>
        )}

        {/* Selector de categorías / subcategorías */}
        {searchMode === 'categorias' && (
          <Box mt={1}>
            <Typography variant="body2" fontWeight={600} mb={1}>
              Explorá por categoría o subcategoría:
            </Typography>
            <Box display="flex" flexDirection="column" gap={0.5}>
              {categories.map((cat) => (
                <Box key={cat.id}>
                  <Button
                    size="small"
                    variant={filters.categoryIds?.includes(cat.id) ? 'contained' : 'outlined'}
                    onClick={() => navigate(`/categoria/${cat.slug}`)}
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', mb: 0.25 }}
                  >
                    {cat.name} ({cat.children?.reduce((acc, c) => acc + (c.productCount ?? 0), 0) ?? 0})
                  </Button>
                  <Box pl={3} display="flex" flexWrap="wrap" gap={0.5} mb={0.5}>
                    {cat.children?.slice(0, 8).map((child) => (
                      <Chip
                        key={child.id}
                        label={`↳ ${child.name}`}
                        size="small"
                        onClick={() => navigate(`/categoria/${child.slug}`)}
                        color={filters.categoryIds?.includes(child.id) ? 'primary' : 'default'}
                        variant={filters.categoryIds?.includes(child.id) ? 'filled' : 'outlined'}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* ===== FILTRO ACTIVO DE VENDEDOR ===== */}
      {isSellerMode && (
        <Paper sx={{ p: 1, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorefrontIcon color="primary" />
          <Typography variant="body2" fontWeight={600}>
            Tienda seleccionada:
          </Typography>
          <Button size="small" onClick={() => { const p = new URLSearchParams(searchParams); p.delete('sellerId'); setSearchParams(p); }}>
            Quitar filtro de tienda
          </Button>
        </Paper>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {filters.search ? `Resultados para "${filters.search}"` : 'Todos los productos'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {total} productos de todas las tiendas
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={() => setDrawerOpen(true)} sx={{ display: { md: 'none' } }}>
            <Badge badgeContent={activeFilterCount} color="primary">
              <FilterListIcon />
            </Badge>
          </IconButton>
          <select
            value={filters.sort || ''}
            onChange={(e) => setFilter('sort', e.target.value || undefined)}
            style={{ padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
          >
            <option value="">Más recientes</option>
            <option value="price_asc">Menor precio</option>
            <option value="price_desc">Mayor precio</option>
            <option value="best_sellers">Más vendidos</option>
          </select>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* Filtros desktop */}
        <Grid item md={3} sx={{ display: { xs: 'none', md: 'block' } }}>
          <Box sx={{ position: 'sticky', top: 80 }}>{filterContent}</Box>
        </Grid>

        <Grid item xs={12} md={9}>
          {loading ? (
            <ProductGridSkeleton count={12} />
          ) : products.length === 0 ? (
            <EmptyState message="No se encontraron productos con esos filtros" />
          ) : (
            <InfiniteScrollGrid
              hasMore={hasMore}
              loading={loadingMore}
              fetchNext={loadMore}
              total={total}
              emptyMessage="No se encontraron productos con esos filtros"
            >
              <Grid container spacing={2}>
                {products.map((p) => (
                  <Grid item xs={6} sm={4} lg={3} xl={2.4} key={p.id}>
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
            </InfiniteScrollGrid>
          )}
        </Grid>
      </Grid>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {filterContent}
      </Drawer>
    </Container>
  );
}
