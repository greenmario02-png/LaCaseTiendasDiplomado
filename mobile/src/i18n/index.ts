import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import es from '../locales/es.json';
import qu from '../locales/qu.json';
import ay from '../locales/ay.json';
import gn from '../locales/gn.json';
import en from '../locales/en.json';
import pt from '../locales/pt.json';
import languages from '../locales/languages.json';

export const SUPPORTED_LANGUAGES = languages as Record<
  string,
  { name: string; nativeName: string; status: 'stable' | 'stub'; isDefault?: boolean }
>;

const STORAGE_KEY = 'lacase_lang';

/**
 * Mismo scaffold que `frontend/src/locales/` (ver su README) adaptado a React Native: sin
 * `i18next-browser-languagedetector` (no hay `navigator`/`localStorage`), el idioma persiste
 * en AsyncStorage y se restaura con `loadPersistedLanguage()` al iniciar la app.
 */
i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    qu: { translation: qu },
    ay: { translation: ay },
    gn: { translation: gn },
    en: { translation: en },
    pt: { translation: pt },
  },
  lng: 'es',
  fallbackLng: 'es',
  supportedLngs: Object.keys(SUPPORTED_LANGUAGES),
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export async function loadPersistedLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES[saved]) {
      await i18n.changeLanguage(saved);
    }
  } catch {
    /* AsyncStorage no disponible: se queda en español */
  }
}

export async function setLanguage(code: string): Promise<void> {
  await i18n.changeLanguage(code);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* persistencia best-effort */
  }
}

export default i18n;
