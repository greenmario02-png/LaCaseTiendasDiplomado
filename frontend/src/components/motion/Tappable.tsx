import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { tapScale } from './variants';

/**
 * Envoltorio para botones/íconos chicos (navbar, chips de voto, acciones de tarjeta):
 * leve agrandado al hover, achique al tap — el mismo micro-feedback en toda la app en vez
 * de que cada botón reinvente su propia animación.
 *
 * Reenvía ref y el resto de los props (`...rest`) porque suele usarse como hijo directo de
 * `Tooltip` de MUI, que clona su hijo e inyecta `onMouseEnter`/`onFocus`/`aria-*`/ref —
 * sin ese reenvío el tooltip deja de funcionar silenciosamente.
 */
export const Tappable = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(
  function Tappable({ children, style, ...rest }, ref) {
    return (
      <motion.div
        ref={ref}
        style={{ display: 'inline-flex', ...style }}
        {...tapScale}
        {...rest}
      >
        {children}
      </motion.div>
    );
  },
);
