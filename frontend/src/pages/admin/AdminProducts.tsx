import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  CircularProgress,
  Stack,
  Switch,
  FormControlLabel,
  TextField,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import BlockIcon from '@mui/icons-material/Block';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { api, getErrorMessage } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import toast from 'react-hot-toast';

export default function AdminProducts() {
  const money = useMoney();
  const [tab, setTab] = useState(0);
  const [pending, setPending] = useState<any[]>([]);
  const [all, setAll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', brand: '', price: '', originalPrice: '', stock: '', isActive: true, isFeatured: false });

  const openEdit = (p: any) => {
    setEditing(p);
    setEditForm({
      name: p.name ?? '',
      brand: p.brand ?? '',
      price: String(p.price ?? ''),
      originalPrice: String(p.originalPrice ?? ''),
      stock: String(p.stock ?? ''),
      isActive: p.isActive ?? true,
      isFeatured: p.isFeatured ?? false,
    });
  };

  const saveEdit = async () => {
    try {
      await api.put(`/admin/products/${editing.id}`, {
        name: editForm.name,
        brand: editForm.brand,
        price: Number(editForm.price) || undefined,
        originalPrice: Number(editForm.originalPrice) || undefined,
        stock: Number(editForm.stock),
        isActive: editForm.isActive,
        isFeatured: editForm.isFeatured,
      });
      toast.success('Producto actualizado');
      setEditing(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const softDelete = async (productId: number) => {
    if (!confirm('¿Eliminar este producto? (soft delete)')) return;
    try {
      await api.delete(`/admin/products/${productId}`);
      toast.success('Producto eliminado');
      setPreview(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/admin/products/pending').then((r) => r.data.data).catch(() => []),
      api.get('/products', { params: { limit: 50 } }).then((r) => r.data.data).catch(() => []),
    ])
      .then(([p, a]) => {
        setPending(p);
        setAll(a);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const moderate = async (productId: number, approve: boolean) => {
    try {
      await api.put(`/admin/products/${productId}/moderate`, { approve });
      toast.success(approve ? 'Producto aprobado' : 'Producto rechazado');
      setPreview(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Pendientes (${pending.length})`} />
        <Tab label="CatÃ¡logo" />
      </Tabs>

      {tab === 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Tienda</TableCell>
                <TableCell align="right">Precio</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pending.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography color="text.secondary">No hay productos pendientes ðŸŽ‰</Typography>
                  </TableCell>
                </TableRow>
              )}
              {pending.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {p.images?.[0] && (
                        <img src={p.images[0].url} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }} />
                      )}
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {p.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.category?.name}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{p.seller?.storeName}</TableCell>
                  <TableCell align="right">{money(Number(p.price))}</TableCell>
                  <TableCell align="center">
                    <GhostButton size="small" onClick={() => setPreview(p)}>
                      Ver
                    </GhostButton>
                    <GhostButton size="small" color="success" onClick={() => moderate(p.id, true)}>
                      <CheckIcon fontSize="small" /> Aprobar
                    </GhostButton>
                    <GhostButton size="small" color="error" onClick={() => moderate(p.id, false)}>
                      <BlockIcon fontSize="small" /> Rechazar
                    </GhostButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 1 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Tienda</TableCell>
                <TableCell align="right">Precio</TableCell>
                <TableCell align="center">Stock</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {all.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.seller?.storeName}</TableCell>
                  <TableCell align="right">{money(Number(p.price))}</TableCell>
                  <TableCell align="center">
                    <Chip label={p.stock} size="small" color={p.stock === 0 ? 'error' : 'success'} />
                  </TableCell>
                  <TableCell align="center">
                    <GhostButton size="small" onClick={() => openEdit(p)}>
                      <EditIcon fontSize="small" /> Editar
                    </GhostButton>
                    <GhostButton size="small" color="error" onClick={() => softDelete(p.id)}>
                      <DeleteIcon fontSize="small" />
                    </GhostButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{preview?.name}</DialogTitle>
        <DialogContent>
          {preview?.description && <Typography variant="body2" paragraph>{preview.description}</Typography>}
          <Typography variant="h6" className="price-color">
            {money(Number(preview?.price))}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Tienda: {preview?.seller?.storeName} Â· CategorÃ­a: {preview?.category?.name} Â· Stock: {preview?.stock}
          </Typography>
        </DialogContent>
        <DialogActions>
          <GhostButton color="error" onClick={() => moderate(preview.id, false)}>
            Rechazar
          </GhostButton>
          <PrimaryButton color="success" onClick={() => moderate(preview.id, true)}>
            Aprobar
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar producto</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nombre" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} fullWidth />
            <TextField label="Marca" value={editForm.brand} onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })} fullWidth />
            <TextField label="Precio (Bs)" type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} fullWidth />
            <TextField label="Precio original (Bs)" type="number" value={editForm.originalPrice} onChange={(e) => setEditForm({ ...editForm, originalPrice: e.target.value })} fullWidth />
            <TextField label="Stock" type="number" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} fullWidth />
            <FormControlLabel control={<Switch checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />} label="Activo" />
            <FormControlLabel control={<Switch checked={editForm.isFeatured} onChange={(e) => setEditForm({ ...editForm, isFeatured: e.target.checked })} />} label="Destacado" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setEditing(null)}>Cancelar</GhostButton>
          <PrimaryButton onClick={saveEdit}>
            Guardar
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

