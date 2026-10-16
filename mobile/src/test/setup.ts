/// <reference types="jest" />
// AsyncStorage no tiene módulo nativo en jest: se usa el doble en memoria que trae el propio paquete.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
