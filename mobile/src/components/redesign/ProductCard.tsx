import React from 'react';
import { Text, View, Image, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { PriceDisplay } from './PriceDisplay';

export interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  salePrice?: number | null;
  stock: number;
  storeName?: string | null;
  image?: string | null;
  onPress?: () => void;
  onAddToCart?: () => void;
  style?: ViewStyle;
}

export function ProductCard({
  name,
  price,
  salePrice,
  stock,
  storeName,
  image,
  onPress,
  onAddToCart,
  style,
}: ProductCardProps) {
  const { colors: c, raised } = useAppTheme();
  const out = stock <= 0;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: c.surface, ...raised }, style]}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.img} resizeMode="cover" />
      ) : (
        <View style={[styles.img, styles.placeholder, { backgroundColor: c.background }]}>
          <Text style={{ fontSize: 28 }}>📦</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>
          {name}
        </Text>
        {storeName ? (
          <Text style={[styles.store, { color: c.textSecondary }]} numberOfLines={1}>
            {storeName}
          </Text>
        ) : null}
        <PriceDisplay price={price} salePrice={salePrice} />
        {out ? (
          <Text style={[styles.badge, { color: c.error }]}>Sin stock</Text>
        ) : (
          <Text style={[styles.badge, { color: c.success }]}>{`${stock} disponibles`}</Text>
        )}
        {onAddToCart ? (
          <Pressable
            onPress={onAddToCart}
            disabled={out}
            style={[styles.addBtn, { backgroundColor: out ? c.textSecondary : c.primary }]}
          >
            <Text style={styles.addText}>{out ? 'Sin stock' : 'Agregar al carrito'}</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  img: { width: '100%', height: 150 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 14, gap: 6 },
  name: { fontSize: 14, fontWeight: '600' },
  store: { fontSize: 12 },
  badge: { fontSize: 12, fontWeight: '600' },
  addBtn: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  addText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
