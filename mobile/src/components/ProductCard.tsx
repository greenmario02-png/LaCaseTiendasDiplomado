import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { resolveImageUrl } from '../services/api';

export interface Product {
  id: number;
  name: string;
  price: string | number;
  originalPrice?: string | number | null;
  stock: number;
  condition?: string;
  saleCount?: number;
  images?: { url: string }[];
  seller?: { storeName?: string; rating?: number };
}

function formatPrice(value: string | number): string {
  const n = Number(value);
  return n.toLocaleString('es-BO', { maximumFractionDigits: 0 }) + ' Bs';
}

function verdict(rating: number): { label: string; color: string } {
  if (rating >= 4.5) return { label: 'Muy recomendado', color: colors.success };
  if (rating >= 3.5) return { label: 'Recomendado', color: colors.info };
  return { label: 'No recomendado', color: colors.warning };
}

export default function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const image = resolveImageUrl(product.images?.[0]?.url);
  const outOfStock = product.stock <= 0;
  const original = product.originalPrice ? Number(product.originalPrice) : 0;
  const hasDiscount = original > Number(product.price);
  const rating = product.seller?.rating ?? 0;
  const v = rating > 0 ? verdict(rating) : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.imageWrap}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.noImage]}>
            <Text style={{ color: '#999' }}>Sin imagen</Text>
          </View>
        )}
        {outOfStock && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Sin stock</Text>
          </View>
        )}
        {hasDiscount && !outOfStock && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>-{Math.round(((original - Number(product.price)) / original) * 100)}%</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          {hasDiscount && <Text style={styles.oldPrice}>{formatPrice(product.originalPrice!)}</Text>}
        </View>
        {product.seller?.storeName && (
          <Text style={styles.seller} numberOfLines={1}>
            {product.seller.storeName}
          </Text>
        )}
        {v && (
          <View style={styles.verdictRow}>
            <Star size={11} color={colors.warning} fill={colors.warning} />
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{rating.toFixed(1)}</Text>
            <Text style={[styles.verdict, { color: v.color }]}>{v.label}</Text>
          </View>
        )}
        {product.saleCount ? <Text style={styles.sold}>{product.saleCount} vendidos</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  imageWrap: { position: 'relative' },
  image: { width: '100%', aspectRatio: 1 },
  noImage: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F0F0' },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.error,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  body: { padding: 10, gap: 2 },
  name: { fontSize: 13, fontWeight: '600', color: colors.text, minHeight: 34 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  price: { fontSize: 15, fontWeight: '800', color: colors.price },
  oldPrice: { fontSize: 12, color: colors.textSecondary, textDecorationLine: 'line-through' },
  seller: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  verdict: { fontSize: 11, fontWeight: '700' },
  sold: { fontSize: 11, color: colors.success, fontWeight: '600' },
});
