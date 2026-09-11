import React, { useMemo,  useCallback, useState  } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  Alert, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Wallet, CreditCard } from 'lucide-react-native';
import { api, getErrorMessage } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { colors as themeColors } from '../theme';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { NeoButton } from '../components/redesign/NeoButton';

function money(v: string | number): string {
  return Number(v).toLocaleString('es-BO', { maximumFractionDigits: 2 }) + ' Bs';
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: themeColors.warning },
  APPROVED: { label: 'Aprobado', color: themeColors.info },
  PAID: { label: 'Pagado', color: themeColors.success },
  REJECTED: { label: 'Rechazado', color: themeColors.error },
};

export default function SellerPayoutsScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
      Alert.alert('Error', getErrorMessage(e));
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

  const saveAccount = async () => {
    if (!accountHolder.trim() || !accountNumber.trim()) {
      Alert.alert('Faltan datos', 'Completá titular y número de cuenta.');
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
      Alert.alert('Listo', 'Datos de pago actualizados.');
      load();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const requestWithdraw = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      Alert.alert('Monto inválido', 'Ingresá un monto válido en Bs.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/seller/payouts/request', { amount: amt, note: note.trim() || undefined });
      setWithdrawOpen(false);
      setAmount('');
      setNote('');
      Alert.alert('Solicitud enviada', 'Tu solicitud de retiro quedó pendiente de aprobación.');
      load();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
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
          <Text style={styles.payoutId}>Retiro #{item.id}</Text>
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
            <Text style={styles.summaryLabel}>Disponible</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{money(summary?.available ?? 0)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.warning + '15' }]}>
            <Text style={styles.summaryLabel}>Pendiente</Text>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>{money(summary?.pending ?? 0)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.info + '15' }]}>
            <Text style={styles.summaryLabel}>Liberado</Text>
            <Text style={[styles.summaryValue, { color: colors.info }]}>{money(summary?.liberated ?? 0)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.primary + '15' }]}>
            <Text style={styles.summaryLabel}>Pagado</Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>{money(summary?.paid ?? 0)}</Text>
          </View>
        </View>

        {/* Acciones */}
        <View style={{ marginBottom: 10 }}>
          <NeoButton title="Configurar cuenta de pago" variant="secondary" onPress={() => setAccountOpen(true)} />
        </View>
        <View style={{ marginBottom: 12 }}>
          <NeoButton
            title="Solicitar retiro"
            onPress={() => {
              if (!summary?.account) {
                Alert.alert('Sin cuenta', 'Configurá primero tu cuenta de pago.');
                return;
              }
              setWithdrawOpen(true);
            }}
          />
        </View>

        {/* Historial */}
        <Text style={styles.section}>Historial de pagos</Text>
        {payouts.length === 0 ? (
          <EmptyState message="Aún no hay movimientos de pago." />
        ) : (
          payouts.map((p: any) => (
            <View key={p.id} style={styles.payoutCard}>
              <View style={styles.row}>
                <Text style={styles.payoutId}>Retiro #{p.id}</Text>
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
            <Text style={styles.modalTitle}>Cuenta de pago</Text>
            <Text style={styles.modalSub}>Usá BNB (QR) o una cuenta bancaria para recibir tus pagos.</Text>
            <TextInput style={styles.input} value={method} onChangeText={setMethod} placeholder="Método (BNB / QR / Banco)" placeholderTextColor={colors.textSecondary} />
            <TextInput style={styles.input} value={accountHolder} onChangeText={setAccountHolder} placeholder="Titular de la cuenta *" placeholderTextColor={colors.textSecondary} />
            <TextInput style={styles.input} value={accountNumber} onChangeText={setAccountNumber} placeholder="Número de cuenta / wallet *" placeholderTextColor={colors.textSecondary} />
            <TextInput style={styles.input} value={bankName} onChangeText={setBankName} placeholder="Banco (opcional)" placeholderTextColor={colors.textSecondary} />
            <TextInput style={styles.input} value={phoneQr} onChangeText={setPhoneQr} placeholder="QR por celular (opcional)" placeholderTextColor={colors.textSecondary} />
            <View style={{ marginTop: 8 }}>
              <NeoButton title={saving ? 'Guardando...' : 'Guardar cuenta'} onPress={saveAccount} disabled={saving} />
            </View>
            <View style={{ marginTop: 6 }}>
              <NeoButton title="Cancelar" variant="ghost" onPress={() => setAccountOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal retiro */}
      <Modal visible={withdrawOpen} transparent animationType="slide" onRequestClose={() => setWithdrawOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Wallet size={22} color={colors.success} />
            <Text style={styles.modalTitle}>Solicitar retiro</Text>
            <Text style={styles.modalSub}>Disponible: {money(summary?.available ?? 0)}</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="Monto en Bs *" keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
            <TextInput style={[styles.input, styles.notesInput]} value={note} onChangeText={setNote} placeholder="Nota (opcional)" placeholderTextColor={colors.textSecondary} multiline />
            <View style={{ marginTop: 8 }}>
              <NeoButton title={saving ? 'Enviando...' : 'Enviar solicitud'} onPress={requestWithdraw} disabled={saving} />
            </View>
            <View style={{ marginTop: 6 }}>
              <NeoButton title="Cancelar" variant="ghost" onPress={() => setWithdrawOpen(false)} />
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
