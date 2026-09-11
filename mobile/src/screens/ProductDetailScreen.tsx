import React, { useMemo,  useEffect, useState  } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { api, getErrorMessage, resolveImageUrl } from '../services/api';
import { queuePush } from '../services/offlineCache';
import { useAuthStore } from '../stores/authStore';
import { BadgeCheck, Truck, Store, Star, Eye } from 'lucide-react-native';
import { PriceDisplay } from '../components/redesign/PriceDisplay';
import { RatingStars } from '../components/redesign/RatingStars';
import { NeoButton } from '../components/redesign/NeoButton';
import { LoadingState } from '../components/redesign/States';
import { useAppTheme } from '../theme/ThemeContext';
import { colors as themeColors } from '../theme';

function money(v: string | number): string {
  return Number(v).toLocaleString('es-BO', { maximumFractionDigits: 0 }) + ' Bs';
}

function verdict(rating: number): { label: string; color: string } {
  if (rating >= 4.5) return { label: 'Muy recomendado', color: themeColors.success };
  if (rating >= 3.5) return { label: 'Recomendado', color: themeColors.info };
  return { label: 'No recomendado', color: themeColors.warning };
}

export default function ProductDetailScreen({ route, navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { id } = route.params;
  const user = useAuthStore((s) => s.user);
  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, r] = await Promise.all([
          api.get(`/products/${id}`),
          api.get(`/products/${id}/reviews`),
        ]);
        setProduct(p.data.data);
        setReviews(r.data.data ?? []);
        // Registrar vista del producto (contador "Visto por N personas")
        api.post(`/tracking/products/${id}/view`).catch(() => {});
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  const addToCart = async () => {
    setAdding(true);
    try {
      await api.post('/cart/items', { productId: id, quantity: qty });
      Alert.alert('¡Listo!', 'Producto agregado al carrito');
    } catch (err) {
      // Sin conexión: encolar para que se agregue cuando vuelva la red
      await queuePush({ method: 'post', url: '/cart/items', data: { productId: id, quantity: qty } });
      Alert.alert('Sin conexión', 'Se guardó en tu carrito offline. Se sincronizará cuando vuelva la conexión.');
    } finally {
      setAdding(false);
    }
  };

  const consult = async () => {
    if (!user) {
      Alert.alert('Iniciá sesión', 'Para consultar por un producto necesitás iniciar sesión.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Iniciar sesión', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    try {
      const { data } = await api.post('/chat', { sellerId: product.seller.id, productId: product.id });
      navigation.navigate('ChatThread', { id: data.data.id });
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  if (loading) {
    return <LoadingState />;
  }
  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Producto no encontrado</Text>
      </View>
    );
  }

  const outOfStock = product.stock <= 0;
  const image = resolveImageUrl(product.images?.find((i: any) => i.isPrimary)?.url || product.images?.[0]?.url);

  return (
    <ScrollView style={styles.flex}>
      <View style={styles.imageCard}>
        {image ? <Image source={{ uri: image }} style={styles.image} resizeMode="cover" /> : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.name}>{product.name}</Text>
        {product.condition === 'NEW' && <Text style={styles.new}>Nuevo</Text>}
        {product.condition === 'USED' && <Text style={styles.used}>Usado ({product.conditionScore}/10)</Text>}
        {product.saleCount ? (
          <View style={styles.soldRow}>
            <BadgeCheck size={14} color={colors.success} />
            <Text style={styles.sold}>{product.saleCount} vendidos</Text>
          </View>
        ) : null}

        {(product.viewingNow > 0 || product.viewCount > 0) && (
          <View style={styles.viewsRow}>
            <Eye size={14} color={colors.info} />
            <Text style={styles.views}>
              {product.viewingNow > 0 && `${product.viewingNow} persona(s) están viendo ahora · `}
              Visto por {product.viewCount} persona(s)
            </Text>
          </View>
        )}

        <View style={styles.priceRow}>
          <PriceDisplay
            price={Number(product.originalPrice ?? product.price)}
            salePrice={product.originalPrice ? Number(product.price) : null}
            usdPrice={product.priceUsd ? Number(product.priceUsd) : undefined}
          />
        </View>

        {product.seller?.freeShippingThreshold ? (
          <View style={styles.freeShipRow}>
            <Truck size={14} color={colors.success} />
            <Text style={styles.freeShip}>Envío gratis desde {money(product.seller.freeShippingThreshold)}</Text>
          </View>
        ) : null}

        <Text style={styles.section}>Descripción</Text>
        <Text style={styles.desc}>{product.description || 'Sin descripción'}</Text>

        {product.attributes?.length > 0 && (
          <>
            <Text style={styles.section}>Especificaciones</Text>
            {product.attributes.map((a: any, idx: number) => (
              <View key={idx} style={styles.specRow}>
                <Text style={styles.specName}>{a.attributeDefinition?.name || a.name}:</Text>
                <Text style={styles.specValue}>{a.valueText ?? a.valueNumber ?? a.valueBoolean ?? ''}</Text>
              </View>
            ))}
          </>
        )}

        {product.seller && (
          <TouchableOpacity onPress={() => navigation.navigate('Seller', { id: product.seller.id })} style={styles.sellerBox}>
            <View style={styles.sellerNameRow}>
              <Store size={15} color={colors.primary} />
              <Text style={styles.sellerName}>{product.seller.storeName}</Text>
            </View>
            <View style={styles.sellerMetaRow}>
              <Text style={styles.sellerMeta}>
                {product.seller.locationCity}, {product.seller.locationState}
              </Text>
              <RatingStars rating={Number(product.seller.rating)} count={product.seller.reviewCount ?? 0} />
            </View>
          </TouchableOpacity>
        )}

        {/* Reseñas */}
        <Text style={styles.section}>Reseñas ({reviews.length})</Text>
        {reviews.length === 0 ? (
          <Text style={styles.desc}>Aún no hay reseñas. Sé el primero.</Text>
        ) : (
          <>
            {(() => {
              const avg = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;
              const v = verdict(avg);
              const dist = [5, 4, 3, 2, 1].map((star) => ({
                star,
                pct: (reviews.filter((r) => r.rating === star).length / reviews.length) * 100,
              }));
              return (
                <View style={styles.reviewSummary}>
                  <View style={styles.reviewAvgRow}>
                    <Text style={styles.reviewAvg}>{avg.toFixed(1)}</Text>
                    <Text style={[styles.reviewVerdict, { color: v.color }]}>{v.label}</Text>
                  </View>
                  <Text style={styles.reviewTotal}>{reviews.length} persona(s) calificaron</Text>
                  {dist.map((d) => (
                    <View key={d.star} style={styles.distRow}>
                      <View style={styles.distLabelRow}>
                        <Text style={styles.distLabel}>{d.star}</Text>
                        <Star size={10} color={colors.warning} fill={colors.warning} />
                      </View>
                      <View style={styles.distTrack}>
                        <View style={[styles.distFill, { width: `${d.pct}%` }]} />
                      </View>
                    </View>
                  ))}
                </View>
              );
            })()}
            {reviews.slice(0, 3).map((r: any) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHead}>
                  <View style={styles.reviewStarsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={12} color={colors.warning} fill={s <= r.rating ? colors.warning : 'transparent'} />
                    ))}
                  </View>
                  <Text style={styles.reviewAuthor}>{r.user?.firstName} {r.user?.lastName}</Text>
                </View>
                {r.comment ? <Text style={styles.desc}>{r.comment}</Text> : null}
                {r.tags?.length > 0 && (
                  <View style={styles.tagRow}>
                    {r.tags.map((t: string) => (
                      <View key={t} style={styles.tag}>
                        <Text style={styles.tagText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* Barra de compra */}
        <View style={styles.buyBar}>
          {!outOfStock && (
            <View style={styles.qtyBox}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty((q) => Math.max(1, q - 1))}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qty}>{qty}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty((q) => Math.min(product.stock, q + 1))}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
          <NeoButton
            title={outOfStock ? 'Sin stock' : adding ? 'Agregando...' : 'Agregar al carrito'}
            onPress={addToCart}
            disabled={outOfStock || adding}
            style={styles.addBtn}
          />
          {product.seller && (
            <NeoButton title="Consultar" onPress={consult} />
          )}
        </View>

        {!user && <Text style={styles.loginHint}>Iniciá sesión para un carrito persistente</Text>}
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.error, fontSize: 16 },
  image: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: '#eee',
    borderRadius: 14,
  },
  imageCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  body: { padding: 16 },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  new: { color: colors.success, fontWeight: '700', marginTop: 4 },
  used: { color: colors.warning, fontWeight: '700', marginTop: 4 },
  sold: { color: colors.success, fontWeight: '600', marginTop: 6 },
  soldRow: { flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 6 },
  views: { color: colors.info, fontWeight: '600', fontSize: 13, marginTop: 6 },
  viewsRow: { flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  freeShip: { color: colors.success, fontWeight: '700', marginTop: 6 },
  freeShipRow: { flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 6 },
  section: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 20, marginBottom: 6 },
  desc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  specRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  specName: { flex: 1, fontSize: 13, color: colors.textSecondary },
  specValue: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'right' },
  sellerBox: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, marginTop: 20 },
  sellerNameRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  sellerName: { fontSize: 15, fontWeight: '700', color: colors.text },
  sellerMetaRow: { flexDirection: 'row', gap: 3, alignItems: 'center', marginTop: 4 },
  sellerMeta: { fontSize: 12, color: colors.textSecondary },
  reviewSummary: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 12 },
  reviewAvgRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvg: { fontSize: 30, fontWeight: '900', color: colors.text },
  reviewVerdict: { fontSize: 14, fontWeight: '800' },
  reviewTotal: { fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: 6 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  distLabelRow: { flexDirection: 'row', gap: 2, alignItems: 'center', width: 24 },
  distLabel: { fontSize: 11, color: colors.textSecondary },
  distTrack: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  distFill: { height: '100%', backgroundColor: colors.warning, borderRadius: 3 },
  reviewCard: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 8 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  reviewStarsRow: { flexDirection: 'row', gap: 2 },
  reviewAuthor: { fontSize: 12, color: colors.textSecondary },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { backgroundColor: '#E3F2FD', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, color: colors.info, fontWeight: '600' },
  buyBar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 },
  qtyBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface },
  qtyBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  qty: { fontSize: 15, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  addBtn: { flex: 1 },
  loginHint: { textAlign: 'center', color: colors.textSecondary, fontSize: 12, marginTop: 12 },
});
