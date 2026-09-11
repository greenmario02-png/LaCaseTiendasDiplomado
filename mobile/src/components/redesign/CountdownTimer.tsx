import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export interface CountdownTimerProps {
  target: number;
  onEnd?: () => void;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function CountdownTimer({ target, onEnd }: CountdownTimerProps) {
  const { colors: c } = useAppTheme();
  const [left, setLeft] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      const v = Math.max(0, target - Date.now());
      setLeft(v);
      if (v === 0 && onEnd) onEnd();
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  return (
    <View style={[styles.chip, { backgroundColor: c.warning }]}>
      <Text style={styles.text}>{`${pad(d)}:${pad(h)}:${pad(m)}:${pad(sec)}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, fontVariant: ['tabular-nums'] },
});
