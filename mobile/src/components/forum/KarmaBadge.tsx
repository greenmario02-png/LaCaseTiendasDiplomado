import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';

const TAG_COLORS: Record<string, string> = {
  Novato: '#78909C',
  Colaborador: '#42A5F5',
  Activo: '#6366F1',
  Experto: '#AB47BC',
  Maestro: '#FFB300',
  Leyenda: '#FFD700',
};

interface Props {
  tag?: string | null;
  inline?: boolean;
}

export default function KarmaBadge({ tag, inline = false }: Props) {
  const t = tag ?? 'Novato';
  const color = TAG_COLORS[t] ?? colors.forumMuted;
  return (
    <Text style={[styles.badge, { backgroundColor: `${color}22`, color, borderColor: `${color}55` }, inline && styles.inline]}>
      {t}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inline: { alignSelf: 'flex-start' },
});
