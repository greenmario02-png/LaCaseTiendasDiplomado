import React, { useMemo,  useEffect, useState  } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, getErrorMessage, resolveImageUrl } from '../services/api';
import { ProductCard } from '../components/redesign/ProductCard';
import { NeoButton } from '../components/redesign/NeoButton';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { Heart } from 'lucide-react-native';
import { useAppTheme } from '../theme/ThemeContext';

export default function WishlistScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/wishlist');
      setItems(data.data ?? []);
    } catch {}
    setLoading(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  const remove = async (productId: number) => {
    try {
      await api.delete(`/wishlist/${productId}`);
      setItems((prev) => prev.filter((i) => i.product?.id !== productId && i.id !== productId));
    } catch {}
  };

  if (loading) {
    return <LoadingState />;
  }

  const products = items.map((i) => i.product ?? i);

  return (
    <View style={styles.flex}>
      <View style={styles.titleRow}>
        <Heart size={20} color={colors.error} fill={colors.error} />
        <Text style={styles.title}>Mis favoritos</Text>
      </View>
      {products.length === 0 ? (
        <View style={styles.center}>
          <EmptyState message="No tenés favoritos todavía" />
          <NeoButton title="Explorar productos" variant="ghost" onPress={() => navigation.navigate('Products')} />
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => String(item.id)}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 12, marginBottom: 12 }}
          contentContainerStyle={{ paddingBottom: 90 }}
          renderItem={({ item }) => (
            <View style={{ flex: 1, maxWidth: '48%' }}>
              <ProductCard
                id={item.id}
                name={item.name}
                price={Number(item.price)}
                salePrice={item.salePrice ? Number(item.salePrice) : null}
                stock={item.stock}
                storeName={item.seller?.storeName ?? null}
                image={item.images?.[0]?.url ? resolveImageUrl(item.images[0].url) : null}
                onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  titleRow: { flexDirection: 'row', gap: 6, alignItems: 'center', padding: 16 },
});
