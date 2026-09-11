import React, { useMemo,  useState  } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Package, Star, Trash2 } from 'lucide-react-native';
import { api, getErrorMessage } from '../services/api';
import { NeoInput } from '../components/redesign/NeoInput';
import { NeoButton } from '../components/redesign/NeoButton';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { useAppTheme } from '../theme/ThemeContext';

export default function AddressesScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    street: '',
    number: '',
    floor: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: true,
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/account/addresses');
      setAddresses(data.data ?? []);
    } catch {}
    setLoading(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  const save = async () => {
    if (!form.street || !form.city || !form.state) {
      Alert.alert('Faltan datos', 'Completá calle, ciudad y departamento');
      return;
    }
    setSaving(true);
    try {
      await api.post('/account/addresses', { ...form, number: form.number || '0' });
      setShowForm(false);
      setForm({ street: '', number: '', floor: '', city: '', state: '', postalCode: '', isDefault: true });
      load();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (id: number) => {
    try {
      await api.put(`/account/addresses/${id}`, { isDefault: true });
      load();
    } catch {}
  };

  const remove = async (id: number) => {
    Alert.alert('Eliminar', '¿Eliminar esta dirección?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await api.delete(`/account/addresses/${id}`).catch(() => {}); load(); } },
    ]);
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Package size={20} color={colors.primary} />
          <Text style={styles.title}>Mis direcciones</Text>
        </View>
      </View>

      {addresses.length === 0 && !showForm ? (
        <View style={styles.center}>
          <EmptyState message="No tenés direcciones guardadas" />
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 90 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>
                    {item.street} {item.number}
                  </Text>
                  {item.isDefault ? <Star size={13} color={colors.warning} fill={colors.warning} /> : null}
                </View>
                <Text style={styles.cardMeta}>
                  {item.city}, {item.state} · CP {item.postalCode}
                </Text>
                {item.floor ? <Text style={styles.cardMeta}>Piso: {item.floor}</Text> : null}
              </View>
              {!item.isDefault && (
                <TouchableOpacity onPress={() => setDefault(item.id)}>
                  <Text style={styles.defaultBtn}>Hacer principal</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => remove(item.id)}>
                <Trash2 size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {showForm && (
        <ScrollView style={styles.form}>
          <NeoInput style={styles.input} placeholder="Calle" value={form.street} onChangeText={(t) => setForm({ ...form, street: t })} />
          <NeoInput style={styles.input} placeholder="Número" value={form.number} onChangeText={(t) => setForm({ ...form, number: t })} keyboardType="numeric" />
          <NeoInput style={styles.input} placeholder="Piso/Depto (opcional)" value={form.floor} onChangeText={(t) => setForm({ ...form, floor: t })} />
          <NeoInput style={styles.input} placeholder="Ciudad" value={form.city} onChangeText={(t) => setForm({ ...form, city: t })} />
          <NeoInput style={styles.input} placeholder="Departamento/Provincia" value={form.state} onChangeText={(t) => setForm({ ...form, state: t })} />
          <NeoInput style={styles.input} placeholder="Código postal" value={form.postalCode} onChangeText={(t) => setForm({ ...form, postalCode: t })} />
          <View style={styles.saveWrap}>
            <NeoButton title={saving ? 'Guardando...' : 'Guardar dirección'} onPress={save} disabled={saving} />
          </View>
        </ScrollView>
      )}

      <View style={styles.addWrap}>
        <NeoButton title={showForm ? 'Cancelar' : '+ Agregar dirección'} variant={showForm ? 'ghost' : 'secondary'} onPress={() => setShowForm((v) => !v)} />
      </View>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { fontSize: 22, color: colors.primary, fontWeight: '800' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  defaultBtn: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  form: { padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  input: { marginBottom: 8 },
  saveWrap: { marginTop: 4 },
  addWrap: { position: 'absolute', bottom: 24, alignSelf: 'center', width: 220 },
});
