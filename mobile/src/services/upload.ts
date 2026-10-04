import { Platform } from 'react-native';
import { api } from './api';

/**
 * Sube una imagen al backend (campo "image") y devuelve la URL servida.
 *
 * En la web se envía el blob con su nombre de archivo. En Android e iOS React Native solo arma bien la parte del archivo
 * cuando recibe un objeto `{ uri, name, type }`: un Blob sin nombre viaja como un campo de texto, el servidor no encuentra
 * el archivo y responde «No se recibió ninguna imagen» (por eso no se podía cambiar la foto de perfil ni el logo).
 */
export async function uploadImage(uri: string, endpoint: string): Promise<string> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    form.append('image', blob, 'foto.jpg');
  } else {
    const ext = (uri.split('?')[0].split('.').pop() ?? 'jpg').toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const name = `foto.${ext === 'png' || ext === 'webp' ? ext : 'jpg'}`;
    form.append('image', { uri, name, type } as unknown as Blob);
  }
  const { data } = await api.post(endpoint, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (body) => body,
    timeout: 60000,
  });
  return data.data.url;
}
