import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
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
import { resolveImageUrl } from '../../services/api';
import { api, getErrorMessage } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import { useAuthStore } from '../../stores/authStore';
import BarcodeReader from '../../components/seller/BarcodeReader';
import toast from 'react-hot-toast';

export default function SellerProducts() {
  const money = useMoney();
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
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await api.delete(`/seller/products/${id}`);
      toast.success('Producto eliminado');
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
      toast.success('Producto copiado. Completá imagen y precio para publicarlo.');
      navigate('/seller/productos/nuevo', { state: { copyData: data.data } });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCopyingId(null);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>
          Mis productos ({meta?.total ?? 0})
        </Typography>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<QrCodeScannerIcon />} onClick={() => setReaderOpen(true)}>
            Escanear
          </Button>
          <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => setCopyOpen(true)}>
            Copiar producto
          </Button>
          <Button component={Link} to="/seller/etiquetas" variant="outlined" startIcon={<PrintIcon />}>
            Etiquetas
          </Button>
          <Button component={Link} to="/seller/productos/varios" variant="outlined" startIcon={<LibraryAddIcon />}>
            Agregar varios
          </Button>
          <Button component={Link} to="/seller/productos/nuevo" variant="contained" startIcon={<AddIcon />}>
            Nuevo producto
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell>CategorÃ­a</TableCell>
              <TableCell align="right">Precio</TableCell>
              <TableCell align="center">Stock</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
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
                    <Chip label="Aprobado" size="small" color="success" />
                  ) : p.isActive ? (
                    <Chip label="Pendiente" size="small" color="warning" />
                  ) : (
                    <Chip label="Eliminado" size="small" color="default" />
                  )}
                </TableCell>
                <TableCell align="center">
                  <IconButton component={Link} to={`/seller/productos/${p.id}/editar`}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  {!isEmployee && (
                    <>
                      <IconButton color="info" onClick={() => openHistory(p.id, p.name)} title="Historial">
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

      {meta?.totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination count={meta.totalPages} page={page} onChange={(_, p) => setPage(p)} />
        </Box>
      )}

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Historial — {historyFor}</DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box textAlign="center" py={4}>
              <CircularProgress />
            </Box>
          ) : history.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={3}>
              Sin actividad registrada todavía.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Acción</TableCell>
                    <TableCell>Autor</TableCell>
                    <TableCell>Nota</TableCell>
                    <TableCell>Fecha</TableCell>
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
          <Button onClick={() => setHistoryOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <BarcodeReader open={readerOpen} onClose={() => setReaderOpen(false)} />

      <Dialog open={copyOpen} onClose={() => setCopyOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Copiar producto</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Buscá un producto en la multitienda para copiar sus datos (nombre, descripción, categoría y
            características). Después tendrás que poner tu propia imagen y precio.
          </Typography>
          <TextField
            label="Buscar producto por nombre o código"
            placeholder="Ej: ryzen 5 5600g"
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
                No se encontró ningún producto.
              </Typography>
            )}
            {!copyLoading && copyResults.length > 0 && (
              <List dense disablePadding>
                {copyResults.map((p: any) => (
                  <ListItem key={p.id} divider disablePadding secondaryAction={
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={copyingId === p.id ? <CircularProgress size={14} /> : <ContentCopyIcon />}
                      disabled={copyingId !== null}
                      onClick={() => doCopy(p.id)}
                    >
                      Copiar
                    </Button>
                  }>
                    <ListItemButton component={Link} to={`/producto/${p.id}`} target="_blank" sx={{ borderRadius: 1 }}>
                      <ListItemAvatar>
                        <Avatar src={resolveImageUrl(p.images?.[0]?.url)} variant="rounded">
                          <DeleteIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={p.name}
                        secondary={`${p.sku ?? 'Sin SKU'} · ${p.category?.name ?? ''} · ${money(p.price)}`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
            {!copyLoading && copyQuery.trim().length < 2 && (
              <Typography variant="body2" color="text.secondary" align="center" py={3}>
                Escribí al menos 2 caracteres para buscar.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyOpen(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

