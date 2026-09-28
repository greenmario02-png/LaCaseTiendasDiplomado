import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  ListItemButton,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PrintIcon from '@mui/icons-material/Print';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTranslation } from 'react-i18next';
import { resolveImageUrl } from '../../services/api';
import { api, getErrorMessage } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import { useAuthStore } from '../../stores/authStore';
import BarcodeReader from '../../components/seller/BarcodeReader';
import toast from 'react-hot-toast';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';
import { PrimaryButton, GhostButton } from '../../components/redesign/Buttons';
import { EmptyState } from '../../components/redesign/States';
import { useUnifiedTokens } from '../../theme';

export default function SellerProducts() {
  const { t } = useTranslation();
  const money = useMoney();
  const tk = useUnifiedTokens();
  const navigate = useNavigate();
  const isEmployee = useAuthStore((s) => s.user?.storeRole) === 'EMPLOYEE';
  const [products, setProducts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyFor, setHistoryFor] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyQuery, setCopyQuery] = useState('');
  const [copyResults, setCopyResults] = useState<any[]>([]);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyingId, setCopyingId] = useState<number | null>(null);

  const load = (p = 1) => {
    api.get('/seller/products', { params: { page: p, limit: 20 } }).then((res) => {
      setProducts(res.data.data);
      setMeta(res.data.meta);
    });
  };

  useEffect(() => {
    load(page);
  }, [page]);

  const remove = async (id: number) => {
    if (!confirm(t('seller.products.confirmDelete'))) return;
    try {
      await api.delete(`/seller/products/${id}`);
      toast.success(t('seller.products.toast.deleted'));
      load(page);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openHistory = async (id: number, name: string) => {
    setHistoryOpen(true);
    setHistoryFor(name);
    setHistoryLoading(true);
    try {
      const { data } = await api.get(`/audits/product/${id}`);
      setHistory(data.data ?? []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setHistoryLoading(false);
    }
  };

  // Búsqueda pública de productos para copiar (debounce 300ms)
  useEffect(() => {
    if (!copyOpen || copyQuery.trim().length < 2) {
      setCopyResults([]);
      return;
    }
    const t = setTimeout(() => {
      setCopyLoading(true);
      api
        .get('/products', { params: { search: copyQuery.trim(), limit: 8 } })
        .then((res) => setCopyResults(res.data.data ?? []))
        .catch(() => setCopyResults([]))
        .finally(() => setCopyLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [copyQuery, copyOpen]);

  const doCopy = async (id: number) => {
    setCopyingId(id);
    try {
      const { data } = await api.post('/seller/products/copy', { productId: id });
      setCopyOpen(false);
      setCopyQuery('');
      toast.success(t('seller.products.toast.copied'));
      navigate('/seller/productos/nuevo', { state: { copyData: data.data } });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCopyingId(null);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t('seller.products.title', { count: meta?.total ?? 0 })}
        icon={<Inventory2Icon />}
        actions={
          <>
            <GhostButton type="button" startIcon={<QrCodeScannerIcon />} onClick={() => setReaderOpen(true)}>
              {t('seller.products.actions.scan')}
            </GhostButton>
            <GhostButton type="button" startIcon={<ContentCopyIcon />} onClick={() => setCopyOpen(true)}>
              {t('seller.products.actions.copyProduct')}
            </GhostButton>
            <GhostButton to="/seller/etiquetas" startIcon={<PrintIcon />}>
              {t('seller.products.actions.labels')}
            </GhostButton>
            <GhostButton to="/seller/productos/varios" startIcon={<LibraryAddIcon />}>
              {t('seller.products.actions.addMultiple')}
            </GhostButton>
            <PrimaryButton to="/seller/productos/nuevo" startIcon={<AddIcon />}>
              {t('seller.products.actions.newProduct')}
            </PrimaryButton>
          </>
        }
      />

      <SurfaceCard sx={{ p: 0, overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: tk.surface, '& th': { color: tk.onSurfaceVariant, fontWeight: 700 } }}>
              <TableCell>{t('seller.products.table.product')}</TableCell>
              <TableCell>{t('seller.products.table.category')}</TableCell>
              <TableCell align="right">{t('seller.products.table.price')}</TableCell>
              <TableCell align="center">{t('seller.products.table.stock')}</TableCell>
              <TableCell align="center">{t('seller.products.table.status')}</TableCell>
              <TableCell align="center">{t('seller.products.table.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {p.images?.[0] && (
                      <img src={p.images[0].url} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }} />
                    )}
                    <Typography variant="body2" fontWeight={600}>
                      {p.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{p.category?.name}</TableCell>
                <TableCell align="right">{money(Number(p.price))}</TableCell>
                <TableCell align="center">
                  <Chip label={p.stock} size="small" color={p.stock <= 5 ? 'warning' : p.stock === 0 ? 'error' : 'success'} />
                </TableCell>
                <TableCell align="center">
                  {p.isApproved ? (
                    <Chip label={t('seller.products.status.approved')} size="small" color="success" />
                  ) : p.isActive ? (
                    <Chip label={t('seller.products.status.pending')} size="small" color="warning" />
                  ) : (
                    <Chip label={t('seller.products.status.deleted')} size="small" color="default" />
                  )}
                </TableCell>
                <TableCell align="center">
                  <IconButton component={Link} to={`/seller/productos/${p.id}/editar`}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  {!isEmployee && (
                    <>
                      <IconButton color="info" onClick={() => openHistory(p.id, p.name)} title={t('seller.products.history.tooltip')}>
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                      <IconButton color="error" onClick={() => remove(p.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {products.length === 0 && <EmptyState message={t('seller.products.emptyState')} />}
      </SurfaceCard>

      {meta?.totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination count={meta.totalPages} page={page} onChange={(_, p) => setPage(p)} />
        </Box>
      )}

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('seller.products.history.title', { name: historyFor })}</DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box textAlign="center" py={4}>
              <CircularProgress />
            </Box>
          ) : history.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={3}>
              {t('seller.products.history.empty')}
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('seller.products.history.action')}</TableCell>
                    <TableCell>{t('seller.products.history.author')}</TableCell>
                    <TableCell>{t('seller.products.history.note')}</TableCell>
                    <TableCell>{t('seller.products.history.date')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>
                        <Chip
                          label={h.action}
                          size="small"
                          color={
                            h.action === 'CREATED'
                              ? 'success'
                              : h.action === 'DELETED' || h.action === 'DEACTIVATED'
                              ? 'error'
                              : h.action === 'MODERATED'
                              ? 'warning'
                              : 'info'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {h.actor?.firstName} {h.actor?.lastName} ({h.actor?.role})
                      </TableCell>
                      <TableCell>{h.note ?? ''}</TableCell>
                      <TableCell>{new Date(h.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <GhostButton type="button" onClick={() => setHistoryOpen(false)}>{t('seller.products.history.close')}</GhostButton>
        </DialogActions>
      </Dialog>

      <BarcodeReader open={readerOpen} onClose={() => setReaderOpen(false)} />

      <Dialog open={copyOpen} onClose={() => setCopyOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('seller.products.copyDialog.title')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t('seller.products.copyDialog.description')}
          </Typography>
          <TextField
            label={t('seller.products.copyDialog.searchLabel')}
            placeholder={t('seller.products.copyDialog.searchPlaceholder')}
            fullWidth
            size="small"
            autoFocus
            value={copyQuery}
            onChange={(e) => setCopyQuery(e.target.value)}
          />
          <Box mt={2}>
            {copyLoading && (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress size={28} />
              </Box>
            )}
            {!copyLoading && copyQuery.trim().length >= 2 && copyResults.length === 0 && (
              <Typography variant="body2" color="text.secondary" align="center" py={3}>
                {t('seller.products.copyDialog.noResults')}
              </Typography>
            )}
            {!copyLoading && copyResults.length > 0 && (
              <List dense disablePadding>
                {copyResults.map((p: any) => (
                  <ListItem key={p.id} divider disablePadding secondaryAction={
                    <PrimaryButton
                      type="button"
                      size="small"
                      startIcon={copyingId === p.id ? <CircularProgress size={14} /> : <ContentCopyIcon />}
                      disabled={copyingId !== null}
                      onClick={() => doCopy(p.id)}
                    >
                      {t('seller.products.copyDialog.copyButton')}
                    </PrimaryButton>
                  }>
                    <ListItemButton component={Link} to={`/producto/${p.id}`} target="_blank" sx={{ borderRadius: 1 }}>
                      <ListItemAvatar>
                        <Avatar src={resolveImageUrl(p.images?.[0]?.url)} variant="rounded">
                          <DeleteIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={p.name}
                        secondary={`${p.sku ?? t('seller.products.copyDialog.noSku')} · ${p.category?.name ?? ''} · ${money(p.price)}`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
            {!copyLoading && copyQuery.trim().length < 2 && (
              <Typography variant="body2" color="text.secondary" align="center" py={3}>
                {t('seller.products.copyDialog.minChars')}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <GhostButton type="button" onClick={() => setCopyOpen(false)}>{t('seller.products.copyDialog.cancel')}</GhostButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

