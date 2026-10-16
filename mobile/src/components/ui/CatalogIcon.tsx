import React from 'react';
import {
  Briefcase, Car, ChefHat, Construction, Folder, GraduationCap, Hammer, Monitor, Palette, PartyPopper, PenTool,
  Scissors, Shapes, Shield, ShoppingBag, SprayCan, Stethoscope, Truck, Wrench,
  type LucideIcon,
} from 'lucide-react-native';
import { useAppTheme } from '../../theme/ThemeContext';

/**
 * Íconos de catálogo (categorías de empleo) para la app móvil.
 *
 * El campo `icon` guarda una CLAVE semántica (ej. 'tech', 'delivery') y aquí se dibuja con lucide-react-native: nunca
 * se muestra como texto ni como emoji. `LEGACY_EMOJI` traduce los emojis que versiones anteriores guardaron en la BD;
 * está escrito con escapes \u{...} para que la prueba `src/test/noDecorativeEmoji.test.ts` no marque este archivo.
 */
const ICONS: Record<string, LucideIcon> = {
  sales: ShoppingBag,
  delivery: Truck,
  office: Folder,
  chef: ChefHat,
  construction: Construction,
  tech: Monitor,
  cleaning: SprayCan,
  design: PenTool,
  education: GraduationCap,
  security: Shield,
  work: Briefcase,
  handyman: Hammer,
  tools: Wrench,
  vehicle: Car,
  beauty: Scissors,
  health: Stethoscope,
  event: PartyPopper,
  craft: Palette,
  category: Shapes,
};

/** Claves que el servidor acepta para una categoría de empleo (las del seed). */
export const JOB_CATEGORY_ICON_KEYS = ['sales', 'delivery', 'office', 'chef', 'construction', 'tech', 'cleaning', 'design', 'education', 'security', 'work'] as const;

/** Emojis guardados por versiones anteriores en la BD -> clave. Escapados a propósito (ver comentario de arriba). */
const LEGACY_EMOJI: Record<string, string> = {
  '\u{1F6E0}': 'handyman',
  '\u{1F4BB}': 'tech',
  '\u{1F3A8}': 'design',
  '\u{1F4DA}': 'education',
  '\u{1F697}': 'vehicle',
  '\u{1F487}': 'beauty',
  '\u{1F9F9}': 'cleaning',
  '\u{1F389}': 'event',
  '\u{1FA7A}': 'health',
  '\u{1F9F6}': 'craft',
  '\u{1F6CD}': 'sales',
  '\u{1F69A}': 'delivery',
  '\u{1F5C2}': 'office',
  '\u{1F373}': 'chef',
  '\u{1F527}': 'tools',
  '\u{1F6E1}': 'security',
  '\u{1F4BC}': 'work',
  '\u{1F3D7}': 'construction',
  '\u{1F477}': 'construction',
};

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** Resuelve el valor guardado (clave o emoji heredado) a una clave conocida; si no, `fallback`. */
export function catalogIconKey(value: string | null | undefined, fallback: string | null = 'category'): string | null {
  const v = (value ?? '').trim();
  if (!v) return fallback;
  if (has(ICONS, v)) return v;
  const lower = v.toLowerCase();
  if (has(ICONS, lower)) return lower;
  const stripped = v.replace(/[\u{FE0E}\u{FE0F}\u{200D}]/gu, '');
  const first = String.fromCodePoint(stripped.codePointAt(0) ?? 0);
  if (has(LEGACY_EMOJI, stripped)) return LEGACY_EMOJI[stripped];
  if (has(LEGACY_EMOJI, first)) return LEGACY_EMOJI[first];
  return fallback;
}

export interface CatalogIconProps {
  value: string | null | undefined;
  /** Clave a usar si `value` no se reconoce; `null` = no dibujar nada. */
  fallback?: string | null;
  size?: number;
  color?: string;
  testID?: string;
}

/** Ícono decorativo: oculto para lectores de pantalla porque el texto de la etiqueta va al lado. */
export function CatalogIcon({ value, fallback = 'category', size = 16, color, testID }: CatalogIconProps) {
  const { colors } = useAppTheme();
  const key = catalogIconKey(value, fallback);
  if (!key || !has(ICONS, key)) return null;
  const Icon = ICONS[key];
  return (
    <Icon
      size={size}
      color={color ?? colors.textSecondary}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      testID={testID ?? `catalog-icon-${key}`}
    />
  );
}

export default CatalogIcon;
