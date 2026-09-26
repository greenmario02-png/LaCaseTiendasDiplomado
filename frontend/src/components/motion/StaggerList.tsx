import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { staggerContainer, staggerItem } from './variants';

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Grillas/listas que entran en cascada (productos, posts del foro, entradas del Cono de
 * la Vergüenza). Envolvé el contenedor con `StaggerContainer` y cada tarjeta con
 * `StaggerItem` — no hace falta orquestar el delay a mano, lo maneja Framer Motion.
 */
export function StaggerContainer({ children, className }: ContainerProps) {
  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className={className}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: ContainerProps) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}
