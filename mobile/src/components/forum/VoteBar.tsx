import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme';

interface Props {
  score: number;
  userVote: 1 | -1 | 0;
  onVote: (value: 1 | -1) => void;
  compact?: boolean;
}

export default function VoteBar({ score, userVote, onVote, compact = false }: Props) {
  const size = compact ? 16 : 20;
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => onVote(1)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={[styles.btn, userVote === 1 && { backgroundColor: 'rgba(76,175,80,0.15)', borderRadius: 6 }]}
      >
        <Text style={{ fontSize: size, color: userVote === 1 ? colors.karmaUp : colors.forumMuted, fontWeight: '900' }}>▲</Text>
      </TouchableOpacity>
      <Text style={[styles.score, { fontSize: compact ? 12 : 14 }]}>{Math.round(score)}</Text>
      <TouchableOpacity
        onPress={() => onVote(-1)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={[styles.btn, userVote === -1 && { backgroundColor: 'rgba(244,67,54,0.15)', borderRadius: 6 }]}
      >
        <Text style={{ fontSize: size, color: userVote === -1 ? colors.karmaDown : colors.forumMuted, fontWeight: '900' }}>▼</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
  },
  btn: { padding: 2 },
  score: { fontWeight: '700', color: colors.forumText, fontVariant: ['tabular-nums'] },
});
