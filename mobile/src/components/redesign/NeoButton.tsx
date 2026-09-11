import React from 'react';
import { Pressable, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export interface NeoButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle;
}

export function NeoButton({ title, onPress, variant = 'primary', disabled, testID, style }: NeoButtonProps) {
  const { colors: c, raised, pressed } = useAppTheme();

  const bg =
    variant === 'primary' ? c.primary : variant === 'secondary' ? c.warning : 'transparent';
  const fg = variant === 'primary' ? '#FFFFFF' : variant === 'secondary' ? '#FFFFFF' : c.primary;
  const border = variant === 'ghost' ? { borderWidth: 1, borderColor: c.primary } : {};

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed: p }) => [
        styles.base,
        { backgroundColor: bg },
        border,
        !disabled && (p ? { ...pressed } : { ...raised }),
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      <Text style={[styles.label, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
});
