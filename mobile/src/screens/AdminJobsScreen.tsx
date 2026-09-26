import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BadgeCheck } from 'lucide-react-native';
import { api, getErrorMessage } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { LoadingState, EmptyState, ErrorState } from '../components/redesign/States';
import { NeoInput } from '../components/redesign/NeoInput';
import { NeoButton } from '../components/redesign/NeoButton';

const TABS: { key: string; label: string }[] = [
  { key: 'PENDING', label: 'Pendientes' },
  { key: 'APPROVED', label: 'Aprobados' },
  { key: 'REJECTED', label: 'Rechazados' },
  { key: 'CLOSED', label: 'Cerrados' },
];
const PERIOD_LABEL: Record<string, string> = { DAILY: 'Diario', WEEKLY: 'Semanal', MONTHLY: 'Mensual' };

function fmt(v: any) {
  return Number(v).toLocaleString('es-BO', { maximumFractionDigits: 0 });
}
function salaryText(j: any) {
  const p = PERIOD_LABEL[j.payPeriod] ?? '';
  const hasMin = j.salaryMin != null && j.salaryMin !== '';
  const hasMax = j.salaryMax != null && j.salaryMax !== '';
  if (!hasMin && !hasMax) return `Sueldo a convenir · ${p}`;
  if (hasMin && hasMax) return `${fmt(j.salaryMin)} - ${fmt(j.salaryMax)} Bs · ${p}`;
  return `${hasMin ? 'Desde' : 'Hasta'} ${fmt(hasMin ? j.salaryMin : j.salaryMax)} Bs · ${p}`;
}

export default function AdminJobsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState('PENDING');
  const [jobs, setJobs] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectJob, setRejectJob] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (status: string) => {
    try {
      const { data } = await api.get('/admin/jobs', { params: { status } });
      const list = data.data ?? [];
      setJobs(list);
      if (status === 'PENDING') setPendingCount(list.length);
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    if (status !== 'PENDING') {
      try {
        const { data } = await api.get('/admin/jobs', { params: { status: 'PENDING' } });
        setPendingCount((data.data ?? []).length);
      } catch {}
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(tab);
    }, [load, tab])
  );

  const selectTab = (k: string) => {
    if (k === tab) return;
    setJobs([]);
    setTab(k);
  };

  const approve = (j: any) => {
    Alert.alert('Aprobar empleo', `¿Publicar «${j.title}»? Estará visible por 30 días.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprobar',
        onPress: async () => {
          try {
            await api.put(`/admin/jobs/${j.id}/moderate`, { action: 'approve' });
            load(tab);
          } catch (e) {
            Alert.alert('Error', getErrorMessage(e));
          }
        },
      },
    ]);
  };

  const confirmReject = async () => {
    if (reason.trim().length < 5) return Alert.alert('Falta información', 'El motivo debe tener al menos 5 caracteres.');
    setBusy(true);
    try {
      await api.put(`/admin/jobs/${rejectJob.id}/moderate`, { action: 'reject', reason: reason.trim() });
      setRejectJob(null);
      setReason('');
      load(tab);
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.jobTitle}>{item.title}</Text>
      <View style={styles.storeRow}>
        <Text style={styles.meta}>{item.store?.storeName}</Text>
        {item.store?.isVerified && <BadgeCheck size={14} color={colors.success} />}
        {item.store?.isVerified && <Text style={[styles.meta, { color: colors.success }]}>Verificada</Text>}
      </View>
      <Text style={styles.meta}>{item.category?.name} · {item.city}</Text>
      <Text style={styles.salary}>{salaryText(item)}</Text>
      <Text style={styles.desc} numberOfLines={4}>{item.description}</Text>
      {item.status === 'REJECTED' && item.rejectionReason ? (
        <Text style={[styles.meta, { color: colors.error }]}>Motivo: {item.rejectionReason}</Text>
      ) : null}
      {item.status === 'PENDING' && (
        <View style={styles.actions}>
          <View style={styles.flex1}><NeoButton title="Aprobar" onPress={() => approve(item)} /></View>
          <View style={styles.flex1}><NeoButton title="Rechazar" variant="ghost" onPress={() => { setReason(''); setRejectJob(item); }} /></View>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.flex}>
      <Text style={styles.title}>Moderar empleos</Text>
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity key={t.key} style={[styles.chip, active && styles.chipActive]} onPress={() => selectTab(t.key)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t.label}{t.key === 'PENDING' ? ` (${pendingCount})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.chip} onPress={() => navigation.navigate('AdminJobCategories')}>
          <Text style={styles.chipText}>Categorías de trabajo</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <LoadingState />
      ) : error && jobs.length === 0 ? (
        <ErrorState message={error} onRetry={() => { setLoading(true); load(tab); }} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(tab); }} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState message="No hay empleos en este estado." />}
        />
      )}

      <Modal visible={!!rejectJob} transparent animationType="fade" onRequestClose={() => setRejectJob(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Rechazar empleo</Text>
            <Text style={styles.meta}>{rejectJob?.title}</Text>
            <Text style={styles.label}>Motivo * (mín. 5 caracteres)</Text>
            <NeoInput value={reason} onChangeText={setReason} multiline placeholder="Ej: Falta información del sueldo" />
            <NeoButton title="Confirmar rechazo" onPress={confirmReject} disabled={busy} />
            <NeoButton title="Cancelar" variant="ghost" onPress={() => setRejectJob(null)} style={{ marginTop: 8 }} />
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
    title: { fontSize: 18, fontWeight: '800', color: colors.text, paddingHorizontal: 16, paddingTop: 12 },
    tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
    chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    chipText: { fontSize: 12, color: colors.text },
    chipTextActive: { color: '#fff', fontWeight: '700' },
    card: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
    jobTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    storeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    meta: { fontSize: 12, color: colors.textSecondary },
    salary: { fontSize: 14, fontWeight: '700', color: colors.primary },
    desc: { fontSize: 13, color: colors.text, marginTop: 2 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modal: { backgroundColor: colors.surface, borderRadius: 14, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
    label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 10, marginBottom: 6 },
  });
