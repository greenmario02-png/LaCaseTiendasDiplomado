import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { useAppTheme } from '../../theme/ThemeContext';
import { BOLIVIA_DEPARTMENTS, canonicalDepartment } from '../../services/boliviaDepartments';

/**
 * Selector de DEPARTAMENTO de Bolivia: los 9 a la vista como botones (sin escribir ni buscar), uno elegido a la vez.
 * Usa la misma lista que valida el servidor y la web, así nunca se guarda un valor fuera de catálogo.
 * Botones de 44 dp mínimo, rol "radio" y estado elegido anunciado.
 */
export function DepartmentPicker({
  value,
  onChange,
  label,
  error,
  testID = 'department-picker',
}: {
  value: string;
  onChange: (department: string) => void;
  label: string;
  error?: string | null;
  testID?: string;
}) {
  const { colors: c } = useAppTheme();
  const selected = canonicalDepartment(value);
  return (
    <View style={styles.wrap} testID={testID} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      <View style={styles.grid}>
        {BOLIVIA_DEPARTMENTS.map((d) => {
          const on = selected === d;
          return (
            <Pressable
              key={d}
              testID={`${testID}-${d}`}
              accessibilityRole="radio"
              accessibilityLabel={d}
              accessibilityState={{ selected: on, checked: on }}
              onPress={() => onChange(d)}
              style={({ pressed }) => [
                styles.chip,
                { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primary : c.surface },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.chipText, { color: on ? '#fff' : c.text }]}>{d}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text style={[styles.error, { color: c.error }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 14, fontWeight: '600' },
  error: { fontSize: 12, marginTop: 6 },
});
