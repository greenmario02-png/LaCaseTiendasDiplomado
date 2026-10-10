import React, { useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { ThumbsUp, MapPin, MessageCircle, CheckCircle2 } from 'lucide-react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { CategoryIcon } from '../../theme/forumIcons';

export type ForumPostCardData = {
  id: number;
  title: string;
  body: string;
  city: string;
  category: { slug?: string; icon: string; name: string; color: string };
  author: { forumUsername: string };
  status: 'OPEN' | 'RESOLVED' | 'CLOSED';
  replyCount: number;
  positives: number;
  createdAt: string;
};

type Props = {
  post: ForumPostCardData;
  onOpen: (id: number) => void;
  onPositive: (id: number) => void;
};

export function ForumPostCard({ post, onOpen, onPositive }: Props) {
  const [voted, setVoted] = useState(false);
  const { colors: c, raised } = useAppTheme();
  const isResolved = post.status === 'RESOLVED';

  return (
    <Pressable
      testID={`forum-post-${post.id}`}
      onPress={() => onOpen(post.id)}
      style={[styles.card, raised, { backgroundColor: c.surface }]}
    >
      <View style={styles.metaRow}>
        <View style={[styles.iconCircle, { backgroundColor: `${post.category.color}22` }]}>
          <CategoryIcon slug={post.category.slug} size={18} color={post.category.color} />
        </View>
        <Text style={[styles.chip, { backgroundColor: `${c.primary}14`, color: c.primary }]}>{post.category.name}</Text>
        <View style={[styles.chip, styles.chipRow, { borderWidth: 1, borderColor: c.border }]}>
          <MapPin size={12} color={c.textSecondary} />
          <Text style={[styles.chipText, { color: c.textSecondary }]}>{post.city}</Text>
        </View>
        <View style={[styles.chip, styles.chipRow, { backgroundColor: isResolved ? `${c.success}1A` : `${c.warning}1A` }]}>
          {isResolved ? <CheckCircle2 size={12} color={c.success} /> : null}
          <Text style={[styles.chipText, { color: isResolved ? c.success : '#B45309' }]}>{isResolved ? 'Resuelta' : 'Abierta'}</Text>
        </View>
      </View>
      <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
        {post.title}
      </Text>
      <Text style={[styles.body, { color: c.textSecondary }]} numberOfLines={2}>
        {post.body}
      </Text>
      <View style={styles.footer}>
        <View style={styles.authorRow}>
          <Text style={[styles.author, { color: c.textSecondary }]}>por {post.author.forumUsername} ·</Text>
          <MessageCircle size={13} color={c.textSecondary} />
          <Text style={[styles.author, { color: c.textSecondary }]}>{post.replyCount}</Text>
        </View>
        <Pressable
          testID={`forum-positive-${post.id}`}
          onPress={() => {
            onPositive(post.id);
            setVoted((v) => !v);
          }}
          style={[styles.positiveBtn, { borderColor: voted ? c.primary : c.border }]}
        >
          <ThumbsUp size={14} color={voted ? c.primary : c.textSecondary} />
          <Text style={[styles.positiveText, { color: voted ? c.primary : c.textSecondary }]}>
            {voted ? 'Me sirvió' : 'Positivo'} {post.positives + (voted ? 1 : 0)}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chip: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipText: { fontSize: 11, fontWeight: '700' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: 15, fontWeight: '700', marginTop: 8, lineHeight: 20 },
  body: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  author: { fontSize: 12 },
  positiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  positiveText: { fontSize: 12, fontWeight: '600' },
});
