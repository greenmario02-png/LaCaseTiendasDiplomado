import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, RefreshControl, Alert, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BadgeCheck, MapPin, AlertTriangle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage, openApplicationCv } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { NeoButton } from '../components/redesign/NeoButton';
import { LoadingState, EmptyState, ErrorState } from '../components/redesign/States';
import { formatSalary } from '../components/redesign/JobCard';

export type ApplicationStatus = 'RECEIVED' | 'VIEWED' | 'SHORTLISTED' | 'REJECTED' | 'HIRED' | 'WITHDRAWN';

const APPLICATION_LABEL_KEYS: Record<ApplicationStatus, string> = {
  RECEIVED: 'mobile.myApplications.status.received',
  VIEWED: 'mobile.myApplications.status.viewed',
  SHORTLISTED: 'mobile.myApplications.status.shortlisted',
  REJECTED: 'mobile.myApplications.status.rejected',
  HIRED: 'mobile.myApplications.status.hired',
  WITHDRAWN: 'mobile.myApplications.status.withdrawn',
};

/** Traduce el estado de una postulación; requiere el `t` de useTranslation del componente que llama. */
export const applicationLabel = (s: ApplicationStatus, t: (key: string) => string): string =>
  t(APPLICATION_LABEL_KEYS[s] ?? s);

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
  const { t } = useTranslation();
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
    Alert.alert(t('mobile.myApplications.withdrawConfirmTitle'), t('mobile.myApplications.withdrawConfirmMessage', { title: a.job.title }), [
      { text: t('mobile.common.cancel'), style: 'cancel' },
      {
        text: t('mobile.common.withdraw'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/jobs/${a.jobId}/apply`);
            load('initial');
          } catch (e) {
            Alert.alert(t('mobile.myApplications.withdrawFailedTitle'), getErrorMessage(e));
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
            <Text style={[styles.chipText, { color }]}>{applicationLabel(a.status, t)}</Text>
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
        <Text style={styles.meta}>{t('mobile.myApplications.appliedOn', { date: new Date(a.createdAt).toLocaleDateString('es-BO') })}</Text>
        {a.hasCv ? (
          <NeoButton
            title={a.cvName ? t('mobile.myApplications.viewCvNamed', { name: a.cvName }) : t('mobile.myApplications.viewCv')}
            variant="ghost"
            onPress={() => openApplicationCv(a.id).catch((e) => Alert.alert(t('mobile.myApplications.cvOpenFailedTitle'), getErrorMessage(e)))}
          />
        ) : null}
        {a.storeNote ? (
          <View style={styles.note}>
            <Text style={styles.noteLabel}>{t('mobile.myApplications.storeNoteLabel')}</Text>
            <Text style={styles.noteText}>{a.storeNote}</Text>
          </View>
        ) : null}
        {closed ? (
          <View style={styles.row}>
            <AlertTriangle size={14} color={colors.warning} />
            <Text style={[styles.meta, { color: colors.warning }]}>
              {expired ? t('mobile.myApplications.jobExpired') : t('mobile.myApplications.jobUnavailable')}
            </Text>
          </View>
        ) : null}
        {canWithdraw(a.status) ? (
          <NeoButton title={t('mobile.common.withdraw')} variant="ghost" onPress={() => withdraw(a)} />
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
      ListEmptyComponent={<EmptyState message={t('mobile.myApplications.empty')} />}
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
