import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { useMoney } from '../../services/money';

export function fmtBs(n: number): string {
  const v = Math.round(n * 100) / 100;
  const [int, dec] = String(v).split('.');
  const withMiles = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec ? `${withMiles},${dec.padEnd(2, '0')}` : withMiles;
}

export interface PriceDisplayProps {
  price: number;
  salePrice?: number | null;
  currency?: string;
  usdPrice?: number | null;
}

/**
 * Precio (guardado en Bs) en la moneda elegida, con su denominación. `currency` fuerza una etiqueta fija SIN convertir
 * (compatibilidad); por defecto se usa el formateador central `useMoney`.
 */
export function PriceDisplay({ price, salePrice, currency, usdPrice }: PriceDisplayProps) {
  const { colors: c } = useAppTheme();
  const money = useMoney();
  const fmt = (n: number) => (currency ? `${currency} ${fmtBs(n)}` : money(n));
  const sale = typeof salePrice === 'number' && salePrice > 0 && salePrice < price;

  return (
    <View style={styles.row}>
      {sale ? (
        <Text style={[styles.sale, { color: c.textSecondary }]}>{fmt(price)}</Text>
      ) : null}
      <Text style={[styles.price, { color: c.success }]}>{fmt(sale ? (salePrice as number) : price)}</Text>
      {usdPrice ? <Text style={[styles.usd, { color: c.textSecondary }]}>{`(~US$ ${fmtBs(usdPrice)})`}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
  price: { fontSize: 17, fontWeight: '700' },
  sale: { fontSize: 13, textDecorationLine: 'line-through' },
  usd: { fontSize: 12 },
});
