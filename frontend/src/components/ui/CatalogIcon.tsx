import type { SvgIconComponent } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material/styles';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import FolderIcon from '@mui/icons-material/Folder';
import SoupKitchenIcon from '@mui/icons-material/SoupKitchen';
import ConstructionIcon from '@mui/icons-material/Construction';
import ComputerIcon from '@mui/icons-material/Computer';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import BrushIcon from '@mui/icons-material/Brush';
import SchoolIcon from '@mui/icons-material/School';
import SecurityIcon from '@mui/icons-material/Security';
import WorkIcon from '@mui/icons-material/Work';

/**
 * Íconos de las categorías de empleo. El servidor guarda CLAVES semánticas (`sales`, `tech`, ...), nunca emojis.
 * Las categorías antiguas que aún guardan un emoji se traducen con el mapa heredado, escrito con escapes \u{...}
 * a propósito (así la prueba de guardia de emojis no lo marca). Cualquier otro valor cae al ícono genérico de trabajo.
 */
const ICONS: Record<string, SvgIconComponent> = {
  sales: ShoppingBagIcon,
  delivery: LocalShippingIcon,
  office: FolderIcon,
  chef: SoupKitchenIcon,
  construction: ConstructionIcon,
  tech: ComputerIcon,
  cleaning: CleaningServicesIcon,
  design: BrushIcon,
  education: SchoolIcon,
  security: SecurityIcon,
  work: WorkIcon,
};

/** Claves válidas (para el selector de administración y pruebas). */
export const CATALOG_ICON_KEYS = Object.keys(ICONS);

/** Emojis guardados por versiones anteriores en la BD -> clave. */
const LEGACY_EMOJI: Record<string, string> = {
  '\u{1F6CD}': 'sales',
  '\u{1F69A}': 'delivery',
  '\u{1F5C2}': 'office',
  '\u{1F373}': 'chef',
  '\u{1F3D7}': 'construction',
  '\u{1F477}': 'construction',
  '\u{1F4BB}': 'tech',
  '\u{1F9F9}': 'cleaning',
  '\u{1F3A8}': 'design',
  '\u{1F4DA}': 'education',
  '\u{1F6E1}': 'security',
  '\u{1F4BC}': 'work',
};

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** Resuelve el valor guardado (clave, emoji heredado o vacío) a una clave conocida; si no, `fallback`. */
export function catalogIconKey(value: string | null | undefined, fallback: string | null = 'work'): string | null {
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
  fontSize?: 'inherit' | 'small' | 'medium' | 'large';
  color?: string;
  sx?: SxProps<Theme>;
}

/** Ícono decorativo (aria-hidden): el nombre de la categoría siempre va al lado como texto. */
export function CatalogIcon({ value, fallback = 'work', fontSize = 'inherit', color, sx }: CatalogIconProps) {
  const key = catalogIconKey(value, fallback);
  if (!key || !has(ICONS, key)) return null;
  const Icon = ICONS[key];
  return (
    <Icon
      aria-hidden="true"
      focusable="false"
      data-icon={key}
      fontSize={fontSize}
      sx={[{ verticalAlign: '-0.15em', color }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    />
  );
}

export default CatalogIcon;
