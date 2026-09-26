import type { ReactNode } from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useUnifiedTokens } from '../../theme';
import { FadeIn } from '../motion/FadeIn';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Contenedor de pantallas de acceso (login/registro) con el sistema visual Unified. */
export default function AuthCard({ title, subtitle, children, footer }: Props) {
  const t = useUnifiedTokens();
  return (
    <Container maxWidth="xs" sx={{ py: { xs: 4, md: 8 } }}>
      <FadeIn>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: '16px',
            bgcolor: t.surfaceContainerLowest,
            border: `1px solid ${t.outline}33`,
            boxShadow: t.cardShadow,
          }}
        >
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '14px',
                display: 'grid',
                placeItems: 'center',
                mb: 1.5,
                color: t.onPrimary,
                background: `linear-gradient(135deg, ${t.primary}, ${t.primaryContainer})`,
              }}
            >
              <StorefrontIcon />
            </Box>
            <Typography variant="h5" fontWeight={800} color={t.onSurface}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color={t.onSurfaceVariant} mt={0.5} textAlign="center">
                {subtitle}
              </Typography>
            )}
          </Box>
          {children}
          {footer && (
            <Box mt={3} textAlign="center">
              <Typography
                variant="body2"
                color={t.onSurfaceVariant}
                sx={{ '& a': { color: t.primary, fontWeight: 700, textDecoration: 'none' }, '& a:hover': { textDecoration: 'underline' } }}
              >
                {footer}
              </Typography>
            </Box>
          )}
        </Paper>
      </FadeIn>
    </Container>
  );
}
