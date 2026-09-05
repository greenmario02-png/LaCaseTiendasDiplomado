import type { ReactNode } from 'react';
import { Button, type ButtonProps } from '@mui/material';
import { Link } from 'react-router-dom';
import { getUnifiedTokens } from '../../theme';

interface BaseProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
  startIcon?: ReactNode;
  /** Ruta interna (react-router) — si está presente el botón se renderiza como Link. */
  to?: string;
  /** Color MUI opcional para override puntual (ej. 'warning' en Comprar monedas). */
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'inherit';
}

function baseSx(tokens: ReturnType<typeof getUnifiedTokens>, darkMode: boolean) {
  return {
    minHeight: 44,
    borderRadius: '8px',
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.95rem',
    px: 2.5,
    boxShadow: darkMode ? 'none' : tokens.cardShadow,
  } as const;
}

/** Botón principal sólido índigo (color de marca del rediseño Unified). */
export function PrimaryButton({ children, ...rest }: BaseProps) {
  return <MuiBtn color={rest.color ?? 'primary'} variant="contained" {...rest}>{children}</MuiBtn>;
}

/** Botón secundario ámbar (promos, monedas del proyecto, CTAs secundarios). */
export function SecondaryButton({ children, ...rest }: BaseProps) {
  return <MuiBtn color={rest.color ?? 'secondary'} variant="contained" {...rest}>{children}</MuiBtn>;
}

/** Botón fantasma sin fondo (acciones de bajo énfasis). */
export function GhostButton({ children, ...rest }: BaseProps) {
  return <MuiBtn color={rest.color ?? 'primary'} variant="text" {...rest}>{children}</MuiBtn>;
}

type MuiBtnProps = BaseProps & { color: ButtonProps['color']; variant: 'contained' | 'text' };

function MuiBtn({ children, color, variant, darkMode, sx, to, ...btnProps }: MuiBtnProps & { darkMode?: boolean; sx?: object; to?: string }) {
  const tokens = getUnifiedTokens(darkMode ?? false);
  const merged: ButtonProps = {
    ...btnProps,
    type: btnProps.type ?? 'submit',
    color,
    variant,
    sx: { ...baseSx(tokens, darkMode ?? false), ...(sx ?? {}) },
  };
  if (to) {
    return (
      <Button component={Link} to={to} {...merged}>
        {children}
      </Button>
    );
  }
  return <Button {...merged}>{children}</Button>;
}
