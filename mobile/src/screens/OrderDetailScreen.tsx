import React, { useMemo,  useEffect, useState  } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Image } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Package, Truck, Store } from 'lucide-react-native';
import { api, getErrorMessage, resolveImageUrl } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { NeoButton } from '../components/redesign/NeoButton';

function money(v: string | number): string {
  return Number(v).toLocaleString('es-BO', { maximumFractionDigits: 2 }) + ' Bs';
}

const STATUS_KEY: Record<string, string> = {
  PENDING: 'pending',
  PROOF_SUBMITTED: 'proofSubmitted',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

const PAYMENT_KEY: Record<string, string> = {
  VERIFIED: 'verified',
  PENDING: 'pending',
  REJECTED: 'rejected',
};

export default function OrderDetailScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute();
  const { id } = route.params as { id: number };
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get(`/orders/buyer/${id}`);
      setOrder(data.data);
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const confirmDelivery = async () => {
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

  if (loading) {
    return (
      <View style={styles.center}>
        <LoadingState />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <EmptyState message={t('mobile.orderDetail.notFound')} />
      </View>
    );
  }

  const items = order.items ?? [];
  const canConfirm = order.status === 'SHIPPED' && order.fulfillmentType !== 'PICKUP';
  const statusKey = STATUS_KEY[order.status];
  const statusLabel = statusKey ? t(`mobile.orders.status.${statusKey}`) : order.status;
  const paymentKey = PAYMENT_KEY[order.paymentStatus];
  const paymentLabel = paymentKey ? t(`mobile.orderDetail.payment.${paymentKey}`) : order.paymentStatus;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View style={styles.card}>
        <View style={styles.row}>
          <Package size={18} color={colors.primary} />
          <Text style={styles.title}>{t('mobile.orders.orderNumber', { id: order.id })}</Text>
        </View>
        <Text style={[styles.status, { color: (statusKey ? colors.primary : colors.textSecondary) }]}>
          {statusLabel}
        </Text>
        <Text style={styles.meta}>{order.createdAt ? new Date(order.createdAt).toLocaleString('es-BO') : ''}</Text>
      </View>

      <Text style={styles.section}>{t('mobile.orderDetail.sectionStore')}</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Store size={15} color={colors.textSecondary} />
          <Text style={styles.value}>{order.seller?.storeName ?? t('mobile.orders.storeFallback')}</Text>
        </View>
        <Text style={styles.meta}>
          {t('mobile.orderDetail.deliveryLabel')} {order.fulfillmentType === 'PICKUP' ? t('mobile.orderDetail.deliveryPickup') : t('mobile.orderDetail.deliveryShipping')}
          {order.fulfillmentType === 'PICKUP' && order.pickupAddress ? `\n${order.pickupAddress}` : ''}
        </Text>
      </View>

      <Text style={styles.section}>{t('mobile.orderDetail.sectionProducts')}</Text>
      <View style={styles.card}>
        {items.length === 0 ? (
          <Text style={styles.meta}>{t('mobile.orderDetail.noProductDetails')}</Text>
        ) : (
          items.map((it: any) => (
            <View key={it.id} style={styles.itemRow}>
              {it.product?.images?.[0]?.url && (
                <Image source={{ uri: resolveImageUrl(it.product.images[0].url) }} style={styles.itemThumb} resizeMode="cover" />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>{it.product?.name ?? t('mobile.orderDetail.productFallback')}</Text>
                <Text style={styles.itemMeta}>x{it.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{money(it.unitPrice)}</Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.section}>{t('mobile.orderDetail.sectionTotals')}</Text>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>{t('mobile.orderDetail.subtotal')}</Text>
          <Text style={styles.value}>{money(order.subtotal)}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>{t('mobile.orderDetail.shippingCost')}</Text>
          <Text style={styles.value}>{money(order.shippingCost ?? 0)}</Text>
        </View>
        {Number(order.discountAmount) > 0 && (
          <View style={styles.rowBetween}>
            <Text style={styles.label}>{t('mobile.orderDetail.discount')}</Text>
            <Text style={[styles.value, { color: colors.success }]}>-{money(order.discountAmount)}</Text>
          </View>
        )}
        <View style={styles.divider} />
        <View style={styles.rowBetween}>
          <Text style={[styles.label, { fontWeight: '800' }]}>{t('mobile.orderDetail.total')}</Text>
          <Text style={styles.total}>{money(order.total)}</Text>
        </View>
      </View>

      <Text style={styles.section}>{t('mobile.orderDetail.sectionPayment')}</Text>
      <View style={styles.card}>
        <Text style={styles.value}>{t('mobile.orderDetail.paymentMethod', { method: order.paymentMethod ?? t('mobile.orderDetail.paymentMethodFallback') })}</Text>
        <Text style={[styles.meta, { color: order.paymentStatus === 'VERIFIED' ? colors.success : colors.warning }]}>
          {paymentLabel}
        </Text>
        {order.trackingNumber ? <Text style={styles.meta}>{t('mobile.orderDetail.tracking', { number: order.trackingNumber })}</Text> : null}
      </View>

      {canConfirm && (
        <View style={{ marginTop: 12 }}>
          <NeoButton title={t('mobile.orders.confirmReceipt')} variant="secondary" onPress={confirmDelivery} />
        </View>
      )}
      {order.fulfillmentType === 'SHIPPING' && (
        <View style={[styles.card, { marginTop: 12, flexDirection: 'row', gap: 6 }]}>
          <Truck size={14} color={colors.textSecondary} />
          <Text style={styles.meta}>{t('mobile.orderDetail.shippingTo', { address: order.shippingAddress ? `${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}` : t('mobile.orderDetail.shippingAddressFallback') })}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: colors.textSecondary, fontSize: 15 },
  card: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 6, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  status: { fontSize: 13, fontWeight: '800' },
  meta: { fontSize: 12, color: colors.textSecondary },
  section: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 14, marginBottom: 6 },
  value: { fontSize: 13, color: colors.text, flex: 1 },
  label: { fontSize: 13, color: colors.textSecondary },
  total: { fontSize: 17, fontWeight: '900', color: colors.price },
  divider: { height: 1, backgroundColor: colors.border },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.border },
  itemName: { fontSize: 13, fontWeight: '600', color: colors.text },
  itemMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '800', color: colors.price },
});
