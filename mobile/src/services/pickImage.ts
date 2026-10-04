import * as ImagePicker from 'expo-image-picker';

/**
 * Abre la galería y devuelve la uri local de la imagen elegida (o null si se cancela).
 *
 * No se pide el permiso de la biblioteca de medios antes de abrir: en Android 13 o superior el selector de fotos del sistema
 * no lo necesita, y la app no declara READ_MEDIA_IMAGES, así que esa solicitud devolvía «denegado» sin posibilidad de volver a
 * preguntar y el selector nunca se abría (la foto de perfil y el logo de la tienda no se podían cambiar).
 */
export async function pickImageFromLibrary(square = true): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: square ? [1, 1] : [16, 10],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
}
