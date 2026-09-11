import React, { useMemo,  useCallback, useState  } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, getErrorMessage, resolveImageUrl } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { colors as themeColors } from '../theme';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { NeoButton } from '../components/redesign/NeoButton';

function money(v: string | number): string {
  return Number(v).toLocaleString('es-BO', { maximumFractionDigits: 0 }) + ' Bs';
}

function estado(p: any): { label: string; color: string } {
  if (p.isActive === false) return { label: 'Eliminado', color: themeColors.error };
  if (!p.isApproved) return { label: 'Pendiente', color: themeColors.warning };
  return { label: 'Aprobado', color: themeColors.success };
}

export default function SellerProductsScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [products, setProducts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (p: number, append = false) => {
    try {
      const { data } = await api.get('/seller/products', { params: { page: p, limit: 20 } });
      const items = data.data ?? [];
      setProducts((prev) => (append ? [...prev, ...items] : items));
      setTotal(data.meta?.total ?? items.length);
      setPage(p);
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(1);
    }, [load])
  );

  const loadMore = () => {
    if (loadingMore || products.length >= total) return;
    setLoadingMore(true);
    load(page + 1, true);
  };

  const remove = (p: any) => {
    Alert.alert('Eliminar producto', `¿Eliminar «${p.name}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/seller/products/${p.id}`);
            load(1);
          } catch (e) {
            Alert.alert('Error', getErrorMessage(e));
          }
        },
      },
    ]);
  };

  const reactivate = async (p: any) => {
    try {
      await api.post(`/seller/products/${p.id}/reactivate`);
      load(1);
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const st = estado(item);
    const img = item.images?.find((i: any) => i.isPrimary)?.url || item.images?.[0]?.url;
    return (
      <View style={styles.card}>
        {img ? (
          <Image source={{ uri: resolveImageUrl(img) }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Text style={styles.thumbEmptyText}>Sin img</Text>
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.sku}>{item.sku ?? 'Sin SKU'} · {item.category?.name ?? '—'}</Text>
          <View style={styles.row}>
            <Text style={styles.price}>{money(item.price)}</Text>
            <Text style={[styles.badge, { color: st.color, backgroundColor: st.color + '22' }]}>{st.label}</Text>
          </View>
          <Text style={styles.stock}>Stock: {item.stock}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.miniBtn} onPress={() => navigation.navigate('SellerProductForm', { id: item.id })}>
              <Text style={styles.miniBtnText}>Editar</Text>
            </TouchableOpacity>
            {item.isActive === false ? (
              <TouchableOpacity style={[styles.miniBtn, { borderColor: colors.success }]} onPress={() => reactivate(item)}>
                <Text style={[styles.miniBtnText, { color: colors.success }]}>Reactivar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.miniBtn, { borderColor: colors.error }]} onPress={() => remove(item)}>
                <Text style={[styles.miniBtnText, { color: colors.error }]}>Eliminar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis productos ({total})</Text>
        <View style={styles.addWrap}>
          <NeoButton title="＋ Nuevo producto" onPress={() => navigation.navigate('SellerProductForm')} />
        </View>
      </View>
      {loading ? (
        <LoadingState />
      ) : products.length === 0 ? (
        <EmptyState message="Todavía no tenés productos." />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} /> : null}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => load(1)} tintColor={colors.primary} />}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  addWrap: { minWidth: 150 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumb: { width: 96, height: 96, backgroundColor: '#eee' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  thumbEmptyText: { color: colors.textSecondary, fontSize: 11 },
  body: { flex: 1, padding: 10 },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  sku: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  price: { fontSize: 15, fontWeight: '800', color: colors.price },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  stock: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  miniBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  miniBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
});
