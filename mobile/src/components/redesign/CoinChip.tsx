import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Coins } from 'lucide-react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export function CoinChip({ amount }: { amount: number }) {
  const { colors: c } = useAppTheme();
  return (
    <View style={[styles.chip, { backgroundColor: c.warning }]}>
      <Coins size={14} color="#FFFFFF" />
      <Text style={styles.text}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
