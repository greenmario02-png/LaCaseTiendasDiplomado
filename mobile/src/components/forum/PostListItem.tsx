import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, MessageCircle, Check } from 'lucide-react-native';
import { colors } from '../../theme';
import VoteBar from './VoteBar';
import KarmaBadge from './KarmaBadge';

interface Props {
  post: any;
  onPress: () => void;
  onVote: (value: 1 | -1) => void;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export default function PostListItem({ post, onPress, onVote }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.card, post.status === 'RESOLVED' && styles.cardResolved]}>
        <VoteBar score={post.score} userVote={post.userVote ?? 0} onVote={onVote} compact />
        <View style={styles.body}>
          <View style={styles.metaRow}>
            <Text style={styles.subforo}>
              {post.category?.icon} {post.category?.name}
            </Text>
            <View style={styles.city}>
              <MapPin size={11} color={colors.warning} />
              <Text style={styles.cityText}>{post.city}</Text>
            </View>
            {post.type && post.type !== 'GENERAL' && (
              <Text style={styles.type}>{post.type}</Text>
            )}
          </View>
          <Text style={styles.title} numberOfLines={2}>{post.title}</Text>
          <Text style={styles.author} numberOfLines={1}>
            por <Text style={{ color: colors.forumTextSecondary, fontWeight: '600' }}>
              {post.author?.forumUsername ?? 'usuario'}
            </Text>{' '}
            · <KarmaBadge tag={post.author?.tag} /> · {formatTimeAgo(post.createdAt)}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <MessageCircle size={12} color={colors.forumTextSecondary} />
              <Text style={[styles.statText, post.status === 'RESOLVED' && { color: colors.karmaUp }]}>
                {post.replyCount}
              </Text>
              {post.status === 'RESOLVED' && <Check size={12} color={colors.karmaUp} />}
            </View>
            {post.replyCount === 0 && (
              <View style={styles.noBadge}>
                <Text style={styles.noBadgeText}>Sin respuesta aún</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.forumCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.forumBorder,
    overflow: 'hidden',
  },
  cardResolved: { borderLeftWidth: 3, borderLeftColor: colors.karmaUp },
  body: { flex: 1, padding: 12, paddingLeft: 8 },
  metaRow: { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' },
  subforo: {
    fontSize: 11,
    color: colors.forumAccent,
    fontWeight: '700',
    backgroundColor: 'rgba(255,107,53,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  city: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,152,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cityText: {
    fontSize: 11,
    color: colors.warning,
  },
  type: { fontSize: 10, color: colors.info, fontWeight: '700' },
  title: { fontSize: 14, fontWeight: '700', color: colors.forumText, lineHeight: 20, marginBottom: 6 },
  author: { fontSize: 11, color: colors.forumMuted, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: 12, color: colors.forumTextSecondary },
  noBadge: {
    backgroundColor: 'rgba(211,47,47,0.15)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  noBadgeText: { fontSize: 10, color: '#FF5252', fontWeight: '700' },
});
