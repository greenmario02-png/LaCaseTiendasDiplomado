import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { fadeUp } from './variants';

interface Props {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/** Fade + leve subida al montar — para encabezados, banners, bloques que aparecen solos. */
export function FadeIn({ children, delay = 0, className }: Props) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
