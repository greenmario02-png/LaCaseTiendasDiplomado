import React, { useMemo,  useEffect, useState, useCallback  } from 'react';
import { View, Text, SectionList, TouchableOpacity, Pressable, Image, StyleSheet } from 'react-native';
import { Check, Minus } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api, resolveImageUrl } from '../services/api';
import { cartCacheGet, cartCacheSet, queueList, queueRemove, queuePush } from '../services/offlineCache';
import { NeoButton } from '../components/redesign/NeoButton';
import { PriceDisplay } from '../components/redesign/PriceDisplay';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { useAppTheme } from '../theme/ThemeContext';
import { summarizeSelection, useCartSelection } from '../services/payments';
import { useMoney } from '../services/money';

/** Casilla accesible de 44 x 44 (estado mixto para «todo» y «por tienda»). */
function Check44({ state, onPress, label, testID }: { state: boolean | 'mixed'; onPress: () => void; label: string; testID?: string }) {
  const { colors } = useAppTheme();
  const on = state === true;
  return (
    <Pressable testID={testID} accessibilityRole="checkbox" accessibilityState={{ checked: state }} accessibilityLabel={label} onPress={onPress} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.primary, backgroundColor: state ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {on ? <Check size={16} color="#fff" /> : state === 'mixed' ? <Minus size={16} color="#fff" /> : null}
      </View>
    </Pressable>
  );
}

export default function CartScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const money = useMoney();
  // Lo NO seleccionado se guarda en el teléfono; lo nuevo entra marcado.
  const excluded = useCartSelection((s) => s.excluded);
  const sel = useCartSelection();
  useEffect(() => {
    sel.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (cart?.items) sel.prune(cart.items.map((i: any) => i.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

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
  const summary = summarizeSelection(items, excluded);
  const isSel = (id: number) => !excluded.includes(id);
  const sections = Object.values(
    items.reduce((acc: Record<string, { title: string; storeId: number; data: any[] }>, it: any) => {
      const sid = Number(it.product?.seller?.id ?? 0);
      (acc[sid] ??= { title: it.product?.seller?.storeName ?? '', storeId: sid, data: [] }).data.push(it);
      return acc;
    }, {}),
  ) as Array<{ title: string; storeId: number; data: any[] }>;
  const groupState = (data: any[]): boolean | 'mixed' => (data.every((i) => isSel(i.id)) ? true : data.some((i) => isSel(i.id)) ? 'mixed' : false);

  return (
    <View style={styles.flex}>
      {items.length === 0 ? (
        <View style={styles.center}>
          <EmptyState message={t('mobile.cart.emptyCart')} />
          <NeoButton title={t('mobile.cart.goShopping')} onPress={() => navigation.navigate('Home')} />
        </View>
      ) : (
        <>
          <View style={styles.selectAll}>
            <Check44
              testID="select-all"
              state={summary.allSelected ? true : summary.count > 0 ? 'mixed' : false}
              onPress={() => sel.setSelected(items.map((i: any) => i.id), !summary.allSelected)}
              label={t('pagos.cart.selectAll')}
            />
            <Text style={styles.selectAllText}>{t('pagos.cart.selectAll')}</Text>
            <Text style={styles.selCount} accessibilityLiveRegion="polite">{t('pagos.cart.selectedSummary', { count: summary.count, total: summary.total })}</Text>
          </View>
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 16 }}
            renderSectionHeader={({ section }) => (
              <View style={styles.storeHeader}>
                <Check44
                  testID={`select-store-${section.storeId}`}
                  state={groupState(section.data)}
                  onPress={() => sel.setSelected(section.data.map((i: any) => i.id), groupState(section.data) !== true)}
                  label={t('pagos.cart.selectStore', { store: section.title })}
                />
                <Text style={styles.storeName}>{section.title}</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <View style={[styles.item, !isSel(item.id) && { opacity: 0.6 }]}>
                <Check44 testID={`select-item-${item.id}`} state={isSel(item.id)} onPress={() => sel.toggle(item.id)} label={t('pagos.cart.selectItem', { name: item.product?.name ?? '' })} />
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
            <Text style={styles.total}>{t('mobile.cart.total')}</Text>
            <View style={styles.totalRow}>
              <Text testID="cart-selected-total" style={styles.totalValue}>{money(summary.subtotal)}</Text>
              <Text style={styles.selHint}>{summary.count === 0 ? t('pagos.cart.noneSelected') : t('pagos.cart.keepHint')}</Text>
            </View>
            <NeoButton testID="go-pay" title={t('pagos.cart.goPay', { count: summary.count })} disabled={summary.count === 0} onPress={() => navigation.navigate('Checkout')} />
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
  qtyBtn: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  qty: { fontSize: 14, fontWeight: '700', color: colors.text },
  footer: { padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  total: { fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 4 },
  totalRow: { marginBottom: 10 },
  totalValue: { fontSize: 20, fontWeight: '900', color: colors.price ?? colors.text },
  selHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  selectAll: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  selectAllText: { fontSize: 14, fontWeight: '700', color: colors.text },
  selCount: { fontSize: 12, color: colors.textSecondary, marginLeft: 'auto', paddingRight: 8 },
  storeHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  storeName: { fontSize: 14, fontWeight: '800', color: colors.text },
});
