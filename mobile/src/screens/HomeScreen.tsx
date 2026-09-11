import React, { useMemo,  useEffect, useState  } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Modal, TextInput } from 'react-native';
import { Store, ArrowLeftRight, Calculator, Zap, Bell } from 'lucide-react-native';
import { api, resolveImageUrl } from '../services/api';
import { ProductCard } from '../components/redesign/ProductCard';
import { CountdownTimer } from '../components/redesign/CountdownTimer';
import { NeoButton } from '../components/redesign/NeoButton';
import { useAppTheme } from '../theme/ThemeContext';
import { useNotificationsStore } from '../stores/notificationsStore';

const money = (n: number) => `${n.toLocaleString('es-BO', { maximumFractionDigits: 2 })} Bs`;

const MONEDAS = [
  { code: 'BOB', label: 'Boliviano', symbol: 'Bs' },
  { code: 'USD', label: 'Dólar', symbol: 'US$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'JPY', label: 'Yen', symbol: '¥' },
  { code: 'USDT', label: 'USDT', symbol: 'USDT' },
];

export default function HomeScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [banners, setBanners] = useState<any[]>([]);
  const unread = useNotificationsStore((s) => s.unread);
  const [categories, setCategories] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [rates, setRates] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcAmount, setCalcAmount] = useState('100');
  const [calcFrom, setCalcFrom] = useState('BOB');

  useEffect(() => {
    (async () => {
      try {
        const [b, c, f, p, r] = await Promise.all([
          api.get('/banners'),
          api.get('/products/categories'),
          api.get('/products/featured'),
          api.get('/promotions'),
          api.get('/currencies/rates'),
        ]);
        setBanners(b.data.data ?? []);
        setCategories(c.data.data ?? []);
        setFeatured(f.data.data ?? []);
        setPromotions(p.data.data ?? []);
        setRates(r.data.data ?? null);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const rateOf = (code: string): number => {
    if (code === 'BOB') return 1;
    const key = code.toLowerCase() as keyof typeof rates.rates;
    return rates?.rates?.[key] ?? 0;
  };

  const convert = (amount: number, from: string, to: string): number => {
    // rates son "Bs por unidad": amount unidades de `from` = amount * rateOf(from) Bs,
    // que equivalen a (amount * rateOf(from)) / rateOf(to) unidades de `to`.
    const fromRate = rateOf(from);
    const toRate = rateOf(to);
    if (!fromRate || !toRate) return 0;
    return (amount * fromRate) / toRate;
  };

  const calcRows = MONEDAS.map((m) => ({
    ...m,
    value: convert(Number(calcAmount) || 0, calcFrom, m.code),
  }));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={{ backgroundColor: colors.background }}
        data={featured}
        numColumns={2}
        keyExtractor={(item) => String(item.id)}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 12, marginBottom: 12 }}
        contentContainerStyle={{ paddingBottom: 90 }}
        ListHeaderComponent={
          <View>
          <View style={styles.heroRow}>
            <Store size={24} color={colors.primary} />
            <Text style={styles.hero}>LaCase Multi Tiendas</Text>
            <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
              <Bell size={22} color={colors.primary} />
              {unread > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {banners.length > 0 && (
            <View style={styles.bannerCard}>
              <Image source={{ uri: resolveImageUrl(banners[0].imageDesktop || banners[0].imageUrl) }} style={styles.banner} resizeMode="cover" />
            </View>
          )}

          {rates && (
            <View style={styles.ratesCard}>
              <View style={styles.ratesHeader}>
                <View style={styles.ratesTitleRow}>
                  <ArrowLeftRight size={16} color={colors.primary} />
                  <Text style={styles.ratesTitle}>Cotizaciones</Text>
                </View>
                <NeoButton title="Calculadora" variant="secondary" onPress={() => setCalcOpen(true)} />
              </View>
              <View style={styles.ratesRow}>
                {(['usd', 'eur', 'jpy', 'usdt'] as const).map((code) => (
                  <View key={code} style={styles.rateItem}>
                    <Text style={styles.rateCode}>{code.toUpperCase()}</Text>
                    <Text style={styles.rateValue}>Bs {Number(rates.rates?.[code] ?? 0).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.ratesSource} numberOfLines={2}>
                Fuentes: {rates.source?.usd} · {rates.source?.eur} · {rates.source?.usdt}
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Categorías</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.catChip}
                onPress={() => navigation.navigate('Products', { categoryId: cat.id, categoryName: cat.name })}
              >
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catCount}>{cat.productCount} prod.</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {promotions.length > 0 && (
            <View>
              <View style={styles.promoHeader}>
                <View style={styles.promoTitleRow}>
                  <Zap size={16} color={colors.warning} />
                  <Text style={styles.sectionTitleNoMargin}>Ofertas relámpago</Text>
                </View>
                <Text style={styles.promoSubtitle}>por tiempo limitado</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 12 }}>
                {promotions.map((promo: any) => {
                  const prod = promo.products?.[0]?.product;
                  const img = prod?.images?.[0]?.url
                    ? resolveImageUrl(prod.images[0].url)
                    : null;
                  const off = promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}%` : money(Number(promo.discountValue));
                  return (
                    <TouchableOpacity
                      key={promo.id}
                      style={styles.promoCard}
                      onPress={() => prod && navigation.navigate('ProductDetail', { id: prod.id })}
                    >
                      {img && <Image source={{ uri: img }} style={styles.promoImg} resizeMode="cover" />}
                      <View style={styles.promoBody}>
                        <View style={styles.offBadge}>
                          <Text style={styles.offText}>{off} OFF</Text>
                        </View>
                        <Text style={styles.promoTitle} numberOfLines={1}>{promo.title}</Text>
                        {prod && <Text style={styles.promoProduct} numberOfLines={1}>{prod.name}</Text>}
                        <CountdownTimer target={new Date(promo.endDate).getTime()} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <Text style={styles.sectionTitle}>Destacados</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ flex: 1, maxWidth: '48%' }}>
          <ProductCard
            id={item.id}
            name={item.name}
            price={Number(item.price)}
            salePrice={item.salePrice ? Number(item.salePrice) : null}
            stock={item.stock}
            storeName={item.seller?.storeName ?? null}
            image={item.images?.[0]?.url ? resolveImageUrl(item.images[0].url) : null}
            onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
          />
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>No hay productos destacados</Text>}
    />

    <Modal visible={calcOpen} animationType="slide" transparent onRequestClose={() => setCalcOpen(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalTitleRow}>
            <Calculator size={20} color={colors.primary} />
            <Text style={styles.modalTitle}>Calculadora de divisas</Text>
          </View>
          <Text style={styles.modalSubtitle}>Convertí entre Bs, USD, EUR, JPY y USDT.</Text>

          <Text style={styles.calcLabel}>Cantidad</Text>
          <TextInput
            style={styles.calcInput}
            value={calcAmount}
            onChangeText={setCalcAmount}
            keyboardType="numeric"
            placeholder="100"
          />

          <Text style={styles.calcLabel}>Desde</Text>
          <View style={styles.calcFromRow}>
            {MONEDAS.map((m) => (
              <TouchableOpacity
                key={m.code}
                style={[styles.calcFromBtn, calcFrom === m.code && styles.calcFromBtnActive]}
                onPress={() => setCalcFrom(m.code)}
              >
                <Text style={[styles.calcFromText, calcFrom === m.code && styles.calcFromTextActive]}>{m.code}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.calcRows}>
            {calcRows.map((row) => (
              <View key={row.code} style={styles.calcRow}>
                <Text style={styles.calcRowLabel}>{row.symbol} {row.code}</Text>
                <Text style={styles.calcRowValue}>
                  {row.code === 'JPY' ? row.value.toLocaleString('es-BO', { maximumFractionDigits: 0 }) : row.value.toLocaleString('es-BO', { maximumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.calcSource} numberOfLines={2}>
            Fuentes: {rates?.source?.usd} · {rates?.source?.eur} · {rates?.source?.usdt}
          </Text>

          <NeoButton title="Cerrar" onPress={() => setCalcOpen(false)} />
        </View>
      </View>
    </Modal>
    </>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  bellBtn: { marginLeft: 'auto', padding: 4 },
  bellBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  bellBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  hero: { fontSize: 24, fontWeight: '900', color: colors.primary },
  bannerCard: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  banner: { width: '100%', height: 150 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },
  promoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },
  promoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitleNoMargin: { fontSize: 18, fontWeight: '800', color: colors.text },
  promoSubtitle: { fontSize: 12, color: colors.textSecondary },
  promoCard: {
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  promoImg: { width: '100%', height: 110, backgroundColor: colors.background },
  promoBody: { padding: 10 },
  offBadge: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 },
  offText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  promoTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  promoProduct: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  catChip: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 110,
  },
  catName: { fontSize: 13, fontWeight: '700', color: colors.text },
  catCount: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 },
  ratesCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  ratesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  ratesTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratesTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  ratesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rateItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  rateCode: { fontSize: 12, fontWeight: '800', color: colors.primary },
  rateValue: { fontSize: 13, color: colors.text, marginTop: 2 },
  ratesSource: { fontSize: 10, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: 14 },
  calcLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 10, marginBottom: 4 },
  calcInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  calcFromRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  calcFromBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background,
  },
  calcFromBtnActive: { borderColor: colors.primary, backgroundColor: '#FDEEE9' },
  calcFromText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  calcFromTextActive: { color: colors.primary },
  calcRows: { marginTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  calcRowLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  calcRowValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  calcSource: { fontSize: 10, color: colors.textSecondary, marginTop: 10, textAlign: 'center' },
});
