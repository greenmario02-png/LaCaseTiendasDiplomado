import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, RefreshControl, Alert, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BadgeCheck, MapPin, AlertTriangle } from 'lucide-react-native';
import { api, getErrorMessage, openApplicationCv } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { NeoButton } from '../components/redesign/NeoButton';
import { LoadingState, EmptyState, ErrorState } from '../components/redesign/States';
import { formatSalary } from '../components/redesign/JobCard';

export type ApplicationStatus = 'RECEIVED' | 'VIEWED' | 'SHORTLISTED' | 'REJECTED' | 'HIRED' | 'WITHDRAWN';

export const APPLICATION_LABEL: Record<ApplicationStatus, string> = {
  RECEIVED: 'Recibida',
  VIEWED: 'Vista por la tienda',
  SHORTLISTED: 'Preseleccionado/a',
  REJECTED: 'No seleccionado/a',
  HIRED: '¡Contratado/a!',
  WITHDRAWN: 'Retirada',
};

export const statusColor = (s: ApplicationStatus, colors: any): string => {
  switch (s) {
    case 'HIRED':
      return colors.success;
    case 'SHORTLISTED':
      return colors.primary;
    case 'VIEWED':
      return colors.warning;
    case 'REJECTED':
      return colors.error;
    default:
      return colors.textSecondary;
  }
};

/** Se puede retirar mientras siga activa. */
export const canWithdraw = (s: ApplicationStatus) => s === 'RECEIVED' || s === 'VIEWED' || s === 'SHORTLISTED';

interface Application {
  id: number;
  jobId: number;
  status: ApplicationStatus;
  storeNote?: string | null;
  hasCv?: boolean;
  cvName?: string | null;
  createdAt: string;
  job: {
    id: number;
    title: string;
    city?: string | null;
    payPeriod: any;
    salaryMin?: string | null;
    salaryMax?: string | null;
    status: string;
    expiresAt?: string | null;
    store?: { id: number; storeName: string; isVerified?: boolean } | null;
  };
}

export default function MyApplicationsScreen() {
  const { colors, raised } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'refresh') setRefreshing(true);
    try {
      const { data } = await api.get('/jobs/applications/mine');
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
      load('initial');
    }, [load])
  );

  const withdraw = (a: Application) => {
    Alert.alert('Retirar postulación', `¿Querés retirar tu postulación a "${a.job.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Retirar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/jobs/${a.jobId}/apply`);
            load('initial');
          } catch (e) {
            Alert.alert('No se pudo retirar', getErrorMessage(e));
          }
        },
      },
    ]);
  };

  if (loading && items.length === 0) return <LoadingState />;
  if (error && items.length === 0) return <ErrorState message={error} onRetry={() => load('initial')} />;

  const renderItem = ({ item: a }: { item: Application }) => {
    const color = statusColor(a.status, colors);
    const expired = !!a.job.expiresAt && new Date(a.job.expiresAt).getTime() < Date.now();
    const closed = a.job.status !== 'ACTIVE' || expired;
    return (
      <View style={[styles.card, raised]}>
        <View style={styles.head}>
          <Text style={styles.title} numberOfLines={2}>
            {a.job.title}
          </Text>
          <View style={[styles.chip, { borderColor: color }]}>
            <Text style={[styles.chipText, { color }]}>{APPLICATION_LABEL[a.status] ?? a.status}</Text>
          </View>
        </View>
        {a.job.store ? (
          <View style={styles.row}>
            <Text style={styles.store}>{a.job.store.storeName}</Text>
            {a.job.store.isVerified ? <BadgeCheck size={15} color={colors.success} /> : null}
          </View>
        ) : null}
        <View style={styles.row}>
          {a.job.city ? (
            <>
              <MapPin size={13} color={colors.textSecondary} />
              <Text style={styles.meta}>{a.job.city}  ·  </Text>
            </>
          ) : null}
          <Text style={styles.salary}>{formatSalary(a.job as any)}</Text>
        </View>
        <Text style={styles.meta}>Postulaste el {new Date(a.createdAt).toLocaleDateString('es-BO')}</Text>
        {a.hasCv ? (
          <NeoButton
            title={`Ver mi CV${a.cvName ? ` (${a.cvName})` : ''}`}
            variant="ghost"
            onPress={() => openApplicationCv(a.id).catch((e) => Alert.alert('No se pudo abrir el CV', getErrorMessage(e)))}
          />
        ) : null}
        {a.storeNote ? (
          <View style={styles.note}>
            <Text style={styles.noteLabel}>Mensaje de la tienda</Text>
            <Text style={styles.noteText}>{a.storeNote}</Text>
          </View>
        ) : null}
        {closed ? (
          <View style={styles.row}>
            <AlertTriangle size={14} color={colors.warning} />
            <Text style={[styles.meta, { color: colors.warning }]}>
              {expired ? 'Este empleo venció' : 'Este empleo ya no está disponible'}
            </Text>
          </View>
        ) : null}
        {canWithdraw(a.status) ? (
          <NeoButton title="Retirar" variant="ghost" onPress={() => withdraw(a)} />
        ) : null}
      </View>
    );
  };

  return (
    <FlatList
      style={styles.flex}
      data={items}
      keyExtractor={(a) => String(a.id)}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<EmptyState message="Todavía no te postulaste a ningún empleo" />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load('refresh')}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    />
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    list: { padding: 16, paddingBottom: 60, gap: 14, flexGrow: 1 },
    card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 8 },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    title: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
    chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    chipText: { fontSize: 12, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
    store: { fontSize: 14, fontWeight: '600', color: colors.text },
    meta: { fontSize: 13, color: colors.textSecondary },
    salary: { fontSize: 13, fontWeight: '700', color: colors.success },
    note: { backgroundColor: colors.background, borderRadius: 12, padding: 10, gap: 2 },
    noteLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    noteText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  });
