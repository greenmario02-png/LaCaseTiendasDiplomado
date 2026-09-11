import React, { useMemo,  useCallback, useState  } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, getErrorMessage } from '../services/api';
import { CheckSquare, Square } from 'lucide-react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { NeoInput } from '../components/redesign/NeoInput';
import { NeoButton } from '../components/redesign/NeoButton';

export default function SellerPromotionsScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [promos, setPromos] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', discountType: 'PERCENTAGE', discountValue: '', startDate: '', endDate: '' });
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/seller/promotions');
      setPromos(data.data ?? []);
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const openNew = async () => {
    setForm({ title: '', description: '', discountType: 'PERCENTAGE', discountValue: '', startDate: '', endDate: '' });
    setSelectedProductIds([]);
    setModalOpen(true);
    try {
      const { data } = await api.get('/seller/products', { params: { limit: 50 } });
      setProducts((data.data ?? []).filter((p: any) => p.isActive !== false));
    } catch {}
  };

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggleProduct = (id: number) =>
    setSelectedProductIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const create = async () => {
    if (!form.title.trim()) return Alert.alert('Falta información', 'El título es obligatorio.');
    if (!form.discountValue.trim() || Number(form.discountValue) <= 0) return Alert.alert('Falta información', 'El descuento debe ser mayor a 0.');
    if (selectedProductIds.length === 0) return Alert.alert('Falta información', 'Elegí al menos un producto.');
    if (!form.startDate.trim() || !form.endDate.trim()) return Alert.alert('Falta información', 'Las fechas son obligatorias.');

    setSaving(true);
    try {
      await api.post('/seller/promotions', {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        productIds: selectedProductIds,
      });
      Alert.alert('Listo', 'Promoción creada correctamente.');
      setModalOpen(false);
      load();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = (p: any) => {
    Alert.alert('Desactivar promoción', `¿Desactivar «${p.title}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desactivar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/seller/promotions/${p.id}`);
            load();
          } catch (e) {
            Alert.alert('Error', getErrorMessage(e));
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const active = item.isActive && new Date(item.endDate) > new Date();
    return (
      <View style={styles.card}>
        <View style={styles.body}>
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.status, { color: active ? colors.success : colors.textSecondary }]}>{active ? 'Activa' : 'Finalizada'}</Text>
          </View>
          <Text style={styles.meta}>
            {item.discountType === 'PERCENTAGE' ? `${item.discountValue}% OFF` : `${item.discountValue} Bs OFF`} ·{' '}
            {item.startDate ? new Date(item.startDate).toLocaleDateString('es-BO') : ''} → {item.endDate ? new Date(item.endDate).toLocaleDateString('es-BO') : ''}
          </Text>
          <Text style={styles.meta}>{item.products?.length ?? 0} producto(s)</Text>
        </View>
        {active && (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.miniBtn, { borderColor: colors.error }]} onPress={() => deactivate(item)}>
              <Text style={[styles.miniBtnText, { color: colors.error }]}>Desactivar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis promociones</Text>
        <View style={styles.addWrap}>
          <NeoButton title="Nueva promoción" onPress={openNew} />
        </View>
      </View>
      {loading ? (
        <LoadingState />
      ) : promos.length === 0 ? (
        <EmptyState message="No hay promociones. Creá una para atraer más ventas." />
      ) : (
        <FlatList
          data={promos}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          renderItem={renderItem}
        />
      )}

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={{ maxHeight: '92%' }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Nueva promoción</Text>
              <Text style={styles.label}>Título *</Text>
              <NeoInput style={styles.input} value={form.title} onChangeText={(v) => set('title', v)} placeholder="Ej: Hot Sale de Hardware" />
              <Text style={styles.label}>Descripción</Text>
              <NeoInput style={styles.input} value={form.description} onChangeText={(v) => set('description', v)} placeholder="Detalle de la promoción..." />
              <Text style={styles.label}>Tipo de descuento</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['PERCENTAGE', 'FIXED'].map((t) => {
                  const active = form.discountType === t;
                  return (
                    <TouchableOpacity key={t} style={[styles.chip, active && styles.chipActive]} onPress={() => set('discountType', t)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{t === 'PERCENTAGE' ? 'Porcentaje (%)' : 'Monto fijo (Bs)'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.label}>Descuento *</Text>
              <NeoInput style={styles.input} value={form.discountValue} onChangeText={(v) => set('discountValue', v)} keyboardType="numeric" placeholder={form.discountType === 'PERCENTAGE' ? '10' : '50'} />
              <View style={styles.row2}>
                <View style={styles.col}>
                  <Text style={styles.label}>Inicio (YYYY-MM-DD) *</Text>
                  <NeoInput style={styles.input} value={form.startDate} onChangeText={(v) => set('startDate', v)} placeholder="2026-08-10" />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Fin (YYYY-MM-DD) *</Text>
                  <NeoInput style={styles.input} value={form.endDate} onChangeText={(v) => set('endDate', v)} placeholder="2026-08-17" />
                </View>
              </View>

              <Text style={styles.label}>Productos incluidos ({selectedProductIds.length})</Text>
              {products.length === 0 ? (
                <Text style={styles.hint}>Cargando productos de tu tienda...</Text>
              ) : (
                <View style={styles.productList}>
                  {products.slice(0, 10).map((p) => {
                    const active = selectedProductIds.includes(p.id);
                    return (
                      <TouchableOpacity key={p.id} style={styles.productItem} onPress={() => toggleProduct(p.id)}>
                        <View style={styles.productItemRow}>
                          {active ? (
                            <CheckSquare size={15} color={colors.primary} />
                          ) : (
                            <Square size={15} color={colors.textSecondary} />
                          )}
                          <Text style={[styles.productName, active && { color: colors.primary, fontWeight: '800' }]} numberOfLines={1}>
                            {p.name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <NeoButton title="Crear promoción" onPress={create} disabled={saving} style={styles.save} />
              <NeoButton title="Cancelar" variant="ghost" onPress={() => setModalOpen(false)} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  addWrap: { minWidth: 160 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  body: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  status: { fontSize: 12, fontWeight: '700', marginLeft: 8 },
  meta: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
  actions: { gap: 8 },
  miniBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  miniBtnText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { backgroundColor: colors.surface, borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 10, marginBottom: 4 },
  hint: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  input: {},
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.background },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  row2: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  productList: { marginTop: 4 },
  productItem: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  productItemRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  productName: { fontSize: 13, color: colors.text, flex: 1 },
  save: { marginTop: 18 },
});
