import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export function CoinChip({ amount }: { amount: number }) {
  const { colors: c } = useAppTheme();
  return (
    <View style={[styles.chip, { backgroundColor: c.warning }]}>
      <Text style={styles.text}>🪙 {amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
