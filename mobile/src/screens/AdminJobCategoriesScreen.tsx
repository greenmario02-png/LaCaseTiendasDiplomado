import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, Pencil } from 'lucide-react-native';
import { api, getErrorMessage } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { LoadingState, EmptyState, ErrorState } from '../components/redesign/States';
import { NeoInput } from '../components/redesign/NeoInput';
import { NeoButton } from '../components/redesign/NeoButton';

interface JobCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export default function AdminJobCategoriesScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<JobCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<JobCategory | 'new' | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/job-categories');
      setItems(data.data ?? []);
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const openNew = () => {
    setName('');
    setIcon('');
    setEditing('new');
  };

  const openEdit = (c: JobCategory) => {
    setName(c.name);
    setIcon(c.icon ?? '');
    setEditing(c);
  };

  const save = async () => {
    if (name.trim().length < 2) return Alert.alert('Falta información', 'El nombre debe tener al menos 2 caracteres.');
    setBusy(true);
    try {
      const body = { name: name.trim(), icon: icon.trim() || null };
      if (editing === 'new') {
        await api.post('/admin/job-categories', { ...body, sortOrder: items.length });
      } else if (editing) {
        await api.put(`/admin/job-categories/${editing.id}`, { ...body, sortOrder: editing.sortOrder, isActive: editing.isActive });
      }
      setEditing(null);
      load();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (c: JobCategory) => {
    try {
      await api.put(`/admin/job-categories/${c.id}`, { name: c.name, icon: c.icon ?? null, sortOrder: c.sortOrder, isActive: !c.isActive });
      load();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    }
  };

  const remove = (c: JobCategory) => {
    Alert.alert(
      'Eliminar categoría',
      `¿Eliminar «${c.name}»? Si ya tiene empleos asociados solo se desactivará para no perder el historial.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/job-categories/${c.id}`);
              load();
            } catch (e) {
              Alert.alert('Error', getErrorMessage(e));
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: JobCategory }) => (
    <View style={[styles.card, !item.isActive && { opacity: 0.6 }]}>
      <Text style={styles.emoji}>{item.icon || '💼'}</Text>
      <View style={styles.flex1}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={[styles.meta, { color: item.isActive ? colors.success : colors.textSecondary }]}>
          {item.isActive ? 'Activa' : 'Inactiva'}
        </Text>
      </View>
      <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn} accessibilityLabel="Editar categoría">
        <Pencil size={18} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => toggleActive(item)} style={styles.pill}>
        <Text style={styles.pillText}>{item.isActive ? 'Desactivar' : 'Activar'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => remove(item)} style={styles.pill}>
        <Text style={[styles.pillText, { color: colors.error }]}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Categorías de trabajo</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Plus size={16} color="#fff" />
          <Text style={styles.addText}>Nueva</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <LoadingState />
      ) : error && items.length === 0 ? (
        <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState message="Todavía no hay categorías de trabajo." />}
        />
      )}

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editing === 'new' ? 'Nueva categoría' : 'Editar categoría'}</Text>
            <Text style={styles.label}>Nombre *</Text>
            <NeoInput value={name} onChangeText={setName} placeholder="Ej: Ventas y atención al cliente" />
            <Text style={styles.label}>Ícono (emoji)</Text>
            <NeoInput value={icon} onChangeText={setIcon} placeholder="🛍️" />
            <View style={{ marginTop: 14 }}>
              <NeoButton title={busy ? 'Guardando…' : 'Guardar'} onPress={save} disabled={busy} />
              <NeoButton title="Cancelar" variant="ghost" onPress={() => setEditing(null)} style={{ marginTop: 8 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    flex1: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12 },
    title: { fontSize: 18, fontWeight: '800', color: colors.text },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
    addText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    card: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12 },
    emoji: { fontSize: 24 },
    name: { fontSize: 14, fontWeight: '700', color: colors.text },
    meta: { fontSize: 12 },
    iconBtn: { padding: 6 },
    pill: { paddingHorizontal: 8, paddingVertical: 6 },
    pillText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modal: { backgroundColor: colors.surface, borderRadius: 14, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
    label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 10, marginBottom: 6 },
  });
