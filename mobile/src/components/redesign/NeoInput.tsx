import React from 'react';
import { Text, TextInput, View, StyleSheet, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export interface NeoInputProps {
  label?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  testID?: string;
  style?: StyleProp<ViewStyle>;
  multiline?: boolean;
}

export function NeoInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  testID,
  style,
  multiline,
}: NeoInputProps) {
  const { colors: c, pressed } = useAppTheme();

  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text> : null}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textSecondary}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, { backgroundColor: c.surface, color: c.text, ...pressed }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
  },
});
