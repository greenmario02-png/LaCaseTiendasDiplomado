import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  Novato: { bg: '#E3F2FD', text: '#1565C0' },
  Colaborador: { bg: '#E8F5E9', text: '#2E7D32' },
  Activo: { bg: '#E8EAF6', text: '#3949AB' },
  Experto: { bg: '#FFF8E1', text: '#F57F17' },
  Maestro: { bg: '#FCE4EC', text: '#C2185B' },
  Leyenda: { bg: '#EDE9FE', text: '#5B21B6' },
};

export function KarmaLevelBadge({ level, inline }: { level?: string; inline?: boolean }) {
  const key = level ?? 'Novato';
  const palette = BADGE_COLORS[key] ?? BADGE_COLORS.Novato;

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, inline && styles.inline]}>
      <Text style={[styles.text, { color: palette.text }]}>{key}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  inline: { alignSelf: 'center' },
  text: { fontSize: 11, fontWeight: '700' },
});
