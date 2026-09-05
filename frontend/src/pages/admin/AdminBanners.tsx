import { useEffect, useState, useRef } from 'react';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Switch,
  Stack,
  CircularProgress,
  Alert,
  Avatar,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CropIcon from '@mui/icons-material/Crop';
import LinkIcon from '@mui/icons-material/Link';
import { api } from '../../services/api';
import { getErrorMessage, resolveImageUrl } from '../../services/api';
import ImageCropDialog from '../../components/ui/ImageCropDialog';
import toast from 'react-hot-toast';

// Dimensiones recomendadas del banner (relaciones de aspecto)
const BANNER_ASPECT = {
  desktop: 1920 / 400, // 4.8
  tablet: 1024 / 400, // 2.56
  mobile: 600 / 400, // 1.5
};

const EMPTY = {
  title: '',
  imageDesktop: '',
  imageTablet: '',
  imageMobile: '',
  link: '',
  backgroundColor: '',
  order: '0',
};

export default function AdminBanners() {
  const [banners, setBanners] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropTarget, setCropTarget] = useState<null | 'desktop' | 'tablet' | 'mobile'>(null);
  const [pendingCropUrl, setPendingCropUrl] = useState('');

  const load = () => api.get('/admin/banners').then((res) => setBanners(res.data.data)).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm(EMPTY);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (b: any) => {
    setForm({
      title: b.title || '',
      imageDesktop: b.imageDesktop,
      imageTablet: b.imageTablet || '',
      imageMobile: b.imageMobile || '',
      link: b.link || '',
      backgroundColor: b.backgroundColor || '',
      order: String(b.order),
    });
    setEditingId(b.id);
    setDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const objectUrl = URL.createObjectURL(file);
    setPendingCropUrl(objectUrl);
    setCropTarget('desktop');
  };

  // Upload directo (sin recorte)
  const uploadDirect = async (file: File, field: 'imageTablet' | 'imageMobile') => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post('/admin/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((f) => ({ ...f, [field]: data.data.url }));
      toast.success('Imagen subida');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  // cropTarget usa 'desktop'|'tablet'|'mobile' pero los campos del form son imageDesktop/imageTablet/imageMobile
  const CROP_FIELD: Record<string, keyof typeof EMPTY> = {
    desktop: 'imageDesktop',
    tablet: 'imageTablet',
    mobile: 'imageMobile',
  };

  const onCropped = (url: string) => {
    if (cropTarget) {
      const field = CROP_FIELD[cropTarget];
      if (field) setForm((f) => ({ ...f, [field]: url }));
    }
    if (pendingCropUrl.startsWith('blob:')) URL.revokeObjectURL(pendingCropUrl);
    setCropTarget(null);
  };

  // Derivar tablet/mobile de la imagen desktop (recortes automáticos a las dimensiones)
  const deriveFromDesktop = () => {
    if (!form.imageDesktop) {
      toast.error('Primero subí la imagen principal (desktop)');
      return;
    }
    // Reutilizamos la misma imagen para tablet/mobile si no las tienen
    setForm((f) => ({
      ...f,
      imageTablet: f.imageTablet || f.imageDesktop,
      imageMobile: f.imageMobile || f.imageDesktop,
    }));
    toast.success('Imágenes derivadas de la principal. Usá "Recortar" para ajustarlas.');
  };

  const save = async () => {
    if (!form.imageDesktop) {
      toast.error('La imagen principal (desktop) es obligatoria');
      return;
    }
    try {
      const payload: any = {
        title: form.title || undefined,
        imageDesktop: form.imageDesktop,
        imageTablet: form.imageTablet || undefined,
        imageMobile: form.imageMobile || undefined,
        link: form.link || undefined,
        backgroundColor: form.backgroundColor || undefined,
        order: Number(form.order) || 0,
      };
      if (editingId) {
        await api.put(`/admin/banners/${editingId}`, payload);
        toast.success('Banner actualizado');
      } else {
        await api.post('/admin/banners', payload);
        toast.success('Banner creado');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar banner?')) return;
    try {
      await api.delete(`/admin/banners/${id}`);
      toast.success('Banner eliminado');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const toggleActive = async (b: any) => {
    try {
      await api.put(`/admin/banners/${b.id}`, { isActive: !b.isActive });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <PrimaryButton startIcon={<AddIcon />} onClick={openNew}>
          Nuevo banner
        </PrimaryButton>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Banner</TableCell>
              <TableCell align="center">Activo</TableCell>
              <TableCell align="right">Orden</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {banners.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {b.imageDesktop ? (
                      <img src={resolveImageUrl(b.imageDesktop)} alt="" style={{ width: 100, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                    ) : (
                      <Box sx={{ width: 100, height: 32, borderRadius: 4, bgcolor: b.backgroundColor || '#eee' }} />
                    )}
                    <Typography variant="body2" fontWeight={600}>
                      {b.title || 'Sin título'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Switch checked={b.isActive} onChange={() => toggleActive(b)} size="small" />
                </TableCell>
                <TableCell align="right">{b.order}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => openEdit(b)} title="Editar">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton color="error" onClick={() => remove(b.id)} title="Eliminar">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ============ DIALOG ============ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingId ? 'Editar banner' : 'Nuevo banner'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <TextField label="Título del banner" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Hot Sale, Nuevo ingreso" />

            {/* IMAGEN PRINCIPAL (desktop) */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Imagen principal (Desktop) — obligatoria
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Tamaño recomendado: <strong>1920 × 400 px</strong>. Usá el editor para recortar a medida.
              </Typography>
              <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                <Avatar variant="rounded" sx={{ width: 120, height: 50 }}>
                  {form.imageDesktop ? (
                    <img src={resolveImageUrl(form.imageDesktop)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : null}
                </Avatar>
                <SecondaryButton size="small" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()}>
                  Subir imagen
                </SecondaryButton>
                {form.imageDesktop && (
                  <SecondaryButton size="small" color="primary" startIcon={<CropIcon />} onClick={() => { setPendingCropUrl(resolveImageUrl(form.imageDesktop)); setCropTarget('desktop'); }}>
                    Recortar
                  </SecondaryButton>
                )}
              </Box>
            </Box>

            <Box>
              <GhostButton size="small" onClick={deriveFromDesktop}>
                Usar la principal para tablet y mobile (auto)
              </GhostButton>
            </Box>

            {/* TABLET y MOBILE (opcionales) */}
            {(['tablet', 'mobile'] as const).map((mode) => {
              const field = mode === 'tablet' ? 'imageTablet' : 'imageMobile';
              const label = mode === 'tablet' ? 'Tablet (1024 × 400 px)' : 'Mobile (600 × 400 px)';
              return (
                <Box key={mode}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    Imagen {label} — opcional
                  </Typography>
                  <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                    <Avatar variant="rounded" sx={{ width: 100, height: 40 }}>
                      {form[field] ? (
                        <img src={resolveImageUrl(form[field])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : null}
                    </Avatar>
                    <SecondaryButton
                      size="small"
                      startIcon={uploading ? <CircularProgress size={16} /> : <UploadFileIcon />}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.jpg,.jpeg,.png,.webp';
                        input.onchange = () => {
                          const f = input.files?.[0];
                          if (f) uploadDirect(f, field);
                        };
                        input.click();
                      }}
                    >
                      Subir
                    </SecondaryButton>
                    {form[field] && (
                      <SecondaryButton size="small" startIcon={<CropIcon />} onClick={() => { setPendingCropUrl(resolveImageUrl(form[field])); setCropTarget(mode); }}>
                        Recortar
                      </SecondaryButton>
                    )}
                  </Box>
                </Box>
              );
            })}

            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={handleFileSelect} />

            <Box display="flex" gap={2} flexWrap="wrap">
              <TextField label="Link al hacer clic" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="Ej: /productos?tag=oferta" sx={{ flex: 1, minWidth: 200 }} InputProps={{ startAdornment: <InputAdornment position="start"><LinkIcon fontSize="small" /></InputAdornment> }} />
              <TextField label="Color de fondo" value={form.backgroundColor} onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })} placeholder="#f0320a" sx={{ width: 160 }} />
              <TextField label="Orden" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} sx={{ width: 100 }} helperText="Bajo = primero" />
            </Box>

            {/* PREVIEW */}
            {form.imageDesktop && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Vista previa (Desktop)
                </Typography>
                <Box
                  sx={{
                    width: '100%',
                    height: 140,
                    borderRadius: 2,
                    overflow: 'hidden',
                    position: 'relative',
                    bgcolor: form.backgroundColor || 'primary.main',
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  {form.imageDesktop && (
                    <img src={resolveImageUrl(form.imageDesktop)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  {form.title && (
                    <Box sx={{ position: 'absolute', bottom: 8, left: 12 }}>
                      <Typography color="white" fontWeight={700}>{form.title}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setDialogOpen(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={save} disabled={!form.imageDesktop}>
            {editingId ? 'Guardar cambios' : 'Crear banner'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* Editor de recorte */}
      <ImageCropDialog
        open={Boolean(cropTarget)}
        imageUrl={pendingCropUrl}
        aspect={BANNER_ASPECT[cropTarget ?? 'desktop']}
        title={`Recortar imagen ${cropTarget ?? ''}`}
        onClose={() => setCropTarget(null)}
        onUploaded={onCropped}
      />
    </Box>
  );
}
