import React, { useMemo,  useEffect, useState  } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { getKarmaHistory, redeemKarma } from '../../services/forum.api';
import { getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { KarmaLevelBadge } from '../../components/redesign/KarmaLevelBadge';
import { NeoInput } from '../../components/redesign/NeoInput';
import { NeoButton } from '../../components/redesign/NeoButton';
import { Star } from 'lucide-react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export default function ForumKarmaScreen() {
  const { t } = useTranslation();
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
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRedeem = async () => {
    const value = parseInt(amount, 10);
    const available = (profile?.karma ?? 0) - (profile?.karmaSpent ?? 0);
    if (!value || value < 100 || value % 100 !== 0) {
      Alert.alert(t('mobile.forumKarma.invalidAmountTitle'), t('mobile.forumKarma.invalidAmountMessage'));
      return;
    }
    if (value > available) {
      Alert.alert(t('mobile.forumKarma.insufficientKarmaTitle'), t('mobile.forumKarma.insufficientKarmaMessage', { available }));
      return;
    }
    setSending(true);
    try {
      const res = await redeemKarma(value);
      Alert.alert(t('mobile.forumKarma.redeemSuccessTitle'), t('mobile.forumKarma.redeemSuccessMessage', { coins: res.coinsEarned }));
      await load();
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
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
          <Text style={styles.karma}>{t('mobile.forumKarma.karmaLabel', { karma: profile?.karma ?? 0 })}</Text>
        </View>
        <KarmaLevelBadge level={profile?.tag} />
        <Text style={styles.muted}>
          {t('mobile.forumKarma.availableInfo', { available })}
        </Text>
        <NeoInput
          style={styles.input}
          keyboardType="number-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <NeoButton
          title={sending ? t('mobile.forumKarma.redeeming') : t('mobile.forumKarma.redeemButton')}
          onPress={handleRedeem}
          disabled={sending || available < 100}
        />
      </View>

      <Text style={styles.sectionTitle}>{t('mobile.forumKarma.historyTitle')}</Text>
      {txs.length === 0 && <Text style={styles.muted}>{t('mobile.forumKarma.noTransactionsMessage')}</Text>}
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
