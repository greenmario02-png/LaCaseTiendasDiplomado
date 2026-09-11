import { api } from './api';

/**
 * Sube una imagen al backend (campo "image") y devuelve la URL servida.
 * Funciona en Android (uri file://) y en web (fetch -> blob).
 */
export async function uploadImage(uri: string, endpoint: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  const form = new FormData();
  form.append('image', blob, 'foto.jpg');
  const { data } = await api.post(endpoint, form);
  return data.data.url;
}
