import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useServidorStore } from '../services/warmup';

/** Franja flotante que avisa mientras la API gratuita despierta (solo aparece si tarda unos segundos). */
export default function ServidorDespertando() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const despertando = useServidorStore((s) => s.despertando);
  if (!despertando) return null;
  return (
    <View pointerEvents="none" style={[styles.contenedor, { bottom: 24 + insets.bottom }]}>
      <View style={styles.franja} accessibilityRole="alert">
        <ActivityIndicator size="small" color="#fff" />
        <Text style={styles.texto}>{t('mobile.server.waking')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  franja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 8,
  },
  texto: { color: '#fff', fontSize: 13, flexShrink: 1 },
});
