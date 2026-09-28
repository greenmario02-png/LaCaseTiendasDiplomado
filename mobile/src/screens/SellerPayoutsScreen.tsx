import React, { useMemo,  useCallback, useState  } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  Alert, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Wallet, CreditCard } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { colors as themeColors } from '../theme';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { NeoButton } from '../components/redesign/NeoButton';

function money(v: string | number): string {
  return Number(v).toLocaleString('es-BO', { maximumFractionDigits: 2 }) + ' Bs';
}

export default function SellerPayoutsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const STATUS_LABEL: Record<string, { label: string; color: string }> = useMemo(() => ({
    PENDING: { label: t('mobile.common.pending'), color: themeColors.warning },
    APPROVED: { label: t('mobile.common.approved'), color: themeColors.info },
    PAID: { label: t('mobile.common.paid'), color: themeColors.success },
    REJECTED: { label: t('mobile.common.rejected'), color: themeColors.error },
  }), [t]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  // Cuenta
  const [method, setMethod] = useState('BNB');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [phoneQr, setPhoneQr] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/seller/payouts/summary');
      setSummary(data.data);
      if (data.data?.account) {
        const a = data.data.account;
        setMethod(a.method ?? 'BNB');
        setAccountHolder(a.accountHolder ?? '');
        setAccountNumber(a.accountNumber ?? '');
        setBankName(a.bankName ?? '');
        setPhoneQr(a.phoneQr ?? '');
      }
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const saveAccount = async () => {
    if (!accountHolder.trim() || !accountNumber.trim()) {
      Alert.alert(t('mobile.sellerPayouts.missingDataTitle'), t('mobile.sellerPayouts.missingDataMessage'));
      return;
    }
    setSaving(true);
    try {
      await api.put('/seller/payouts/account', {
        method,
        accountHolder: accountHolder.trim(),
        accountNumber: accountNumber.trim(),
        bankName: bankName.trim() || undefined,
        phoneQr: phoneQr.trim() || undefined,
      });
      setAccountOpen(false);
      Alert.alert(t('mobile.common.done'), t('mobile.sellerPayouts.accountUpdated'));
      load();
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const requestWithdraw = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      Alert.alert(t('mobile.sellerPayouts.invalidAmountTitle'), t('mobile.sellerPayouts.invalidAmountMessage'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/seller/payouts/request', { amount: amt, note: note.trim() || undefined });
      setWithdrawOpen(false);
      setAmount('');
      setNote('');
      Alert.alert(t('mobile.sellerPayouts.withdrawSentTitle'), t('mobile.sellerPayouts.withdrawSentMessage'));
      load();
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <LoadingState />
      </View>
    );
  }

  const payouts = summary?.payouts ?? [];

  const renderItem = ({ item }: { item: any }) => {
    const st = STATUS_LABEL[item.status] ?? { label: item.status, color: colors.textSecondary };
    return (
      <View style={styles.payoutCard}>
        <View style={styles.row}>
          <Text style={styles.payoutId}>{t('mobile.sellerPayouts.payoutId', { id: item.id })}</Text>
          <Text style={[styles.status, { color: st.color }]}>{st.label}</Text>
        </View>
        <Text style={styles.payoutAmount}>{money(item.amount)}</Text>
        <Text style={styles.payoutMeta}>
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-BO') : ''}
          {item.note ? ` · ${item.note}` : ''}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
        {/* Resumen */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: colors.success + '15' }]}>
            <Text style={styles.summaryLabel}>{t('mobile.sellerPayouts.summaryAvailable')}</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{money(summary?.available ?? 0)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.warning + '15' }]}>
            <Text style={styles.summaryLabel}>{t('mobile.common.pending')}</Text>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>{money(summary?.pending ?? 0)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.info + '15' }]}>
            <Text style={styles.summaryLabel}>{t('mobile.sellerPayouts.summaryLiberated')}</Text>
            <Text style={[styles.summaryValue, { color: colors.info }]}>{money(summary?.liberated ?? 0)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.primary + '15' }]}>
            <Text style={styles.summaryLabel}>{t('mobile.common.paid')}</Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>{money(summary?.paid ?? 0)}</Text>
          </View>
        </View>

        {/* Acciones */}
        <View style={{ marginBottom: 10 }}>
          <NeoButton title={t('mobile.sellerPayouts.configureAccountButton')} variant="secondary" onPress={() => setAccountOpen(true)} />
        </View>
        <View style={{ marginBottom: 12 }}>
          <NeoButton
            title={t('mobile.sellerPayouts.requestWithdrawButton')}
            onPress={() => {
              if (!summary?.account) {
                Alert.alert(t('mobile.sellerPayouts.noAccountTitle'), t('mobile.sellerPayouts.noAccountMessage'));
                return;
              }
              setWithdrawOpen(true);
            }}
          />
        </View>

        {/* Historial */}
        <Text style={styles.section}>{t('mobile.sellerPayouts.historyTitle')}</Text>
        {payouts.length === 0 ? (
          <EmptyState message={t('mobile.sellerPayouts.emptyHistory')} />
        ) : (
          payouts.map((p: any) => (
            <View key={p.id} style={styles.payoutCard}>
              <View style={styles.row}>
                <Text style={styles.payoutId}>{t('mobile.sellerPayouts.payoutId', { id: p.id })}</Text>
                <Text style={[styles.status, { color: (STATUS_LABEL[p.status] ?? { color: colors.textSecondary }).color }]}>
                  {(STATUS_LABEL[p.status] ?? { label: p.status }).label}
                </Text>
              </View>
              <Text style={styles.payoutAmount}>{money(p.amount)}</Text>
              <Text style={styles.payoutMeta}>
                {p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-BO') : ''}
                {p.note ? ` · ${p.note}` : ''}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal cuenta */}
      <Modal visible={accountOpen} transparent animationType="slide" onRequestClose={() => setAccountOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('mobile.sellerPayouts.accountModalTitle')}</Text>
            <Text style={styles.modalSub}>{t('mobile.sellerPayouts.accountModalSubtitle')}</Text>
            <TextInput style={styles.input} value={method} onChangeText={setMethod} placeholder={t('mobile.sellerPayouts.methodPlaceholder')} placeholderTextColor={colors.textSecondary} />
            <TextInput style={styles.input} value={accountHolder} onChangeText={setAccountHolder} placeholder={t('mobile.sellerPayouts.accountHolderPlaceholder')} placeholderTextColor={colors.textSecondary} />
            <TextInput style={styles.input} value={accountNumber} onChangeText={setAccountNumber} placeholder={t('mobile.sellerPayouts.accountNumberPlaceholder')} placeholderTextColor={colors.textSecondary} />
            <TextInput style={styles.input} value={bankName} onChangeText={setBankName} placeholder={t('mobile.sellerPayouts.bankNamePlaceholder')} placeholderTextColor={colors.textSecondary} />
            <TextInput style={styles.input} value={phoneQr} onChangeText={setPhoneQr} placeholder={t('mobile.sellerPayouts.phoneQrPlaceholder')} placeholderTextColor={colors.textSecondary} />
            <View style={{ marginTop: 8 }}>
              <NeoButton title={saving ? t('mobile.sellerPayouts.savingAccount') : t('mobile.sellerPayouts.saveAccountButton')} onPress={saveAccount} disabled={saving} />
            </View>
            <View style={{ marginTop: 6 }}>
              <NeoButton title={t('mobile.common.cancel')} variant="ghost" onPress={() => setAccountOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal retiro */}
      <Modal visible={withdrawOpen} transparent animationType="slide" onRequestClose={() => setWithdrawOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Wallet size={22} color={colors.success} />
            <Text style={styles.modalTitle}>{t('mobile.sellerPayouts.withdrawModalTitle')}</Text>
            <Text style={styles.modalSub}>{t('mobile.sellerPayouts.withdrawAvailable', { amount: money(summary?.available ?? 0) })}</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder={t('mobile.sellerPayouts.amountPlaceholder')} keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
            <TextInput style={[styles.input, styles.notesInput]} value={note} onChangeText={setNote} placeholder={t('mobile.sellerPayouts.notePlaceholder')} placeholderTextColor={colors.textSecondary} multiline />
            <View style={{ marginTop: 8 }}>
              <NeoButton title={saving ? t('mobile.sellerPayouts.sendingRequest') : t('mobile.sellerPayouts.sendRequestButton')} onPress={requestWithdraw} disabled={saving} />
            </View>
            <View style={{ marginTop: 6 }}>
              <NeoButton title={t('mobile.common.cancel')} variant="ghost" onPress={() => setWithdrawOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  summaryCard: { flexBasis: '47%', flexGrow: 1, borderRadius: 12, padding: 14, gap: 4 },
  summaryLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  summaryValue: { fontSize: 17, fontWeight: '900' },
  section: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 14, marginBottom: 8 },
  payoutCard: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  payoutId: { fontSize: 14, fontWeight: '700', color: colors.text },
  status: { fontSize: 12, fontWeight: '800' },
  payoutAmount: { fontSize: 16, fontWeight: '900', color: colors.price, marginTop: 4 },
  payoutMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalSub: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.text },
  notesInput: { minHeight: 50, textAlignVertical: 'top' },
});
