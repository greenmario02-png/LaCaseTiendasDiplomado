import React, { useMemo,  useEffect, useState  } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { getKarmaHistory, redeemKarma } from '../../services/forum.api';
import { getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { KarmaLevelBadge } from '../../components/redesign/KarmaLevelBadge';
import { NeoInput } from '../../components/redesign/NeoInput';
import { NeoButton } from '../../components/redesign/NeoButton';
import { Star } from 'lucide-react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export default function ForumKarmaScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [amount, setAmount] = useState('100');
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      const res = await getKarmaHistory();
      setProfile(res?.profile ?? null);
      setTxs(res?.transactions ?? []);
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRedeem = async () => {
    const value = parseInt(amount, 10);
    const available = (profile?.karma ?? 0) - (profile?.karmaSpent ?? 0);
    if (!value || value < 100 || value % 100 !== 0) {
      Alert.alert('Monto inválido', 'Mínimo 100, en múltiplos de 100.');
      return;
    }
    if (value > available) {
      Alert.alert('Karma insuficiente', `Tienes ${available} disponible.`);
      return;
    }
    setSending(true);
    try {
      const res = await redeemKarma(value);
      Alert.alert('Canje exitoso', `Recibiste ${res.coinsEarned} monedas.`);
      await load();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const available = (profile?.karma ?? 0) - (profile?.karmaSpent ?? 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 12, gap: 12 }}>
      <View style={styles.card}>
        <View style={styles.karmaRow}>
          <Star size={20} color={colors.karmaGold} fill={colors.karmaGold} />
          <Text style={styles.karma}>{profile?.karma ?? 0} karma</Text>
        </View>
        <KarmaLevelBadge level={profile?.tag} />
        <Text style={styles.muted}>
          Disponible para canjear: {available} karma · Tasa: 100 karma = 10 monedas
        </Text>
        <NeoInput
          style={styles.input}
          keyboardType="number-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <NeoButton
          title={sending ? 'Canjeando...' : 'Canjear por monedas del proyecto'}
          onPress={handleRedeem}
          disabled={sending || available < 100}
        />
      </View>

      <Text style={styles.sectionTitle}>Historial de karma</Text>
      {txs.length === 0 && <Text style={styles.muted}>Sin transacciones aún</Text>}
      {txs.map((t) => (
        <View key={String(t.id)} style={styles.card}>
          <View style={styles.txRow}>
            <Text style={[styles.txAmount, t.amount > 0 ? styles.pos : styles.neg]}>
              {t.amount > 0 ? `+${t.amount}` : t.amount}
            </Text>
            <Text style={styles.txType}>{t.type}</Text>
          </View>
          {t.note ? <Text style={styles.muted}>{t.note}</Text> : null}
          <Text style={styles.txDate}>{new Date(t.createdAt).toLocaleString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.forumBg,
  },
  card: {
    backgroundColor: colors.forumCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.forumBorder,
    padding: 14,
    gap: 8,
  },
  karma: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.karmaGold,
  },
  karmaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  muted: {
    fontSize: 12,
    color: colors.forumMuted,
  },
  input: {
    minHeight: 40,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forumText,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  pos: {
    color: colors.karmaUp,
  },
  neg: {
    color: colors.karmaDown,
  },
  txType: {
    fontSize: 12,
    color: colors.forumTextSecondary,
    fontWeight: '600',
  },
  txDate: {
    fontSize: 11,
    color: colors.forumMuted,
  },
});
