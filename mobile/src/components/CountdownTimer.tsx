import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';

function diff(target: string): { d: number; h: number; m: number; s: number; done: boolean } {
  const t = new Date(target).getTime() - Date.now();
  if (t <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true };
  const s = Math.floor(t / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    done: false,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Countdown reutilizable (promos, subastas). Modo compacto para tarjetas. */
export default function CountdownTimer({ targetDate, compact = false }: { targetDate: string; compact?: boolean }) {
  const { colors } = useAppTheme();

  const [t, setT] = useState(() => diff(targetDate));

  useEffect(() => {
    const iv = setInterval(() => setT(diff(targetDate)), 1000);
    return () => clearInterval(iv);
  }, [targetDate]);

  if (t.done) {
    return <Text style={compact ? styles.doneCompact : styles.done}>Finalizado</Text>;
  }

  if (compact) {
    return <Text style={styles.compactText}>⏳ {t.d > 0 ? `${t.d}d ` : ''}{pad(t.h)}:{pad(t.m)}:{pad(t.s)}</Text>;
  }

  const boxes: { label: string; value: number }[] = [
    { label: 'días', value: t.d },
    { label: 'horas', value: t.h },
    { label: 'min', value: t.m },
    { label: 'seg', value: t.s },
  ];

  return (
    <View style={styles.row}>
      {boxes.map((b) => (
        <View key={b.label} style={styles.box}>
          <Text style={styles.boxValue}>{pad(b.value)}</Text>
          <Text style={styles.boxLabel}>{b.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  box: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', minWidth: 44 },
  boxValue: { color: '#fff', fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  boxLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '600', marginTop: 1 },
  done: { color: colors.textSecondary, fontWeight: '700' },
  doneCompact: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  compactText: { color: colors.primary, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
