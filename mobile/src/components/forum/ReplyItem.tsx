import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { CheckCircle2, Check } from 'lucide-react-native';
import { colors } from '../../theme';
import { resolveImageUrl } from '../../services/api';
import VoteBar from './VoteBar';
import KarmaBadge from './KarmaBadge';
import BotReplyBadge from './BotReplyBadge';

interface Props {
  reply: any;
  canAccept?: boolean;
  onAccept?: (id: number) => void;
  onVote?: (value: 1 | -1) => void;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export default function ReplyItem({ reply, canAccept, onAccept, onVote }: Props) {
  return (
    <View style={[styles.card, reply.isAccepted && styles.accepted]}>
      <VoteBar score={reply.score} userVote={reply.userVote ?? 0} onVote={onVote ?? (() => {})} compact />
      <View style={styles.body}>
        <View style={styles.metaRow}>
          {reply.isBotReply ? (
            <BotReplyBadge />
          ) : (
            <>
              <Text style={styles.alias}>{reply.author?.forumUsername ?? 'usuario'}</Text>
              <KarmaBadge tag={reply.author?.tag} />
            </>
          )}
          {reply.isAccepted && (
            <View style={styles.best}>
              <CheckCircle2 size={12} color={colors.karmaUp} />
              <Text style={styles.bestText}>Mejor respuesta</Text>
            </View>
          )}
          <Text style={styles.time}>{formatTimeAgo(reply.createdAt)}</Text>
        </View>
        <Text style={styles.bodyText}>{reply.body}</Text>
        {reply.images?.map((img: string) => (
          <Image
            key={img}
            source={{ uri: resolveImageUrl(img) }}
            style={styles.replyImage}
            resizeMode="cover"
          />
        ))}
        {canAccept && !reply.isBotReply && !reply.isAccepted && onAccept && (
          <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(reply.id)}>
            <Check size={14} color={colors.karmaUp} />
            <Text style={styles.acceptText}>Marcar como respuesta</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.forumCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.forumBorder,
    padding: 8,
    overflow: 'hidden',
  },
  accepted: { borderLeftWidth: 3, borderLeftColor: colors.karmaUp },
  body: { flex: 1, paddingLeft: 8 },
  metaRow: { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' },
  alias: { fontSize: 13, fontWeight: '700', color: colors.forumAccent },
  best: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bestText: { fontSize: 11, fontWeight: '700', color: colors.karmaUp },
  time: { fontSize: 11, color: colors.forumMuted },
  bodyText: { fontSize: 14, color: colors.forumText, lineHeight: 20 },
  replyImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: colors.forumBorder,
  },
  acceptBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(76,175,80,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  acceptText: { fontSize: 12, fontWeight: '700', color: colors.karmaUp },
});
