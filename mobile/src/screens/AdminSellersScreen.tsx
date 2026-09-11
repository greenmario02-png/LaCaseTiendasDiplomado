import React, { useMemo,  useCallback, useState  } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, getErrorMessage } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { colors as themeColors } from '../theme';
import { LoadingState, EmptyState } from '../components/redesign/States';

function estado(s: any): { label: string; color: string } {
  if (s.isActive === false) return { label: 'Suspendido', color: themeColors.error };
  if (!s.isApproved) return { label: 'Pendiente', color: themeColors.warning };
  return { label: 'Aprobado', color: themeColors.success };
}

export default function AdminSellersScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/users', { params: { role: 'SELLER', limit: 50 } });
      setSellers(data.data ?? []);
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

  const approve = async (s: any, isApproved: boolean) => {
    try {
      await api.put(`/admin/users/${s.id}`, { isApproved });
      load();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    }
  };

  const toggleActive = async (s: any) => {
    try {
      await api.put(`/admin/users/${s.id}`, { isActive: !s.isActive });
      load();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    }
  };

  const togglePause = async (s: any) => {
    try {
      await api.put(`/admin/sellers/${s.id}/pause`, { paused: !s.storePaused });
      load();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const st = estado(item);
    return (
      <View style={styles.card}>
        <View style={styles.body}>
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>{item.storeName ?? `${item.firstName} ${item.lastName}`}</Text>
            <Text style={[styles.status, { color: st.color }]}>{st.label}</Text>
          </View>
          <Text style={styles.email}>{item.email}</Text>
          {item.storePaused ? <Text style={styles.paused}>⏸ Tienda pausada (actividad sospechosa)</Text> : null}
        </View>
        <View style={styles.actions}>
          {!item.isApproved && (
            <TouchableOpacity style={[styles.miniBtn, { borderColor: colors.success }]} onPress={() => approve(item, true)}>
              <Text style={[styles.miniBtnText, { color: colors.success }]}>Aprobar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.miniBtn, { borderColor: colors.warning }]} onPress={() => togglePause(item)}>
            <Text style={[styles.miniBtnText, { color: colors.warning }]}>{item.storePaused ? 'Reanudar' : 'Pausar'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.miniBtn, { borderColor: item.isActive ? colors.error : colors.success }]}
            onPress={() => toggleActive(item)}
          >
            <Text style={[styles.miniBtnText, { color: item.isActive ? colors.error : colors.success }]}>
              {item.isActive ? 'Suspender' : 'Activar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Vendedores ({sellers.length})</Text>
      </View>
      {loading ? (
        <LoadingState />
      ) : sellers.length === 0 ? (
        <EmptyState message="No hay vendedores registrados." />
      ) : (
        <FlatList
          data={sellers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  body: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  status: { fontSize: 12, fontWeight: '700', marginLeft: 8 },
  email: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  paused: { fontSize: 11, color: colors.warning, marginTop: 4 },
  actions: { gap: 6 },
  miniBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  miniBtnText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
});
