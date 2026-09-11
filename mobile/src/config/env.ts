import { Platform } from 'react-native';

/**
 * URL del backend desplegado (producción). Se usa en cualquier build que no sea de
 * desarrollo (incluye el APK Release).
 */
const PROD_API_URL = 'https://lacase-backend.onrender.com/api';
const PROD_SOCKET_URL = 'https://lacase-backend.onrender.com';

/**
 * URL del backend en desarrollo local.
 * - Web (Expo web / navegador): usa localhost contra el backend local.
 * - Emulador Android: "localhost" del host es 10.0.2.2.
 * - Teléfono físico: reemplazá con la IP de tu PC en la red local.
 */
const HOST = Platform.OS === 'web' ? 'localhost' : '192.168.100.7';
const DEV_API_URL = `http://${HOST}:3000/api`;
const DEV_SOCKET_URL = `http://${HOST}:3000`;

export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
export const SOCKET_URL = __DEV__ ? DEV_SOCKET_URL : PROD_SOCKET_URL;
