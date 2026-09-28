import { Link } from 'react-router-dom';
import {
  Card,
  CardActionArea,
  CardContent,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useTranslation } from 'react-i18next';
import PriceDisplay from './PriceDisplay';
import { useAuthStore } from '../../stores/authStore';
import { useWishlistStore } from '../../stores/wishlistStore';
import type { Product } from '../../types/domain';
import { useState } from 'react';

export default function ProductCard({ product }: { product: Product }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const wishlist = useWishlistStore((s) => s.wishlist);
  const toggle = useWishlistStore((s) => s.toggle);
  const [imgFailed, setImgFailed] = useState(false);

  const image = product.images?.find((i) => i.isPrimary)?.url || product.images?.[0]?.url;
  const inWishlist = wishlist.includes(product.id);
  const outOfStock = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  const slug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const conditionLabel =
    product.condition === 'USED'
      ? t('product.condition.usedWithScore', { score: product.conditionScore ?? '?' })
      : product.condition === 'REFURBISHED'
      ? t('product.condition.refurbished')
      : t('product.condition.new');

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
        {user && (
          <Tooltip title={inWishlist ? t('product.card.removeFromWishlist') : t('product.card.addToWishlist')}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.preventDefault();
                toggle(product.id).catch(() => {});
              }}
              sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
            >
              {inWishlist ? <FavoriteIcon color="error" fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <CardActionArea component={Link} to={`/producto/${product.id}/${slug}`} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <Box className="image-container" sx={{ aspectRatio: '1/1' }}>
          {image && !imgFailed ? (
            <img
              src={image}
              alt={product.name}
              onError={() => setImgFailed(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: '0.9rem' }}>
              {t('product.detail.noImage')}
            </Box>
          )}
        </Box>
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5, pt: 1.5 }}>
          {product.tags?.slice(0, 2).map((t) => (
            <Chip key={t.tag.slug} label={t.tag.name} size="small" color="primary" variant="outlined" sx={{ width: 'fit-content', mb: 0.5 }} />
          ))}
          <Typography variant="body2" fontWeight={600} noWrap>
            {product.name}
          </Typography>

          {product.condition && product.condition !== 'NEW' && (
            <Typography variant="caption" color="text.secondary">
              {conditionLabel}
            </Typography>
          )}

          <PriceDisplay price={product.price} originalPrice={product.originalPrice} size="small" />

          <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
            <StorefrontIcon fontSize="inherit" color="action" />
            <Typography variant="caption" color="text.secondary" noWrap>
              {product.seller.storeName}
            </Typography>
          </Box>

          {outOfStock ? (
            <Chip label={t('product.detail.outOfStock')} size="small" color="error" sx={{ mt: 0.5, alignSelf: 'flex-start' }} />
          ) : lowStock ? (
            <Chip
              label={product.stock === 1 ? t('product.card.lastUnit') : t('product.card.lastUnits', { count: product.stock })}
              size="small"
              color="warning"
              sx={{ mt: 0.5, alignSelf: 'flex-start' }}
            />
          ) : null}

          {/* Prueba social: vendidos */}
          {(() => {
            const sold = product.saleCount ?? 0;
            const hasDelivery = (product.deliveryTypes?.length ?? 0) > 0;
            if (sold <= 0 && !hasDelivery) return null;
            return (
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mt={0.5}>
                {sold > 0 && (
                  <Typography variant="caption" color="success.main" fontWeight={600}>
                    {sold === 1 ? t('product.card.sold_one', { count: sold }) : t('product.card.sold_other', { count: sold })}
                  </Typography>
                )}
                {product.deliveryTypes?.includes('DELIVERY') && (
                  <Typography variant="caption" color="text.secondary">
                    {t('product.card.homeDelivery')}
                  </Typography>
                )}
                {product.deliveryTypes?.includes('PERMUTA') && (
                  <Typography variant="caption" color="text.secondary">
                    {t('product.card.tradeIn')}
                  </Typography>
                )}
              </Box>
            );
          })()}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
