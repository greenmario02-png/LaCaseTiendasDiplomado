import { Box, Button, Card, CardActionArea, CardContent, CardMedia, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { getUnifiedTokens } from '../../theme';
import { PriceDisplay } from './PriceDisplay';

export interface CardProduct {
  id: number;
  name: string;
  price: number;
  salePrice?: number;
  stock: number;
  storeName?: string;
  rating?: number;
  image?: string | null;
}

interface ProductCardProps {
  product: CardProduct;
  onAddToCart?: () => void;
  onClick?: () => void;
}

/** Tarjeta de producto del rediseño Unified: imagen, precio Bs, tienda, stock, agregar al carrito. */
export function ProductCard({ product, onAddToCart, onClick }: ProductCardProps) {
  const tokens = getUnifiedTokens(false);
  const out = product.stock <= 0;
  const body = (
    <>
      {product.image ? (
        <CardMedia component="img" height="140" image={product.image} alt={product.name} />
      ) : (
        <Box sx={{ height: 140, bgcolor: tokens.surfaceContainerLowest, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h4">📦</Typography>
        </Box>
      )}
      <CardContent sx={{ pb: '8px !important' }}>
        <Typography variant="subtitle1" fontWeight={700} noWrap>
          {product.name}
        </Typography>
        {product.storeName && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {product.storeName}
          </Typography>
        )}
        <Box sx={{ mt: 1 }}>
          <PriceDisplay price={product.price} salePrice={product.salePrice} />
        </Box>
        {out ? (
          <Chip label="Sin stock" size="small" color="error" sx={{ mt: 1 }} />
        ) : (
          <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
            {product.stock} disponibles
          </Typography>
        )}
      </CardContent>
    </>
  );
  return (
    <Card sx={{ borderRadius: '8px', boxShadow: tokens.cardShadow, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={onClick} sx={{ flex: 1 }}>{body}</CardActionArea>
      <Box sx={{ p: 1.5, pt: 0 }}>
        <Button
          fullWidth
          variant="contained"
          disabled={out}
          onClick={onAddToCart}
          startIcon={out ? <ShoppingCartIcon /> : <AddShoppingCartIcon />}
          sx={{ minHeight: 40, borderRadius: '8px', textTransform: 'none' }}
        >
          {out ? 'Sin stock' : 'Agregar al carrito'}
        </Button>
      </Box>
    </Card>
  );
}

export interface EmptyStateProps {
  message: string;
  action?: React.ReactNode;
}
