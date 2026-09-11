import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Bot } from 'lucide-react-native';
import { colors } from '../../theme';

export default function BotReplyBadge() {
  return (
    <View style={styles.badge}>
      <Bot size={12} color={colors.forumAccent} />
      <Text style={styles.badgeText}>Bot LaCASE Multitienda</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,107,53,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.forumAccent,
  },
});
