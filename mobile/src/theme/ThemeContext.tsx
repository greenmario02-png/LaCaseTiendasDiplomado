import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { getSilkColors, getNeoShadow, neoSurfaceStyle, type NeoShadow } from './silkTokens';

/** Objeto de colores completo, igual al `colors` exportado de theme/index.ts */
export interface AppColors {
  primary: string;
  primaryDark: string;
  tertiary: string;
  price: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  forumAccent: string;
  forumBg: string;
  forumCard: string;
  forumBorder: string;
  forumInput: string;
  forumText: string;
  forumTextSecondary: string;
  forumMuted: string;
  karmaGold: string;
  karmaUp: string;
  karmaDown: string;
}

export const appColorsLight: AppColors = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  tertiary: '#7C3AED',
  price: '#10B981',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#7C3AED',
  background: '#E8EAF0',
  surface: '#FFFFFF',
  text: '#1F2430',
  textSecondary: '#5A6072',
  border: 'rgba(31,36,48,0.12)',
  forumAccent: '#6366F1',
  forumBg: '#E8EAF0',
  forumCard: '#FFFFFF',
  forumBorder: 'rgba(31,36,48,0.12)',
  forumInput: '#FFFFFF',
  forumText: '#1F2430',
  forumTextSecondary: '#5A6072',
  forumMuted: '#8A90A5',
  karmaGold: '#F59E0B',
  karmaUp: '#10B981',
  karmaDown: '#EF4444',
};

export const appColorsDark: AppColors = {
  primary: '#818CF8',
  primaryDark: '#6366F1',
  tertiary: '#A78BFA',
  price: '#34D399',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#A78BFA',
  background: '#16181D',
  surface: '#1E2028',
  text: '#EDEFF4',
  textSecondary: '#9BA1B0',
  border: 'rgba(255,255,255,0.12)',
  forumAccent: '#818CF8',
  forumBg: '#16181D',
  forumCard: '#1E2028',
  forumBorder: 'rgba(255,255,255,0.12)',
  forumInput: '#1E2028',
  forumText: '#EDEFF4',
  forumTextSecondary: '#9BA1B0',
  forumMuted: '#8A90A5',
  karmaGold: '#FBBF24',
  karmaUp: '#34D399',
  karmaDown: '#F87171',
};

type AppThemeValue = {
  dark: boolean;
  colors: AppColors;
  raised: NeoShadow;
  pressed: NeoShadow;
  surfaceStyle: ReturnType<typeof neoSurfaceStyle>;
};

const AppThemeContext = createContext<AppThemeValue>({
  dark: false,
  colors: appColorsLight,
  raised: getNeoShadow(false, 'raised'),
  pressed: getNeoShadow(false, 'pressed'),
  surfaceStyle: neoSurfaceStyle(false, 'raised'),
});

/**
 * Provee el tema Silk a la app, conectado al modo claro/oscuro del sistema
 * operativo (useColorScheme). Sin provider (tests) cae a claro.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const value = useMemo<AppThemeValue>(
    () => ({
      dark,
      colors: dark ? appColorsDark : appColorsLight,
      raised: getNeoShadow(dark, 'raised'),
      pressed: getNeoShadow(dark, 'pressed'),
      surfaceStyle: neoSurfaceStyle(dark, 'raised'),
    }),
    [dark],
  );
  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeValue {
  return useContext(AppThemeContext);
}

export default AppThemeContext;
