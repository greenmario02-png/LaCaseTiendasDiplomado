import React, { useMemo,  useEffect, useState  } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { api, resolveImageUrl } from '../services/api';
import { ProductCard } from '../components/redesign/ProductCard';
import { NeoInput } from '../components/redesign/NeoInput';
import { LoadingState, EmptyState, ErrorState } from '../components/redesign/States';
import { useAppTheme } from '../theme/ThemeContext';

export default function ProductsScreen({ navigation, route }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { categoryId: initialCategoryId, categoryName: initialCategoryName } = route.params ?? {};
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(initialCategoryId ?? null);
  const [categoryName, setCategoryName] = useState<string | null>(initialCategoryName ?? null);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  // Cargar categorías raíz para el filtro de chips
  useEffect(() => {
    api
      .get('/products/categories')
      .then((res) => setCategories(res.data.data ?? []))
      .catch(() => setCategories([]));
  }, []);

  const load = async (cursor: string | null = null) => {
    try {
      const params: Record<string, unknown> = { limit: 20 };
      if (categoryId) params.categoryId = categoryId;
      if (search) params.search = search;
      if (cursor) params.cursor = cursor;
      const { data } = await api.get('/products', { params });
      if (cursor) {
        setProducts((prev) => [...prev, ...(data.data ?? [])]);
      } else {
        setProducts(data.data ?? []);
      }
      setNextCursor(data.meta?.nextCursor ?? null);
      setHasMore(Boolean(data.meta?.hasMore));
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Error al cargar productos');
    }
  };

  useEffect(() => {
    setLoading(true);
    setError('');
    const t = setTimeout(() => {
      load().finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [categoryId, search]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await load(nextCursor);
    setLoadingMore(false);
  };

  const selectCategory = (id: number | null, name: string | null) => {
    setCategoryId(id);
    setCategoryName(name);
  };

  return (
    <View style={styles.flex}>
      <NeoInput
        style={styles.search}
        placeholder="Buscar productos..."
        value={search}
        onChangeText={setSearch}
      />

      {/* Chips de categorías (filtrar) */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          <TouchableOpacity
            style={[styles.chip, categoryId === null && styles.chipActive]}
            onPress={() => selectCategory(null, null)}
          >
            <Text style={[styles.chipText, categoryId === null && styles.chipTextActive]}>Todas</Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, categoryId === c.id && styles.chipActive]}
              onPress={() => selectCategory(c.id, c.name)}
            >
              <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {categoryName ? <Text style={styles.title}>{categoryName}</Text> : null}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => String(item.id)}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 12, marginBottom: 12 }}
          contentContainerStyle={{ paddingBottom: 90 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={<EmptyState message="No hay productos" />}
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
  search: {
    margin: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, paddingHorizontal: 12, marginBottom: 8 },
  chipsRow: { paddingHorizontal: 12, gap: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '700' },
});
