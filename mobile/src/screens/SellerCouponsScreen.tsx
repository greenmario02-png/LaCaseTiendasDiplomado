import React, { useMemo,  useCallback, useState  } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { NeoInput } from '../components/redesign/NeoInput';
import { NeoButton } from '../components/redesign/NeoButton';

export default function SellerCouponsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const TYPE_LABEL: Record<string, string> = { PERCENTAGE: '%', FIXED: 'Bs', GIFT: t('mobile.sellerCoupons.typeGift') };
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', type: 'PERCENTAGE', value: '', minSpend: '', maxUses: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/seller/coupons');
      setCoupons(data.data ?? []);
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const create = async () => {
    if (!form.code.trim()) return Alert.alert(t('mobile.common.missingInfo'), t('mobile.sellerCoupons.codeRequired'));
    if (!form.value.trim() || Number(form.value) <= 0) return Alert.alert(t('mobile.common.missingInfo'), t('mobile.sellerCoupons.valueRequired'));
    setSaving(true);
    try {
      await api.post('/seller/coupons', {
        code: form.code.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        value: Number(form.value),
        minSpend: form.minSpend.trim() ? Number(form.minSpend) : undefined,
        maxUses: form.maxUses.trim() ? Number(form.maxUses) : undefined,
      });
      Alert.alert(t('mobile.common.success'), t('mobile.sellerCoupons.createSuccessMessage'));
      setModalOpen(false);
      setForm({ code: '', description: '', type: 'PERCENTAGE', value: '', minSpend: '', maxUses: '' });
      load();
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: any) => {
    try {
      await api.put(`/seller/coupons/${c.id}`, { isActive: !c.isActive });
      load();
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    }
  };

  const remove = (c: any) => {
    Alert.alert(t('mobile.sellerCoupons.deleteTitle'), t('mobile.sellerCoupons.deleteConfirm', { code: c.code }), [
      { text: t('mobile.common.cancel'), style: 'cancel' },
      {
        text: t('mobile.common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/seller/coupons/${c.id}`);
            load();
          } catch (e) {
            Alert.alert(t('mobile.common.error'), getErrorMessage(e));
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.code}>{item.code}</Text>
          <Text style={[styles.status, { color: item.isActive ? colors.success : colors.textSecondary }]}>
            {item.isActive ? t('mobile.common.active') : t('mobile.common.inactive')}
          </Text>
        </View>
        {item.description ? <Text style={styles.desc} numberOfLines={1}>{item.description}</Text> : null}
        <Text style={styles.meta}>
          {t('mobile.sellerCoupons.metaLine', {
            typeLabel: TYPE_LABEL[item.type] ?? '',
            value: item.value,
            minSpend: item.minSpend ? `${item.minSpend} Bs` : '—',
            used: item.usesCount,
            max: item.maxUses ?? '∞',
          })}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.miniBtn} onPress={() => toggle(item)}>
          <Text style={styles.miniBtnText}>{item.isActive ? t('mobile.common.deactivate') : t('mobile.common.activate')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.miniBtn, { borderColor: colors.error }]} onPress={() => remove(item)}>
          <Text style={[styles.miniBtnText, { color: colors.error }]}>{t('mobile.common.delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('mobile.sellerCoupons.title')}</Text>
        <View style={styles.addWrap}>
          <NeoButton title={t('mobile.sellerCoupons.newCouponButton')} onPress={() => setModalOpen(true)} />
        </View>
      </View>
      {loading ? (
        <LoadingState />
      ) : coupons.length === 0 ? (
        <EmptyState message={t('mobile.sellerCoupons.emptyMessage')} />
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          renderItem={renderItem}
        />
      )}

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('mobile.sellerCoupons.modalTitle')}</Text>
            <Text style={styles.label}>{t('mobile.sellerCoupons.codeLabel')}</Text>
            <NeoInput style={styles.input} value={form.code} onChangeText={(v) => set('code', v)} placeholder={t('mobile.sellerCoupons.codePlaceholder')} />
            <Text style={styles.label}>{t('mobile.common.description')}</Text>
            <NeoInput style={styles.input} value={form.description} onChangeText={(v) => set('description', v)} placeholder={t('mobile.sellerCoupons.descriptionPlaceholder')} />
            <Text style={styles.label}>{t('mobile.sellerCoupons.typeLabel')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['PERCENTAGE', 'FIXED'].map((ty) => {
                const active = form.type === ty;
                return (
                  <TouchableOpacity key={ty} style={[styles.chip, active && styles.chipActive]} onPress={() => set('type', ty)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{ty === 'PERCENTAGE' ? t('mobile.common.percentageOption') : t('mobile.common.fixedAmountOption')}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.label}>{t('mobile.sellerCoupons.valueLabel')}</Text>
            <NeoInput style={styles.input} value={form.value} onChangeText={(v) => set('value', v)} keyboardType="numeric" placeholder={form.type === 'PERCENTAGE' ? '10' : '50'} />
            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.label}>{t('mobile.sellerCoupons.minSpendLabel')}</Text>
                <NeoInput style={styles.input} value={form.minSpend} onChangeText={(v) => set('minSpend', v)} keyboardType="numeric" placeholder="0" />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>{t('mobile.sellerCoupons.maxUsesLabel')}</Text>
                <NeoInput style={styles.input} value={form.maxUses} onChangeText={(v) => set('maxUses', v)} keyboardType="numeric" placeholder="1" />
              </View>
            </View>
            <NeoButton title={t('mobile.sellerCoupons.createButton')} onPress={create} disabled={saving} style={styles.save} />
            <NeoButton title={t('mobile.common.cancel')} variant="ghost" onPress={() => setModalOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  addWrap: { minWidth: 140 },
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
  code: { fontSize: 16, fontWeight: '800', color: colors.text },
  status: { fontSize: 12, fontWeight: '700' },
  desc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  meta: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  actions: { gap: 8 },
  miniBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  miniBtnText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: colors.surface, borderRadius: 14, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 10, marginBottom: 4 },
  input: {},
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.background },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  row2: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  save: { marginTop: 18 },
});
