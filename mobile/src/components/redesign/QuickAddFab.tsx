import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';

export interface QuickAddFabProps {
  label: string;
  onPress: () => void;
  testID?: string;
}

/** Botón flotante de acción rápida (por ejemplo «Nuevo producto»): queda fijo abajo a la derecha, sobre el contenido. */
export function QuickAddFab({ label, onPress, testID }: QuickAddFabProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: colors.primary, bottom: 16 + insets.bottom, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Plus size={22} color="#fff" />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    minHeight: 52,
    borderRadius: 26,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  label: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
