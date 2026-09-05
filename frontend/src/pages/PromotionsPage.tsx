import { useEffect, useState } from 'react';
import { Container, Typography, Grid, Paper, Chip, Box } from '@mui/material';
import { api } from '../services/api';
import { useMoney } from '../hooks/useMoney';
import ProductCard from '../components/ui/ProductCard';
import { ProductGridSkeleton } from '../components/ui/LoadingSkeleton';

export default function PromotionsPage() {
  const money = useMoney();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/promotions')
      .then((res) => setPromotions(res.data.data))
      .catch(() => setPromotions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ProductGridSkeleton count={3} />;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Promociones activas
      </Typography>
      {promotions.length === 0 && <Typography color="text.secondary">No hay promociones activas en este momento.</Typography>}

      {promotions.map((promo) => (
        <Paper key={promo.id} sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
            <Chip
              label={promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}% OFF` : `${money(promo.discountValue)} OFF`}
              color="primary"
            />
            <Typography variant="h6" fontWeight={700}>
              {promo.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Hasta el {new Date(promo.endDate).toLocaleDateString('es-BO')}
            </Typography>
          </Box>
          {promo.description && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              {promo.description}
            </Typography>
          )}
          <Grid container spacing={2}>
            {promo.products?.map((pp: any) => (
              <Grid item xs={6} sm={4} md={3} lg={2.4} key={pp.product.id}>
                <ProductCard product={pp.product} />
              </Grid>
            ))}
          </Grid>
        </Paper>
      ))}
    </Container>
  );
}
