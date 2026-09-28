import { useState } from 'react';
import { IconButton, Menu, MenuItem, Tooltip, ListItemText, Chip } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../i18n';

/**
 * Selector de idioma del navbar. Usa el catálogo de `src/locales/languages.json` —
 * los idiomas "stub" (todavía sin traducción real, ver README de locales) se muestran
 * igual pero marcados, para que quede claro que por ahora renderizan en español.
 */
export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const current = SUPPORTED_LANGUAGES[i18n.language] ?? SUPPORTED_LANGUAGES.es;

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
              i18n.changeLanguage(code);
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
