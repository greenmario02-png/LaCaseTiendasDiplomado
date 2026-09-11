import React from 'react';
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
  MessageCircleQuestionMark,
} from 'lucide-react-native';

/**
 * Mapeo de slug de categoría/subforo → icono Lucide (librería de iconos del sistema).
 * Reemplaza los emojis que estaban en la BD. Las categorías sin slug conocido
 * caen en `MessageCircleQuestionMark`.
 */
const FORUM_CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
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

interface CategoryIconProps {
  slug?: string | null;
  size?: number;
  color?: string;
}

/**
 * Componente React Native que renderiza el icono Lucide de una categoría del foro.
 * Reemplaza los emojis de categoría que venían de la BD.
 */
export function CategoryIcon({ slug, size = 14, color }: CategoryIconProps) {
  const Icon = (slug && FORUM_CATEGORY_ICONS[slug]) || MessageCircleQuestionMark;
  return <Icon size={size} color={color} />;
}
