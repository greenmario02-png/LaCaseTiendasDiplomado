import React from 'react';
import { Stack, Chip } from '@mui/material';
import { getUnifiedTokens } from '../../theme';

export type FilterOption = { key: string; label: string };

type Props = {
  options: FilterOption[];
  active: string;
  onChange: (key: string) => void;
};

export function FilterBar({ options, active, onChange }: Props) {
  const tokens = getUnifiedTokens(false);
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
      {options.map((opt) => {
        const isActive = opt.key === active;
        return (
          <Chip
            key={opt.key}
            label={opt.label}
            size="small"
            onClick={() => onChange(opt.key)}
            sx={{
              bgcolor: isActive ? tokens.primary : `${tokens.primary}10`,
              color: isActive ? '#fff' : tokens.primary,
              fontWeight: isActive ? 700 : 600,
              borderRadius: '999px',
              cursor: 'pointer',
            }}
          />
        );
      })}
    </Stack>
  );
}
