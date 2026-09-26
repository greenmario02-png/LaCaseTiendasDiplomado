import { createTheme, ThemeOptions } from '@mui/material/styles';
import { getUnifiedTokens, type UnifiedTokens } from './theme/unifiedTokens';
import { useThemeStore } from './stores/themeStore';

export const colors = {
  primary: '#f0320a',
  price: '#4675b9',
  success: '#00d12a',
  error: '#f40025',
  alert: '#ffb800',
};

export { unifiedLight, unifiedDark, getUnifiedTokens, KARMA_LEVELS } from './theme/unifiedTokens';
export type { UnifiedTokens, KarmaLevel, KarmaBadgeTokens } from './theme/unifiedTokens';

/** Tokens del sistema "Unified" que reaccionan al modo oscuro real de la app (useThemeStore). */
export function useUnifiedTokens(): UnifiedTokens {
  const darkMode = useThemeStore((s) => s.darkMode);
  return getUnifiedTokens(darkMode);
}

const baseTheme: ThemeOptions = {
  typography: {
    fontFamily: "'Montserrat', 'Segoe UI', sans-serif",
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        },
      },
    },
  },
};

export function buildTheme(darkMode: boolean) {
  const tokens = getUnifiedTokens(darkMode);
  return createTheme({
    ...baseTheme,
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: tokens.primary },
      // En el esquema oscuro `secondaryContainer` es un tono de fondo apagado (pensado para
      // chips/tags, no para relleno de botón); el tono vibrante para CTA en modo oscuro es
      // `secondary`. En claro es al revés: `secondaryContainer` ya es el tono vibrante.
      secondary: darkMode
        ? { main: tokens.secondary, contrastText: '#3D2E0F' }
        : { main: tokens.secondaryContainer, contrastText: tokens.onSecondary },
      success: { main: tokens.tertiaryContainer, contrastText: tokens.onTertiary },
      error: { main: tokens.error },
      warning: darkMode ? { main: tokens.secondary, contrastText: '#3D2E0F' } : { main: tokens.secondaryContainer },
      background: { default: tokens.background, paper: darkMode ? tokens.surface : tokens.surfaceContainerLowest },
      text: { primary: tokens.onSurface, secondary: tokens.onSurfaceVariant },
      divider: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)',
    },
  });
}
