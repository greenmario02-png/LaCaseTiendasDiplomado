import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { resolveImageUrl } from '../services/api';

interface Props {
  label?: string;
  currentUri?: string | null;
  onPicked: (uri: string) => void;
  square?: boolean;
  uploading?: boolean;
}

/**
 * Botón que abre la galería/cámara (expo-image-picker) y devuelve la uri local
 * de la imagen elegida. El upload lo hace la pantalla con `uploadImage()`.
 */
export default function ImagePickerButton({ label = 'Elegir imagen', currentUri, onPicked, square, uploading }: Props) {
  const { colors } = useAppTheme();

  const pick = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted && !perm.canAskAgain) {
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: square ? [1, 1] : [16, 10],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        onPicked(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('ImagePicker error:', e);
    }
  };

  const src = currentUri ? (currentUri.startsWith('file:') || currentUri.startsWith('blob:') ? currentUri : resolveImageUrl(currentUri)) : null;

  return (
    <View style={styles.container}>
      {src ? (
        <Image source={{ uri: src }} style={[styles.preview, square ? styles.previewSquare : styles.previewLandscape]} resizeMode="cover" />
      ) : (
        <View style={[styles.preview, square ? styles.previewSquare : styles.previewLandscape, styles.placeholder]}>
          <Text style={styles.placeholderText}>Sin imagen</Text>
        </View>
      )}
      <TouchableOpacity style={styles.button} onPress={pick} disabled={uploading}>
        {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>{label}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  preview: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSquare: { aspectRatio: 1, maxWidth: 160 },
  previewLandscape: { aspectRatio: 16 / 10, maxWidth: 260 },
  placeholder: { borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  placeholderText: { color: colors.textSecondary, fontSize: 13 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'stretch',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
