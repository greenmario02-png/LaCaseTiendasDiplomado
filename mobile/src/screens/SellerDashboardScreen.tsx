import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { api, getErrorMessage } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import {
  Store,
  Package,
  ClipboardCheck,
  ShoppingBag,
  Users,
  DollarSign,
  CalendarRange,
  TrendingUp,
  MessageSquareWarning,
  PackageOpen,
  Flame,
} from 'lucide-react-native';
import { VisionScreen, GlassCard, GradientIconBox, VisionBackground } from '../components/vision';
import { vision } from '../theme/vision';

const money = (n: string | number) => `${Number(n).toLocaleString('es-BO', { maximumFractionDigits: 2 })} Bs`;

const KPI_ICONS = [Package, ClipboardCheck, ShoppingBag, Users, DollarSign, CalendarRange, TrendingUp, MessageSquareWarning];

const GRADIENTS: readonly (readonly [string, string])[] = [
  vision.gradPrimary,
  vision.gradCyan,
  vision.gradGreen,
  vision.gradOrange,
  vision.gradPink,
  vision.gradViolet,
];

function KpiCard({ label, value, color, index }: { label: string; value: string; color?: string; index: number }) {
  const Icon = KPI_ICONS[index % KPI_ICONS.length];
  return (
    <GlassCard style={styles.kpiCard}>
      <GradientIconBox gradient={GRADIENTS[index % GRADIENTS.length]} size={40} radius={12}>
        <Icon size={20} color="#fff" />
      </GradientIconBox>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, color ? { color } : null]}>{value}</Text>
    </GlassCard>
  );
}

export default function SellerDashboardScreen({ navigation }: any) {
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
        <VisionBackground />
        <ActivityIndicator size="large" color={vision.text} />
      </View>
    );
  }

  const d = data?.data || data || {};
  const recentOrders: any[] = d.recentOrders ?? [];
  const topProducts: any[] = d.topProducts ?? [];

  const kpis: { label: string; value: string; color?: string }[] = [
    { label: 'Productos', value: String(d.totalProducts ?? d.productCount ?? 0) },
    { label: 'Pendientes mod.', value: String(d.pendingProducts ?? 0), color: d.pendingProducts ? '#ffc837' : vision.text },
    { label: 'Pedidos', value: String(d.totalSales ?? d.orderCount ?? 0) },
    { label: 'Clientes atendidos', value: String(d.customersServed ?? 0) },
    { label: 'Ventas', value: money(d.totalRevenue ?? d.sales ?? 0), color: '#6ad2ff' },
    { label: 'Ventas de la semana', value: money(d.revenueWeek ?? 0) },
    { label: 'Ventas del mes', value: money(d.revenueMonth ?? 0) },
    { label: 'Mensajes sin leer', value: String(d.unreadMessages ?? 0), color: d.unreadMessages ? '#ffc837' : vision.text },
  ];

  return (
    <VisionScreen>
      <View style={styles.titleRow}>
        <GradientIconBox gradient={vision.gradViolet} size={44} radius={14}>
          <Store size={24} color="#fff" />
        </GradientIconBox>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{user?.storeName || 'Panel de vendedor'}</Text>
          <Text style={styles.subtitle}>Rendimiento de tu tienda</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {kpis.map((k, i) => (
          <KpiCard key={k.label} label={k.label} value={k.value} color={k.color} index={i} />
        ))}
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#4318ff' }]} onPress={() => navigation.navigate('Seller', { id: user?.id })}>
          <Text style={styles.btnText}>Ver mi tienda</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => navigation.navigate('EditStore')}>
          <Text style={styles.btnOutlineText}>Editar tienda</Text>
        </TouchableOpacity>
      </View>

      {recentOrders.length > 0 && (
        <GlassCard style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <PackageOpen size={16} color={vision.textSecondary} />
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
        </GlassCard>
      )}

      {topProducts.length > 0 && (
        <GlassCard style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Flame size={16} color="#ffc837" />
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
        </GlassCard>
      )}
    </VisionScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: vision.text },
  subtitle: { fontSize: 12, color: vision.textMuted, marginTop: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: { width: '47%', padding: 14 },
  kpiLabel: { fontSize: 12, color: vision.textSecondary, marginTop: 10 },
  kpiValue: { fontSize: 20, fontWeight: '800', color: vision.text, marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnOutline: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: '#4318ff',
  },
  btnOutlineText: { color: '#6ad2ff', fontSize: 15, fontWeight: '700' },
  sectionCard: { marginTop: 18 },
  sectionTitleRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: vision.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    marginBottom: 8,
  },
  rowTitle: { fontSize: 14, fontWeight: '700', color: vision.textSecondary },
  rowSub: { fontSize: 12, color: vision.textMuted, marginTop: 2 },
  rowValue: { fontSize: 14, fontWeight: '800', color: '#6ad2ff' },
});
