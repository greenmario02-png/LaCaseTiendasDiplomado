import React, { useMemo,  useEffect, useState  } from 'react';
import { View, Text, FlatList, Image, StyleSheet } from 'react-native';
import { api, getErrorMessage, resolveImageUrl } from '../services/api';
import { ProductCard } from '../components/redesign/ProductCard';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { Store, MapPin, BadgeCheck, MessageCircle, Star } from 'lucide-react-native';
import { useAppTheme } from '../theme/ThemeContext';

const money = (n: string | number) => `${Number(n).toLocaleString('es-BO', { maximumFractionDigits: 0 })} Bs`;

export default function SellerScreen({ route, navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = route.params;
  const [seller, setSeller] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, p, r] = await Promise.all([
          api.get(`/sellers/${id}`),
          api.get(`/sellers/${id}/products`),
          api.get(`/sellers/${id}/reviews`),
        ]);
        setSeller(s.data.data);
        setProducts(p.data.data ?? []);
        setReviews(r.data.data ?? []);
      } catch (e) {
        console.warn(getErrorMessage(e));
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return <LoadingState />;
  }
  if (!seller) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Tienda no encontrada</Text>
      </View>
    );
  }

  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const img = seller.storeLogo || seller.profileImage;
  const header = (
    <View style={styles.header}>
      {img ? <Image source={{ uri: resolveImageUrl(img) }} style={styles.logo} /> : <View style={[styles.logo, styles.logoFallback]}><Store size={36} color={colors.primary} /></View>}
      <Text style={styles.name}>{seller.storeName}</Text>
      <View style={styles.metaRow}>
        {seller.locationCity ? (
          <View style={styles.metaItem}>
            <MapPin size={12} color={colors.textSecondary} />
            <Text style={styles.meta}>{seller.locationCity}{seller.locationState ? `, ${seller.locationState}` : ''}</Text>
          </View>
        ) : null}
        {seller.isVerified ? (
          <View style={styles.metaItem}>
            <BadgeCheck size={12} color={colors.success} />
            <Text style={styles.verified}>Verificado</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={styles.statValue}>{avg ? avg.toFixed(1) : '—'}</Text><Text style={styles.statLabel}>Rating</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{reviews.length}</Text><Text style={styles.statLabel}>Reseñas</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{products.length}</Text><Text style={styles.statLabel}>Productos</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{seller.totalSales ?? 0}</Text><Text style={styles.statLabel}>Ventas</Text></View>
      </View>
      {seller.storeDescription ? <Text style={styles.desc}>{seller.storeDescription}</Text> : null}
      {seller.whatsappPhone ? (
        <View style={styles.waRow}>
          <MessageCircle size={13} color={colors.success} />
          <Text style={styles.wa}>WhatsApp: {seller.whatsappPhone}</Text>
        </View>
      ) : null}
      {reviews.length > 0 && (
        <View style={styles.reviewBox}>
          <Text style={styles.reviewTitle}>Reseñas recientes</Text>
          {reviews.slice(0, 3).map((r: any) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewStarsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={12} color={colors.warning} fill={s <= r.rating ? colors.warning : 'transparent'} />
                ))}
              </View>
              {r.comment ? <Text style={styles.reviewComment} numberOfLines={2}>{r.comment}</Text> : null}
            </View>
          ))}
        </View>
      )}
      <Text style={styles.section}>Productos de la tienda</Text>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={products}
      numColumns={2}
      keyExtractor={(item) => String(item.id)}
      columnWrapperStyle={{ gap: 12, paddingHorizontal: 12, marginBottom: 12 }}
      contentContainerStyle={{ paddingBottom: 40 }}
      ListHeaderComponent={header}
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
      ListEmptyComponent={<EmptyState message="No hay productos" />}
    />
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  error: { color: colors.error, fontSize: 16 },
  header: { padding: 16, alignItems: 'center' },
  logo: { width: 84, height: 84, borderRadius: 42, marginBottom: 8 },
  logoFallback: { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  metaItem: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  meta: { fontSize: 12, color: colors.textSecondary },
  verified: { fontSize: 12, color: colors.success, fontWeight: '700' },
  statsRow: { flexDirection: 'row', marginTop: 14, gap: 8 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  desc: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 18 },
  waRow: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 8 },
  wa: { fontSize: 13, color: colors.success, fontWeight: '700' },
  reviewBox: { width: '100%', marginTop: 16 },
  reviewTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 8 },
  reviewCard: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 6 },
  reviewStarsRow: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontSize: 12, color: colors.text, marginTop: 4 },
  section: { width: '100%', fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 20, marginBottom: 10 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 30 },
});
