import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from './api';

// En foreground, mostrar la notificación como banner sin sonido agresivo.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Pide permisos y registra el token de push del dispositivo en el backend
 * (`PUT /api/account/push-token`). Solo aplica en dispositivos nativos
 * (expo-notifications no está soportado en web). Nunca lanza: falla silencioso.
 */
export async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    let token: string | null = null;
    try {
      // En proyectos sin EAS el projectId puede faltar; si ocurre, se cae a device token.
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (projectId) {
        const res = await Notifications.getExpoPushTokenAsync({ projectId });
        token = res.data;
      }
    } catch {
      // fallback: token de dispositivo nativo (no válido para Expo Push Service,
      // pero queda guardado para diagnóstico / futura integración FCM).
      try {
        const res = await Notifications.getDevicePushTokenAsync();
        token = res.data;
      } catch {
        token = null;
      }
    }

    if (token) {
      await api.put('/account/push-token', { pushToken: token });
    }
  } catch {
    // El registro de push nunca debe romper el login/init de la app.
  }
}

/** Quita el token registrado del backend (al cerrar sesión). */
export async function clearPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await api.put('/account/push-token', { pushToken: '' });
  } catch {
    // silencioso
  }
}

/**
 * Suscriptor de notificaciones: recibe un callback al tocar una notificación.
 * Devuelve una función de limpieza.
 */
export function onNotificationResponse(callback: (data: Record<string, unknown>) => void): () => void {
  if (Platform.OS === 'web') return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    callback((response.notification.request.content.data ?? {}) as Record<string, unknown>);
  });
  return () => sub.remove();
}
