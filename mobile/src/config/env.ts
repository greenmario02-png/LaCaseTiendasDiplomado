import { Platform } from 'react-native';

/**
 * URL base de la API. Se define con EXPO_PUBLIC_API_URL (ver mobile/.env.example).
 * Sin variable: localhost (web / simulador iOS) o 10.0.2.2 (emulador Android).
 */
const FALLBACK_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_URL: string = process.env.EXPO_PUBLIC_API_URL || `http://${FALLBACK_HOST}:3000/api`;
export const SOCKET_URL: string = API_URL.replace(/\/api\/?$/, '');
