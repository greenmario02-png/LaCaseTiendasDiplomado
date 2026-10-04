import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { Store, PackageOpen, Flame } from 'lucide-react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { StatCard } from '../components/redesign/StatCard';
import { NeoButton } from '../components/redesign/NeoButton';
import { LoadingState } from '../components/redesign/States';
import { QuickAddFab } from '../components/redesign/QuickAddFab';

const money = (n: string | number) => `${Number(n).toLocaleString('es-BO', { maximumFractionDigits: 2 })} Bs`;

export default function SellerDashboardScreen({ navigation }: any) {
  const { colors, raised } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
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
    { label: t('mobile.sellerDashboard.productsLabel'), value: String(d.totalProducts ?? d.productCount ?? 0) },
    { label: t('mobile.sellerDashboard.pendingModerationLabel'), value: String(d.pendingProducts ?? 0) },
    { label: t('mobile.sellerDashboard.ordersLabel'), value: String(d.totalSales ?? d.orderCount ?? 0) },
    { label: t('mobile.sellerDashboard.customersServedLabel'), value: String(d.customersServed ?? 0) },
    { label: t('mobile.sellerDashboard.salesLabel'), value: money(d.totalRevenue ?? d.sales ?? 0) },
    { label: t('mobile.sellerDashboard.weeklySalesLabel'), value: money(d.revenueWeek ?? 0) },
    { label: t('mobile.sellerDashboard.monthlySalesLabel'), value: money(d.revenueMonth ?? 0) },
    { label: t('mobile.sellerDashboard.unreadMessagesLabel'), value: String(d.unreadMessages ?? 0) },
  ];

  return (
    <View style={styles.flex}>
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <View style={[styles.iconBox, { backgroundColor: colors.surface }, raised]}>
          <Store size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{user?.storeName || t('mobile.sellerDashboard.defaultTitle')}</Text>
          <Text style={styles.subtitle}>{t('mobile.sellerDashboard.subtitle')}</Text>
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
          <NeoButton title={t('mobile.sellerDashboard.viewStoreButton')} onPress={() => navigation.navigate('Seller', { id: user?.id })} />
        </View>
        <View style={{ flex: 1 }}>
          <NeoButton title={t('mobile.sellerDashboard.editStoreButton')} variant="ghost" onPress={() => navigation.navigate('EditStore')} />
        </View>
      </View>

      {recentOrders.length > 0 && (
        <View style={[styles.sectionCard, { backgroundColor: colors.surface }, raised]}>
          <View style={styles.sectionTitleRow}>
            <PackageOpen size={16} color={colors.textSecondary} />
            <Text style={styles.sectionTitle}>{t('mobile.sellerDashboard.recentOrdersTitle')}</Text>
          </View>
          {recentOrders.slice(0, 5).map((o: any) => (
            <View key={o.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {t('mobile.sellerDashboard.orderRowTitle', { id: o.id, firstName: o.buyer?.firstName, lastName: o.buyer?.lastName })}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {t('mobile.sellerDashboard.orderRowSub', { productName: o.items?.[0]?.product?.name ?? t('mobile.sellerDashboard.defaultProductName'), status: o.status })}
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
            <Text style={styles.sectionTitle}>{t('mobile.sellerDashboard.topProductsTitle')}</Text>
          </View>
          {topProducts.slice(0, 5).map((p: any) => (
            <View key={p.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.rowSub}>
                  {t('mobile.sellerDashboard.stockSold', { stock: p.stock, count: p.totalSold })}
                </Text>
              </View>
              <Text style={styles.rowValue}>{money(p.price)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
    <QuickAddFab label={t('mobile.sellerProducts.newProductButton')} onPress={() => navigation.navigate('SellerProductForm')} />
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 110 },
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
