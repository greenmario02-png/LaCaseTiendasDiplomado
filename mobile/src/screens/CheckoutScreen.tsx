import React, { useMemo,  useCallback, useState  } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Truck, Store, CreditCard, MapPin } from 'lucide-react-native';
import { api, getErrorMessage } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { NeoButton } from '../components/redesign/NeoButton';

function money(v: string | number): string {
  return Number(v).toLocaleString('es-BO', { maximumFractionDigits: 2 }) + ' Bs';
}

export default function CheckoutScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [cart, setCart] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [fulfillmentType, setFulfillmentType] = useState<'SHIPPING' | 'PICKUP'>('SHIPPING');
  const [pickupAddress, setPickupAddress] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [{ data: cartRes }, { data: addrRes }] = await Promise.all([
        api.get('/cart'),
        api.get('/account/addresses').catch(() => ({ data: { data: [] } })),
      ]);
      setCart(cartRes.data);
      const addrs = addrRes.data ?? [];
      setAddresses(addrs);
      if (!selectedAddressId) {
        const def = addrs.find((a: any) => a.isDefault) ?? addrs[0];
        if (def) setSelectedAddressId(def.id);
      }
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [selectedAddressId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const placeOrder = async () => {
    try {
      if (placing) return;
      setPlacing(true);
      const payload: any = { fulfillmentType, notes: notes.trim() || undefined };
      if (fulfillmentType === 'SHIPPING') {
        if (!selectedAddressId) {
          Alert.alert('Falta dirección', 'Elegí una dirección de envío.');
          setPlacing(false);
          return;
        }
        payload.shippingAddressId = selectedAddressId;
      } else {
        if (!pickupAddress.trim()) {
          Alert.alert('Falta dirección de retiro', 'Indicá la dirección de la tienda donde retirás.');
          setPlacing(false);
          return;
        }
        payload.pickupAddress = pickupAddress.trim();
      }
      if (couponCode.trim()) payload.couponCode = couponCode.trim();
      const res = await api.post('/orders', payload);
      const orders = res.data.data ?? [];
      Alert.alert('¡Pedido creado!', `Se crearon ${orders.length} orden(es).`, [
        { text: 'Ver mis pedidos', onPress: () => navigation.navigate('Orders') },
        { text: 'OK' },
      ]);
      setCouponCode('');
      setNotes('');
      setFulfillmentType('SHIPPING');
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <LoadingState />
      </View>
    );
  }

  const items = cart?.items ?? [];
  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <EmptyState message="Tu carrito está vacío" />
        <View style={{ minWidth: 160, marginTop: 8 }}>
          <NeoButton title="Ir a comprar" variant="secondary" onPress={() => navigation.navigate('Home')} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      {/* Items del carrito */}
      <Text style={styles.sectionTitle}>Resumen del pedido</Text>
      <View style={styles.card}>
        {items.map((it: any) => (
          <View key={it.id} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName} numberOfLines={2}>{it.product?.name}</Text>
              <Text style={styles.itemSeller}>{it.product?.seller?.storeName}</Text>
            </View>
            <Text style={styles.itemQty}>x{it.quantity}</Text>
            <Text style={styles.itemPrice}>{money(it.price ?? it.product?.price)}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{money(cart?.subtotal ?? 0)}</Text>
        </View>
      </View>

      {/* Tipo de entrega */}
      <Text style={styles.sectionTitle}>Tipo de entrega</Text>
      <View style={styles.card}>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeBtn, fulfillmentType === 'SHIPPING' && styles.typeBtnActive]}
            onPress={() => setFulfillmentType('SHIPPING')}
          >
            <Truck size={15} color={fulfillmentType === 'SHIPPING' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.typeBtnText, fulfillmentType === 'SHIPPING' && styles.typeBtnTextActive]}>Envío</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, fulfillmentType === 'PICKUP' && styles.typeBtnActive]}
            onPress={() => setFulfillmentType('PICKUP')}
          >
            <Store size={15} color={fulfillmentType === 'PICKUP' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.typeBtnText, fulfillmentType === 'PICKUP' && styles.typeBtnTextActive]}>Retiro en tienda</Text>
          </TouchableOpacity>
        </View>

        {fulfillmentType === 'SHIPPING' ? (
          addresses.length === 0 ? (
            <TouchableOpacity onPress={() => navigation.navigate('Addresses')}>
              <Text style={styles.link}>No tenés direcciones — agregar una</Text>
            </TouchableOpacity>
          ) : (
            addresses.map((a: any) => (
              <TouchableOpacity
                key={a.id}
                style={[styles.addrItem, selectedAddressId === a.id && styles.addrItemActive]}
                onPress={() => setSelectedAddressId(a.id)}
              >
                <MapPin size={14} color={selectedAddressId === a.id ? colors.primary : colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addrLine1}>
                    {a.street ?? 'Dirección'} {a.number ? ` ${a.number}` : ''} {a.isDefault ? '(predeterminada)' : ''}
                  </Text>
                  <Text style={styles.addrLine2}>{[a.city, a.state].filter(Boolean).join(', ')}</Text>
                </View>
              </TouchableOpacity>
            ))
          )
        ) : (
          <TextInput
            style={styles.input}
            value={pickupAddress}
            onChangeText={setPickupAddress}
            placeholder="Dirección de la tienda para retirar (ej: Av. 16 de Julio 1523)"
            placeholderTextColor={colors.textSecondary}
          />
        )}
      </View>

      {/* Cupón y notas */}
      <Text style={styles.sectionTitle}>Cupón y notas</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          value={couponCode}
          onChangeText={setCouponCode}
          placeholder="Código de cupón (opcional)"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="characters"
        />
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notas para el vendedor (opcional)"
          placeholderTextColor={colors.textSecondary}
          multiline
        />
      </View>

      {/* Pago */}
      <Text style={styles.sectionTitle}>Método de pago</Text>
      <View style={styles.card}>
        <View style={styles.payRow}>
          <CreditCard size={15} color={colors.primary} />
          <Text style={styles.payText}>Comprobante manual (BNB/QR disponible próximamente)</Text>
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        <NeoButton title={placing ? 'Creando pedido...' : 'Confirmar pedido'} onPress={placeOrder} disabled={placing} />
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: colors.textSecondary, fontSize: 16, marginBottom: 8 },
  link: { color: colors.primary, fontSize: 14, fontWeight: '600', marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  card: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginHorizontal: 16, padding: 14, gap: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { fontSize: 13, fontWeight: '600', color: colors.text },
  itemSeller: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  itemQty: { fontSize: 12, color: colors.textSecondary },
  itemPrice: { fontSize: 14, fontWeight: '800', color: colors.price },
  divider: { height: 1, backgroundColor: colors.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: 16, fontWeight: '900', color: colors.text },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  typeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  typeBtnText: { fontSize: 13, color: colors.text },
  typeBtnTextActive: { color: '#fff', fontWeight: '700' },
  addrItem: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  addrItemActive: { borderColor: colors.primary, backgroundColor: colors.primary + '12' },
  addrLine1: { fontSize: 13, fontWeight: '700', color: colors.text },
  addrLine2: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
  },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  payText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
});
