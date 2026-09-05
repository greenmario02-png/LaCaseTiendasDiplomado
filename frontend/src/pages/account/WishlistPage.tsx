import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Typography, Grid, Paper, Box, IconButton, Chip } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { api, getErrorMessage } from '../../services/api';
import ProductCard from '../../components/ui/ProductCard';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

export default function WishlistPage() {
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
      <Typography variant="h5" fontWeight={700} mb={3}>
        Mis favoritos ({items.length})
      </Typography>

      {items.length === 0 ? (
        <EmptyState message="No tenés productos en favoritos" />
      ) : (
        <Grid container spacing={2}>
          {items.map((w) => (
            <Grid item xs={6} sm={4} md={3} lg={2.4} key={w.id}>
              <Box position="relative">
                <ProductCard product={w.product} />
                <IconButton
                  onClick={() => remove(w.product.id)}
                  sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'background.paper', boxShadow: 1, zIndex: 2 }}
                  size="small"
                >
                  <FavoriteIcon color="error" fontSize="small" />
                </IconButton>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
