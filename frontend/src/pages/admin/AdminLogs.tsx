import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Stack,
  Chip,
  Link,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { api } from '../../services/api';
import { useUnifiedTokens } from '../../theme';
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';
import { LoadingState, ErrorState } from '../../components/redesign/States';
import { useTranslation } from 'react-i18next';

type AuditAction =
  | 'CREATED'
  | 'UPDATED'
  | 'MODERATED'
  | 'ACTIVATED'
  | 'DEACTIVATED'
  | 'DELETED'
  | 'REACTIVATED'
  | 'AUCTIONED';

interface AuditRow {
  id: number;
  productId: number;
  actorId: number;
  action: AuditAction;
  changes: unknown;
  note?: string;
  createdAt: string;
  product?: { id: number; name: string; sku?: string };
  actor?: { id: number; firstName: string; lastName: string; email: string; role: string };
}

const ACTIONS: AuditAction[] = [
  'CREATED',
  'UPDATED',
  'MODERATED',
  'ACTIVATED',
  'DEACTIVATED',
  'DELETED',
  'REACTIVATED',
  'AUCTIONED',
];

const ACTION_COLORS: Record<AuditAction, 'success' | 'info' | 'warning' | 'error' | 'default' | 'secondary'> = {
  CREATED: 'success',
  ACTIVATED: 'success',
  REACTIVATED: 'success',
  UPDATED: 'info',
  MODERATED: 'warning',
  AUCTIONED: 'secondary',
  DEACTIVATED: 'default',
  DELETED: 'error',
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AdminLogs() {
  const t = useUnifiedTokens();
  const { t: tr } = useTranslation();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get('/audits', {
        params: { page: page + 1, limit, action: action || undefined, search: search || undefined },
      })
      .then((res) => {
        setRows(res.data.data ?? []);
        setTotal(res.data.meta?.total ?? 0);
      })
      .catch((err) => setError(err?.response?.data?.message || tr('admin.logs.loadError')))
      .finally(() => setLoading(false));
  }, [page, limit, action, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <Box>
      <PageHeader title={tr('admin.logs.title')} subtitle={tr('admin.logs.subtitle')} icon={<HistoryIcon />} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
        <TextField
          size="small"
          label={tr('admin.logs.searchLabel')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 260 }}
        />
        <TextField
          select
          size="small"
          label={tr('admin.logs.actionLabel')}
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">{tr('admin.logs.allActions')}</MenuItem>
          {ACTIONS.map((a) => (
            <MenuItem key={a} value={a}>
              {a}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error && <ErrorState message={error} onRetry={load} />}

      <SurfaceCard sx={{ p: 0, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: t.surface }}>
              <TableRow>
                <TableCell>{tr('admin.logs.colDate')}</TableCell>
                <TableCell>{tr('admin.logs.colAction')}</TableCell>
                <TableCell>{tr('admin.logs.colProduct')}</TableCell>
                <TableCell>{tr('admin.logs.colUser')}</TableCell>
                <TableCell>{tr('admin.logs.colNote')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <LoadingState />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: t.onSurfaceVariant }}>
                    <Typography variant="body2">
                      {tr('admin.logs.emptyState')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id} hover sx={{ '& td': { borderColor: `${t.outline}33` } }}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</TableCell>
                    <TableCell>
                      <Chip label={r.action} size="small" color={ACTION_COLORS[r.action] ?? 'default'} />
                    </TableCell>
                    <TableCell>
                      {r.product ? (
                        <>
                          <Link href={`/producto/${r.product.id}`} underline="hover" color="inherit">
                            {r.product.name}
                          </Link>
                          {r.product.sku ? (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {r.product.sku}
                            </Typography>
                          ) : null}
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {tr('admin.logs.productFallback', { id: r.productId })}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.actor ? (
                        <Typography variant="body2">
                          {r.actor.firstName} {r.actor.lastName}
                          <Typography component="span" variant="caption" color="text.secondary">
                            {' '}
                            · {r.actor.email}
                          </Typography>
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {tr('admin.logs.userFallback', { id: r.actorId })}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 260 }}>
                        {r.note || '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={limit}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(0);
          }}
          labelRowsPerPage={tr('admin.logs.rowsPerPage')}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </SurfaceCard>
    </Box>
  );
}
