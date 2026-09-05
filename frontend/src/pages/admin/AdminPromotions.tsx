import { useEffect, useState } from 'react';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import { Flame } from 'lucide-react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Stack,
  Autocomplete,
  Alert,
  Avatar,
  Divider,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import StorefrontIcon from '@mui/icons-material/Storefront';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { api } from '../../services/api';
import { getErrorMessage } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import toast from 'react-hot-toast';

interface SellerOption {
  id: number;
  storeName: string;
  email: string;
  locationCity: string;
}

interface ProductOption {
  id: number;
  name: string;
  sku: string;
  price: string;
  originalPrice?: string | null;
  images?: Array<{ url: string }>;
  seller?: { storeName: string };
}

interface SelectedProduct {
  product: ProductOption;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  finalPrice: number;
}

const EMPTY = { title: '', description: '', discountType: 'PERCENTAGE', discountValue: '10', startDate: '', endDate: '' };

export default function AdminPromotions() {
  const money = useMoney();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  // Selector tienda -> producto
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<SellerOption | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [productResults, setProductResults] = useState<ProductOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);

  const load = () => api.get('/admin/promotions').then((res) => setPromotions(res.data.data)).catch(() => {});
  useEffect(() => {
    load();
    api
      .get('/admin/users', { params: { role: 'SELLER', limit: 200 } })
      .then((res) => setSellers(res.data.data))
      .catch(() => {});
  }, []);

  const searchProducts = async (term: string) => {
    setSearchTerm(term);
    if (!term.trim() || !selectedSeller) {
      setProductResults([]);
      return;
    }
    setSearching(true);
    try {
      // Buscar productos del vendedor por nombre o SKU
      const res = await api.get('/products', { params: { search: term.trim(), limit: 20 } });
      // filtrar por vendedor y excluir los ya agregados
      const filtered = res.data.data.filter(
        (p: any) => p.seller?.id === selectedSeller.id && !selectedProducts.some((sp) => sp.product.id === p.id)
      );
      setProductResults(filtered);
    } catch {
      setProductResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addProduct = (product: ProductOption) => {
    const discountType = form.discountType as 'PERCENTAGE' | 'FIXED';
    const discountValue = Number(form.discountValue) || 0;
    const price = Number(product.price);
    const finalPrice = discountType === 'PERCENTAGE' ? price * (1 - discountValue / 100) : Math.max(0, price - discountValue);

    setSelectedProducts((prev) => [...prev, { product, discountType, discountValue, finalPrice }]);
    setProductResults([]);
    setSearchTerm('');
  };

  const removeProduct = (productId: number) => {
    setSelectedProducts((prev) => prev.filter((sp) => sp.product.id !== productId));
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error('Escribí el nombre de la promoción');
      return;
    }
    if (selectedProducts.length === 0) {
      toast.error('Agregá al menos un producto');
      return;
    }
    try {
      const payload: any = {
        title: form.title,
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        startDate: form.startDate,
        endDate: form.endDate,
        productIds: selectedProducts.map((sp) => sp.product.id),
      };
      await api.post('/admin/promotions', payload);
      toast.success('Promoción creada con ' + selectedProducts.length + ' producto(s)');
      setDialogOpen(false);
      setForm(EMPTY);
      setSelectedProducts([]);
      setSelectedSeller(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <PrimaryButton startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Nueva promoción
        </PrimaryButton>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Promoción</TableCell>
              <TableCell align="center">Descuento</TableCell>
              <TableCell>Vigencia</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Productos</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {promotions.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {p.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {p.description}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={p.discountType === 'PERCENTAGE' ? `${p.discountValue}% OFF` : `${money(p.discountValue)} OFF`}
                    color="primary"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(p.startDate).toLocaleDateString('es-BO')} → {new Date(p.endDate).toLocaleDateString('es-BO')}
                </TableCell>
                <TableCell align="center">
                  <Chip label={p.isActive ? 'Activa' : 'Inactiva'} size="small" color={p.isActive ? 'success' : 'default'} />
                </TableCell>
                <TableCell align="center">
                  <Box display="flex" gap={0.5} justifyContent="center" flexWrap="wrap" maxWidth={180}>
                    {(p.products ?? []).slice(0, 5).map((prow: any) =>
                      prow.product?.images?.[0] ? (
                        <img
                          key={prow.product.id}
                          src={prow.product.images[0].url}
                          alt={prow.product.name}
                          title={prow.product.name}
                          style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                        />
                      ) : null
                    )}
                    <Typography variant="caption" color="text.secondary" width="100%">
                      {p.products?.length || 0} producto{(p.products?.length ?? 0) === 1 ? '' : 's'}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {/* ============ DIALOG ============ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <LocalOfferIcon color="primary" /> Nueva promoción
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Box display="flex" gap={2} flexWrap="wrap">
              <TextField
                label="Nombre de la promoción"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej: Hot Sale de Hardware"
                sx={{ flex: 1, minWidth: 250 }}
                required
              />
              <TextField
                label="Descripción (opcional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ej: Descuentos en productos seleccionados"
                sx={{ flex: 1, minWidth: 250 }}
              />
            </Box>

            <Box display="flex" gap={2} flexWrap="wrap">
              <TextField
                select
                label="Tipo de descuento"
                value={form.discountType}
                onChange={(e) => {
                  setForm({ ...form, discountType: e.target.value });
                  // Recalcular precios de los productos ya agregados
                  setSelectedProducts((prev) =>
                    prev.map((sp) => {
                      const v = Number(form.discountValue) || 0;
                      const price = Number(sp.product.price);
                      const final =
                        e.target.value === 'PERCENTAGE' ? price * (1 - v / 100) : Math.max(0, price - v);
                      return { ...sp, discountType: e.target.value as any, discountValue: v, finalPrice: final };
                    })
                  );
                }}
                sx={{ width: 180 }}
              >
                <MenuItem value="PERCENTAGE">Porcentaje (%)</MenuItem>
                <MenuItem value="FIXED">Monto fijo (Bs)</MenuItem>
              </TextField>
              <TextField
                label={form.discountType === 'PERCENTAGE' ? 'Descuento (%)' : 'Descuento (Bs)'}
                type="number"
                value={form.discountValue}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  setForm({ ...form, discountValue: e.target.value });
                  setSelectedProducts((prev) =>
                    prev.map((sp) => {
                      const price = Number(sp.product.price);
                      const final =
                        form.discountType === 'PERCENTAGE' ? price * (1 - v / 100) : Math.max(0, price - v);
                      return { ...sp, discountValue: v, finalPrice: final };
                    })
                  );
                }}
                sx={{ width: 160 }}
              />
              <TextField
                label="Inicio"
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Fin"
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <Divider />

            {/* ===== SELECCIÓN DE PRODUCTOS ===== */}
            <Box>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>
                Productos incluidos ({selectedProducts.length})
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Elegí la <strong>tienda</strong> y buscá el <strong>producto</strong> por nombre o código (SKU). Podés
                  agregar varios.
                </Typography>
              </Alert>

              <Stack spacing={1} mb={2}>
                <Autocomplete
                  options={sellers}
                  getOptionLabel={(s) => `${s.storeName} (${s.locationCity})`}
                  value={selectedSeller}
                  onChange={(_, s) => {
                    setSelectedSeller(s);
                    setProductResults([]);
                    setSearchTerm('');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="1. Elegí la tienda"
                      placeholder="Buscar tienda..."
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <StorefrontIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />

                <TextField
                  label="2. Buscar producto por nombre o código"
                  value={searchTerm}
                  onChange={(e) => searchProducts(e.target.value)}
                  disabled={!selectedSeller}
                  placeholder={selectedSeller ? 'Ej: RTX 4090, o el SKU' : 'Primero elegí la tienda'}
                  InputProps={{
                    startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />

                {searching && <Typography variant="caption">Buscando...</Typography>}

                {productResults.length > 0 && (
                  <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {productResults.map((p) => (
                      <Box
                        key={p.id}
                        display="flex"
                        alignItems="center"
                        gap={1}
                        px={1.5}
                        py={1}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                        onClick={() => addProduct(p)}
                      >
                        <Avatar variant="rounded" sx={{ width: 36, height: 36 }}>
                          {p.images?.[0] ? (
                            <img src={p.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <StorefrontIcon fontSize="small" />
                          )}
                        </Avatar>
                        <Box flex={1}>
                          <Typography variant="body2" fontWeight={600}>
                            {p.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {p.sku}
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={600}>
                          {money(p.price)}
                        </Typography>
                        <Chip label="Agregar" size="small" color="primary" />
                      </Box>
                    ))}
                  </Paper>
                )}
              </Stack>

              {/* ===== PRODUCTOS AGREGADOS ===== */}
              {selectedProducts.length > 0 && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Productos seleccionados:
                  </Typography>
                  {selectedProducts.map((sp) => (
                    <Paper key={sp.product.id} variant="outlined" sx={{ p: 1 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar variant="rounded" sx={{ width: 40, height: 40 }}>
                          {sp.product.images?.[0] ? (
                            <img src={sp.product.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <StorefrontIcon fontSize="small" />
                          )}
                        </Avatar>
                        <Box flex={1}>
                          <Typography variant="body2" fontWeight={600}>
                            {sp.product.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {sp.product.sku} · Precio: {money(sp.product.price)}
                          </Typography>
                        </Box>
                        <Box textAlign="right">
                          <Typography variant="body2" fontWeight={700} className="price-color">
                            {money(sp.finalPrice)}
                          </Typography>
                          <Chip
                            label={sp.discountType === 'PERCENTAGE' ? `-${sp.discountValue}%` : `-${money(sp.discountValue)}`}
                            size="small"
                            color="success"
                          />
                        </Box>
                        <IconButton size="small" color="error" onClick={() => removeProduct(sp.product.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>

            {/* ===== PREVIEW ===== */}
            {selectedProducts.length > 0 && (
              <Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Vista previa del artículo en la tienda
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, maxWidth: 260, mx: 'auto' }}>
                  <Box className="image-container" sx={{ aspectRatio: '1/1', borderRadius: 2, mb: 1 }}>
                    {selectedProducts[0].product.images?.[0] ? (
                      <img
                        src={selectedProducts[0].product.images[0].url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <StorefrontIcon sx={{ fontSize: 48, color: '#ccc' }} />
                    )}
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="h6" className="price-color" fontWeight={700}>
                      {money(selectedProducts[0].finalPrice)}
                    </Typography>
                    <Chip
                      label={selectedProducts[0].discountType === 'PERCENTAGE' ? `-${selectedProducts[0].discountValue}%` : `-${money(selectedProducts[0].discountValue)}`}
                      size="small"
                      color="success"
                    />
                  </Box>
                  <Typography variant="body2" className="strikethrough">
                    {money(selectedProducts[0].product.price)}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} mt={0.5} noWrap>
                    {selectedProducts[0].product.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedProducts[0].product.seller?.storeName || selectedSeller?.storeName}
                  </Typography>
                  {form.title && (
                    <Box mt={1}>
                      <Chip label={form.title} size="small" color="primary" variant="outlined" />
                    </Box>
                  )}
                </Paper>
                <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={1}>
                  Así se verá el primer producto agregado en la página de promociones.
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setDialogOpen(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={save} disabled={selectedProducts.length === 0}>
            Crear promoción
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
