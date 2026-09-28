import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import es from '../locales/es.json';
import qu from '../locales/qu.json';
import ay from '../locales/ay.json';
import gn from '../locales/gn.json';
import pt from '../locales/pt.json';
import en from '../locales/en.json';
import languages from '../locales/languages.json';

export const SUPPORTED_LANGUAGES = languages as Record<
  string,
  { name: string; nativeName: string; status: 'stable' | 'stub'; isDefault?: boolean }
>;

/**
 * Conecta el scaffold de `src/locales/` (ver README ahí) a i18next. `en` es copia literal de
 * `es.json` (status "stub" en languages.json) hasta que se traduzca de verdad — mostrar español en
 * vez de una clave sin traducir es preferible a un string roto, así que no hace falta
 * `fallbackLng` distinto por idioma.
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      qu: { translation: qu },
      ay: { translation: ay },
      gn: { translation: gn },
      pt: { translation: pt },
      en: { translation: en },
    },
    fallbackLng: 'es',
    supportedLngs: Object.keys(SUPPORTED_LANGUAGES),
    interpolation: { escapeValue: false }, // React ya escapa por su cuenta
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'lacase_lang',
    },
  });

export default i18n;
