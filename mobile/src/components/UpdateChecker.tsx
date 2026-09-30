import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import Constants from 'expo-constants';

import { api } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';

interface VersionInfo {
  latestVersion: string;
  apkUrl: string;
  mandatory: boolean;
  notes?: string;
}

/** Compara versiones "1.2.0" estilo semver simple (sin pre-release). */
function isNewer(remote: string, local: string): boolean {
  const r = remote.split('.').map(Number);
  const l = local.split('.').map(Number);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const rv = r[i] ?? 0;
    const lv = l[i] ?? 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false;
}

/**
 * Consulta GET /api/app-version al iniciar la app (sin requerir sesión) y, si hay una versión
 * más nueva que la instalada, muestra un aviso con botón para descargar el APK. La app no está
 * en Play Store, así que no hay actualización automática del sistema — esto reemplaza el
 * "avisale manualmente al usuario" que se hacía antes por fuera de la app.
 */
export default function UpdateChecker() {
  const { colors } = useAppTheme();
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const currentVersion = Constants.expoConfig?.version ?? '0.0.0';
    api
      .get('/app-version')
      .then((res) => {
        const data: VersionInfo | undefined = res.data?.data;
        if (data && isNewer(data.latestVersion, currentVersion)) {
          setInfo(data);
        }
      })
      .catch(() => {
        // Sin conexión o endpoint no disponible: no bloquea el uso de la app.
      });
  }, []);

  if (!info || (dismissed && !info.mandatory)) return null;

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Nueva versión disponible</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {info.notes || `Hay una nueva versión (${info.latestVersion}) de la aplicación.`}
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => Linking.openURL(info.apkUrl)}
          >
            <Text style={styles.primaryButtonText}>Descargar actualización</Text>
          </TouchableOpacity>
          {!info.mandatory && (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setDismissed(true)}>
              <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Después</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { borderRadius: 16, padding: 20, width: '100%', maxWidth: 360 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  body: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  primaryButton: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { marginTop: 10, alignItems: 'center' },
  secondaryButtonText: { fontSize: 14 },
});
