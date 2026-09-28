import React, { useMemo,  useState  } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Package, Star, Trash2 } from 'lucide-react-native';
import { api, getErrorMessage } from '../services/api';
import { NeoInput } from '../components/redesign/NeoInput';
import { NeoButton } from '../components/redesign/NeoButton';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { useAppTheme } from '../theme/ThemeContext';

export default function AddressesScreen({ navigation }: any) {
  const { t } = useTranslation();
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
      Alert.alert(t('mobile.addresses.missingFieldsTitle'), t('mobile.addresses.missingFieldsMessage'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/account/addresses', { ...form, number: form.number || '0' });
      setShowForm(false);
      setForm({ street: '', number: '', floor: '', city: '', state: '', postalCode: '', isDefault: true });
      load();
    } catch (err) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(err));
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
    Alert.alert(t('mobile.addresses.deleteTitle'), t('mobile.addresses.deleteConfirmMessage'), [
      { text: t('mobile.common.cancel'), style: 'cancel' },
      { text: t('mobile.addresses.deleteTitle'), style: 'destructive', onPress: async () => { await api.delete(`/account/addresses/${id}`).catch(() => {}); load(); } },
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
          <Text style={styles.title}>{t('mobile.addresses.title')}</Text>
        </View>
      </View>

      {addresses.length === 0 && !showForm ? (
        <View style={styles.center}>
          <EmptyState message={t('mobile.addresses.emptyMessage')} />
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
                  {t('mobile.addresses.cityStateZip', { city: item.city, state: item.state, postalCode: item.postalCode })}
                </Text>
                {item.floor ? <Text style={styles.cardMeta}>{t('mobile.addresses.floorLabel', { floor: item.floor })}</Text> : null}
              </View>
              {!item.isDefault && (
                <TouchableOpacity onPress={() => setDefault(item.id)}>
                  <Text style={styles.defaultBtn}>{t('mobile.addresses.makeDefault')}</Text>
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
          <NeoInput style={styles.input} placeholder={t('mobile.addresses.streetPlaceholder')} value={form.street} onChangeText={(v) => setForm({ ...form, street: v })} />
          <NeoInput style={styles.input} placeholder={t('mobile.addresses.numberPlaceholder')} value={form.number} onChangeText={(v) => setForm({ ...form, number: v })} keyboardType="numeric" />
          <NeoInput style={styles.input} placeholder={t('mobile.addresses.floorPlaceholder')} value={form.floor} onChangeText={(v) => setForm({ ...form, floor: v })} />
          <NeoInput style={styles.input} placeholder={t('mobile.addresses.cityPlaceholder')} value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} />
          <NeoInput style={styles.input} placeholder={t('mobile.addresses.statePlaceholder')} value={form.state} onChangeText={(v) => setForm({ ...form, state: v })} />
          <NeoInput style={styles.input} placeholder={t('mobile.addresses.postalCodePlaceholder')} value={form.postalCode} onChangeText={(v) => setForm({ ...form, postalCode: v })} />
          <View style={styles.saveWrap}>
            <NeoButton title={saving ? t('mobile.addresses.saving') : t('mobile.addresses.saveButton')} onPress={save} disabled={saving} />
          </View>
        </ScrollView>
      )}

      <View style={styles.addWrap}>
        <NeoButton title={showForm ? t('mobile.common.cancel') : t('mobile.addresses.addButton')} variant={showForm ? 'ghost' : 'secondary'} onPress={() => setShowForm((v) => !v)} />
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
