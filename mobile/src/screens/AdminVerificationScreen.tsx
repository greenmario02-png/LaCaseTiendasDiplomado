import React, { useMemo,  useCallback, useState  } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BadgeCheck, MapPin, X } from 'lucide-react-native';
import { api, getErrorMessage } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { LoadingState, EmptyState } from '../components/redesign/States';

export default function AdminVerificationScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/sellers/verification');
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

  const decideVerified = async (id: number, isVerified: boolean) => {
    try {
      await api.put(`/admin/users/${id}`, { isVerified });
      load();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    }
  };

  const decideLocation = async (id: number, locationVerified: boolean) => {
    try {
      await api.put(`/admin/users/${id}`, { locationVerified });
      load();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.storeName}>{item.storeName ?? `${item.firstName} ${item.lastName}`}</Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
        <View style={styles.chips}>
          {item.isVerified ? (
            <View style={[styles.chip, { backgroundColor: colors.success + '1A' }]}>
              <BadgeCheck size={12} color={colors.success} />
              <Text style={[styles.chipText, { color: colors.success }]}>Verificada</Text>
            </View>
          ) : (
            <View style={[styles.chip, { backgroundColor: colors.warning + '1A' }]}>
              <Text style={[styles.chipText, { color: colors.warning }]}>Sin verificar</Text>
            </View>
          )}
          {item.locationVerified ? (
            <View style={[styles.chip, { backgroundColor: colors.info + '1A' }]}>
              <MapPin size={12} color={colors.info} />
              <Text style={[styles.chipText, { color: colors.info }]}>Ubicación OK</Text>
            </View>
          ) : (
            <View style={[styles.chip, { backgroundColor: colors.error + '1A' }]}>
              <X size={12} color={colors.error} />
              <Text style={[styles.chipText, { color: colors.error }]}>Sin ubicación</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.meta}>
        {[item.locationCity, item.locationState].filter(Boolean).join(', ') || 'Sin ubicación declarada'}
        {item.nit ? ` · NIT: ${item.nit}` : ''}
      </Text>
      {item.verificationNote ? <Text style={styles.note}>📝 {item.verificationNote}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.miniBtn, { borderColor: colors.success }]} onPress={() => decideVerified(item.id, true)}>
          <Text style={[styles.miniBtnText, { color: colors.success }]}>Verificar tienda</Text>
        </TouchableOpacity>
        {!item.locationVerified && (
          <TouchableOpacity style={[styles.miniBtn, { borderColor: colors.info }]} onPress={() => decideLocation(item.id, true)}>
            <Text style={[styles.miniBtnText, { color: colors.info }]}>Aprobar ubicación</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Verificación de tiendas ({sellers.length})</Text>
      </View>
      {loading ? (
        <View style={styles.center}><LoadingState /></View>
      ) : sellers.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 60 }}><EmptyState message="No hay tiendas pendientes de verificación." /></View>
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
  center: { alignItems: 'center', marginTop: 30 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  storeName: { fontSize: 15, fontWeight: '700', color: colors.text },
  email: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  chips: { gap: 4, alignItems: 'flex-end' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 10, fontWeight: '700' },
  meta: { fontSize: 11, color: colors.textSecondary },
  note: { fontSize: 11, color: colors.warning, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  miniBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  miniBtnText: { fontSize: 11, fontWeight: '700' },
});
