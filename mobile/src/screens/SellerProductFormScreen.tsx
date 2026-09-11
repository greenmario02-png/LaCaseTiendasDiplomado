import React, { useMemo,  useEffect, useState  } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { api, getErrorMessage, resolveImageUrl } from '../services/api';
import { uploadImage } from '../services/upload';
import ImagePickerButton from '../components/ImagePickerButton';
import { useAppTheme } from '../theme/ThemeContext';
import { NeoInput } from '../components/redesign/NeoInput';
import { NeoButton } from '../components/redesign/NeoButton';
import { LoadingState } from '../components/redesign/States';

export default function SellerProductFormScreen({ navigation, route }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const editingId = route.params?.id ?? null;
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    condition: 'NEW',
    price: '',
    originalPrice: '',
    stock: '0',
    sku: '',
    description: '',
    warrantyInfo: '',
  });
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(editingId));

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api
      .get('/products/categories')
      .then(({ data }) => setCategories(data.data ?? []))
      .catch(() => {});
    if (editingId) {
      api
        .get(`/products/${editingId}`)
        .then(({ data }) => {
          const p = data.data;
          setForm({
            name: p.name,
            categoryId: String(p.categoryId ?? ''),
            condition: p.condition,
            price: String(p.price ?? ''),
            originalPrice: p.originalPrice ? String(p.originalPrice) : '',
            stock: String(p.stock ?? 0),
            sku: p.sku ?? '',
            description: p.description ?? '',
            warrantyInfo: p.warrantyInfo ?? '',
          });
          const img = p.images?.find((i: any) => i.isPrimary)?.url || p.images?.[0]?.url;
          if (img) setImageUrl(img);
        })
        .catch((e) => Alert.alert('Error', getErrorMessage(e)))
        .finally(() => setLoading(false));
    }
  }, [editingId]);

  const onPickedImage = async (uri: string) => {
    setUploading(true);
    try {
      const url = await uploadImage(uri, '/seller/upload');
      setImageUrl(url);
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) return Alert.alert('Falta información', 'El nombre del producto es obligatorio.');
    if (!form.categoryId) return Alert.alert('Falta información', 'Elegí la categoría del producto.');
    if (!form.price.trim() || Number(form.price) <= 0) return Alert.alert('Falta información', 'El precio debe ser mayor a 0.');

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        categoryId: Number(form.categoryId),
        condition: form.condition,
        price: Number(form.price),
        originalPrice: form.originalPrice.trim() ? Number(form.originalPrice) : undefined,
        stock: Number(form.stock) || 0,
        sku: form.sku.trim() || undefined,
        description: form.description.trim() || undefined,
        warrantyInfo: form.warrantyInfo.trim() || undefined,
      };
      if (imageUrl) payload.images = [{ url: imageUrl, isPrimary: true }];

      if (editingId) {
        await api.put(`/seller/products/${editingId}`, payload);
        Alert.alert('Listo', 'Producto actualizado correctamente.');
      } else {
        await api.post('/seller/products', payload);
        Alert.alert('Listo', 'Producto creado. Espera la moderación del admin.');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{editingId ? 'Editar producto' : 'Nuevo producto'}</Text>

      <Text style={styles.label}>Foto principal</Text>
      <ImagePickerButton label="Cambiar foto" currentUri={imageUrl} onPicked={onPickedImage} square uploading={uploading} />

      <Text style={styles.label}>Nombre *</Text>
      <NeoInput style={styles.input} value={form.name} onChangeText={(v) => set('name', v)} placeholder="Ej: Teclado Mecánico RGB" />

      <Text style={styles.label}>Categoría *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {categories.map((c) => {
            const active = String(c.id) === form.categoryId;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => set('categoryId', String(c.id))}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      {!form.categoryId && <Text style={styles.hint}>Elegí una categoría de la lista.</Text>}

      <Text style={styles.label}>Condición</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {['NEW', 'USED', 'REFURBISHED'].map((c) => {
          const active = form.condition === c;
          return (
            <TouchableOpacity key={c} style={[styles.chip, active && styles.chipActive]} onPress={() => set('condition', c)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {c === 'NEW' ? 'Nuevo' : c === 'USED' ? 'Usado' : 'Reacondicionado'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Precio (Bs) *</Text>
          <NeoInput style={styles.input} value={form.price} onChangeText={(v) => set('price', v)} keyboardType="numeric" placeholder="0" />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Precio original (Bs)</Text>
          <NeoInput style={styles.input} value={form.originalPrice} onChangeText={(v) => set('originalPrice', v)} keyboardType="numeric" placeholder="0" />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Stock</Text>
          <NeoInput style={styles.input} value={form.stock} onChangeText={(v) => set('stock', v)} keyboardType="numeric" placeholder="0" />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>SKU (opcional)</Text>
          <NeoInput style={styles.input} value={form.sku} onChangeText={(v) => set('sku', v)} placeholder="Ej: PRO-0001" />
        </View>
      </View>

      <Text style={styles.label}>Descripción</Text>
      <NeoInput
        style={styles.textarea}
        value={form.description}
        onChangeText={(v) => set('description', v)}
        placeholder="Descripción del producto..."
        multiline
      />

      <Text style={styles.label}>Garantía</Text>
      <NeoInput style={styles.input} value={form.warrantyInfo} onChangeText={(v) => set('warrantyInfo', v)} placeholder="Ej: 12 meses" />

      <NeoButton title={editingId ? 'Guardar cambios' : 'Crear producto'} onPress={save} disabled={saving} style={styles.save} />
      <NeoButton title="Cancelar" variant="ghost" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 12, marginBottom: 4 },
  hint: { fontSize: 11, color: colors.warning, marginTop: 2 },
  input: {},
  textarea: { minHeight: 84, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  save: { marginTop: 24 },
});
