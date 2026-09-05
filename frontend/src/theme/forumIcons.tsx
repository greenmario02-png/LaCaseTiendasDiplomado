import type { LucideIcon } from 'lucide-react';
import {
  BadgeDollarSign,
  Boxes,
  HeartPulse,
  Cpu,
  ShoppingCart,
  Wrench,
  GraduationCap,
  Bus,
  UtensilsCrossed,
  Scale,
  Briefcase,
  House,
  KeyRound,
  MapPin,
  MessagesSquare,
  Car,
  PawPrint,
  Sofa,
  Shirt,
  Baby,
  Palette,
  Music2,
  BookOpenCheck,
  PartyPopper,
  HandHeart,
  MessageCircleQuestion,
} from 'lucide-react';

/**
 * Mapeo de slug de categoría/subforo → icono Lucide (librería de iconos del sistema).
 * Reemplaza los emojis que estaban en la BD. Las categorías sin slug conocido
 * caen en `MessageCircleQuestion`.
 */
const FORUM_CATEGORY_ICONS: Record<string, LucideIcon> = {
  'precio-producto': BadgeDollarSign,
  'existencia-stock': Boxes,
  salud: HeartPulse,
  tecnologia: Cpu,
  comercio: ShoppingCart,
  servicios: Wrench,
  educacion: GraduationCap,
  transporte: Bus,
  gastronomia: UtensilsCrossed,
  legal: Scale,
  empleos: Briefcase,
  alquileres: House,
  anticreticos: KeyRound,
  direcciones: MapPin,
  general: MessagesSquare,
  vehiculos: Car,
  mascotas: PawPrint,
  hogar: Sofa,
  moda: Shirt,
  bebes: Baby,
  aficiones: Palette,
  libros: Music2,
  clases: BookOpenCheck,
  eventos: PartyPopper,
  comunidad: HandHeart,
};

export function categoryIcon(slug?: string | null): LucideIcon {
  if (slug && FORUM_CATEGORY_ICONS[slug]) return FORUM_CATEGORY_ICONS[slug];
  return MessageCircleQuestion;
}

interface CategoryIconProps {
  slug?: string | null;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

/**
 * Componente React que renderiza el icono Lucide de una categoría del foro.
 * Acceso directo al map (resolución estática, sin funciones invocadas en render).
 */
export function CategoryIcon({ slug, size = 14, strokeWidth = 2.2, color }: CategoryIconProps) {
  const Icon = (slug && FORUM_CATEGORY_ICONS[slug]) || MessageCircleQuestion;
  return <Icon size={size} strokeWidth={strokeWidth} color={color} />;
}
