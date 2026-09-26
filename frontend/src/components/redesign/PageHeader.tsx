import type { ReactNode } from 'react';
import { Box, Paper, Typography, type PaperProps } from '@mui/material';
import { useUnifiedTokens } from '../../theme';
import { FadeIn } from '../motion/FadeIn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Acciones alineadas a la derecha (botones, filtros). */
  actions?: ReactNode;
}

/** Encabezado estándar de pantallas con el sistema visual Unified (ícono en degradé + título). */
export function PageHeader({ title, subtitle, icon, actions }: PageHeaderProps) {
  const t = useUnifiedTokens();
  return (
    <FadeIn>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
        <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
          {icon && (
            <Box
              sx={{
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: '12px',
                display: 'grid',
                placeItems: 'center',
                color: t.onPrimary,
                background: `linear-gradient(135deg, ${t.primary}, ${t.primaryContainer})`,
              }}
            >
              {icon}
            </Box>
          )}
          <Box minWidth={0}>
            <Typography variant="h5" fontWeight={800} color={t.onSurface} noWrap>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color={t.onSurfaceVariant}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {actions && <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">{actions}</Box>}
      </Box>
    </FadeIn>
  );
}

/** Tarjeta de superficie Unified (reemplaza `<Paper sx={{ p: ... }}>` genéricos). */
export function SurfaceCard({ sx, children, ...rest }: PaperProps) {
  const t = useUnifiedTokens();
  return (
    <Paper
      elevation={0}
      {...rest}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: '16px',
        bgcolor: t.surfaceContainerLowest,
        border: `1px solid ${t.outline}33`,
        boxShadow: t.cardShadow,
        ...(sx as object),
      }}
    >
      {children}
    </Paper>
  );
}
