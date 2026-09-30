import "@testing-library/jest-dom/vitest";
import "../i18n"; // inicializa i18next (jsdom trae localStorage/navigator para el LanguageDetector);
// sin esto, useTranslation() lanza NO_I18NEXT_INSTANCE en cualquier componente que lo use.
