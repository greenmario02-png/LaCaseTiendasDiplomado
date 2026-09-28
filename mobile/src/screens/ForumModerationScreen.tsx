import React, { useMemo,  useCallback, useState  } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { StatCard } from '../components/redesign/StatCard';
import { NeoInput } from '../components/redesign/NeoInput';
import { NeoButton } from '../components/redesign/NeoButton';

export default function ForumModerationScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const REASON_LABEL: Record<string, string> = {
    SPAM: t('mobile.forumModeration.reasons.spam'),
    CONTENIDO_INAPROPIADO: t('mobile.forumModeration.reasons.contenidoInapropiado'),
    DESINFORMACION: t('mobile.forumModeration.reasons.desinformacion'),
    CONTENIDO_FALSO: t('mobile.forumModeration.reasons.contenidoFalso'),
    CONTENIDO_IA: t('mobile.forumModeration.reasons.contenidoIA'),
    ESTAFA: t('mobile.forumModeration.reasons.estafa'),
    DATOS_PERSONALES: t('mobile.forumModeration.reasons.datosPersonales'),
    PUBLICIDAD_ENCUBIERTA: t('mobile.forumModeration.reasons.publicidadEncubierta'),
    ES_UN_BOT: t('mobile.forumModeration.reasons.esUnBot'),
    ACOSO: t('mobile.forumModeration.reasons.acoso'),
    OTRO: t('mobile.forumModeration.reasons.otro'),
  };

  const TARGET_LABEL: Record<string, string> = {
    POST: t('mobile.forumModeration.targets.post'),
    REPLY: t('mobile.forumModeration.targets.reply'),
    PROFILE: t('mobile.forumModeration.targets.profile'),
  };
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ data: rep }, { data: st }] = await Promise.all([
        api.get('/forum/reports', { params: { status: 'PENDING', limit: 100 } }),
        api.get('/forum/admin/stats').catch(() => ({ data: {} })),
      ]);
      setReports(rep.data ?? []);
      setStats(st.data ?? null);
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
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

  const act = async (action: 'resolve' | 'reject') => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.put(`/forum/reports/${selected.id}/${action}`, { resolution: resolution.trim() || undefined });
      setSelected(null);
      setResolution('');
      Alert.alert(
        action === 'resolve' ? t('mobile.forumModeration.reportApprovedTitle') : t('mobile.forumModeration.reportRejectedTitle'),
        t('mobile.forumModeration.contentUpdatedMessage'),
      );
      load();
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => { setSelected(item); setResolution(''); }}>
      <View style={styles.row}>
        <Text style={styles.target}>{TARGET_LABEL[item.targetType] ?? item.targetType} #{item.postId ?? item.replyId ?? item.profileId}</Text>
        <Text style={styles.reason}>{REASON_LABEL[item.reason] ?? item.reason}</Text>
      </View>
      <Text style={styles.meta}>
        {item.createdAt ? new Date(item.createdAt).toLocaleString('es-BO') : ''}
      </Text>
      {item.detail ? <Text style={styles.detail} numberOfLines={2}>“{item.detail}”</Text> : null}
      <Text style={styles.viewHint}>{t('mobile.forumModeration.tapToResolveHint')}</Text>
    </TouchableOpacity>
  );

  const st = stats ?? {};
  return (
    <View style={styles.flex}>
      {/* Stats compactas */}
      <View style={styles.statsRow}>
        <View style={{ flex: 1 }}>
          <StatCard title={t('mobile.forumModeration.statQuestions')} value={st.totalPosts ?? 0} icon="❓" />
        </View>
        <View style={{ flex: 1 }}>
          <StatCard title={t('mobile.forumModeration.statReplies')} value={st.totalReplies ?? 0} icon="💬" />
        </View>
        <View style={{ flex: 1 }}>
          <StatCard title={t('mobile.forumModeration.statUsers')} value={st.totalUsers ?? 0} icon="👥" />
        </View>
        <View style={{ flex: 1 }}>
          <StatCard title={t('mobile.forumModeration.statPending')} value={reports.length} icon="🚩" />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><LoadingState /></View>
      ) : reports.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 50 }}>
          <ShieldCheck size={40} color={colors.success} />
          <Text style={styles.empty}>{t('mobile.forumModeration.noPendingReportsMessage')}</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        />
      )}

      {/* Modal decisión */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {TARGET_LABEL[selected?.targetType] ?? selected?.targetType} #{selected?.postId ?? selected?.replyId ?? selected?.profileId}
            </Text>
            <Text style={styles.modalReason}>{REASON_LABEL[selected?.reason] ?? selected?.reason}</Text>
            {selected?.detail ? <Text style={styles.modalDetail}>{selected.detail}</Text> : null}
            <NeoInput
              style={styles.input}
              value={resolution}
              onChangeText={setResolution}
              placeholder={t('mobile.forumModeration.resolutionNotePlaceholder')}
              multiline
            />
            <View style={{ marginTop: 4 }}>
              <NeoButton title={busy ? t('mobile.common.processing') : t('mobile.forumModeration.approveButton')} onPress={() => act('resolve')} disabled={busy} />
            </View>
            <View style={{ marginTop: 6 }}>
              <NeoButton title={busy ? t('mobile.common.processing') : t('mobile.forumModeration.rejectButton')} variant="secondary" onPress={() => act('reject')} disabled={busy} />
            </View>
            <NeoButton title={t('mobile.common.cancel')} variant="ghost" onPress={() => setSelected(null)} disabled={busy} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', marginTop: 30 },
  statsRow: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 4 },
  card: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  target: { fontSize: 14, fontWeight: '700', color: colors.text },
  reason: { fontSize: 11, fontWeight: '700', color: colors.warning, backgroundColor: colors.warning + '1A', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  meta: { fontSize: 11, color: colors.textSecondary },
  detail: { fontSize: 12, color: colors.text, fontStyle: 'italic' },
  viewHint: { fontSize: 10, color: colors.primary, marginTop: 4 },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 12, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  modalReason: { fontSize: 13, fontWeight: '700', color: colors.warning },
  modalDetail: { fontSize: 12, color: colors.textSecondary },
  input: { minHeight: 48 },
});
