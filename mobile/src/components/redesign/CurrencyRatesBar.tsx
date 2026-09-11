import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export type CurrencyRates = {
  usd?: number;
  eur?: number;
  jpy?: number;
  usdt?: number;
};

type Props = {
  rates: CurrencyRates;
};

const ITEMS: { key: keyof CurrencyRates; label: string }[] = [
  { key: 'usd', label: 'USD' },
  { key: 'eur', label: 'EUR' },
  { key: 'jpy', label: 'JPY' },
  { key: 'usdt', label: 'USDT' },
];

export function CurrencyRatesBar({ rates }: Props) {
  const { colors: c } = useAppTheme();

  return (
    <View style={styles.row}>
      {ITEMS.map((it) => {
        const value = rates[it.key];
        if (value === undefined) return null;
        return (
          <View key={it.key} style={[styles.chip, { backgroundColor: `${c.primary}10` }]}>
            <Text style={[styles.chipText, { color: c.primary }]}>
              {it.label} {value.toFixed(2).replace('.', ',')} Bs
            </Text>
          </View>
        );
      })}
      <Pressable onPress={() => {}}>
        <Text style={[styles.link, { color: c.tertiary }]}>Calculadora</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '700' },
  link: { fontSize: 12, fontWeight: '700', paddingVertical: 4, paddingHorizontal: 2 },
});
