import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ShieldCheck,
  Package,
  Store,
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Clock,
  ClipboardList,
  UserCheck,
  TriangleAlert,
  Zap,
  ChevronRight,
  BadgeCheck,
  MessageSquareWarning,
  Upload,
  Wallet,
  Bell,
} from 'lucide-react-native';
import { api, getErrorMessage } from '../services/api';
import { VisionScreen, GlassCard, GradientIconBox, VisionBackground } from '../components/vision';
import { vision } from '../theme/vision';

const ADMIN_MENU = [
  { label: 'Vendedores', icon: Store, route: 'AdminSellers', desc: 'Aprobar, pausar y suspender tiendas' },
  { label: 'Verificación de tiendas', icon: BadgeCheck, route: 'AdminVerification', desc: 'Verificar NIT y ubicación' },
  { label: 'Moderación del foro', icon: MessageSquareWarning, route: 'ForumModeration', desc: 'Reportes y contenido del foro' },
  { label: 'Carga masiva de productos', icon: Upload, route: 'SellerBulkProducts', desc: 'Alta de productos en lote' },
  { label: 'Mis pagos', icon: Wallet, route: 'SellerPayouts', desc: 'Payouts y cuenta de cobro' },
  { label: 'Notificaciones', icon: Bell, route: 'Notifications', desc: 'Centro de notificaciones' },
  { label: 'Mis pedidos', icon: ClipboardList, route: 'Orders', desc: 'Historial de pedidos' },
];

const money = (n: string | number) => `${Number(n).toLocaleString('es-BO', { maximumFractionDigits: 2 })} Bs`;

const KPI_ICONS = [
  Package,
  Store,
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Clock,
  ClipboardList,
  UserCheck,
];

function KpiCard({ label, value, color, index }: { label: string; value: string; color?: string; index: number }) {
  const Icon = KPI_ICONS[index % KPI_ICONS.length];
  const gradients: readonly (readonly [string, string])[] = [
    vision.gradPrimary,
    vision.gradCyan,
    vision.gradGreen,
    vision.gradOrange,
    vision.gradPink,
    vision.gradViolet,
  ];
  return (
    <GlassCard style={styles.kpiCard}>
      <GradientIconBox gradient={gradients[index % gradients.length]} size={40} radius={12}>
        <Icon size={20} color="#fff" />
      </GradientIconBox>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, color ? { color } : null]}>{value}</Text>
    </GlassCard>
  );
}

export default function AdminDashboardScreen() {
  const [kpis, setKpis] = useState<any>(null);
  const [salesToday, setSalesToday] = useState<any>(null);
  const [copies, setCopies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    (async () => {
      try {
        const [d, s, c] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/sales-today'),
          api.get('/admin/copies/alerts', { params: { min: 5, days: 30 } }),
        ]);
        setKpis(d.data?.data?.kpis || d.data?.data || {});
        setSalesToday(s.data?.data || null);
        setCopies(c.data?.data?.data ?? []);
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

  const k = kpis || {};
  const cards: { label: string; value: string; color?: string }[] = [
    { label: 'Productos', value: String(k.totalProducts ?? 0) },
    { label: 'Vendedores', value: String(k.totalSellers ?? 0) },
    { label: 'Clientes', value: String(k.totalUsers ?? 0) },
    { label: 'Órdenes', value: String(k.totalOrders ?? 0) },
    { label: 'Ventas', value: money(k.totalRevenue ?? 0), color: '#6ad2ff' },
    { label: 'Mes', value: money(k.monthRevenue ?? 0) },
    { label: 'Pedidos pendientes', value: String(k.pendingOrders ?? 0), color: k.pendingOrders ? '#ffc837' : vision.text },
    { label: 'Productos pend.', value: String(k.pendingProducts ?? 0), color: k.pendingProducts ? '#ffc837' : vision.text },
    { label: 'Vendedores pend.', value: String(k.pendingSellers ?? 0), color: k.pendingSellers ? '#ffc837' : vision.text },
  ];

  const todayProducts: any[] = salesToday?.products ?? [];
  const todayPromos: any[] = salesToday?.promotions ?? [];

  return (
    <VisionScreen>
      <View style={styles.titleRow}>
        <GradientIconBox gradient={vision.gradPrimary} size={44} radius={14}>
          <ShieldCheck size={24} color="#fff" />
        </GradientIconBox>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Panel de administración</Text>
          <Text style={styles.subtitle}>Visión general de la multitienda</Text>
        </View>
      </View>

      <GlassCard style={styles.menuCard}>
        <Text style={styles.menuTitle}>Menú de administración</Text>
        {ADMIN_MENU.map((m) => {
          const Icon = m.icon;
          return (
            <Pressable key={m.route} style={styles.menuItem} onPress={() => navigation.navigate(m.route)}>
              <View style={styles.menuIconWrap}>
                <Icon size={18} color={vision.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>{m.label}</Text>
                <Text style={styles.menuDesc}>{m.desc}</Text>
              </View>
              <ChevronRight size={18} color={vision.textMuted} />
            </Pressable>
          );
        })}
      </GlassCard>

      <View style={styles.grid}>
        {cards.map((c, i) => (
          <KpiCard key={c.label} label={c.label} value={c.value} color={c.color} index={i} />
        ))}
      </View>

      {copies.length > 0 && (
        <GlassCard style={[styles.sectionCard, { borderColor: 'rgba(255,200,55,0.4)' }]}>
          <View style={styles.sectionTitleRow}>
            <TriangleAlert size={16} color="#ffc837" />
            <Text style={[styles.sectionTitle, { color: '#ffc837' }]}>Copias masivas detectadas</Text>
          </View>
          {copies.slice(0, 5).map((c: any, i: number) => (
            <View key={i} style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {c.actor?.storeName || `${c.actor?.firstName} ${c.actor?.lastName}`} ({c.actor?.email})
              </Text>
              <Text style={[styles.rowValue, { color: '#ffc837' }]}>{c.count} copia(s)</Text>
            </View>
          ))}
        </GlassCard>
      )}

      {todayProducts.length > 0 && (
        <GlassCard style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <ShoppingCart size={16} color={vision.textSecondary} />
            <Text style={styles.sectionTitle}>Vendidos hoy</Text>
          </View>
          {todayProducts.slice(0, 6).map((p: any) => (
            <View key={p.productId} style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={styles.rowValue}>{p.quantity} vendido(s)</Text>
            </View>
          ))}
        </GlassCard>
      )}

      {todayPromos.length > 0 && (
        <GlassCard style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Zap size={16} color="#ffc837" />
            <Text style={styles.sectionTitle}>Promociones activas</Text>
          </View>
          {todayPromos.slice(0, 5).map((promo: any) => (
            <View key={promo.id} style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {promo.title}
              </Text>
              <Text style={[styles.rowValue, { color: '#ff5858' }]}>
                {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}%` : money(promo.discountValue)} OFF
              </Text>
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
  menuCard: { marginBottom: 18 },
  menuTitle: { fontSize: 13, fontWeight: '800', color: vision.textSecondary, marginBottom: 10 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    marginBottom: 8,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: 14, fontWeight: '800', color: vision.text },
  menuDesc: { fontSize: 11, color: vision.textMuted, marginTop: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: { width: '47%', padding: 14 },
  kpiLabel: { fontSize: 12, color: vision.textSecondary, marginTop: 10 },
  kpiValue: { fontSize: 20, fontWeight: '800', color: vision.text, marginTop: 2 },
  sectionCard: { marginTop: 18 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: vision.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    marginBottom: 8,
  },
  rowTitle: { fontSize: 13, fontWeight: '700', color: vision.textSecondary, flex: 1, marginRight: 8 },
  rowValue: { fontSize: 13, fontWeight: '800', color: '#6ad2ff' },
});
