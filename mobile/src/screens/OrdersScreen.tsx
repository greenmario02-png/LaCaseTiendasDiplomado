import React, { useMemo,  useCallback, useState  } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Package, ChevronRight } from 'lucide-react-native';
import { api, getErrorMessage } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { colors as themeColors } from '../theme';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { NeoButton } from '../components/redesign/NeoButton';
import { useMoney } from '../services/money';
import '../services/payments';


const STATUS_COLOR: Record<string, string> = {
  PENDING: themeColors.warning,
  PROOF_SUBMITTED: themeColors.info,
  CONFIRMED: themeColors.primary,
  SHIPPED: themeColors.info,
  DELIVERED: themeColors.success,
  CANCELLED: themeColors.error,
};

const STATUS_KEY: Record<string, string> = {
  PENDING: 'pending',
  PROOF_SUBMITTED: 'proofSubmitted',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export default function OrdersScreen({ navigation, route }: any) {
  const money = useMoney(); // moneda elegida con su denominación
  // «Pagar pedidos pendientes»: filtro en el servidor; se puede alternar desde la misma pantalla.
  const [onlyPending, setOnlyPending] = useState<boolean>(!!route?.params?.pendingPayment);
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/buyer', { params: { limit: 100, ...(onlyPending ? { payment: 'pending' } : {}) } });
      setOrders(data.data ?? []);
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onlyPending]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const confirmDelivery = async (id: number) => {
    Alert.alert(t('mobile.orders.confirmReceipt'), t('mobile.orders.confirmReceiptMessage'), [
      { text: t('mobile.common.cancel'), style: 'cancel' },
      {
        text: t('mobile.common.confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/orders/${id}/confirm-delivery`);
            Alert.alert(t('mobile.orders.confirmReceiptSuccessTitle'), t('mobile.orders.confirmReceiptSuccessMessage'));
            load();
          } catch (e) {
            Alert.alert(t('mobile.common.error'), getErrorMessage(e));
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const statusKey = STATUS_KEY[item.status];
    const label = statusKey ? t(`mobile.orders.status.${statusKey}`) : item.status;
    const color = STATUS_COLOR[item.status] ?? colors.textSecondary;
    const canConfirm = item.status === 'SHIPPED' && item.fulfillmentType !== 'PICKUP';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('OrderDetail', { id: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={styles.idRow}>
            <Package size={16} color={colors.primary} />
            <Text style={styles.id}>{t('mobile.orders.orderNumber', { id: item.id })}</Text>
          </View>
          <Text style={[styles.status, { color }]}>{label}</Text>
        </View>
        <Text style={styles.store}>{item.seller?.storeName ?? t('mobile.orders.storeFallback')}</Text>
        <Text style={styles.meta}>
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-BO') : ''}
          {item.items?.length ? t('mobile.orders.productsCount', { count: item.items.length }) : ''}
          {item.fulfillmentType === 'PICKUP' ? t('mobile.orders.pickupSuffix') : ''}
        </Text>
        <View style={styles.cardBottom}>
          <Text style={styles.total}>{money(item.total)}</Text>
          {canConfirm && (
            <View style={{ minWidth: 150 }}>
              <NeoButton
                title={t('mobile.orders.confirmReceipt')}
                variant="secondary"
                onPress={() => confirmDelivery(item.id)}
                style={{ minHeight: 34, paddingHorizontal: 10 }}
              />
            </View>
          )}
          <ChevronRight size={18} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('mobile.orders.title', { count: orders.length })}</Text>
        <View style={styles.filterRow} accessibilityRole="radiogroup">
          {[false, true].map((v) => (
            <TouchableOpacity
              key={String(v)}
              testID={v ? 'filter-pending' : 'filter-all'}
              accessibilityRole="radio"
              accessibilityState={{ checked: onlyPending === v }}
              onPress={() => setOnlyPending(v)}
              style={[styles.filterChip, onlyPending === v && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <Text style={{ color: onlyPending === v ? '#fff' : colors.text, fontWeight: '700' }}>{v ? t('pagos.menu.payPending') : t('pagos.menu.orders')}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {loading ? (
        <LoadingState />
      ) : orders.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 60 }}>
          <EmptyState message={t('mobile.orders.emptyOrders')} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
          }
        />
      )}
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  filterChip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  id: { fontSize: 15, fontWeight: '700', color: colors.text },
  status: { fontSize: 12, fontWeight: '800' },
  store: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  meta: { fontSize: 11, color: colors.textSecondary },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  total: { fontSize: 16, fontWeight: '800', color: colors.price },
});
