import React, { useMemo,  useCallback, useState  } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ShieldCheck } from 'lucide-react-native';
import { api, getErrorMessage } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { StatCard } from '../components/redesign/StatCard';
import { NeoInput } from '../components/redesign/NeoInput';
import { NeoButton } from '../components/redesign/NeoButton';

const REASON_LABEL: Record<string, string> = {
  SPAM: 'Spam',
  CONTENIDO_INAPROPIADO: 'Contenido inapropiado',
  DESINFORMACION: 'Desinformación',
  CONTENIDO_FALSO: 'Contenido falso / engañoso',
  CONTENIDO_IA: 'Contenido generado por IA',
  ESTAFA: 'Posible estafa',
  DATOS_PERSONALES: 'Expone datos personales',
  PUBLICIDAD_ENCUBIERTA: 'Publicidad encubierta',
  ES_UN_BOT: 'Es un bot',
  ACOSO: 'Acoso',
  OTRO: 'Otro',
};

const TARGET_LABEL: Record<string, string> = {
  POST: 'Post',
  REPLY: 'Respuesta',
  PROFILE: 'Perfil',
};

export default function ForumModerationScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
      Alert.alert('Error', getErrorMessage(e));
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
      Alert.alert(action === 'resolve' ? 'Reporte aprobado' : 'Reporte rechazado', 'Contenido actualizado.');
      load();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
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
      <Text style={styles.viewHint}>Tocá para resolver o rechazar</Text>
    </TouchableOpacity>
  );

  const st = stats ?? {};
  return (
    <View style={styles.flex}>
      {/* Stats compactas */}
      <View style={styles.statsRow}>
        <View style={{ flex: 1 }}>
          <StatCard title="Preguntas" value={st.totalPosts ?? 0} icon="❓" />
        </View>
        <View style={{ flex: 1 }}>
          <StatCard title="Respuestas" value={st.totalReplies ?? 0} icon="💬" />
        </View>
        <View style={{ flex: 1 }}>
          <StatCard title="Usuarios" value={st.totalUsers ?? 0} icon="👥" />
        </View>
        <View style={{ flex: 1 }}>
          <StatCard title="Pendientes" value={reports.length} icon="🚩" />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><LoadingState /></View>
      ) : reports.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 50 }}>
          <ShieldCheck size={40} color={colors.success} />
          <Text style={styles.empty}>No hay reportes pendientes 🎉</Text>
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
              placeholder="Nota de resolución (opcional)"
              multiline
            />
            <View style={{ marginTop: 4 }}>
              <NeoButton title={busy ? 'Procesando...' : 'Aprobar (eliminar contenido + penalizar)'} onPress={() => act('resolve')} disabled={busy} />
            </View>
            <View style={{ marginTop: 6 }}>
              <NeoButton title={busy ? 'Procesando...' : 'Rechazar (restaurar contenido)'} variant="secondary" onPress={() => act('reject')} disabled={busy} />
            </View>
            <NeoButton title="Cancelar" variant="ghost" onPress={() => setSelected(null)} disabled={busy} />
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
