import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export function RatingStars({ rating, count }: { rating: number; count?: number }) {
  const { colors: c } = useAppTheme();
  const filled = Math.round(rating);
  return (
    <View style={styles.row}>
      <Text style={[styles.stars, { color: c.warning }]}>
        {'★'.repeat(Math.max(0, Math.min(5, filled))) + '☆'.repeat(Math.max(0, 5 - filled))}
      </Text>
      <Text style={[styles.text, { color: c.textSecondary }]}>
        {rating.toFixed(1)}
        {typeof count === 'number' ? ` (${count})` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stars: { fontSize: 15, letterSpacing: 1 },
  text: { fontSize: 12 },
});
