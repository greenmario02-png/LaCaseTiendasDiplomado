import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  Modal,
  Linking,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { BadgeCheck, MapPin, Users, Clock, X, Paperclip } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../stores/authStore';
import { applicationLabel, statusColor, canWithdraw, type ApplicationStatus } from './MyApplicationsScreen';
import { NeoButton } from '../components/redesign/NeoButton';
import { NeoInput } from '../components/redesign/NeoInput';
import { LoadingState, EmptyState, ErrorState } from '../components/redesign/States';
import { JobCard, formatSalary, timeAgo, type Job, type PayPeriod } from '../components/redesign/JobCard';

const LIMIT = 10;

export default function JobsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors, raised, pressed } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const PERIODS: { value: '' | PayPeriod; label: string }[] = [
    { value: '', label: t('mobile.jobs.periodAll') },
    { value: 'DAILY', label: t('mobile.jobs.periodDaily') },
    { value: 'WEEKLY', label: t('mobile.jobs.periodWeekly') },
    { value: 'MONTHLY', label: t('mobile.jobs.periodMonthly') },
  ];

  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [period, setPeriod] = useState<'' | PayPeriod>('');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Job | null>(null);
  const reqId = useRef(0);

  const user = useAuthStore((st: any) => st.user);
  const [myApp, setMyApp] = useState<{ id: number; status: ApplicationStatus; createdAt: string } | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState('');
  const [resume, setResume] = useState('');
  const [cvFile, setCvFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMyApp(null);
    if (!selected || !user) return;
    let alive = true;
    api
      .get(`/jobs/${selected.id}`)
      .then(({ data }) => alive && setMyApp(data.data?.myApplication ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [selected?.id, user?.id]);

  const startApply = () => {
    if (!user) {
      setSelected(null);
      navigation.navigate('Login');
      return;
    }
    setMessage('');
    setSalary('');
    setResume('');
    setCvFile(null);
    setPhone(user.phone ?? '');
    setFormError(null);
    setApplyOpen(true);
  };

  const pickCv = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });
      if (r.canceled || !r.assets?.[0]) return;
      const f = r.assets[0];
      if (!/\.(pdf|doc|docx)$/i.test(f.name)) return setFormError(t('mobile.jobs.cvTypeError'));
      if (f.size != null && f.size > 5 * 1024 * 1024) return setFormError(t('mobile.jobs.cvSizeError'));
      setFormError(null);
      setCvFile(f);
    } catch (e) {
      setFormError(getErrorMessage(e));
    }
  };

  const submitApply = async () => {
    if (!selected) return;
    const msg = message.trim();
    const ph = phone.trim();
    const res = resume.trim();
    if (msg.length < 10) return setFormError(t('mobile.jobs.messageTooShort'));
    if (ph.length < 6) return setFormError(t('mobile.jobs.phoneInvalid'));
    let expectedSalary: number | undefined;
    if (salary.trim()) {
      expectedSalary = Number(salary.replace(',', '.'));
      if (!isFinite(expectedSalary) || expectedSalary < 0) return setFormError(t('mobile.jobs.salaryInvalid'));
    }
    if (res && !/^https?:\/\/\S+\.\S+/i.test(res)) return setFormError(t('mobile.jobs.cvUrlInvalid'));
    const body: Record<string, any> = { message: msg, contactPhone: ph };
    if (expectedSalary !== undefined) body.expectedSalary = expectedSalary;
    if (res) body.resumeUrl = res;
    setSubmitting(true);
    setFormError(null);
    try {
      let payload: any = body;
      let config: any;
      if (cvFile) {
        const fd = new FormData();
        Object.entries(body).forEach(([k, v]) => fd.append(k, String(v)));
        const mime =
          cvFile.mimeType ||
          (/\.pdf$/i.test(cvFile.name)
            ? 'application/pdf'
            : /\.docx$/i.test(cvFile.name)
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/msword');
        if (Platform.OS === 'web' && cvFile.file) fd.append('cv', cvFile.file, cvFile.name);
        else fd.append('cv', { uri: cvFile.uri, name: cvFile.name, type: mime } as any);
        payload = fd;
        config = { headers: { 'Content-Type': 'multipart/form-data' } };
      }
      const { data } = await api.post(`/jobs/${selected.id}/apply`, payload, config);
      setMyApp(data.data ? { id: data.data.id, status: data.data.status ?? 'RECEIVED', createdAt: data.data.createdAt } : { id: 0, status: 'RECEIVED', createdAt: '' });
      setApplyOpen(false);
      Alert.alert(t('mobile.jobs.applicationSentTitle'), t('mobile.jobs.applicationSentMessage'));
    } catch (e: any) {
      const code = e?.response?.status;
      setFormError(
        code === 403
          ? t('mobile.jobs.forbiddenOwnJob')
          : code === 404
          ? t('mobile.jobs.jobUnavailable')
          : getErrorMessage(e)
      );
    } finally {
      setSubmitting(false);
    }
  };

  const withdrawApply = () => {
    if (!selected) return;
    Alert.alert(t('mobile.jobs.withdrawConfirmTitle'), t('mobile.jobs.withdrawConfirmMessage'), [
      { text: t('mobile.common.cancel'), style: 'cancel' },
      {
        text: t('mobile.common.withdraw'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/jobs/${selected.id}/apply`);
            setMyApp((m) => (m ? { ...m, status: 'WITHDRAWN' } : m));
          } catch (e) {
            Alert.alert(t('mobile.jobs.withdrawFailedTitle'), getErrorMessage(e));
          }
        },
      },
    ]);
  };

  useEffect(() => {
    api
      .get('/jobs/categories')
      .then(({ data }) => setCategories(data.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), 400);
    return () => clearTimeout(timer);
  }, [text]);

  const fetchPage = useCallback(
    async (p: number, mode: 'reset' | 'more' | 'refresh') => {
      const id = ++reqId.current;
      if (mode === 'reset') setLoading(true);
      if (mode === 'more') setLoadingMore(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const params: Record<string, any> = { page: p, limit: LIMIT };
        if (q) params.q = q;
        if (categoryId) params.categoryId = categoryId;
        if (period) params.payPeriod = period;
        const { data } = await api.get('/jobs', { params });
        if (id !== reqId.current) return;
        const list: Job[] = data.data ?? [];
        setJobs((prev) => (p === 1 ? list : [...prev, ...list]));
        setPage(p);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setError(null);
      } catch (e) {
        if (id !== reqId.current) return;
        if (mode !== 'more') setError(getErrorMessage(e));
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [q, categoryId, period]
  );

  useEffect(() => {
    fetchPage(1, 'reset');
  }, [fetchPage]);

  const onEndReached = () => {
    if (loading || loadingMore || refreshing || page >= totalPages) return;
    fetchPage(page + 1, 'more');
  };

  const openWhatsApp = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits) Linking.openURL(`https://wa.me/${digits}`).catch(() => {});
  };

  const chip = (active: boolean) => [
    styles.chip,
    { backgroundColor: colors.surface },
    active ? { ...pressed, borderWidth: 1, borderColor: colors.primary } : { ...raised },
  ];

  const header = (
    <View>
      <NeoInput
        value={text}
        onChangeText={setText}
        placeholder={t('mobile.jobs.searchPlaceholder')}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.search}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <Pressable style={chip(categoryId === null)} onPress={() => setCategoryId(null)}>
          <Text style={[styles.chipText, categoryId === null && styles.chipTextActive]}>{t('mobile.jobs.categoryAll')}</Text>
        </Pressable>
        {categories.map((cat) => (
          <Pressable key={cat.id} style={chip(categoryId === cat.id)} onPress={() => setCategoryId(cat.id)}>
            <Text style={[styles.chipText, categoryId === cat.id && styles.chipTextActive]}>
              {`${cat.icon ?? ''} ${cat.name}`.trim()}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {PERIODS.map((p) => (
          <Pressable key={p.value || 'all'} style={chip(period === p.value)} onPress={() => setPeriod(p.value)}>
            <Text style={[styles.chipText, period === p.value && styles.chipTextActive]}>{p.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  let body: React.ReactNode;
  if (loading && jobs.length === 0) body = <LoadingState />;
  else if (error && jobs.length === 0)
    body = <ErrorState message={error} onRetry={() => fetchPage(1, 'reset')} />;
  else
    body = (
      <FlatList
        data={jobs}
        keyExtractor={(j) => String(j.id)}
        renderItem={({ item }) => <JobCard job={item} onPress={() => setSelected(item)} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState message={t('mobile.jobs.emptyFiltered')} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchPage(1, 'refresh')}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ margin: 16 }} /> : null}
      />
    );

  return (
    <View style={styles.flex}>
      {header}
      <View style={styles.flex}>{body}</View>

      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom + 16 }]}>
            {selected ? (
              <>
                <View style={styles.sheetHead}>
                  <View style={{ flex: 1 }}>
                    {selected.category ? (
                      <Text style={styles.category}>
                        {`${selected.category.icon ?? ''} ${selected.category.name}`.trim()}
                      </Text>
                    ) : null}
                    <Text style={styles.sheetTitle}>{selected.title}</Text>
                  </View>
                  <Pressable onPress={() => setSelected(null)} hitSlop={10}>
                    <X size={22} color={colors.text} />
                  </Pressable>
                </View>
                <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
                  {selected.store ? (
                    <View style={styles.row}>
                      <Text style={styles.store}>{selected.store.storeName}</Text>
                      {selected.store.isVerified ? <BadgeCheck size={16} color={colors.success} /> : null}
                    </View>
                  ) : null}
                  <Text style={styles.salary}>{formatSalary(selected)}</Text>
                  <View style={styles.metaRow}>
                    {selected.city || selected.store?.locationCity ? (
                      <View style={styles.row}>
                        <MapPin size={14} color={colors.textSecondary} />
                        <Text style={styles.meta}>{selected.city || selected.store?.locationCity}</Text>
                      </View>
                    ) : null}
                    {selected.vacancies ? (
                      <View style={styles.row}>
                        <Users size={14} color={colors.textSecondary} />
                        <Text style={styles.meta}>
                          {t('mobile.jobs.vacancies', { count: selected.vacancies })}
                        </Text>
                      </View>
                    ) : null}
                    {selected.schedule ? (
                      <View style={styles.row}>
                        <Clock size={14} color={colors.textSecondary} />
                        <Text style={styles.meta}>{selected.schedule}</Text>
                      </View>
                    ) : null}
                  </View>
                  {selected.publishedAt ? <Text style={styles.meta}>{timeAgo(selected.publishedAt)}</Text> : null}
                  {selected.description ? (
                    <>
                      <Text style={styles.label}>{t('mobile.jobs.descriptionLabel')}</Text>
                      <Text style={styles.body}>{selected.description}</Text>
                    </>
                  ) : null}
                  {selected.requirements ? (
                    <>
                      <Text style={styles.label}>{t('mobile.jobs.requirementsLabel')}</Text>
                      <Text style={styles.body}>{selected.requirements}</Text>
                    </>
                  ) : null}
                </ScrollView>
                <View style={styles.actions}>
                  {myApp && myApp.status !== 'WITHDRAWN' ? (
                    <View style={styles.row}>
                      <Text style={styles.meta}>{t('mobile.jobs.yourApplicationLabel')}</Text>
                      <View style={[styles.statusChip, { borderColor: statusColor(myApp.status, colors) }]}>
                        <Text style={[styles.statusText, { color: statusColor(myApp.status, colors) }]}>
                          {applicationLabel(myApp.status, t)}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <NeoButton title={t('mobile.jobs.applyButton')} onPress={startApply} />
                  )}
                  {myApp && canWithdraw(myApp.status) ? (
                    <NeoButton title={t('mobile.jobs.withdrawButton')} variant="ghost" onPress={withdrawApply} />
                  ) : null}
                  {selected.contactPhone ? (
                    <NeoButton title={t('mobile.jobs.contactWhatsApp')} onPress={() => openWhatsApp(selected.contactPhone!)} />
                  ) : null}
                  {selected.store ? (
                    <NeoButton
                      title={t('mobile.jobs.viewStore')}
                      variant="ghost"
                      onPress={() => {
                        const id = selected.store!.id;
                        setSelected(null);
                        navigation.navigate('Seller', { id });
                      }}
                    />
                  ) : null}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={applyOpen} animationType="slide" transparent onRequestClose={() => setApplyOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom + 16 }]}>
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { flex: 1 }]}>{t('mobile.jobs.applyButton')}</Text>
              <Pressable onPress={() => setApplyOpen(false)} hitSlop={10}>
                <X size={22} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>
              <Text style={styles.meta}>{selected?.title}</Text>
              <NeoInput
                value={message}
                onChangeText={setMessage}
                placeholder={t('mobile.jobs.messagePlaceholder')}
                multiline
                style={{ minHeight: 100 }}
              />
              <NeoInput value={phone} onChangeText={setPhone} placeholder={t('mobile.jobs.phonePlaceholder')} keyboardType="phone-pad" />
              <NeoInput
                value={salary}
                onChangeText={setSalary}
                placeholder={t('mobile.jobs.salaryPlaceholder')}
                keyboardType="numeric"
              />
              <NeoInput
                value={resume}
                onChangeText={setResume}
                placeholder={t('mobile.jobs.resumePlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              {cvFile ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Paperclip size={16} color={colors.primary} />
                  <Text style={{ flex: 1, color: colors.text, fontSize: 13 }} numberOfLines={1}>{cvFile.name}</Text>
                  <Pressable onPress={() => setCvFile(null)} hitSlop={10}>
                    <X size={18} color={colors.error} />
                  </Pressable>
                </View>
              ) : (
                <NeoButton title={t('mobile.jobs.attachCv')} variant="ghost" onPress={pickCv} />
              )}
              {formError ? <Text style={{ color: colors.error, fontSize: 13 }}>{formError}</Text> : null}
            </ScrollView>
            <NeoButton title={submitting ? t('mobile.common.sending') : t('mobile.jobs.submitApplication')} onPress={submitApply} disabled={submitting} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    search: { marginHorizontal: 16, marginTop: 12, marginBottom: 4 },
    chipRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    chipTextActive: { color: colors.primary },
    list: { padding: 16, paddingBottom: 90, flexGrow: 1 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '85%',
      gap: 12,
    },
    sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    category: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    store: { fontSize: 15, fontWeight: '600', color: colors.text },
    salary: { fontSize: 18, fontWeight: '800', color: colors.success, marginTop: 6 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginVertical: 8 },
    meta: { fontSize: 13, color: colors.textSecondary },
    label: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: 14, marginBottom: 4 },
    body: { fontSize: 14, lineHeight: 20, color: colors.text },
    actions: { gap: 10 },
    statusChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    statusText: { fontSize: 13, fontWeight: '700' },
  });
