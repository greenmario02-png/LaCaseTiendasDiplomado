import { useState } from 'react';
import { IconButton, Menu, MenuItem, Tooltip, ListItemText, Chip } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import { useCurrencyStore } from '../../stores/currencyStore';

// Moneda "natural" de cada idioma — se aplica automáticamente al cambiar de idioma,
// solo si esa moneda existe en el catálogo que devuelve el backend (`/currencies`).
const LANGUAGE_CURRENCY: Record<string, string> = {
  es: 'BOB',
  qu: 'BOB',
  ay: 'BOB',
  gn: 'BOB',
  pt: 'BRL',
  en: 'USD',
};

/**
 * Selector de idioma del navbar. Usa el catálogo de `src/locales/languages.json` —
 * los idiomas "stub" (todavía sin traducción real, ver README de locales) se muestran
 * igual pero marcados, para que quede claro que por ahora renderizan en español.
 * Al cambiar de idioma, también cambia la moneda seleccionada a la moneda "natural"
 * de ese idioma (si el backend la tiene disponible).
 */
export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const currencies = useCurrencyStore((s) => s.currencies);
  const setCurrency = useCurrencyStore((s) => s.setSelected);

  const current = SUPPORTED_LANGUAGES[i18n.language] ?? SUPPORTED_LANGUAGES.es;

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    const targetCurrency = LANGUAGE_CURRENCY[code];
    if (targetCurrency && currencies.some((c) => c.code === targetCurrency)) {
      setCurrency(targetCurrency);
    }
  };

  return (
    <>
      <Tooltip title={`Idioma: ${current.nativeName}`}>
        <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <TranslateIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
          <MenuItem
            key={code}
            selected={code === i18n.language}
            onClick={() => {
              changeLanguage(code);
              setAnchorEl(null);
            }}
          >
            <ListItemText>{lang.nativeName}</ListItemText>
            {lang.status === 'stub' && (
              <Chip label="ES" size="small" variant="outlined" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
