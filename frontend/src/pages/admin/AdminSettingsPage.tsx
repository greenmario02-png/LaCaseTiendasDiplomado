import { useCallback, useEffect, useState } from 'react';
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
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Alert,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import { api } from '../../services/api';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import { LoadingState, EmptyState } from '../../components/redesign/States';

interface SettingRow {
  key: string;
  value: string;
  updatedAt?: string;
}

const EMPTY_FORM: SettingRow = { key: '', value: '' };

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SettingRow | null>(null);
  const [form, setForm] = useState<SettingRow>(EMPTY_FORM);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/admin/settings')
      .then((res) => {
        const obj: Record<string, string> = res.data.data ?? {};
        const rows = Object.entries(obj).map(([key, value]) => ({ key, value }));
        setSettings(rows);
      })
      .catch(() => setSettings([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (row: SettingRow) => {
    setForm({ key: row.key, value: row.value });
    setEditing(row);
    setError('');
    setDialogOpen(true);
  };

  const save = async () => {
    const key = form.key.trim();
    if (!key) {
      setError('La clave es obligatoria.');
      return;
    }
    try {
      await api.put(`/admin/settings/${encodeURIComponent(key)}`, { key, value: form.value });
      toast.success(editing ? 'Ajuste actualizado' : 'Ajuste creado');
      setDialogOpen(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const remove = async (row: SettingRow) => {
    if (!confirm(`¿Eliminar el ajuste "${row.key}"?`)) return;
    try {
      await api.delete(`/admin/settings/${encodeURIComponent(row.key)}`);
      toast.success('Ajuste eliminado');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Configuración global
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pares clave/valor usados por la plataforma (maintenance, comisiones, textos, flags).
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          Nuevo ajuste
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Estos ajustes se guardan en la tabla <Chip label="settings" size="small" /> y están disponibles vía{' '}
        <code>GET /api/admin/settings</code>. Edítalos con cuidado: el frontend y el backend pueden depender de ellos.
      </Alert>

      {loading ? (
        <LoadingState />
      ) : settings.length === 0 ? (
        <EmptyState message="No hay ajustes guardados todavía." />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Clave</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {settings.map((row) => (
                <TableRow key={row.key}>
                  <TableCell sx={{ fontWeight: 600 }}>
                    <SettingsIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 1, color: 'text.secondary' }} />
                    {row.key}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 400 }}>
                    <Typography variant="body2" noWrap sx={{ fontFamily: 'monospace' }}>
                      {row.value}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton onClick={() => openEdit(row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton color="error" onClick={() => remove(row)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? `Editar ajuste: ${editing.key}` : 'Nuevo ajuste'}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2}>
            <TextField
              label="Clave (key)"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              fullWidth
              disabled={!!editing}
              helperText="Ej: maintenance_mode, default_commission, site_title"
            />
            <TextField
              label="Valor (value)"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={save}>
            {editing ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
