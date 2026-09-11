import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

type Props = {
  title: string;
  value: number | string;
  icon?: string;
  trend?: number;
};

export function StatCard({ title, value, icon, trend }: Props) {
  const { colors: c, raised } = useAppTheme();
  const hasTrend = trend !== undefined;
  return (
    <View
      style={[styles.card, { backgroundColor: c.surface }, raised]}
      testID={`stat-${title}`}
    >
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={[styles.title, { color: c.textSecondary }]}>{title}</Text>
      <Text style={[styles.value, { color: c.text }]}>{value}</Text>
      {hasTrend ? (
        <Text style={[styles.trend, { color: trend! >= 0 ? c.success : c.error }]}>
          {trend! >= 0 ? `+${trend}` : trend}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 20, marginBottom: 4 },
  title: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  value: { fontSize: 22, fontWeight: '800' },
  trend: { fontSize: 13, fontWeight: '700', marginTop: 2 },
});
