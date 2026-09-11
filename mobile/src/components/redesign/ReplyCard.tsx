import React, { useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { ThumbsUp, CheckCircle2 } from 'lucide-react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export type ReplyCardData = {
  id: number;
  body: string;
  images?: string[];
  isBotReply?: boolean;
  isAccepted?: boolean;
  author: { forumUsername: string; tag?: string } | null;
  positives?: number;
  createdAt?: string;
};

type Props = {
  reply: ReplyCardData;
  canAccept?: boolean;
  onAccept?: (id: number) => void;
  onPositive?: (id: number) => void;
};

export function ReplyCard({ reply, canAccept, onAccept, onPositive }: Props) {
  const [voted, setVoted] = useState(false);
  const { colors: c, raised } = useAppTheme();
  const positives = reply.positives ?? 0;

  return (
    <View style={[styles.card, raised, { backgroundColor: c.surface, borderLeftColor: c.success, borderLeftWidth: reply.isAccepted ? 3 : 0 }]}>
      <View style={styles.metaRow}>
        {reply.isBotReply ? (
          <Text style={[styles.chip, { backgroundColor: `${c.primary}14`, color: c.primary }]}>Bot LaCASE Multitienda</Text>
        ) : (
          <Text style={[styles.author, { color: c.textSecondary }]}>
            <Text style={{ color: c.text, fontWeight: '700' }}>{reply.author?.forumUsername ?? 'usuario'}</Text>
            {reply.author?.tag ? ` · ${reply.author.tag}` : ''}
          </Text>
        )}
        {reply.isAccepted && (
          <Text style={[styles.chip, { backgroundColor: `${c.success}1A`, color: c.success }]}>
            ✓ Resuelve la duda
          </Text>
        )}
      </View>
      <Text style={[styles.body, { color: c.text }]}>{reply.body}</Text>
      <View style={styles.footer}>
        <Pressable
          testID={`reply-positive-${reply.id}`}
          onPress={() => {
            onPositive?.(reply.id);
            setVoted((v) => !v);
          }}
          style={[styles.positiveBtn, { borderColor: voted ? c.primary : c.border }]}
        >
          <ThumbsUp size={14} color={voted ? c.primary : c.textSecondary} />
          <Text style={[styles.positiveText, { color: voted ? c.primary : c.textSecondary }]}>
            {voted ? 'Me sirvió' : 'Positivo'} {positives + (voted ? 1 : 0)}
          </Text>
        </Pressable>
        {canAccept && !reply.isAccepted && !reply.isBotReply && (
          <Pressable testID={`reply-accept-${reply.id}`} onPress={() => onAccept?.(reply.id)} style={[styles.acceptBtn, { backgroundColor: `${c.success}1A` }]}>
            <CheckCircle2 size={14} color={c.success} />
            <Text style={[styles.acceptText, { color: c.success }]}>Marcar como respuesta</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  chip: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  author: { fontSize: 12 },
  body: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
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
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  acceptText: { fontSize: 12, fontWeight: '700' },
});
