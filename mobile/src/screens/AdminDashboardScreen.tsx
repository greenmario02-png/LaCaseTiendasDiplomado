import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Store,
  ShoppingCart,
  ClipboardList,
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
import { useAppTheme } from '../theme/ThemeContext';
import { StatCard } from '../components/redesign/StatCard';
import { LoadingState } from '../components/redesign/States';

const money = (n: string | number) => `${Number(n).toLocaleString('es-BO', { maximumFractionDigits: 2 })} Bs`;

export default function AdminDashboardScreen() {
  const { colors, raised } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const ADMIN_MENU = [
    { label: t('mobile.adminDashboard.menuSellersLabel'), icon: Store, route: 'AdminSellers', desc: t('mobile.adminDashboard.menuSellersDesc') },
    { label: t('mobile.adminDashboard.menuVerificationLabel'), icon: BadgeCheck, route: 'AdminVerification', desc: t('mobile.adminDashboard.menuVerificationDesc') },
    { label: t('mobile.adminDashboard.menuForumModerationLabel'), icon: MessageSquareWarning, route: 'ForumModeration', desc: t('mobile.adminDashboard.menuForumModerationDesc') },
    { label: t('mobile.adminDashboard.menuBulkProductsLabel'), icon: Upload, route: 'SellerBulkProducts', desc: t('mobile.adminDashboard.menuBulkProductsDesc') },
    { label: t('mobile.adminDashboard.menuPayoutsLabel'), icon: Wallet, route: 'SellerPayouts', desc: t('mobile.adminDashboard.menuPayoutsDesc') },
    { label: t('mobile.adminDashboard.menuNotificationsLabel'), icon: Bell, route: 'Notifications', desc: t('mobile.adminDashboard.menuNotificationsDesc') },
    { label: t('mobile.adminDashboard.menuOrdersLabel'), icon: ClipboardList, route: 'Orders', desc: t('mobile.adminDashboard.menuOrdersDesc') },
  ];
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
        <LoadingState />
      </View>
    );
  }

  const k = kpis || {};
  const cards: { label: string; value: string }[] = [
    { label: t('mobile.adminDashboard.productsLabel'), value: String(k.totalProducts ?? 0) },
    { label: t('mobile.adminDashboard.sellersLabel'), value: String(k.totalSellers ?? 0) },
    { label: t('mobile.adminDashboard.customersLabel'), value: String(k.totalUsers ?? 0) },
    { label: t('mobile.adminDashboard.ordersLabel'), value: String(k.totalOrders ?? 0) },
    { label: t('mobile.adminDashboard.salesLabel'), value: money(k.totalRevenue ?? 0) },
    { label: t('mobile.adminDashboard.monthLabel'), value: money(k.monthRevenue ?? 0) },
    { label: t('mobile.adminDashboard.pendingOrdersLabel'), value: String(k.pendingOrders ?? 0) },
    { label: t('mobile.adminDashboard.pendingProductsLabel'), value: String(k.pendingProducts ?? 0) },
    { label: t('mobile.adminDashboard.pendingSellersLabel'), value: String(k.pendingSellers ?? 0) },
  ];

  const todayProducts: any[] = salesToday?.products ?? [];
  const todayPromos: any[] = salesToday?.promotions ?? [];

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <View style={[styles.iconBox, { backgroundColor: colors.surface }, raised]}>
          <ShieldCheck size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('mobile.adminDashboard.title')}</Text>
          <Text style={styles.subtitle}>{t('mobile.adminDashboard.subtitle')}</Text>
        </View>
      </View>

      <Text style={styles.menuTitle}>{t('mobile.adminDashboard.menuTitle')}</Text>
      <View style={styles.menuList}>
        {ADMIN_MENU.map((m) => {
          const Icon = m.icon;
          return (
            <Pressable
              key={m.route}
              style={[styles.menuItem, { backgroundColor: colors.surface }, raised]}
              onPress={() => navigation.navigate(m.route)}
            >
              <View style={styles.menuIconWrap}>
                <Icon size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>{m.label}</Text>
                <Text style={styles.menuDesc}>{m.desc}</Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.grid}>
        {cards.map((c) => (
          <View key={c.label} style={styles.kpiCell}>
            <StatCard title={c.label} value={c.value} />
          </View>
        ))}
      </View>

      {copies.length > 0 && (
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.warning }, raised]}>
          <View style={styles.sectionTitleRow}>
            <TriangleAlert size={16} color={colors.warning} />
            <Text style={[styles.sectionTitle, { color: colors.warning }]}>{t('mobile.adminDashboard.copiesDetectedTitle')}</Text>
          </View>
          {copies.slice(0, 5).map((c: any, i: number) => (
            <View key={i} style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {c.actor?.storeName || `${c.actor?.firstName} ${c.actor?.lastName}`} ({c.actor?.email})
              </Text>
              <Text style={[styles.rowValue, { color: colors.warning }]}>{t('mobile.adminDashboard.copiesCount', { count: c.count })}</Text>
            </View>
          ))}
        </View>
      )}

      {todayProducts.length > 0 && (
        <View style={[styles.sectionCard, { backgroundColor: colors.surface }, raised]}>
          <View style={styles.sectionTitleRow}>
            <ShoppingCart size={16} color={colors.textSecondary} />
            <Text style={styles.sectionTitle}>{t('mobile.adminDashboard.soldTodayTitle')}</Text>
          </View>
          {todayProducts.slice(0, 6).map((p: any) => (
            <View key={p.productId} style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={styles.rowValue}>{t('mobile.adminDashboard.soldCount', { count: p.quantity })}</Text>
            </View>
          ))}
        </View>
      )}

      {todayPromos.length > 0 && (
        <View style={[styles.sectionCard, { backgroundColor: colors.surface }, raised]}>
          <View style={styles.sectionTitleRow}>
            <Zap size={16} color={colors.warning} />
            <Text style={styles.sectionTitle}>{t('mobile.adminDashboard.activePromotionsTitle')}</Text>
          </View>
          {todayPromos.slice(0, 5).map((promo: any) => (
            <View key={promo.id} style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {promo.title}
              </Text>
              <Text style={[styles.rowValue, { color: colors.error }]}>
                {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}%` : money(promo.discountValue)} {t('mobile.adminDashboard.offSuffix')}
              </Text>
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
    menuTitle: { fontSize: 13, fontWeight: '800', color: colors.textSecondary, marginBottom: 10 },
    menuList: { gap: 10, marginBottom: 18 },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12 },
    menuIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuLabel: { fontSize: 14, fontWeight: '800', color: colors.text },
    menuDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    kpiCell: { flexBasis: '47%', flexGrow: 1 },
    sectionCard: { marginTop: 18, borderRadius: 16, padding: 14 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    rowTitle: { fontSize: 13, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
    rowValue: { fontSize: 13, fontWeight: '800', color: colors.price },
  });
