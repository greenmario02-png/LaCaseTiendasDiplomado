import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '../../services/api';

type TargetType = 'SELLER' | 'STORE' | 'PRODUCT';
type Reason = 'VENDEDOR_SOSPECHOSO' | 'TIENDA_SOSPECHOSA' | 'PRODUCTO_INADECUADO' | 'OTRO';
type Status = 'OPEN' | 'REVIEWED' | 'DISCARDED';

interface PublicUser {
  id: number;
  name: string;
  email: string;
}

interface Row {
  id: number;
  targetType: TargetType;
  targetId: number;
  reason: Reason;
  detail: string | null;
  status: Status;
  createdAt: string;
  reviewedAt: string | null;
  adminNote: string | null;
  reporter: PublicUser | null;
  reviewer: PublicUser | null;
  target: { type: TargetType; id: number; name: string | null; sellerId?: number | null };
}

const LIMIT = 20;

const REASON_LABEL: Record<Reason, string> = {
  VENDEDOR_SOSPECHOSO: 'Vendedor sospechoso',
  TIENDA_SOSPECHOSA: 'Tienda sospechosa',
  PRODUCTO_INADECUADO: 'Producto inadecuado',
  OTRO: 'Otro',
};

const TARGET_LABEL: Record<TargetType, string> = {
  SELLER: 'Vendedor',
  STORE: 'Tienda',
  PRODUCT: 'Producto',
};

const STATUS_LABEL: Record<Status, string> = {
  OPEN: 'Pendiente',
  REVIEWED: 'Revisada',
  DISCARDED: 'Descartada',
};

const statusColor = (s: Status) => (s === 'REVIEWED' ? 'success' : s === 'DISCARDED' ? 'default' : 'warning');

/**
 * Cola de revisión de las denuncias del catálogo (vendedor, tienda o producto) hechas desde la ficha del
 * producto (POST /catalog-reports). La usan el administrador (/admin/denuncias) y el moderador asignado con el
 * permiso catalog.reports.moderate (/moderacion/denuncias).
 */
export default function AdminCatalogReports() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<Status | ''>('OPEN');
  const [targetType, setTargetType] = useState<TargetType | ''>('');
  const [reason, setReason] = useState<Reason | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<{ row: Row; decision: 'REVIEWED' | 'DISCARDED' } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get('/admin/catalog-reports', { params: { page: page + 1, limit: LIMIT, status: status || undefined, targetType: targetType || undefined, reason: reason || undefined } })
      .then((r) => {
        setRows(r.data.data);
        setTotal(r.data.meta.total);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [page, status, targetType, reason]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDialog = (row: Row, decision: 'REVIEWED' | 'DISCARDED') => {
    setPending({ row, decision });
    setNote('');
  };

  const confirmDecision = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await api.put(`/admin/catalog-reports/${pending.row.id}`, { status: pending.decision, note: note.trim() || undefined });
      toast.success(t('catalogReport.admin.done', { defaultValue: 'Denuncia actualizada.' }));
      setPending(null);
      setNote('');
      load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // La ficha del producto se abre por id (el slug de la ruta es solo decorativo); vendedor y tienda son la misma persona.
  const targetLink = (row: Row) => (row.target.type === 'PRODUCT' ? `/producto/${row.target.id}/p` : `/vendedor/${row.target.sellerId ?? row.target.id}`);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 0 } }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
        {t('catalogReport.admin.title', { defaultValue: 'Denuncias del catálogo' })}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        {t('catalogReport.admin.subtitle', { defaultValue: 'Denuncias de vendedor, tienda o producto hechas desde la ficha del producto.' })}
      </Typography>

      <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <TextField
          select
          size="small"
          label={t('catalogReport.admin.status', { defaultValue: 'Estado' })}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as Status | '');
            setPage(0);
          }}
          sx={{ minWidth: 170 }}
        >
          <MenuItem value="">{t('catalogReport.admin.all', { defaultValue: 'Todas' })}</MenuItem>
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
            <MenuItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('catalogReport.admin.targetType', { defaultValue: 'Tipo' })}
          value={targetType}
          onChange={(e) => {
            setTargetType(e.target.value as TargetType | '');
            setPage(0);
          }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">{t('catalogReport.admin.all', { defaultValue: 'Todas' })}</MenuItem>
          {(Object.keys(TARGET_LABEL) as TargetType[]).map((v) => (
            <MenuItem key={v} value={v}>
              {TARGET_LABEL[v]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('catalogReport.admin.reason', { defaultValue: 'Motivo' })}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value as Reason | '');
            setPage(0);
          }}
          sx={{ minWidth: 190 }}
        >
          <MenuItem value="">{t('catalogReport.admin.all', { defaultValue: 'Todas' })}</MenuItem>
          {(Object.keys(REASON_LABEL) as Reason[]).map((v) => (
            <MenuItem key={v} value={v}>
              {REASON_LABEL[v]}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Alert severity="info">{t('catalogReport.admin.empty', { defaultValue: 'No hay denuncias para este filtro.' })}</Alert>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <TableContainer>
            <Table size="small" aria-label={t('catalogReport.admin.title', { defaultValue: 'Denuncias del catálogo' })}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('catalogReport.admin.colReporter', { defaultValue: 'Denunciante' })}</TableCell>
                  <TableCell>{t('catalogReport.admin.colTarget', { defaultValue: 'Objetivo' })}</TableCell>
                  <TableCell>{t('catalogReport.admin.colReason', { defaultValue: 'Motivo' })}</TableCell>
                  <TableCell>{t('catalogReport.admin.colStatus', { defaultValue: 'Estado' })}</TableCell>
                  <TableCell>{t('catalogReport.admin.colDate', { defaultValue: 'Fecha' })}</TableCell>
                  <TableCell align="right">{t('catalogReport.admin.colActions', { defaultValue: 'Acciones' })}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover data-testid={`catalog-report-${r.id}`}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {r.reporter?.name ?? `#${r.id}`}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {r.reporter?.email ?? ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {targetLink(r) ? (
                          <Link to={targetLink(r)!} target="_blank" rel="noopener">
                            {r.target.name ?? `#${r.target.id}`}
                          </Link>
                        ) : (
                          r.target.name ?? `#${r.target.id}`
                        )}
                      </Typography>
                      <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                        {TARGET_LABEL[r.targetType]}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {REASON_LABEL[r.reason]}
                      {r.detail && (
                        <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                          {r.detail}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" color={statusColor(r.status)} label={STATUS_LABEL[r.status]} />
                      {r.adminNote && (
                        <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                          {r.adminNote}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{new Date(r.createdAt).toLocaleDateString('es-BO')}</TableCell>
                    <TableCell align="right">
                      {r.status === 'OPEN' ? (
                        <Stack direction="row" sx={{ gap: 0.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <Button size="small" variant="contained" color="success" onClick={() => openDialog(r, 'REVIEWED')}>
                            {t('catalogReport.admin.markReviewed', { defaultValue: 'Marcar revisada' })}
                          </Button>
                          <Button size="small" variant="outlined" color="error" onClick={() => openDialog(r, 'DISCARDED')}>
                            {t('catalogReport.admin.discard', { defaultValue: 'Descartar' })}
                          </Button>
                        </Stack>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {r.reviewer?.name ?? ''}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={LIMIT} rowsPerPageOptions={[LIMIT]} />
        </Paper>
      )}

      <Dialog open={!!pending} onClose={() => setPending(null)} fullWidth maxWidth="xs">
        <DialogTitle>
          {pending?.decision === 'REVIEWED'
            ? t('catalogReport.admin.markReviewedTitle', { defaultValue: 'Marcar como revisada' })
            : t('catalogReport.admin.discardTitle', { defaultValue: 'Descartar denuncia' })}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={2}
            margin="dense"
            label={t('catalogReport.admin.note', { defaultValue: 'Nota (opcional)' })}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 300 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)}>{t('catalogReport.admin.cancel', { defaultValue: 'Cancelar' })}</Button>
          <Button
            variant="contained"
            color={pending?.decision === 'REVIEWED' ? 'success' : 'error'}
            disabled={busy}
            onClick={confirmDecision}
          >
            {pending?.decision === 'REVIEWED'
              ? t('catalogReport.admin.markReviewed', { defaultValue: 'Marcar revisada' })
              : t('catalogReport.admin.discard', { defaultValue: 'Descartar' })}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
