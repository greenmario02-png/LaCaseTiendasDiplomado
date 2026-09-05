import { useEffect, useState } from 'react';
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
  MenuItem,
  Grid,
  Chip,
  Alert,
  Tooltip,
  Stack,
  Avatar,
  FormHelperText,
  InputAdornment,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import ImageIcon from '@mui/icons-material/Image';
import CropIcon from '@mui/icons-material/Crop';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { api } from '../../services/api';
import { getErrorMessage, resolveImageUrl } from '../../services/api';
import { CATEGORY_ICONS, getCategoryIcon, isIconSvg } from '../../data/categoryIcons';
import ImageCropDialog from '../../components/ui/ImageCropDialog';
import toast from 'react-hot-toast';

const EMPTY = { name: '', parentId: '', icon: '', imageUrl: '', order: '0', description: '' };

const ATTR_TYPES = [
  { value: 'TEXT', label: 'Texto', hint: 'Ej: Material, Color, Marca — se escribe libre' },
  { value: 'NUMBER', label: 'Número', hint: 'Ej: Peso (kg), Tamaño (cm), RAM (GB) — se agrega la unidad' },
  { value: 'SELECT', label: 'Lista de opciones', hint: 'Ej: Talle [S, M, L], Socket [AM5, LGA1700] — el usuario elige de una lista' },
  { value: 'BOOLEAN', label: 'Sí / No', hint: 'Ej: ¿Incluye garantía?, ¿Es impermeable?' },
];

export default function AdminCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [attrs, setAttrs] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [attrDialog, setAttrDialog] = useState(false);
  const [editingAttrId, setEditingAttrId] = useState<number | null>(null);
  const [attrForm, setAttrForm] = useState({ name: '', type: 'TEXT', categoryId: '', unit: '', options: '' });
  const [attrErrors, setAttrErrors] = useState<Record<string, string>>({});
  const [cropOpen, setCropOpen] = useState(false);
  const [cropUrl, setCropUrl] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [tplFilter, setTplFilter] = useState('');
  const [tplDialog, setTplDialog] = useState(false);
  const [editingTplId, setEditingTplId] = useState<number | null>(null);
  const [tplForm, setTplForm] = useState<{ name: string; categoryId: string; attributes: { attributeDefinitionId: number | ''; defaultValue: string; isRequired: boolean }[] }>({
    name: '',
    categoryId: '',
    attributes: [],
  });

  const load = () => {
    api.get('/admin/categories').then((res) => setCategories(res.data.data)).catch(() => {});
    api.get('/admin/attributes').then((res) => setAttrs(res.data.data)).catch(() => {});
    api.get('/admin/known-products').then((res) => setTemplates(res.data.data)).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  // ---------- CATEGORÍAS ----------

  const openNewCategory = () => {
    setForm(EMPTY);
    setEditingCatId(null);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditCategory = (c: any) => {
    setForm({
      name: c.name,
      parentId: c.parentId ? String(c.parentId) : '',
      icon: c.icon || '',
      imageUrl: c.imageUrl || '',
      order: String(c.order ?? 0),
      description: c.description || '',
    });
    setEditingCatId(c.id);
    setFormErrors({});
    setDialogOpen(true);
  };

  const validateCategory = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Escribí el nombre de la categoría (mín. 2 letras)';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveCategory = async () => {
    if (!validateCategory()) return;
    try {
      const payload: any = {
        name: form.name.trim(),
        parentId: form.parentId ? Number(form.parentId) : undefined,
        icon: form.icon || undefined,
        imageUrl: form.imageUrl || undefined,
        order: Number(form.order) || 0,
      };
      if (editingCatId) {
        await api.put(`/admin/categories/${editingCatId}`, payload);
        toast.success('Categoría actualizada');
      } else {
        await api.post('/admin/categories', payload);
        toast.success('Categoría creada');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const deleteCategory = async (c: any) => {
    // El backend no expone DELETE de categorías; desactivamos en su lugar
    try {
      await api.put(`/admin/categories/${c.id}`, { isActive: false });
      toast.success('Categoría desactivada');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // ---------- ATRIBUTOS ----------

  const openNewAttr = () => {
    setAttrForm({ name: '', type: 'TEXT', categoryId: '', unit: '', options: '' });
    setEditingAttrId(null);
    setAttrErrors({});
    setAttrDialog(true);
  };

  const openEditAttr = (a: any) => {
    setAttrForm({
      name: a.name,
      type: a.type,
      categoryId: a.categoryId ? String(a.categoryId) : '',
      unit: a.unit || '',
      options: (a.options?.values ?? []).join(', '),
    });
    setEditingAttrId(a.id);
    setAttrErrors({});
    setAttrDialog(true);
  };

  const validateAttr = (): boolean => {
    const errs: Record<string, string> = {};
    if (!attrForm.name.trim()) errs.name = 'Escribí el nombre del atributo';
    if (attrForm.type === 'SELECT' && !attrForm.options.trim()) errs.options = 'Escribí al menos una opción';
    setAttrErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveAttr = async () => {
    if (!validateAttr()) return;
    try {
      const payload: any = {
        name: attrForm.name.trim(),
        type: attrForm.type,
        categoryId: attrForm.categoryId ? Number(attrForm.categoryId) : undefined,
        unit: attrForm.unit || undefined,
        options: attrForm.options ? attrForm.options.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      };
      if (editingAttrId) {
        await api.put(`/admin/attributes/${editingAttrId}`, payload);
        toast.success('Atributo actualizado');
      } else {
        await api.post('/admin/attributes', payload);
        toast.success('Atributo creado');
      }
      setAttrDialog(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const deleteAttr = async (a: any) => {
    // No hay endpoint DELETE; lo mostramos como no editable por ahora
    toast.error('La eliminación de atributos no está disponible en esta versión');
  };

  // ---------- PLANTILLAS ----------

  const openNewTemplate = () => {
    setTplForm({ name: '', categoryId: '', attributes: [] });
    setEditingTplId(null);
    setTplDialog(true);
  };

  const openEditTemplate = (t: any) => {
    const parsed = Array.isArray(t.attributes) ? t.attributes : [];
    setTplForm({
      name: t.name,
      categoryId: String(t.categoryId ?? ''),
      attributes: parsed.map((a: any) => ({
        attributeDefinitionId: typeof a.attributeDefinitionId === 'number' ? a.attributeDefinitionId : '',
        defaultValue: typeof a.defaultValue === 'string' ? a.defaultValue : '',
        isRequired: Boolean(a.isRequired),
      })),
    });
    setEditingTplId(t.id);
    setTplDialog(true);
  };

  const saveTemplate = async () => {
    if (!tplForm.name.trim()) {
      toast.error('Escribí el nombre del producto conocido');
      return;
    }
    if (!tplForm.categoryId) {
      toast.error('Elegí la categoría');
      return;
    }
    const attributes = tplForm.attributes
      .filter((a) => a.attributeDefinitionId !== '')
      .map((a) => ({ attributeDefinitionId: a.attributeDefinitionId, defaultValue: a.defaultValue.trim(), isRequired: Boolean(a.isRequired) }));
    try {
      const payload = { name: tplForm.name.trim(), categoryId: Number(tplForm.categoryId), attributes };
      if (editingTplId) {
        await api.put(`/admin/known-products/${editingTplId}`, payload);
        toast.success('Producto conocido actualizado');
      } else {
        await api.post('/admin/known-products', payload);
        toast.success('Producto conocido creado');
      }
      setTplDialog(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const deleteTemplate = async (t: any) => {
    if (!window.confirm(`¿Eliminar el producto conocido "${t.name}"?`)) return;
    try {
      await api.delete(`/admin/known-products/${t.id}`);
      toast.success('Producto conocido eliminado');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // ---------- RENDER ----------

  const renderCatIcon = (iconName: string | null | undefined, imageUrl: string | null | undefined, size = 32) => {
    if (imageUrl) {
      return (
        <Avatar variant="rounded" sx={{ width: size, height: size, mr: 1 }}>
          <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Avatar>
      );
    }
    const Icon = getCategoryIcon(iconName);
    return Icon ? <Icon sx={{ mr: 1, color: 'primary.main', fontSize: size }} /> : null;
  };

  return (
    <Box>
      <Box display="flex" gap={1} mb={3} flexWrap="wrap">
        <PrimaryButton startIcon={<AddIcon />} onClick={openNewCategory}>
          Nueva categoría
        </PrimaryButton>
        <SecondaryButton startIcon={<AddIcon />} onClick={openNewAttr}>
          Nuevo atributo
        </SecondaryButton>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Categorías</strong>: agrupá tus productos (ej: Ropa, Bar, Juguetes). La <strong>imagen</strong> se usa
          para el carrusel de la portada. El <strong>ícono</strong> es el dibujito que acompaña a la categoría.
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          <strong>Atributos dinámicos</strong>: son las características que describen un producto (ej: talles de ropa,
          capacidad en litros, socket del procesador). Se muestran como filtros y en la ficha del producto.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            Categorías ({categories.length})
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell align="center">Icono</TableCell>
                  <TableCell align="center">Imagen</TableCell>
                  <TableCell align="center">Orden</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {renderCatIcon(c.icon, c.imageUrl, 28)}
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {c.name}
                          </Typography>
                          {c.children?.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              {c.children.length} subcategorías
                            </Typography>
                          )}
                          {!c.isActive && <Chip label="Desactivada" size="small" color="error" sx={{ ml: 1 }} />}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">{c.icon ? <Chip label={c.icon} size="small" variant="outlined" /> : '—'}</TableCell>
                    <TableCell align="center">{c.imageUrl ? <CheckIcon color="success" fontSize="small" /> : '—'}</TableCell>
                    <TableCell align="center">{c.order}</TableCell>
                    <TableCell align="center">
                      <IconButton onClick={() => openEditCategory(c)} title="Editar">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton color="error" onClick={() => deleteCategory(c)} title="Desactivar">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            Atributos dinámicos ({attrs.length})
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell align="center">Tipo</TableCell>
                  <TableCell align="center">Unidad</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attrs.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Typography variant="body2">{a.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.category?.name || 'Todas las categorías'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={ATTR_TYPES.find((t) => t.value === a.type)?.label || a.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">{a.unit || '—'}</TableCell>
                    <TableCell align="center">
                      <IconButton onClick={() => openEditAttr(a)} title="Editar">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      {/* ============ PLANTILLAS ============ */}
      <Box mt={4}>
        <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
          Productos conocidos por categoría
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Definí los productos típicos de cada categoría (ej: «Cuaderno» en Libros y Papelería, «Chompa» en Ropa) con sus
          atributos/etiquetas. Al crear un producto, el vendedor elige el producto conocido de la categoría y los atributos se precargan.
        </Typography>
        <Box display="flex" gap={1} mb={2} flexWrap="wrap" alignItems="center">
          <TextField
            select
            label="Filtrar por categoría"
            value={tplFilter}
            onChange={(e) => setTplFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 260 }}
          >
            <MenuItem value="">Todas las categorías</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <PrimaryButton startIcon={<AddIcon />} onClick={openNewTemplate}>
            Nuevo producto conocido
          </PrimaryButton>
        </Box>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Categoría</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell align="center">Ámbito</TableCell>
                <TableCell align="center">Atributos</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates
                .filter((t) => !tplFilter || String(t.categoryId) === tplFilter)
                .map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.category?.name || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {t.name}
                      </Typography>
                      {!t.isActive && <Chip label="Inactiva" size="small" color="error" sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        variant="outlined"
                        color={t.sellerId ? 'secondary' : 'primary'}
                        label={t.sellerId ? `Tienda (${t.seller?.storeName || 'privada'})` : 'Global'}
                      />
                    </TableCell>
                    <TableCell align="center">{Array.isArray(t.attributes) ? t.attributes.length : 0}</TableCell>
                    <TableCell align="center">
                      <IconButton onClick={() => openEditTemplate(t)} title="Editar">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton color="error" onClick={() => deleteTemplate(t)} title="Eliminar">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              {templates.filter((t) => !tplFilter || String(t.categoryId) === tplFilter).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No hay productos conocidos. Creá uno para precargar atributos en los productos.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* ============ DIALOG CATEGORÍA ============ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCatId ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} mt={1}>
            <Box>
              <TextField
                label="Nombre de la categoría"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                fullWidth
                error={Boolean(formErrors.name)}
                helperText={formErrors.name || 'Ej: Ropa, Bar, Juguetes, Electrodomésticos'}
                required
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                Categoría padre (opcional)
              </Typography>
              <TextField select label="¿Depende de otra categoría?" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} fullWidth>
                <MenuItem value="">Es una categoría principal</MenuItem>
                {categories.filter((c) => !c.parentId).map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    Depende de: {c.name}
                  </MenuItem>
                ))}
              </TextField>
              <FormHelperText>Dejá "principal" si esta categoría es de primer nivel.</FormHelperText>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                Ícono de la categoría
              </Typography>
              <TextField
                select
                label="Elegí un ícono"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                fullWidth
                helperText="Se muestra junto al nombre. Podés elegir de la lista."
              >
                <MenuItem value="">Sin ícono</MenuItem>
                {CATEGORY_ICONS.map((ic) => {
                  const Icon = ic.component;
                  return (
                    <MenuItem key={ic.name} value={ic.name}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Icon fontSize="small" />
                        {ic.label}
                      </Box>
                    </MenuItem>
                  );
                })}
              </TextField>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                Imagen de portada
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Tamaño recomendado: <strong>800 × 600 px</strong> (cuadrado 1:1 ideal para el carrusel). Usá el editor para recortar.
              </Typography>
              <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                <Avatar variant="rounded" sx={{ width: 56, height: 56 }}>
                  {form.imageUrl ? (
                    <img src={resolveImageUrl(form.imageUrl)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : null}
                </Avatar>
                <TextField
                  label="URL de la imagen"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://imagen.com/categoria.jpg"
                  sx={{ flex: 1, minWidth: 220 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ImageIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <SecondaryButton size="small" startIcon={<CropIcon />} onClick={() => { setCropUrl(form.imageUrl || ''); setCropOpen(true); }} disabled={!form.imageUrl}>
                  Recortar
                </SecondaryButton>
              </Box>
            </Box>

            <Box>
              <TextField
                label="Orden en el carrusel"
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: e.target.value })}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <InfoOutlinedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                helperText="Número bajo = aparece primero en la portada. Ej: 1 va antes que 5."
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setDialogOpen(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={saveCategory}>
            {editingCatId ? 'Guardar cambios' : 'Crear categoría'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* ============ DIALOG ATRIBUTO ============ */}
      <Dialog open={attrDialog} onClose={() => setAttrDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingAttrId ? 'Editar atributo' : 'Nuevo atributo'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} mt={1}>
            <Box>
              <TextField
                label="Nombre del atributo"
                value={attrForm.name}
                onChange={(e) => setAttrForm({ ...attrForm, name: e.target.value })}
                fullWidth
                error={Boolean(attrErrors.name)}
                helperText={attrErrors.name || 'Ej: Talle, Color, Capacidad, Socket, Marca'}
                required
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                Tipo de valor
              </Typography>
              <TextField select label="¿Cómo se completa?" value={attrForm.type} onChange={(e) => setAttrForm({ ...attrForm, type: e.target.value })} fullWidth>
                {ATTR_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
              <FormHelperText>{ATTR_TYPES.find((t) => t.value === attrForm.type)?.hint}</FormHelperText>
            </Box>

            <Box>
              <TextField
                select
                label="Categoría a la que aplica"
                value={attrForm.categoryId}
                onChange={(e) => setAttrForm({ ...attrForm, categoryId: e.target.value })}
                fullWidth
                helperText="Elegí la categoría donde se usa este atributo."
              >
                <MenuItem value="">Todas las categorías</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box>
              <TextField
                label="Unidad de medida (opcional)"
                value={attrForm.unit}
                onChange={(e) => setAttrForm({ ...attrForm, unit: e.target.value })}
                fullWidth
                placeholder="Ej: kg, cm, GB, W, litros"
                helperText="Se muestra junto al valor. Ej: 500 GB, 15 kg."
              />
            </Box>

            {attrForm.type === 'SELECT' && (
              <Box>
                <TextField
                  label="Opciones (separadas por coma)"
                  value={attrForm.options}
                  onChange={(e) => setAttrForm({ ...attrForm, options: e.target.value })}
                  fullWidth
                  placeholder="Ej: S, M, L, XL  o  AM4, AM5, LGA1700"
                  error={Boolean(attrErrors.options)}
                  helperText={attrErrors.options || 'Cada opción separada por coma. El comprador elegirá una.'}
                />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setAttrDialog(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={saveAttr}>
            {editingAttrId ? 'Guardar cambios' : 'Crear atributo'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* ============ DIALOG PLANTILLA ============ */}
      <Dialog open={tplDialog} onClose={() => setTplDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTplId ? 'Editar producto conocido' : 'Nuevo producto conocido'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} mt={1}>
            <Box>
              <TextField
                label="Nombre del producto"
                value={tplForm.name}
                onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })}
                fullWidth
                placeholder="Ej: Cuaderno, Bolígrafo, Chompa, Polera"
                helperText="Ej: «Cuaderno» dentro de Libros y Papelería."
                required
              />
            </Box>

            <Box>
              <TextField
                select
                label="Categoría"
                value={tplForm.categoryId}
                onChange={(e) => setTplForm({ ...tplForm, categoryId: e.target.value })}
                fullWidth
                helperText="La categoría donde se ofrece este tipo de producto."
              >
                <MenuItem value="">Seleccioná una categoría</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Atributos del producto (etiquetas)
                </Typography>
                <SecondaryButton
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() =>
                    setTplForm((f) => ({ ...f, attributes: [...f.attributes, { attributeDefinitionId: '', defaultValue: '', isRequired: false }] }))
                  }
                >
                  Agregar atributo
                </SecondaryButton>
              </Box>
              {tplForm.attributes.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  Todavía no agregaste atributos. Usá «Agregar atributo» para sumar los que debe tener este producto.
                </Typography>
              )}
              <Stack spacing={1}>
                {tplForm.attributes.map((row, idx) => (
                  <Box key={idx} display="flex" gap={1} alignItems="center">
                    <TextField
                      select
                      label="Atributo"
                      value={row.attributeDefinitionId}
                      onChange={(e) => {
                        const next = [...tplForm.attributes];
                        next[idx] = { ...next[idx], attributeDefinitionId: Number(e.target.value) };
                        setTplForm((f) => ({ ...f, attributes: next }));
                      }}
                      size="small"
                      sx={{ flex: 1 }}
                    >
                      <MenuItem value="">Seleccioná…</MenuItem>
                      {attrs.map((a) => (
                        <MenuItem key={a.id} value={a.id}>
                          {a.name}
                          {a.unit ? ` (${a.unit})` : ''}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Valor por defecto"
                      value={row.defaultValue}
                      onChange={(e) => {
                        const next = [...tplForm.attributes];
                        next[idx] = { ...next[idx], defaultValue: e.target.value };
                        setTplForm((f) => ({ ...f, attributes: next }));
                      }}
                      size="small"
                      placeholder="Ej: 100"
                      sx={{ flex: 1 }}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={Boolean(row.isRequired)}
                          onChange={(e) => {
                            const next = [...tplForm.attributes];
                            next[idx] = { ...next[idx], isRequired: e.target.checked };
                            setTplForm((f) => ({ ...f, attributes: next }));
                          }}
                        />
                      }
                      label={<Typography variant="caption">Requerido</Typography>}
                      sx={{ m: 0 }}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setTplForm((f) => ({ ...f, attributes: f.attributes.filter((_, i) => i !== idx) }))}
                      title="Quitar"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setTplDialog(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={saveTemplate}>
            {editingTplId ? 'Guardar cambios' : 'Crear producto conocido'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* Editor de recorte para imagen de categoría */}
      <ImageCropDialog
        open={cropOpen}
        imageUrl={cropUrl}
        aspect={1}
        title="Recortar imagen de categoría"
        onClose={() => setCropOpen(false)}
        onUploaded={(url) => {
          setForm((f) => ({ ...f, imageUrl: url }));
          setCropOpen(false);
        }}
      />
    </Box>
  );
}
