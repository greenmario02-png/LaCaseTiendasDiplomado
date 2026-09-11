import type { ViewStyle } from 'react-native';

/**
 * Tokens del sistema de diseño "Silk Neomorphic / Soft UI" (móvil) — basado en
 * silk/DESIGN.md de Stitch, adaptado al contexto de pctienda. Temas claro y oscuro.
 * Iconos: solo lucide-react-native (nunca IA de Stitch).
 */

export interface SilkColors {
  primary: string;
  primaryDark: string;
  tertiary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  success: string;
  warning: string;
  error: string;
  border: string;
}

export const silkLight: SilkColors = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  tertiary: '#7C3AED',
  background: '#E8EAF0',
  surface: '#E8EAF0',
  text: '#1F2430',
  textSecondary: '#5A6072',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: 'rgba(255,255,255,0.55)',
};

export const silkDark: SilkColors = {
  primary: '#818CF8',
  primaryDark: '#6366F1',
  tertiary: '#A78BFA',
  background: '#16181D',
  surface: '#16181D',
  text: '#EDEFF4',
  textSecondary: '#9BA1B0',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  border: 'rgba(255,255,255,0.06)',
};

export function getSilkColors(darkMode: boolean): SilkColors {
  return darkMode ? silkDark : silkLight;
}

export interface NeoShadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

/**
 * Sombra neomórfica para React Native (el inset real no existe en RN; se simula
 * con menor elevación y offset). raised = extruido, pressed = hundido.
 */
export function getNeoShadow(darkMode: boolean, variant: 'raised' | 'pressed' = 'raised'): NeoShadow {
  const base = darkMode ? '#000000' : '#000000';
  if (variant === 'pressed') {
    return {
      shadowColor: base,
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: darkMode ? 0.14 : 0.06,
      shadowRadius: 4,
      elevation: 0,
    };
  }
  return {
    shadowColor: base,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: darkMode ? 0.18 : 0.12,
    shadowRadius: 12,
    elevation: 6,
  };
}

export function neoSurfaceStyle(darkMode: boolean, variant: 'raised' | 'pressed' = 'raised'): ViewStyle {
  return {
    backgroundColor: getSilkColors(darkMode).surface,
    borderRadius: 14,
    ...getNeoShadow(darkMode, variant),
  };
}
