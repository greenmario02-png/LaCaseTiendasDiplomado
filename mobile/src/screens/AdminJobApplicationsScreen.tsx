import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage, openApplicationCv } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { LoadingState, EmptyState, ErrorState } from '../components/redesign/States';
import { NeoInput } from '../components/redesign/NeoInput';
import { NeoButton } from '../components/redesign/NeoButton';

const LIMIT = 20;

export default function AdminJobApplicationsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const FILTERS: { key: string; label: string }[] = [
    { key: '', label: t('mobile.adminJobApplications.filterAll') },
    { key: 'RECEIVED', label: t('mobile.adminJobApplications.filterReceived') },
    { key: 'VIEWED', label: t('mobile.adminJobApplications.filterViewed') },
    { key: 'SHORTLISTED', label: t('mobile.adminJobApplications.filterShortlisted') },
    { key: 'REJECTED', label: t('mobile.adminJobApplications.filterRejected') },
    { key: 'HIRED', label: t('mobile.adminJobApplications.filterHired') },
    { key: 'WITHDRAWN', label: t('mobile.adminJobApplications.filterWithdrawn') },
  ];
  const STATUS_LABEL: Record<string, string> = Object.fromEntries(FILTERS.filter((f) => f.key).map((f) => [f.key, f.label]));
  const [status, setStatus] = useState('');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 400);
    return () => clearTimeout(t);
  }, [text]);

  const load = useCallback(async (pg: number, append: boolean) => {
    const id = ++reqId.current;
    try {
      const params: any = { page: pg, limit: LIMIT };
      if (status) params.status = status;
      if (q) params.q = q;
      const { data } = await api.get('/admin/job-applications', { params });
      if (id !== reqId.current) return;
      const d = data.data ?? {};
      setItems((prev) => (append ? [...prev, ...(d.items ?? [])] : d.items ?? []));
      setTotal(d.total ?? 0);
      setPage(pg);
      if (d.stats) setStats(d.stats);
      setError(null);
    } catch (e) {
      if (id === reqId.current) setError(getErrorMessage(e));
    } finally {
      if (id === reqId.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [status, q]);

  useEffect(() => {
    setLoading(true);
    setItems([]);
    load(1, false);
  }, [load]);

  const loadMore = () => {
    if (loading || loadingMore || refreshing || items.length >= total) return;
    setLoadingMore(true);
    load(page + 1, true);
  };

  const allCount = Object.values(stats).reduce((a, b) => a + (Number(b) || 0), 0);

  const renderItem = ({ item }: { item: any }) => {
    const a = item.applicant ?? {};
    const store = item.job?.store;
    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={[styles.name, styles.flex1]} numberOfLines={1}>{`${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || t('mobile.adminJobApplications.defaultCandidateName')}</Text>
          <View style={styles.pill}><Text style={styles.pillText}>{STATUS_LABEL[item.status] ?? item.status}</Text></View>
        </View>
        {a.email ? <Text style={styles.meta}>{a.email}</Text> : null}
        <Text style={styles.job} numberOfLines={2}>{item.job?.title}</Text>
        <Text style={styles.meta}>{store?.storeName || `${store?.firstName ?? ''} ${store?.lastName ?? ''}`.trim()}</Text>
        <Text style={styles.meta}>{new Date(item.createdAt).toLocaleDateString('es-BO')}</Text>
        {item.hasCv ? (
          <View style={styles.cv}>
            <NeoButton
              title={t('mobile.adminJobApplications.viewCvButton')}
              variant="ghost"
              onPress={() => openApplicationCv(item.id).catch((e) => Alert.alert(t('mobile.adminJobApplications.cvOpenErrorTitle'), getErrorMessage(e)))}
            />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.flex}>
      <View style={styles.search}>
        <NeoInput value={text} onChangeText={setText} placeholder={t('mobile.adminJobApplications.searchPlaceholder')} autoCapitalize="none" autoCorrect={false} />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {FILTERS.map((f) => {
            const active = status === f.key;
            const count = f.key ? stats[f.key] : allCount;
            return (
              <TouchableOpacity key={f.key || 'ALL'} style={[styles.chip, active && styles.chipActive]} onPress={() => setStatus(f.key)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}{count != null ? ` (${count})` : ''}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {loading ? (
        <LoadingState />
      ) : error && items.length === 0 ? (
        <ErrorState message={error} onRetry={() => { setLoading(true); load(1, false); }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1, false); }} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState message={t('mobile.adminJobApplications.emptyMessage')} />}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
            ) : items.length < total ? (
              <NeoButton title={t('mobile.adminJobApplications.loadMoreButton')} variant="ghost" onPress={loadMore} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    flex1: { flex: 1 },
    search: { paddingHorizontal: 12, paddingTop: 12 },
    tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
    chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    chipText: { fontSize: 12, color: colors.text },
    chipTextActive: { color: '#fff', fontWeight: '700' },
    card: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 3 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { fontSize: 16, fontWeight: '800', color: colors.text },
    pill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: colors.primary },
    pillText: { fontSize: 11, fontWeight: '700', color: colors.primary },
    job: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 4 },
    meta: { fontSize: 12, color: colors.textSecondary },
    cv: { marginTop: 8 },
  });
