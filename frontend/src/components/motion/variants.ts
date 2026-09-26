import type { Variants, Transition } from 'framer-motion';

/**
 * Sistema de animación compartido (Framer Motion) — variantes reusables para que toda la
 * app anime de forma consistente en vez de que cada página invente su propia curva/tiempo.
 * Import desde acá, no declares variants sueltas por componente salvo un caso muy puntual.
 */

export const EASE = [0.16, 1, 0.3, 1] as const; // "easeOutExpo"-ish, se siente rápido y suave

export const fadeUpTransition: Transition = { duration: 0.35, ease: EASE };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: fadeUpTransition },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25, ease: EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: EASE } },
};

/** Contenedor de lista: los hijos con variants=`staggerItem` entran en cascada. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

export const staggerItem: Variants = fadeUp;

/** Hover/tap estándar para tarjetas clicleables (productos, posts, entradas de memes). */
export const cardHover = {
  whileHover: { y: -4, scale: 1.01, transition: { duration: 0.18, ease: EASE } },
  whileTap: { scale: 0.98 },
};

/** Hover/tap estándar para botones/íconos pequeños (navbar, chips de acción). */
export const tapScale = {
  whileHover: { scale: 1.06 },
  whileTap: { scale: 0.92 },
};
