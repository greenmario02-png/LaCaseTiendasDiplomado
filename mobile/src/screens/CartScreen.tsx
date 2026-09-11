import React, { useMemo,  useEffect, useState, useCallback  } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, resolveImageUrl } from '../services/api';
import { cartCacheGet, cartCacheSet, queueList, queueRemove, queuePush } from '../services/offlineCache';
import { NeoButton } from '../components/redesign/NeoButton';
import { PriceDisplay } from '../components/redesign/PriceDisplay';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { useAppTheme } from '../theme/ThemeContext';

function money(v: string | number): string {
  return Number(v).toLocaleString('es-BO', { maximumFractionDigits: 0 }) + ' Bs';
}

export default function CartScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/cart');
      setCart(data.data);
      await cartCacheSet(data.data);
      // Reintentar escrituras pendientes que quedaron offline
      const pending = await queueList();
      for (const op of pending) {
        try {
          await api({ method: op.method, url: op.url, data: op.data });
          await queueRemove(op.id);
        } catch {
          /* sigue pendiente */
        }
      }
      if (pending.length > 0) {
        const fresh = await api.get('/cart');
        setCart(fresh.data.data);
        await cartCacheSet(fresh.data.data);
      }
    } catch {
      // Offline: usar el carrito guardado en caché
      const cached = await cartCacheGet<any>();
      if (cached) setCart(cached);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const updateQty = async (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      await api.delete(`/cart/items/${itemId}`).catch(async () => {
        await queuePush({ method: 'delete', url: `/cart/items/${itemId}` });
      });
    } else {
      await api.put(`/cart/items/${itemId}`, { quantity }).catch(async () => {
        await queuePush({ method: 'put', url: `/cart/items/${itemId}`, data: { quantity } });
      });
    }
    load();
  };

  if (loading) {
    return <LoadingState />;
  }

  const items = cart?.items ?? [];

  return (
    <View style={styles.flex}>
      {items.length === 0 ? (
        <View style={styles.center}>
          <EmptyState message="Tu carrito está vacío" />
          <NeoButton title="Ir a comprar" onPress={() => navigation.navigate('Home')} />
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 16 }}
            renderItem={({ item }) => (
              <View style={styles.item}>
                {item.product?.images?.[0]?.url && <Image source={{ uri: resolveImageUrl(item.product.images[0].url) }} style={styles.thumb} />}
                <View style={styles.itemBody}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.product?.name}
                  </Text>
                  <Text style={styles.itemSeller}>{item.product?.seller?.storeName}</Text>
                  <PriceDisplay price={Number(item.price ?? item.product?.price)} />
                  <View style={styles.qtyRow}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, item.quantity - 1)}>
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qty}>{item.quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, item.quantity + 1)}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
          <View style={styles.footer}>
            <Text style={styles.total}>Total:</Text>
            <View style={styles.totalRow}>
              <PriceDisplay price={Number(cart.subtotal)} />
            </View>
            <NeoButton title="Finalizar compra" onPress={() => navigation.navigate('Checkout')} />
          </View>
        </>
      )}
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 10, gap: 12 },
  thumb: { width: 70, height: 70, borderRadius: 8 },
  itemBody: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: colors.text },
  itemSeller: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  qtyBtn: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  qty: { fontSize: 14, fontWeight: '700' },
  footer: { padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  total: { fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 4 },
  totalRow: { marginBottom: 10 },
});
