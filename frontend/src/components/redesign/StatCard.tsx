import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { getUnifiedTokens } from '../../theme';

export type StatCardProps = {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  trend?: number; // positivo = sube (verde), negativo = baja (rojo)
};

export function StatCard({ title, value, icon, trend }: StatCardProps) {
  const tokens = getUnifiedTokens(false);
  return (
    <Card
      sx={{
        bgcolor: tokens.surfaceContainerLowest,
        borderRadius: '12px',
        boxShadow: tokens.cardShadow,
        p: 2,
      }}
    >
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
          {icon ? <Box sx={{ color: tokens.primary, display: 'flex' }}>{icon}</Box> : null}
          <Typography variant="h5" fontWeight={700} color="text.primary">
            {value}
          </Typography>
          {typeof trend === 'number' ? (
            <Chip
              size="small"
              icon={trend >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
              label={`${trend >= 0 ? '+' : ''}${trend}`}
              sx={{
                bgcolor: trend >= 0 ? `${tokens.tertiaryContainer}1A` : `${tokens.error}1A`,
                color: trend >= 0 ? tokens.tertiaryContainer : tokens.error,
                fontWeight: 700,
              }}
            />
          ) : null}
        </Box>
      </CardContent>
    </Card>
  );
}
