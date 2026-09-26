import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { api, getErrorMessage } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { Store, PackageOpen, Flame } from 'lucide-react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { StatCard } from '../components/redesign/StatCard';
import { NeoButton } from '../components/redesign/NeoButton';
import { LoadingState } from '../components/redesign/States';

const money = (n: string | number) => `${Number(n).toLocaleString('es-BO', { maximumFractionDigits: 2 })} Bs`;

export default function SellerDashboardScreen({ navigation }: any) {
  const { colors, raised } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/seller/dashboard');
        setData(data.data);
      } catch (e) {
        console.warn(getErrorMessage(e));
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <LoadingState />
      </View>
    );
  }

  const d = data?.data || data || {};
  const recentOrders: any[] = d.recentOrders ?? [];
  const topProducts: any[] = d.topProducts ?? [];

  const kpis: { label: string; value: string }[] = [
    { label: 'Productos', value: String(d.totalProducts ?? d.productCount ?? 0) },
    { label: 'Pendientes mod.', value: String(d.pendingProducts ?? 0) },
    { label: 'Pedidos', value: String(d.totalSales ?? d.orderCount ?? 0) },
    { label: 'Clientes atendidos', value: String(d.customersServed ?? 0) },
    { label: 'Ventas', value: money(d.totalRevenue ?? d.sales ?? 0) },
    { label: 'Ventas de la semana', value: money(d.revenueWeek ?? 0) },
    { label: 'Ventas del mes', value: money(d.revenueMonth ?? 0) },
    { label: 'Mensajes sin leer', value: String(d.unreadMessages ?? 0) },
  ];

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <View style={[styles.iconBox, { backgroundColor: colors.surface }, raised]}>
          <Store size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{user?.storeName || 'Panel de vendedor'}</Text>
          <Text style={styles.subtitle}>Rendimiento de tu tienda</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {kpis.map((k) => (
          <View key={k.label} style={styles.kpiCell}>
            <StatCard title={k.label} value={k.value} />
          </View>
        ))}
      </View>

      <View style={styles.btnRow}>
        <View style={{ flex: 1 }}>
          <NeoButton title="Ver mi tienda" onPress={() => navigation.navigate('Seller', { id: user?.id })} />
        </View>
        <View style={{ flex: 1 }}>
          <NeoButton title="Editar tienda" variant="ghost" onPress={() => navigation.navigate('EditStore')} />
        </View>
      </View>

      {recentOrders.length > 0 && (
        <View style={[styles.sectionCard, { backgroundColor: colors.surface }, raised]}>
          <View style={styles.sectionTitleRow}>
            <PackageOpen size={16} color={colors.textSecondary} />
            <Text style={styles.sectionTitle}>Últimos pedidos</Text>
          </View>
          {recentOrders.slice(0, 5).map((o: any) => (
            <View key={o.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  Pedido #{o.id} · {o.buyer?.firstName} {o.buyer?.lastName}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {o.items?.[0]?.product?.name ?? 'Producto'} · {o.status}
                </Text>
              </View>
              <Text style={styles.rowValue}>{money(o.total)}</Text>
            </View>
          ))}
        </View>
      )}

      {topProducts.length > 0 && (
        <View style={[styles.sectionCard, { backgroundColor: colors.surface }, raised]}>
          <View style={styles.sectionTitleRow}>
            <Flame size={16} color={colors.warning} />
            <Text style={styles.sectionTitle}>Top productos</Text>
          </View>
          {topProducts.slice(0, 5).map((p: any) => (
            <View key={p.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.rowSub}>
                  Stock {p.stock} · {p.totalSold} vendido(s)
                </Text>
              </View>
              <Text style={styles.rowValue}>{money(p.price)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
    iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: '900', color: colors.text },
    subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    kpiCell: { flexBasis: '47%', flexGrow: 1 },
    btnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
    sectionCard: { marginTop: 18, borderRadius: 16, padding: 14 },
    sectionTitleRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    rowValue: { fontSize: 14, fontWeight: '800', color: colors.price },
  });
