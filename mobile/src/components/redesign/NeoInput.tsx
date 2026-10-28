import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, StyleSheet, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
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
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  autoCorrect?: boolean;
  textContentType?: TextInputProps['textContentType'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
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
  autoCapitalize,
  autoComplete,
  autoCorrect,
  textContentType,
  returnKeyType,
  onSubmitEditing,
}: NeoInputProps) {
  const { colors: c, pressed } = useAppTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.textSecondary}
          secureTextEntry={secureTextEntry && !visible}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          style={[styles.input, { backgroundColor: c.surface, color: c.text, ...pressed }, secureTextEntry && styles.inputWithToggle]}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setVisible((v) => !v)}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {visible ? <EyeOff size={20} color={c.textSecondary} /> : <Eye size={20} color={c.textSecondary} />}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  inputRow: { position: 'relative', justifyContent: 'center' },
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  inputWithToggle: { paddingRight: 46 },
  toggle: { position: 'absolute', right: 14 },
});
