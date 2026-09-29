import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    if (name.trim().length < 2) return Alert.alert(t('mobile.common.missingInfoTitle'), t('mobile.adminJobCategories.nameTooShortMessage'));
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
      Alert.alert(t('mobile.common.errorTitle'), getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (c: JobCategory) => {
    try {
      await api.put(`/admin/job-categories/${c.id}`, { name: c.name, icon: c.icon ?? null, sortOrder: c.sortOrder, isActive: !c.isActive });
      load();
    } catch (e) {
      Alert.alert(t('mobile.common.errorTitle'), getErrorMessage(e));
    }
  };

  const remove = (c: JobCategory) => {
    Alert.alert(
      t('mobile.adminJobCategories.deleteConfirmTitle'),
      t('mobile.adminJobCategories.deleteConfirmMessage', { name: c.name }),
      [
        { text: t('mobile.common.cancel'), style: 'cancel' },
        {
          text: t('mobile.common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/job-categories/${c.id}`);
              load();
            } catch (e) {
              Alert.alert(t('mobile.common.errorTitle'), getErrorMessage(e));
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
          {item.isActive ? t('mobile.adminJobCategories.activeStatus') : t('mobile.adminJobCategories.inactiveStatus')}
        </Text>
      </View>
      <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn} accessibilityLabel={t('mobile.adminJobCategories.editCategoryA11yLabel')}>
        <Pencil size={18} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => toggleActive(item)} style={styles.pill}>
        <Text style={styles.pillText}>{item.isActive ? t('mobile.common.deactivate') : t('mobile.common.activate')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => remove(item)} style={styles.pill}>
        <Text style={[styles.pillText, { color: colors.error }]}>{t('mobile.common.delete')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('mobile.adminJobCategories.title')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Plus size={16} color="#fff" />
          <Text style={styles.addText}>{t('mobile.adminJobCategories.newButton')}</Text>
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
          ListEmptyComponent={<EmptyState message={t('mobile.adminJobCategories.emptyMessage')} />}
        />
      )}

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editing === 'new' ? t('mobile.adminJobCategories.newCategoryModalTitle') : t('mobile.adminJobCategories.editCategoryModalTitle')}</Text>
            <Text style={styles.label}>{t('mobile.adminJobCategories.nameFieldLabel')}</Text>
            <NeoInput value={name} onChangeText={setName} placeholder={t('mobile.adminJobCategories.namePlaceholder')} />
            <Text style={styles.label}>{t('mobile.adminJobCategories.iconFieldLabel')}</Text>
            <NeoInput value={icon} onChangeText={setIcon} placeholder="🛍️" />
            <View style={{ marginTop: 14 }}>
              <NeoButton title={busy ? t('mobile.common.saving') : t('mobile.common.saveChanges')} onPress={save} disabled={busy} />
              <NeoButton title={t('mobile.common.cancel')} variant="ghost" onPress={() => setEditing(null)} style={{ marginTop: 8 }} />
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
