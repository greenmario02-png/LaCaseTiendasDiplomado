/**
 * Doble del módulo nativo de fetch de Expo para jest.
 *
 * jest-expo busca los dobles de los módulos nativos leyendo la pila de llamadas; con paréntesis en la ruta del proyecto
 * («(3 Roles)») la ruta sale mal armada y la búsqueda falla al instalar `fetch` global, antes de correr cualquier prueba.
 * Las pruebas no usan el fetch nativo (las llamadas al API van con axios simulado), así que basta con clases vacías.
 */
class NativeRequest {}
class NativeResponse {}
module.exports = { ExpoFetchModule: { NativeRequest, NativeResponse } };
