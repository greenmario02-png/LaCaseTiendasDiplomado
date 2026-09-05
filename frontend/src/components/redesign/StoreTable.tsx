import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Box,
} from '@mui/material';
import { getUnifiedTokens } from '../../theme';
import { EmptyState } from './States';

export type StoreColumn = { key: string; label: string };
export type StoreRow = Record<string, unknown> & { id?: number | string };

type StoreTableProps = {
  columns: StoreColumn[];
  rows: StoreRow[];
  onRowClick?: (row: StoreRow) => void;
  emptyMessage?: string;
};

export function StoreTable({ columns, rows, onRowClick, emptyMessage = 'No hay registros todavía.' }: StoreTableProps) {
  const tokens = getUnifiedTokens(false);

  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        border: `1px solid ${tokens.outline}22`,
        borderRadius: '12px',
        boxShadow: tokens.cardShadow,
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: `${tokens.primary}0F` }}>
            {columns.map((c) => (
              <TableCell key={c.key} sx={{ fontWeight: 700, color: tokens.onSurfaceVariant, whiteSpace: 'nowrap' }}>
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow
              key={row.id ?? i}
              hover={Boolean(onRowClick)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((c) => (
                <TableCell key={c.key}>
                  <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
                    <Typography variant="body2" noWrap>
                      {String(row[c.key] ?? '—')}
                    </Typography>
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
