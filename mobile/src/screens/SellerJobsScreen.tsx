import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, RefreshControl, Linking } from 'react-native';
import { Phone, MessageCircle, Mail, FileText, Users, X } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage, openApplicationCv } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { LoadingState, EmptyState, ErrorState } from '../components/redesign/States';
import { NeoInput } from '../components/redesign/NeoInput';
import { NeoButton } from '../components/redesign/NeoButton';

const JOB_STATUS_KEY: Record<string, string> = {
  PENDING: 'mobile.sellerJobs.statusPendingApproval',
  APPROVED: 'mobile.sellerJobs.statusPublished',
  REJECTED: 'mobile.common.rejected',
  CLOSED: 'mobile.common.closed',
};
const PERIODS: { key: string; labelKey: string }[] = [
  { key: 'DAILY', labelKey: 'periodDaily' },
  { key: 'WEEKLY', labelKey: 'periodWeekly' },
  { key: 'MONTHLY', labelKey: 'periodMonthly' },
];
const PERIOD_KEY: Record<string, string> = { DAILY: 'periodDaily', WEEKLY: 'periodWeekly', MONTHLY: 'periodMonthly' };

const emptyForm = {
  categoryId: '',
  title: '',
  description: '',
  requirements: '',
  city: '',
  locationState: '',
  payPeriod: 'MONTHLY',
  salaryMin: '',
  salaryMax: '',
  vacancies: '1',
  schedule: '',
  contactPhone: '',
};

function fmt(v: any) {
  return Number(v).toLocaleString('es-BO', { maximumFractionDigits: 0 });
}
function periodLabel(period: string, t: any) {
  const key = PERIOD_KEY[period];
  return key ? t(`mobile.sellerJobs.${key}`) : '';
}
function salaryText(j: any, t: any) {
  const p = periodLabel(j.payPeriod, t);
  const hasMin = j.salaryMin != null && j.salaryMin !== '';
  const hasMax = j.salaryMax != null && j.salaryMax !== '';
  if (!hasMin && !hasMax) return t('mobile.sellerJobs.salaryNegotiated', { period: p });
  if (hasMin && hasMax) return t('mobile.sellerJobs.salaryRange', { min: fmt(j.salaryMin), max: fmt(j.salaryMax), period: p });
  return hasMin
    ? t('mobile.sellerJobs.salaryFrom', { amount: fmt(j.salaryMin), period: p })
    : t('mobile.sellerJobs.salaryTo', { amount: fmt(j.salaryMax), period: p });
}
function dateText(d: string) {
  return new Date(d).toLocaleDateString('es-BO');
}

export default function SellerJobsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [appsJob, setAppsJob] = useState<any | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/seller/jobs');
      const d = data.data ?? {};
      setJobs(d.jobs ?? []);
      setCanPost(!!d.canPost);
      setIsVerified(!!d.isVerified);
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    try {
      const { data } = await api.get('/jobs/categories');
      setCategories(data.data ?? []);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const canPublish = canPost && isVerified;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (j: any) => {
    Alert.alert(t('mobile.sellerJobs.editJobTitle'), t('mobile.sellerJobs.editJobMessage'), [
      { text: t('mobile.common.cancel'), style: 'cancel' },
      {
        text: t('mobile.sellerJobs.continueButton'),
        onPress: () => {
          setEditingId(j.id);
          setForm({
            categoryId: j.category?.id ?? '',
            title: j.title ?? '',
            description: j.description ?? '',
            requirements: j.requirements ?? '',
            city: j.city ?? '',
            locationState: j.locationState ?? '',
            payPeriod: j.payPeriod ?? 'MONTHLY',
            salaryMin: j.salaryMin != null ? String(Number(j.salaryMin)) : '',
            salaryMax: j.salaryMax != null ? String(Number(j.salaryMax)) : '',
            vacancies: String(j.vacancies ?? 1),
            schedule: j.schedule ?? '',
            contactPhone: j.contactPhone ?? '',
          });
          setModalOpen(true);
        },
      },
    ]);
  };

  const save = async () => {
    const title = form.title.trim();
    const description = form.description.trim();
    if (!form.categoryId) return Alert.alert(t('mobile.sellerJobs.missingInfoTitle'), t('mobile.sellerJobs.missingCategoryMessage'));
    if (title.length < 5) return Alert.alert(t('mobile.sellerJobs.missingInfoTitle'), t('mobile.sellerJobs.titleTooShortMessage'));
    if (description.length < 20) return Alert.alert(t('mobile.sellerJobs.missingInfoTitle'), t('mobile.sellerJobs.descriptionTooShortMessage'));
    if (!form.city.trim()) return Alert.alert(t('mobile.sellerJobs.missingInfoTitle'), t('mobile.sellerJobs.cityRequiredMessage'));
    const min = form.salaryMin.trim() ? Number(form.salaryMin) : undefined;
    const max = form.salaryMax.trim() ? Number(form.salaryMax) : undefined;
    if ((min !== undefined && (isNaN(min) || min < 0)) || (max !== undefined && (isNaN(max) || max < 0))) {
      return Alert.alert(t('mobile.sellerJobs.invalidSalaryTitle'), t('mobile.sellerJobs.invalidSalaryAmountsMessage'));
    }
    if (min !== undefined && max !== undefined && min > max) {
      return Alert.alert(t('mobile.sellerJobs.invalidSalaryTitle'), t('mobile.sellerJobs.invalidSalaryRangeMessage'));
    }
    const vacancies = Number(form.vacancies);
    if (!Number.isInteger(vacancies) || vacancies < 1) return Alert.alert(t('mobile.sellerJobs.missingInfoTitle'), t('mobile.sellerJobs.vacanciesMinMessage'));

    const body = {
      categoryId: form.categoryId,
      title,
      description,
      requirements: form.requirements.trim() || undefined,
      city: form.city.trim(),
      locationState: form.locationState.trim() || undefined,
      payPeriod: form.payPeriod,
      salaryMin: min,
      salaryMax: max,
      vacancies,
      schedule: form.schedule.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
    };
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/seller/jobs/${editingId}`, body);
        Alert.alert(t('mobile.common.done'), t('mobile.sellerJobs.jobUpdatedMessage'));
      } else {
        await api.post('/seller/jobs', body);
        Alert.alert(t('mobile.common.done'), t('mobile.sellerJobs.jobSubmittedMessage'));
      }
      setModalOpen(false);
      load();
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const close = (j: any) => {
    Alert.alert(t('mobile.sellerJobs.closeJobTitle'), t('mobile.sellerJobs.closeJobMessage', { title: j.title }), [
      { text: t('mobile.common.cancel'), style: 'cancel' },
      {
        text: t('mobile.sellerJobs.closeJobTitle'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/seller/jobs/${j.id}/close`);
            load();
          } catch (e) {
            Alert.alert(t('mobile.common.error'), getErrorMessage(e));
          }
        },
      },
    ]);
  };

  const statusColor = (s: string) =>
    s === 'APPROVED' ? colors.success : s === 'PENDING' ? colors.warning : s === 'REJECTED' ? colors.error : colors.textSecondary;

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.jobTitle} numberOfLines={2}>{item.title}</Text>
        <View style={[styles.statusChip, { borderColor: statusColor(item.status) }]}>
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
            {JOB_STATUS_KEY[item.status] ? t(JOB_STATUS_KEY[item.status]) : item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.meta}>{item.category?.name} · {item.city}</Text>
      <Text style={styles.salary}>{salaryText(item, t)}</Text>
      {item.status === 'APPROVED' && item.expiresAt ? <Text style={styles.meta}>{t('mobile.sellerJobs.expiresLabel', { date: dateText(item.expiresAt) })}</Text> : null}
      {item.status === 'REJECTED' && item.rejectionReason ? (
        <Text style={[styles.meta, { color: colors.error }]}>{t('mobile.sellerJobs.rejectionReasonLabel', { reason: item.rejectionReason })}</Text>
      ) : null}
      {(item.status === 'APPROVED' || item.status === 'CLOSED') && (
        <TouchableOpacity
          style={[styles.miniBtn, styles.appsBtn, (item._count?.applications ?? 0) > 0 && { backgroundColor: colors.primary }]}
          onPress={() => setAppsJob(item)}
        >
          <Users size={14} color={(item._count?.applications ?? 0) > 0 ? '#fff' : colors.primary} />
          <Text style={[styles.miniBtnText, (item._count?.applications ?? 0) > 0 && { color: '#fff' }]}>
            {t('mobile.sellerJobs.applicantsButton', { count: item._count?.applications ?? 0 })}
          </Text>
        </TouchableOpacity>
      )}
      {item.status !== 'CLOSED' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.miniBtn} onPress={() => openEdit(item)}>
            <Text style={styles.miniBtnText}>{t('mobile.common.edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.miniBtn, { borderColor: colors.error }]} onPress={() => close(item)}>
            <Text style={[styles.miniBtnText, { color: colors.error }]}>{t('mobile.common.close')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('mobile.sellerJobs.title')}</Text>
        <View style={styles.addWrap}>
          <NeoButton title={t('mobile.sellerJobs.publishButton')} onPress={openCreate} disabled={!canPublish} />
        </View>
      </View>
      {!loading && !canPublish && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            {t('mobile.sellerJobs.verificationNotice')}
          </Text>
        </View>
      )}
      {loading ? (
        <LoadingState />
      ) : error && jobs.length === 0 ? (
        <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState message={t('mobile.sellerJobs.emptyJobs')} />}
        />
      )}

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{editingId ? t('mobile.sellerJobs.editJobTitle') : t('mobile.sellerJobs.publishButton')}</Text>
              {editingId ? <Text style={styles.hint}>{t('mobile.sellerJobs.editHint')}</Text> : null}
              <Text style={styles.label}>{t('mobile.sellerJobs.categoryLabel')}</Text>
              <View style={styles.chips}>
                {categories.map((c) => {
                  const active = form.categoryId === c.id;
                  return (
                    <TouchableOpacity key={c.id} style={[styles.chip, active && styles.chipActive]} onPress={() => set('categoryId', c.id)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.label}>{t('mobile.sellerJobs.titleLabel')}</Text>
              <NeoInput value={form.title} onChangeText={(v) => set('title', v)} placeholder={t('mobile.sellerJobs.titlePlaceholder')} />
              <Text style={styles.label}>{t('mobile.sellerJobs.descriptionLabel')}</Text>
              <NeoInput value={form.description} onChangeText={(v) => set('description', v)} multiline placeholder={t('mobile.sellerJobs.descriptionPlaceholder')} />
              <Text style={styles.label}>{t('mobile.sellerJobs.requirementsLabel')}</Text>
              <NeoInput value={form.requirements} onChangeText={(v) => set('requirements', v)} multiline placeholder={t('mobile.sellerJobs.requirementsPlaceholder')} />
              <View style={styles.row2}>
                <View style={styles.col}>
                  <Text style={styles.label}>{t('mobile.sellerJobs.cityLabel')}</Text>
                  <NeoInput value={form.city} onChangeText={(v) => set('city', v)} placeholder={t('mobile.sellerJobs.cityPlaceholder')} />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>{t('mobile.sellerJobs.stateLabel')}</Text>
                  <NeoInput value={form.locationState} onChangeText={(v) => set('locationState', v)} placeholder={t('mobile.sellerJobs.statePlaceholder')} />
                </View>
              </View>
              <Text style={styles.label}>{t('mobile.sellerJobs.payPeriodLabel')}</Text>
              <View style={styles.segment}>
                {PERIODS.map((p) => {
                  const active = form.payPeriod === p.key;
                  return (
                    <TouchableOpacity key={p.key} style={[styles.segBtn, active && styles.chipActive]} onPress={() => set('payPeriod', p.key)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(`mobile.sellerJobs.${p.labelKey}`)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.row2}>
                <View style={styles.col}>
                  <Text style={styles.label}>{t('mobile.sellerJobs.salaryMinLabel')}</Text>
                  <NeoInput value={form.salaryMin} onChangeText={(v) => set('salaryMin', v)} keyboardType="numeric" placeholder="0" />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>{t('mobile.sellerJobs.salaryMaxLabel')}</Text>
                  <NeoInput value={form.salaryMax} onChangeText={(v) => set('salaryMax', v)} keyboardType="numeric" placeholder="0" />
                </View>
              </View>
              <View style={styles.row2}>
                <View style={styles.col}>
                  <Text style={styles.label}>{t('mobile.sellerJobs.vacanciesLabel')}</Text>
                  <NeoInput value={form.vacancies} onChangeText={(v) => set('vacancies', v)} keyboardType="numeric" placeholder="1" />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>{t('mobile.sellerJobs.scheduleLabel')}</Text>
                  <NeoInput value={form.schedule} onChangeText={(v) => set('schedule', v)} placeholder={t('mobile.sellerJobs.schedulePlaceholder')} />
                </View>
              </View>
              <Text style={styles.label}>{t('mobile.sellerJobs.phoneLabel')}</Text>
              <NeoInput value={form.contactPhone} onChangeText={(v) => set('contactPhone', v)} keyboardType="numeric" placeholder={t('mobile.sellerJobs.phonePlaceholder')} />
              <NeoButton title={editingId ? t('mobile.sellerJobs.saveChangesButton') : t('mobile.sellerJobs.submitForReviewButton')} onPress={save} disabled={saving} style={styles.save} />
              <NeoButton title={t('mobile.common.cancel')} variant="ghost" onPress={() => setModalOpen(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ApplicantsModal job={appsJob} onClose={() => setAppsJob(null)} onChanged={load} />
    </View>
  );
}

const APP_STATUS_KEY: Record<string, string> = {
  RECEIVED: 'appStatusNew',
  VIEWED: 'appStatusViewed',
  SHORTLISTED: 'appStatusShortlisted',
  REJECTED: 'appStatusRejected',
  HIRED: 'appStatusHired',
};
const APP_FILTERS: { key: string; labelKey: string }[] = [
  { key: 'ALL', labelKey: 'filterAll' },
  { key: 'RECEIVED', labelKey: 'filterNew' },
  { key: 'SHORTLISTED', labelKey: 'filterShortlisted' },
  { key: 'HIRED', labelKey: 'filterHired' },
  { key: 'REJECTED', labelKey: 'filterRejected' },
];
const APP_ACTIONS: { status: string; labelKey: string; okKey: string }[] = [
  { status: 'VIEWED', labelKey: 'markViewedAction', okKey: 'markViewedOk' },
  { status: 'SHORTLISTED', labelKey: 'shortlistAction', okKey: 'shortlistOk' },
  { status: 'REJECTED', labelKey: 'rejectAction', okKey: 'rejectOk' },
  { status: 'HIRED', labelKey: 'hireAction', okKey: 'hireOk' },
];

function ApplicantsModal({ job, onClose, onChanged }: { job: any | null; onClose: () => void; onChanged: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [pending, setPending] = useState<{ app: any; action: (typeof APP_ACTIONS)[number] } | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const jobId = job?.id;

  const loadApps = useCallback(async () => {
    if (!jobId) return;
    try {
      const { data } = await api.get(`/seller/jobs/${jobId}/applications`);
      setApps(data.data ?? []);
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jobId]);

  React.useEffect(() => {
    if (jobId) {
      setApps([]);
      setFilter('ALL');
      setLoading(true);
      loadApps();
    }
  }, [jobId, loadApps]);

  const submit = async () => {
    if (!pending) return;
    setSending(true);
    try {
      const body: any = { status: pending.action.status };
      if (note.trim()) body.note = note.trim();
      await api.put(`/seller/jobs/applications/${pending.app.id}/status`, body);
      Alert.alert(t('mobile.common.done'), t(`mobile.sellerJobs.${pending.action.okKey}`));
      setPending(null);
      setNote('');
      loadApps();
      onChanged();
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const statusColor = (s: string) =>
    s === 'HIRED' ? colors.success : s === 'REJECTED' ? colors.error : s === 'SHORTLISTED' ? colors.primary : s === 'RECEIVED' ? colors.warning : colors.textSecondary;

  const visible = filter === 'ALL' ? apps : apps.filter((a) => a.status === filter);

  const renderApp = ({ item }: { item: any }) => {
    const a = item.applicant ?? {};
    const name = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || t('mobile.sellerJobs.applicantDefaultName');
    const initials = `${(a.firstName ?? '?')[0] ?? ''}${(a.lastName ?? '')[0] ?? ''}`.toUpperCase();
    const phone = item.contactPhone || a.phone;
    const digits = phone ? String(phone).replace(/\D/g, '') : '';
    const wa = digits.length === 8 ? `591${digits}` : digits;
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.jobTitle} numberOfLines={1}>{name}</Text>
            <Text style={styles.meta}>{dateText(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusChip, { borderColor: statusColor(item.status) }]}>
            <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
              {APP_STATUS_KEY[item.status] ? t(`mobile.sellerJobs.${APP_STATUS_KEY[item.status]}`) : item.status}
            </Text>
          </View>
        </View>
        {item.message ? <Text style={styles.message}>{item.message}</Text> : null}
        {item.expectedSalary != null && item.expectedSalary !== '' ? (
          <Text style={styles.salary}>{t('mobile.sellerJobs.expectedSalary', { amount: fmt(item.expectedSalary) })}</Text>
        ) : null}
        {phone ? <Text style={styles.meta}>{t('mobile.sellerJobs.phoneMetaLabel', { phone })}</Text> : null}
        {a.email ? <Text style={styles.meta}>{a.email}</Text> : null}
        {item.storeNote ? <Text style={styles.meta}>{t('mobile.sellerJobs.yourMessageLabel', { note: item.storeNote })}</Text> : null}
        <View style={styles.actions}>
          {digits ? (
            <>
              <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(`tel:${digits}`)}>
                <Phone size={14} color={colors.primary} /><Text style={styles.miniBtnText}>{t('mobile.sellerJobs.callAction')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(`https://wa.me/${wa}`)}>
                <MessageCircle size={14} color={colors.primary} /><Text style={styles.miniBtnText}>{t('mobile.sellerJobs.whatsappAction')}</Text>
              </TouchableOpacity>
            </>
          ) : null}
          {a.email ? (
            <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(`mailto:${a.email}`)}>
              <Mail size={14} color={colors.primary} /><Text style={styles.miniBtnText}>{t('mobile.sellerJobs.emailAction')}</Text>
            </TouchableOpacity>
          ) : null}
          {item.hasCv ? (
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => openApplicationCv(item.id).catch((e) => Alert.alert(t('mobile.sellerJobs.cvOpenErrorTitle'), getErrorMessage(e)))}
            >
              <FileText size={14} color={colors.primary} />
              <Text style={styles.miniBtnText}>
                {item.cvName ? t('mobile.sellerJobs.viewCvActionNamed', { name: item.cvName }) : t('mobile.sellerJobs.viewCvAction')}
              </Text>
            </TouchableOpacity>
          ) : null}
          {item.resumeUrl ? (
            <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(item.resumeUrl)}>
              <FileText size={14} color={colors.primary} /><Text style={styles.miniBtnText}>{t('mobile.sellerJobs.viewCvAction')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.actions}>
          {APP_ACTIONS.filter((x) => x.status !== item.status).map((x) => (
            <TouchableOpacity
              key={x.status}
              style={[styles.miniBtn, x.status === 'REJECTED' && { borderColor: colors.error }]}
              onPress={() => { setNote(''); setPending({ app: item, action: x }); }}
            >
              <Text style={[styles.miniBtnText, x.status === 'REJECTED' && { color: colors.error }]}>{t(`mobile.sellerJobs.${x.labelKey}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={!!job} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modal, { height: '94%' }]}>
          <View style={styles.row}>
            <Text style={[styles.modalTitle, { flex: 1 }]} numberOfLines={2}>{t('mobile.sellerJobs.applicantsOf', { title: job?.title })}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel={t('mobile.common.close')}><X size={22} color={colors.text} /></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginVertical: 8 }} contentContainerStyle={{ gap: 8 }}>
            {APP_FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <TouchableOpacity key={f.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilter(f.key)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(`mobile.sellerJobs.${f.labelKey}`)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {loading ? (
            <LoadingState />
          ) : error && apps.length === 0 ? (
            <ErrorState message={error} onRetry={() => { setLoading(true); loadApps(); }} />
          ) : (
            <FlatList
              data={visible}
              keyExtractor={(x) => String(x.id)}
              renderItem={renderApp}
              contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadApps(); }} tintColor={colors.primary} colors={[colors.primary]} />}
              ListEmptyComponent={<EmptyState message={apps.length === 0 ? t('mobile.sellerJobs.emptyApplicantsNone') : t('mobile.sellerJobs.emptyApplicantsFiltered')} />}
            />
          )}
        </View>
      </View>

      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => setPending(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{pending ? t(`mobile.sellerJobs.${pending.action.labelKey}`) : ''}</Text>
            <Text style={styles.label}>{t('mobile.sellerJobs.actionModalNoteLabel')}</Text>
            <NeoInput value={note} onChangeText={setNote} multiline placeholder={t('mobile.sellerJobs.actionModalNotePlaceholder')} />
            <NeoButton title={t('mobile.common.confirm')} onPress={submit} disabled={sending} style={styles.save} />
            <NeoButton title={t('mobile.common.cancel')} variant="ghost" onPress={() => setPending(null)} />
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    title: { fontSize: 18, fontWeight: '800', color: colors.text },
    addWrap: { minWidth: 150 },
    notice: { marginHorizontal: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.warning, backgroundColor: colors.surface },
    noticeText: { color: colors.text, fontSize: 13 },
    card: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
    row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    jobTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
    statusChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, maxWidth: '45%' },
    statusText: { fontSize: 11, fontWeight: '700' },
    meta: { fontSize: 12, color: colors.textSecondary },
    salary: { fontSize: 14, fontWeight: '700', color: colors.primary },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    miniBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
    miniBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
    modal: { backgroundColor: colors.surface, borderRadius: 14, padding: 20, maxHeight: '92%' },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
    hint: { fontSize: 12, color: colors.warning, marginBottom: 4 },
    label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 10, marginBottom: 6 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.background },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    chipText: { fontSize: 12, color: colors.text },
    chipTextActive: { color: '#fff', fontWeight: '700' },
    segment: { flexDirection: 'row', gap: 8 },
    segBtn: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, backgroundColor: colors.background },
    appsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 8 },
    linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    message: { fontSize: 13, color: colors.text, marginTop: 4 },
    row2: { flexDirection: 'row', gap: 10 },
    col: { flex: 1 },
    save: { marginTop: 18, marginBottom: 10 },
  });
