import React, { useMemo,  useEffect, useState  } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Star, FileText, MessageCircle, Flame } from 'lucide-react-native';
import { colors as forumColors } from '../../theme';
import {
  getPublicProfile,
  getProfilePosts,
  addReputation,
  redeemKarma,
} from '../../services/forum.api';
import { getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { KarmaLevelBadge } from '../../components/redesign/KarmaLevelBadge';
import { NeoInput } from '../../components/redesign/NeoInput';
import { NeoButton } from '../../components/redesign/NeoButton';
import { StatCard } from '../../components/redesign/StatCard';
import { ForumPostCard } from '../../components/redesign/ForumPostCard';
import { useAppTheme } from '../../theme/ThemeContext';
import {
  MapPin,
  Ban,
  ThumbsUp,
  ThumbsDown,
  Coins,
} from 'lucide-react-native';

export default function ForumProfileScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { username } = route.params;
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [redeemAmount, setRedeemAmount] = useState('100');
  const [sending, setSending] = useState(false);

  const isSelf = !!user && user.forumProfile?.forumUsername === username;

  const load = async () => {
    try {
      const [p, postsRes] = await Promise.all([
        getPublicProfile(String(username)),
        getProfilePosts(String(username), 1),
      ]);
      setProfile(p);
      setPosts(postsRes?.data ?? []);
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const handleReputation = async () => {
    if (!rating) {
      Alert.alert(t('mobile.forumProfile.chooseRatingTitle'), t('mobile.forumProfile.chooseRatingMessage'));
      return;
    }
    setSending(true);
    try {
      await addReputation(String(username), {
        value: rating,
        comment: comment.trim() || undefined,
      });
      Alert.alert(t('mobile.forumProfile.thanksTitle'), t('mobile.forumProfile.thanksMessage'));
      setComment('');
      setRating(null);
      await load();
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const handleRedeem = async () => {
    const amount = parseInt(redeemAmount, 10);
    if (!amount || amount < 100 || amount % 100 !== 0) {
      Alert.alert(t('mobile.forumProfile.invalidAmountTitle'), t('mobile.forumProfile.invalidAmountMessage'));
      return;
    }
    setSending(true);
    try {
      const res = await redeemKarma(amount);
      Alert.alert(
        t('mobile.forumProfile.redeemSuccessTitle'),
        t('mobile.forumProfile.redeemSuccessMessage', { coins: res.coinsEarned }),
      );
      await load();
    } catch (e) {
      Alert.alert(t('mobile.common.error'), getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>{t('mobile.forumProfile.loadingMessage')}</Text>
      </View>
    );
  }

  const available = profile.karma - profile.karmaSpent;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 12, gap: 12 }}>
      <View style={styles.banner} />
      <View style={styles.card}>
        <Text style={styles.username}>{profile.forumUsername}</Text>
        <View style={styles.chipsRow}>
          <KarmaLevelBadge level={profile.tag} />
          <View style={styles.chipRow}>
            <MapPin size={11} color={colors.warning} />
            <Text style={styles.city}>{profile.city}</Text>
          </View>
          {profile.isBanned && (
            <View style={styles.chipRow}>
              <Ban size={11} color={colors.karmaDown} />
              <Text style={styles.banned}>{t('mobile.forumProfile.bannedLabel')}</Text>
            </View>
          )}
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statCol}>
            <StatCard title={t('mobile.forumProfile.statKarma')} value={profile.karma} icon={<Star size={20} color={forumColors.forumAccent} />} />
          </View>
          <View style={styles.statCol}>
            <StatCard title={t('mobile.forumProfile.statQuestions')} value={profile._count?.posts ?? 0} icon={<FileText size={20} color={forumColors.forumAccent} />} />
          </View>
          <View style={styles.statCol}>
            <StatCard title={t('mobile.forumProfile.statReplies')} value={profile._count?.replies ?? 0} icon={<MessageCircle size={20} color={forumColors.forumAccent} />} />
          </View>
          <View style={styles.statCol}>
            <StatCard title={t('mobile.forumProfile.statStreak')} value={profile.streakDays ?? 0} icon={<Flame size={20} color={forumColors.forumAccent} />} />
          </View>
        </View>
        <View style={styles.reputationRow}>
          <ThumbsUp size={12} color={colors.karmaUp} />
          <Text style={styles.reputation}>
            {t('mobile.forumProfile.reputationLabel', { score: profile.reputationScore ?? 0 })}
          </Text>
        </View>
        {profile.signatureText ? (
          <Text style={styles.signature}>“{profile.signatureText}”</Text>
        ) : null}
      </View>

      {isSelf && (
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Coins size={15} color={colors.karmaGold} />
            <Text style={styles.sectionTitle}>{t('mobile.forumProfile.redeemSectionTitle')}</Text>
          </View>
          <Text style={styles.muted}>
            {t('mobile.forumProfile.redeemAvailableInfo', { available })}
          </Text>
          <NeoInput
            style={styles.input}
            keyboardType="number-pad"
            value={redeemAmount}
            onChangeText={setRedeemAmount}
          />
          <NeoButton
            title={t('mobile.forumProfile.redeemButton')}
            onPress={handleRedeem}
            disabled={sending || available < 100}
          />
          <NeoButton
            title={t('mobile.forumProfile.configureZoneButton')}
            variant="ghost"
            onPress={() => navigation.navigate('ForumGeoConfig')}
          />
        </View>
      )}

      {!isSelf && user && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('mobile.forumProfile.trustworthyQuestion')}</Text>
          <View style={styles.rateRow}>
            <Pressable
              style={[styles.rateBtn, rating === 1 && styles.rateBtnUp]}
              onPress={() => setRating(1)}
            >
              <View style={styles.rateBtnRow}>
                <ThumbsUp size={13} color={rating === 1 ? colors.karmaUp : colors.forumTextSecondary} />
                <Text style={styles.rateText}>{t('mobile.forumProfile.trustworthyYes')}</Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.rateBtn, rating === -1 && styles.rateBtnDown]}
              onPress={() => setRating(-1)}
            >
              <View style={styles.rateBtnRow}>
                <ThumbsDown size={13} color={rating === -1 ? colors.karmaDown : colors.forumTextSecondary} />
                <Text style={styles.rateText}>{t('mobile.forumProfile.trustworthyNo')}</Text>
              </View>
            </Pressable>
          </View>
          <NeoInput
            style={styles.input}
            placeholder={t('mobile.forumProfile.commentPlaceholder')}
            value={comment}
            onChangeText={setComment}
          />
          <NeoButton
            title={t('mobile.forumProfile.sendRatingButton')}
            onPress={handleReputation}
            disabled={sending}
          />
        </View>
      )}

      <Text style={styles.sectionTitle}>{t('mobile.forumProfile.recentQuestionsTitle')}</Text>
      {posts.length === 0 && <Text style={styles.muted}>{t('mobile.forumProfile.noQuestionsMessage')}</Text>}
      {posts.map((p) => (
        <ForumPostCard
          key={String(p.id)}
          post={{
            id: p.id,
            title: p.title,
            body: p.body ?? '',
            city: p.city,
            category: {
              slug: p.category?.slug,
              icon: p.category?.icon ?? '💬',
              name: p.category?.name ?? 'General',
              color: p.category?.color ?? '#6366F1',
            },
            author: { forumUsername: p.author?.forumUsername ?? 'usuario' },
            status: (p.status as 'OPEN' | 'RESOLVED' | 'CLOSED') ?? 'OPEN',
            replyCount: p.replyCount ?? 0,
            positives: p.score ?? 0,
            createdAt: p.createdAt,
          }}
          onOpen={(id) => navigation.navigate('ForumPost', { id })}
          onPositive={() => {}}
        />
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
  empty: {
    textAlign: 'center',
    color: colors.forumMuted,
    marginTop: 40,
  },
  banner: {
    height: 70,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  card: {
    backgroundColor: colors.forumCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.forumBorder,
    padding: 14,
    gap: 8,
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.forumText,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  city: {
    fontSize: 12,
    color: colors.warning,
  },
  banned: {
    fontSize: 12,
    color: colors.karmaDown,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  statCol: {
    width: '48%',
  },
  reputationRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  reputation: {
    fontSize: 12,
    color: colors.forumTextSecondary,
  },
  signature: {
    fontSize: 12,
    color: colors.forumAccent,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forumText,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  muted: {
    fontSize: 12,
    color: colors.forumMuted,
  },
  input: {
    minHeight: 40,
  },
  rateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rateBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.forumBorder,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rateBtnUp: {
    borderColor: colors.karmaUp,
    backgroundColor: 'rgba(76,175,80,0.1)',
  },
  rateBtnDown: {
    borderColor: colors.karmaDown,
    backgroundColor: 'rgba(244,67,54,0.1)',
  },
  rateText: {
    fontSize: 13,
    color: colors.forumTextSecondary,
    fontWeight: '600',
  },
  rateBtnRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
});
