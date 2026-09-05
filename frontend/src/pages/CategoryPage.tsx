import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Typography, Grid, Breadcrumbs } from '@mui/material';
import { api } from '../services/api';
import { ProductCard } from '../components/redesign/ProductCard';
import { ProductGridSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/redesign/States';

export default function CategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/products/categories')
      .then((res) => {
        // buscar en el árbol
        let found: any = null;
        const walk = (items: any[]) => {
          for (const c of items) {
            if (c.slug === slug) { found = c; return; }
            if (c.children) {
              const child = c.children.find((ch: any) => ch.slug === slug);
              if (child) { found = { ...child, name: child.name }; return; }
            }
          }
        };
        walk(res.data.data);
        setCategory(found);

        if (found) {
          const categoryId = found.id;
          // recolectar la categoría + todas sus subcategorías para el filtro
          const ids = [categoryId];
          if (Array.isArray(found.children)) ids.push(...found.children.map((c: any) => c.id));
          const descendants = res.data.data.flatMap((c: any) => (c.id === categoryId ? c.children ?? [] : []));
          ids.push(...descendants.map((c: any) => c.id));
          const uniqueIds = [...new Set(ids)];
          api
            .get(`/products`, { params: { categoryIds: uniqueIds.join(','), limit: 60 } })
            .then((p) => setProducts(p.data.data))
            .catch(() => setProducts([]));
        } else {
          setProducts([]);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Typography component={Link} to="/" color="inherit" sx={{ textDecoration: 'none' }}>
          Inicio
        </Typography>
        <Typography color="text.primary">{category?.name || 'Categoría'}</Typography>
      </Breadcrumbs>
      <Typography variant="h5" fontWeight={700} mb={2}>
        {category?.name || 'Categoría'}
      </Typography>

      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : products.length === 0 ? (
        <EmptyState message="No hay productos en esta categoría" />
      ) : (
        <Grid container spacing={2}>
          {products.map((p) => (
            <Grid item xs={6} sm={4} md={3} lg={2.4} key={p.id}>
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
      )}
    </Container>
  );
}
