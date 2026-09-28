import { useEffect, useState } from 'react';
import { Container, Grid, Box, IconButton } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { api, getErrorMessage } from '../../services/api';
import ProductCard from '../../components/ui/ProductCard';
import toast from 'react-hot-toast';
import { useUnifiedTokens } from '../../theme';
import { PageHeader } from '../../components/redesign/PageHeader';
import { EmptyState } from '../../components/redesign/States';
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerList';

export default function WishlistPage() {
  const t = useUnifiedTokens();
  const [items, setItems] = useState<any[]>([]);

  const load = () =>
    api
      .get('/wishlist')
      .then((res) => setItems(res.data.data))
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const remove = async (productId: number) => {
    try {
      await api.delete(`/wishlist/${productId}`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <PageHeader title="Mis favoritos" subtitle={`${items.length} ${items.length === 1 ? 'producto' : 'productos'}`} icon={<FavoriteIcon />} />

      {items.length === 0 ? (
        <EmptyState message="No tienes productos en favoritos" />
      ) : (
        <StaggerContainer>
        <Grid container spacing={2}>
          {items.map((w) => (
            <Grid item xs={6} sm={4} md={3} lg={2.4} key={w.id}>
              <StaggerItem>
              <Box position="relative">
                <ProductCard product={w.product} />
                <IconButton
                  onClick={() => remove(w.product.id)}
                  sx={{ position: 'absolute', top: 8, right: 8, bgcolor: t.surfaceContainerLowest, boxShadow: t.cardShadow, zIndex: 2 }}
                  size="small"
                >
                  <FavoriteIcon color="error" fontSize="small" />
                </IconButton>
              </Box>
              </StaggerItem>
            </Grid>
          ))}
        </Grid>
        </StaggerContainer>
      )}
    </Container>
  );
}
