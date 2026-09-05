import { useEffect, useState } from 'react';
import { Box, Paper, Typography, Chip, CircularProgress, Grid } from '@mui/material';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import InventoryIcon from '@mui/icons-material/Inventory';
import { api } from '../../services/api';
import CountdownTimer from './CountdownTimer';
import { vision } from '../../theme/vision';

interface SalesTodayProduct {
  productId: number;
  name: string;
  quantity: number;
}

interface ActivePromotion {
  id: number;
  title: string;
  description?: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  endDate: string;
  products: Array<{ product: { id: number; name: string; images: Array<{ url: string }> } }>;
}

interface SalesTodayWidgetProps {
  endpoint: '/admin/sales-today' | '/seller/sales-today';
  showPromotions?: boolean;
  /** Modo oscuro (Vision UI): tarjeta glass sobre fondo gradiente */
  dark?: boolean;
}

/**
 * Widget "Ventas de hoy": productos vendidos en el día (nombre + cantidad)
 * y promociones activas con cuenta regresiva (C3 + C5).
 */
export default function SalesTodayWidget({ endpoint, showPromotions = true, dark = false }: SalesTodayWidgetProps) {
  const [products, setProducts] = useState<SalesTodayProduct[]>([]);
  const [promotions, setPromotions] = useState<ActivePromotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(endpoint)
      .then((res) => {
        setProducts(res.data.data?.products ?? []);
        setPromotions(res.data.data?.promotions ?? []);
      })
      .catch(() => {
        setProducts([]);
        setPromotions([]);
      })
      .finally(() => setLoading(false));
  }, [endpoint]);

  const discountLabel = (p: ActivePromotion) =>
    p.discountType === 'PERCENTAGE' ? `${Number(p.discountValue)}%` : `Bs ${Number(p.discountValue)}`;

  return (
    <>
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%', ...(dark ? { ...vision.card, color: '#fff' } : {}) }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <InventoryIcon fontSize="small" sx={{ color: dark ? '#6ad2ff' : 'primary.main' }} />
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: dark ? '#fff' : undefined }}>
                Productos vendidos hoy
              </Typography>
              {loading && <CircularProgress size={14} sx={{ ml: 'auto', color: dark ? '#6ad2ff' : undefined }} />}
            </Box>
            {!loading && products.length === 0 && (
              <Typography variant="body2" sx={{ color: dark ? vision.text.muted : 'text.secondary' }}>
                Todavía no hay ventas hoy.
              </Typography>
            )}
            <Box>
              {products.slice(0, 10).map((p) => (
                <Box key={p.productId} display="flex" justifyContent="space-between" alignItems="center" py={0.5}>
                  <Typography variant="body2" noWrap sx={{ maxWidth: '70%', color: dark ? vision.text.secondary : undefined }}>
                    {p.name}
                  </Typography>
                  <Chip label={`${p.quantity} vendido(s)`} size="small" variant="outlined" sx={dark ? vision.chipGhost('#00d12a') : { color: 'success.main' }} />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {showPromotions && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%', ...(dark ? { ...vision.card, color: '#fff' } : {}) }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <LocalOfferIcon fontSize="small" sx={{ color: dark ? '#ff5858' : 'error.main' }} />
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: dark ? '#fff' : undefined }}>
                  Promociones activas
                </Typography>
                {loading && <CircularProgress size={14} sx={{ ml: 'auto', color: dark ? '#6ad2ff' : undefined }} />}
              </Box>
              {!loading && promotions.length === 0 && (
                <Typography variant="body2" sx={{ color: dark ? vision.text.muted : 'text.secondary' }}>
                  No hay promociones activas.
                </Typography>
              )}
              {promotions.map((p) => (
                <Box key={p.id} py={0.75}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
                    <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: '55%', color: dark ? '#fff' : undefined }}>
                      {p.title}
                    </Typography>
                    <Chip label={discountLabel(p)} size="small" sx={dark ? vision.chipGhost('#ff5858') : { color: 'error.main' }} />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
                    <Typography variant="caption" noWrap sx={{ maxWidth: '55%', color: dark ? vision.text.muted : 'text.secondary' }}>
                      {p.products?.[0]?.product?.name ?? 'Productos seleccionados'}
                    </Typography>
                    <CountdownTimer targetDate={p.endDate} compact />
                  </Box>
                </Box>
              ))}
            </Paper>
          </Grid>
        )}
      </Grid>
    </>
  );
}
