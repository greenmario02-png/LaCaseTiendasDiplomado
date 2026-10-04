import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cardHover } from './variants';

interface Props {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Envoltorio para tarjetas clickeables (producto, post del foro, entrada de memes,
 * tema): leve elevación al hover, achique al tap. Pon esto AFUERA del `Card`
 * de MUI (no adentro), así la animación mueve toda la tarjeta.
 */
export function MotionCard({ children, className, style }: Props) {
  return (
    <motion.div className={className} style={style} {...cardHover}>
      {children}
    </motion.div>
  );
}
