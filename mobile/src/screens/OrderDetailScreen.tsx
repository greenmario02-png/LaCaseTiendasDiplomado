import React, { useMemo,  useEffect, useState  } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Image } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Package, Truck, Store } from 'lucide-react-native';
import { api, getErrorMessage, resolveImageUrl } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { NeoButton } from '../components/redesign/NeoButton';

function money(v: string | number): string {
  return Number(v).toLocaleString('es-BO', { maximumFractionDigits: 2 }) + ' Bs';
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PROOF_SUBMITTED: 'Comprobante enviado',
  CONFIRMED: 'Confirmado',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const PAYMENT_LABEL: Record<string, string> = {
  VERIFIED: 'Pagado (verificado)',
  PENDING: 'Pago pendiente',
  REJECTED: 'Pago rechazado',
};

export default function OrderDetailScreen({ navigation }: any) {
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
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const confirmDelivery = async () => {
    Alert.alert('Confirmar recepción', '¿Confirmás que recibiste este pedido?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/orders/${id}/confirm-delivery`);
            Alert.alert('Listo', 'Pedido confirmado como recibido.');
            load();
          } catch (e) {
            Alert.alert('Error', getErrorMessage(e));
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
        <EmptyState message="No se encontró el pedido." />
      </View>
    );
  }

  const items = order.items ?? [];
  const canConfirm = order.status === 'SHIPPED' && order.fulfillmentType !== 'PICKUP';

  return (
    <ScrollView style={styles.flex} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View style={styles.card}>
        <View style={styles.row}>
          <Package size={18} color={colors.primary} />
          <Text style={styles.title}>Pedido #{order.id}</Text>
        </View>
        <Text style={[styles.status, { color: (STATUS_LABEL[order.status] ? colors.primary : colors.textSecondary) }]}>
          {STATUS_LABEL[order.status] ?? order.status}
        </Text>
        <Text style={styles.meta}>{order.createdAt ? new Date(order.createdAt).toLocaleString('es-BO') : ''}</Text>
      </View>

      <Text style={styles.section}>Tienda</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Store size={15} color={colors.textSecondary} />
          <Text style={styles.value}>{order.seller?.storeName ?? 'Tienda'}</Text>
        </View>
        <Text style={styles.meta}>
          Entrega: {order.fulfillmentType === 'PICKUP' ? 'Retiro en tienda' : 'Envío'}
          {order.fulfillmentType === 'PICKUP' && order.pickupAddress ? `\n${order.pickupAddress}` : ''}
        </Text>
      </View>

      <Text style={styles.section}>Productos</Text>
      <View style={styles.card}>
        {items.length === 0 ? (
          <Text style={styles.meta}>Sin detalle de productos.</Text>
        ) : (
          items.map((it: any) => (
            <View key={it.id} style={styles.itemRow}>
              {it.product?.images?.[0]?.url && (
                <Image source={{ uri: resolveImageUrl(it.product.images[0].url) }} style={styles.itemThumb} resizeMode="cover" />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>{it.product?.name ?? 'Producto'}</Text>
                <Text style={styles.itemMeta}>x{it.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{money(it.unitPrice)}</Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.section}>Totales</Text>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Subtotal</Text>
          <Text style={styles.value}>{money(order.subtotal)}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Envío</Text>
          <Text style={styles.value}>{money(order.shippingCost ?? 0)}</Text>
        </View>
        {Number(order.discountAmount) > 0 && (
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Descuento</Text>
            <Text style={[styles.value, { color: colors.success }]}>-{money(order.discountAmount)}</Text>
          </View>
        )}
        <View style={styles.divider} />
        <View style={styles.rowBetween}>
          <Text style={[styles.label, { fontWeight: '800' }]}>Total</Text>
          <Text style={styles.total}>{money(order.total)}</Text>
        </View>
      </View>

      <Text style={styles.section}>Pago</Text>
      <View style={styles.card}>
        <Text style={styles.value}>Método: {order.paymentMethod ?? 'Manual'}</Text>
        <Text style={[styles.meta, { color: order.paymentStatus === 'VERIFIED' ? colors.success : colors.warning }]}>
          {PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}
        </Text>
        {order.trackingNumber ? <Text style={styles.meta}>Tracking: {order.trackingNumber}</Text> : null}
      </View>

      {canConfirm && (
        <View style={{ marginTop: 12 }}>
          <NeoButton title="Confirmar recepción" variant="secondary" onPress={confirmDelivery} />
        </View>
      )}
      {order.fulfillmentType === 'SHIPPING' && (
        <View style={[styles.card, { marginTop: 12, flexDirection: 'row', gap: 6 }]}>
          <Truck size={14} color={colors.textSecondary} />
          <Text style={styles.meta}>Envío a: {order.shippingAddress ? `${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}` : 'Dirección registrada'}</Text>
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
