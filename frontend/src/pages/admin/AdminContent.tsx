import { useEffect, useState } from 'react';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { api } from '../../services/api';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

type ContentType = 'faqs' | 'warranties' | 'reaches';

interface ContentItem {
  id: number;
  [key: string]: any;
}

const FIELD_LABELS: Record<ContentType, { title: string; fields: Array<{ key: string; label: string; multiline?: boolean }> }> = {
  faqs: {
    title: 'Preguntas frecuentes',
    fields: [
      { key: 'question', label: 'Pregunta' },
      { key: 'answer', label: 'Respuesta', multiline: true },
    ],
  },
  warranties: {
    title: 'Garantías',
    fields: [
      { key: 'title', label: 'Título' },
      { key: 'content', label: 'Contenido', multiline: true },
    ],
  },
  reaches: {
    title: 'Alcances',
    fields: [
      { key: 'title', label: 'Título' },
      { key: 'content', label: 'Contenido', multiline: true },
    ],
  },
};

const EMPTY_FORM: Record<string, string> = { title: '', content: '', question: '', answer: '' };

export default function AdminContent() {
  const [tab, setTab] = useState<ContentType>('faqs');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [order, setOrder] = useState('0');
  const [error, setError] = useState('');

  const load = () => {
    api.get(`/admin/content/${tab}`).then((res) => setItems(res.data.data)).catch(() => setItems([]));
  };

  useEffect(() => {
    load();
  }, [tab]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setOrder('0');
    setEditingId(null);
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (item: ContentItem) => {
    const f: Record<string, string> = { ...EMPTY_FORM };
    for (const field of FIELD_LABELS[tab].fields) f[field.key] = item[field.key] ?? '';
    setForm(f);
    setOrder(String(item.order ?? 0));
    setEditingId(item.id);
    setError('');
    setDialogOpen(true);
  };

  const save = async () => {
    try {
      const payload: any = { order: Number(order) || 0 };
      for (const field of FIELD_LABELS[tab].fields) payload[field.key] = form[field.key];
      if (editingId) {
        await api.put(`/admin/content/${tab}/${editingId}`, payload);
        toast.success('Actualizado');
      } else {
        await api.post(`/admin/content/${tab}`, payload);
        toast.success('Creado');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      await api.delete(`/admin/content/${tab}/${id}`);
      toast.success('Eliminado');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const fields = FIELD_LABELS[tab].fields;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Tabs value={tab} onChange={(_, v) => setTab(v as ContentType)}>
          <Tab label="FAQs" value="faqs" />
          <Tab label="Garantías" value="warranties" />
          <Tab label="Alcances" value="reaches" />
        </Tabs>
        <PrimaryButton startIcon={<AddIcon />} onClick={openNew}>
          Nuevo
        </PrimaryButton>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{fields[0].label}</TableCell>
              {fields.length > 1 && <TableCell>{fields[1].label}</TableCell>}
              <TableCell align="center">Orden</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item[fields[0].key]}</TableCell>
                {fields.length > 1 && (
                  <TableCell sx={{ maxWidth: 300 }}>
                    <Typography variant="body2" noWrap>
                      {item[fields[1].key]}
                    </Typography>
                  </TableCell>
                )}
                <TableCell align="center">{item.order}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => openEdit(item)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton color="error" onClick={() => remove(item.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography color="text.secondary">Sin {fields[0].label.toLowerCase()} registradas</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Editar' : 'Nuevo'} — {FIELD_LABELS[tab].title}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2}>
            {fields.map((f) => (
              <TextField
                key={f.key}
                label={f.label}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                multiline={f.multiline}
                rows={f.multiline ? 3 : 1}
                fullWidth
                required
              />
            ))}
            <TextField label="Orden" type="number" value={order} onChange={(e) => setOrder(e.target.value)} fullWidth helperText="Número bajo = aparece primero" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setDialogOpen(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={save}>
            {editingId ? 'Guardar' : 'Crear'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
