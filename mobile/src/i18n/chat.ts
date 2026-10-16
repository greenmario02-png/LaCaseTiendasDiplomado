import i18n from 'i18next';

import es from '../locales/chat/es.json';

/**
 * Textos del chat mejorado bajo `chatx.*`. Solo español: los demás idiomas caen a es (fallbackLng).
 * Se registra al importar este módulo, en un archivo aparte para no tocar los JSON principales de idiomas.
 */
i18n.addResourceBundle('es', 'translation', es, true, false);
