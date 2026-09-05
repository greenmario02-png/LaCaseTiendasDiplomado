/**
 * Tokens del sistema de diseño "LaCase Unified" (web) — basado en el diseño
 * lacase_unified_system/DESIGN.md de Stitch, adaptado al contexto de pctienda.
 * Temas claro y oscuro. Iconos: solo @mui/icons-material (nunca IA de Stitch).
 */

export const KARMA_LEVELS = ['Novato', 'Colaborador', 'Activo', 'Experto', 'Maestro', 'Leyenda'] as const;

export type KarmaLevel = (typeof KARMA_LEVELS)[number];

export interface KarmaBadgeTokens {
  bg: string;
  text: string;
  /** gradiente CSS para la insignia Leyenda (indigo → violeta) */
  gradient?: string;
}

export interface UnifiedTokens {
  primary: string;
  primaryContainer: string;
  onPrimary: string;
  secondary: string;
  secondaryContainer: string;
  onSecondary: string;
  tertiary: string;
  tertiaryContainer: string;
  onTertiary: string;
  error: string;
  errorContainer: string;
  surface: string;
  surfaceContainerLowest: string;
  background: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  cardShadow: string;
  karmaBadges: Record<KarmaLevel, KarmaBadgeTokens>;
}

export const unifiedLight: UnifiedTokens = {
  primary: '#4F46E5',
  primaryContainer: '#3525CD',
  onPrimary: '#FFFFFF',
  secondary: '#855300',
  secondaryContainer: '#FEA619',
  onSecondary: '#FFFFFF',
  tertiary: '#005338',
  tertiaryContainer: '#006E4B',
  onTertiary: '#FFFFFF',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  surface: '#F7F9FB',
  surfaceContainerLowest: '#FFFFFF',
  background: '#F8FAFC',
  onSurface: '#191C1E',
  onSurfaceVariant: '#464555',
  outline: '#777587',
  cardShadow: '0px 4px 20px rgba(15, 23, 42, 0.05)',
  karmaBadges: {
    Novato: { bg: '#E3F2FD', text: '#1565C0' },
    Colaborador: { bg: '#E8F5E9', text: '#2E7D32' },
    Activo: { bg: '#E8EAF6', text: '#3949AB' },
    Experto: { bg: '#FFF8E1', text: '#F57F17' },
    Maestro: { bg: '#FCE4EC', text: '#C2185B' },
    Leyenda: { bg: '#EDE9FE', text: '#5B21B6', gradient: 'linear-gradient(135deg, #4F46E5, #7C3AED)' },
  },
};

export const unifiedDark: UnifiedTokens = {
  primary: '#B8B2FF',
  primaryContainer: '#3525CD',
  onPrimary: '#221D6E',
  secondary: '#FEC759',
  secondaryContainer: '#855300',
  onSecondary: '#FFFFFF',
  tertiary: '#7AD7B1',
  tertiaryContainer: '#005338',
  onTertiary: '#FFFFFF',
  error: '#FFB4AB',
  errorContainer: '#93000A',
  surface: '#121318',
  surfaceContainerLowest: '#0F0F14',
  background: '#0F0F14',
  onSurface: '#E6E1E5',
  onSurfaceVariant: '#CAC4D0',
  outline: '#8E9099',
  cardShadow: '0px 4px 20px rgba(0, 0, 0, 0.4)',
  karmaBadges: {
    Novato: { bg: '#1E3A5F', text: '#90CAF9' },
    Colaborador: { bg: '#1B3A2A', text: '#A5D6A7' },
    Activo: { bg: '#232B5E', text: '#9FA8DA' },
    Experto: { bg: '#3D2E0F', text: '#FFE082' },
    Maestro: { bg: '#3D1524', text: '#F48FB1' },
    Leyenda: { bg: '#2B2357', text: '#C4B5FD', gradient: 'linear-gradient(135deg, #6366F1, #8B5CF6)' },
  },
};

export function getUnifiedTokens(darkMode: boolean): UnifiedTokens {
  return darkMode ? unifiedDark : unifiedLight;
}
