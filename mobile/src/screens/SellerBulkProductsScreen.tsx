import React, { useMemo,  useCallback, useState  } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import { api, getErrorMessage } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { NeoButton } from '../components/redesign/NeoButton';

interface EditableItem {
  knownId?: number;
  name: string;
  price: string;
  stock: string;
  creating: boolean;
}

export default function SellerBulkProductsScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadCats = useCallback(async () => {
    try {
      const { data } = await api.get('/products/categories', { params: { limit: 100 } });
      setCategories(data.data ?? []);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCats().finally(() => setLoading(false));
    }, [loadCats])
  );

  const loadKnown = async (catId: number) => {
    setSelectedCat(catId);
    try {
      const { data } = await api.get('/seller/known-products', { params: { categoryId: catId } });
      const known = data.data ?? [];
      setItems(
        known.length > 0
          ? known.map((k: any) => ({ knownId: k.id, name: k.name ?? '', price: k.price ?? '', stock: k.stock ?? '5' }))
          : []
      );
    } catch (e) {
      setItems([]);
      Alert.alert('Aviso', getErrorMessage(e));
    }
  };

  const updateItem = (idx: number, patch: Partial<EditableItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addManual = () => {
    setItems((prev) => [...prev, { name: '', price: '', stock: '5', creating: false }]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const createAll = async () => {
    const valid = items.filter((it) => it.name.trim() && Number(it.price) > 0);
    if (valid.length === 0) {
      Alert.alert('Nada para crear', 'Completá nombre y precio válidos en al menos un producto.');
      return;
    }
    if (!selectedCat) {
      Alert.alert('Falta categoría', 'Elegí la categoría de los productos.');
      return;
    }
    setBusy(true);
    let created = 0;
    let errors = 0;
    for (const it of valid) {
      try {
        await api.post('/seller/products', {
          name: it.name.trim(),
          categoryId: selectedCat,
          description: `Producto cargado masivamente (${it.name.trim()})`,
          condition: 'NEW',
          price: Number(it.price),
          stock: Number(it.stock) || 0,
          attributes: [],
          images: [],
        });
        created++;
      } catch {
        errors++;
      }
    }
    setBusy(false);
    Alert.alert('Carga masiva', `Se crearon ${created} producto(s).${errors ? ` ${errors} con error.` : ''}`, [
      { text: 'Ver mis productos', onPress: () => navigation.navigate('SellerProducts') },
      { text: 'OK' },
    ]);
    setItems([]);
  };

  const renderItem = ({ item, index }: { item: EditableItem; index: number }) => (
    <View style={styles.itemCard}>
      <TextInput
        style={styles.nameInput}
        value={item.name}
        onChangeText={(v) => updateItem(index, { name: v })}
        placeholder="Nombre del producto *"
        placeholderTextColor={colors.textSecondary}
      />
      <View style={styles.row}>
        <TextInput
          style={styles.smallInput}
          value={item.price}
          onChangeText={(v) => updateItem(index, { price: v })}
          placeholder="Precio Bs *"
          keyboardType="numeric"
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          style={styles.smallInput}
          value={item.stock}
          onChangeText={(v) => updateItem(index, { stock: v })}
          placeholder="Stock"
          keyboardType="numeric"
          placeholderTextColor={colors.textSecondary}
        />
        <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(index)}>
          <Text style={styles.removeText}>Quitar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Carga masiva de productos</Text>
        <Text style={styles.subtitle}>Elegí una categoría, completá los datos y creá varios productos de una vez.</Text>
      </View>

      {/* Selector de categoría */}
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(c) => String(c.id)}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.catChip, selectedCat === item.id && styles.catChipActive]}
            onPress={() => loadKnown(item.id)}
          >
            <Text style={[styles.catChipText, selectedCat === item.id && styles.catChipTextActive]}>{item.name}</Text>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
      />

      {loading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 8 }}>
              <NeoButton title="Agregar producto manual" variant="secondary" onPress={addManual} />
            </View>
          }
          ListEmptyComponent={
            <EmptyState message={selectedCat ? 'No hay plantillas en esta categoría. Agregá productos manualmente.' : 'Elegí una categoría arriba.'} />
          }
          ListFooterComponent={
            items.length > 0 ? (
              <View style={{ marginTop: 8 }}>
                <NeoButton title={busy ? 'Creando...' : `Crear ${items.length} producto(s)`} onPress={createAll} disabled={busy} />
              </View>
            ) : null
          }
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => selectedCat && loadKnown(selectedCat)} tintColor={colors.primary} />}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { fontSize: 13, color: colors.text },
  catChipTextActive: { color: '#fff', fontWeight: '700' },
  itemCard: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8 },
  nameInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: colors.text },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  smallInput: { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: colors.text },
  removeBtn: { borderWidth: 1, borderColor: colors.error, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  removeText: { color: colors.error, fontSize: 12, fontWeight: '700' },
});
