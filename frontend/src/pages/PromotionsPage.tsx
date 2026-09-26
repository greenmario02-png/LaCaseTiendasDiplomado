import { useEffect, useState } from 'react';
import { Container, Typography, Grid, Chip, Box } from '@mui/material';
import { api } from '../services/api';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { useMoney } from '../hooks/useMoney';
import { useUnifiedTokens } from '../theme';
import { PageHeader, SurfaceCard } from '../components/redesign/PageHeader';
import { EmptyState } from '../components/redesign/States';
import { StaggerContainer, StaggerItem } from '../components/motion/StaggerList';
import ProductCard from '../components/ui/ProductCard';
import { ProductGridSkeleton } from '../components/ui/LoadingSkeleton';

export default function PromotionsPage() {
  const money = useMoney();
  const t = useUnifiedTokens();
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
      <PageHeader title="Promociones activas" subtitle="Aprovechá los mejores descuentos" icon={<LocalOfferIcon />} />
      {promotions.length === 0 && (
        <SurfaceCard>
          <EmptyState message="No hay promociones activas en este momento." />
        </SurfaceCard>
      )}

      <StaggerContainer>
      {promotions.map((promo) => (
        <StaggerItem key={promo.id}>
        <SurfaceCard sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
            <Chip
              label={promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}% OFF` : `${money(promo.discountValue)} OFF`}
              color="primary"
            />
            <Typography variant="h6" fontWeight={700} color={t.onSurface}>
              {promo.title}
            </Typography>
            <Typography variant="body2" color={t.onSurfaceVariant}>
              Hasta el {new Date(promo.endDate).toLocaleDateString('es-BO')}
            </Typography>
          </Box>
          {promo.description && (
            <Typography variant="body2" color={t.onSurfaceVariant} mb={2}>
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
        </SurfaceCard>
        </StaggerItem>
      ))}
      </StaggerContainer>
    </Container>
  );
}
