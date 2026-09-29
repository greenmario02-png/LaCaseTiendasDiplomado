import { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
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

export default function AdminCategories() {
  const { t } = useTranslation();
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

  const ATTR_TYPES = [
    { value: 'TEXT', label: t('admin.categories.attrType.text.label'), hint: t('admin.categories.attrType.text.hint') },
    { value: 'NUMBER', label: t('admin.categories.attrType.number.label'), hint: t('admin.categories.attrType.number.hint') },
    { value: 'SELECT', label: t('admin.categories.attrType.select.label'), hint: t('admin.categories.attrType.select.hint') },
    { value: 'BOOLEAN', label: t('admin.categories.attrType.boolean.label'), hint: t('admin.categories.attrType.boolean.hint') },
  ];

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
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = t('admin.categories.validation.nameRequired');
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
        toast.success(t('admin.categories.toast.categoryUpdated'));
      } else {
        await api.post('/admin/categories', payload);
        toast.success(t('admin.categories.toast.categoryCreated'));
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
      toast.success(t('admin.categories.toast.categoryDeactivated'));
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
    if (!attrForm.name.trim()) errs.name = t('admin.categories.validation.attrNameRequired');
    if (attrForm.type === 'SELECT' && !attrForm.options.trim()) errs.options = t('admin.categories.validation.attrOptionsRequired');
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
        toast.success(t('admin.categories.toast.attributeUpdated'));
      } else {
        await api.post('/admin/attributes', payload);
        toast.success(t('admin.categories.toast.attributeCreated'));
      }
      setAttrDialog(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const deleteAttr = async (a: any) => {
    // No hay endpoint DELETE; lo mostramos como no editable por ahora
    toast.error(t('admin.categories.notAvailable'));
  };

  // ---------- PLANTILLAS ----------

  const openNewTemplate = () => {
    setTplForm({ name: '', categoryId: '', attributes: [] });
    setEditingTplId(null);
    setTplDialog(true);
  };

  const openEditTemplate = (t2: any) => {
    const parsed = Array.isArray(t2.attributes) ? t2.attributes : [];
    setTplForm({
      name: t2.name,
      categoryId: String(t2.categoryId ?? ''),
      attributes: parsed.map((a: any) => ({
        attributeDefinitionId: typeof a.attributeDefinitionId === 'number' ? a.attributeDefinitionId : '',
        defaultValue: typeof a.defaultValue === 'string' ? a.defaultValue : '',
        isRequired: Boolean(a.isRequired),
      })),
    });
    setEditingTplId(t2.id);
    setTplDialog(true);
  };

  const saveTemplate = async () => {
    if (!tplForm.name.trim()) {
      toast.error(t('admin.categories.validation.templateNameRequired'));
      return;
    }
    if (!tplForm.categoryId) {
      toast.error(t('admin.categories.validation.templateCategoryRequired'));
      return;
    }
    const attributes = tplForm.attributes
      .filter((a) => a.attributeDefinitionId !== '')
      .map((a) => ({ attributeDefinitionId: a.attributeDefinitionId, defaultValue: a.defaultValue.trim(), isRequired: Boolean(a.isRequired) }));
    try {
      const payload = { name: tplForm.name.trim(), categoryId: Number(tplForm.categoryId), attributes };
      if (editingTplId) {
        await api.put(`/admin/known-products/${editingTplId}`, payload);
        toast.success(t('admin.categories.toast.templateUpdated'));
      } else {
        await api.post('/admin/known-products', payload);
        toast.success(t('admin.categories.toast.templateCreated'));
      }
      setTplDialog(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const deleteTemplate = async (t2: any) => {
    if (!window.confirm(t('admin.categories.tplDialog.deleteConfirm', { name: t2.name }))) return;
    try {
      await api.delete(`/admin/known-products/${t2.id}`);
      toast.success(t('admin.categories.toast.templateDeleted'));
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
          {t('admin.categories.newCategory')}
        </PrimaryButton>
        <SecondaryButton startIcon={<AddIcon />} onClick={openNewAttr}>
          {t('admin.categories.newAttribute')}
        </SecondaryButton>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <Trans i18nKey="admin.categories.info.categoriesText" components={{ b: <strong /> }} />
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          <Trans i18nKey="admin.categories.info.attributesText" components={{ b: <strong /> }} />
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            {t('admin.categories.sectionTitle', { count: categories.length })}
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('admin.categories.table.name')}</TableCell>
                  <TableCell align="center">{t('admin.categories.table.icon')}</TableCell>
                  <TableCell align="center">{t('admin.categories.table.image')}</TableCell>
                  <TableCell align="center">{t('admin.categories.table.order')}</TableCell>
                  <TableCell align="center">{t('admin.categories.table.actions')}</TableCell>
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
                              {t('admin.categories.subcategoriesCount', { count: c.children.length })}
                            </Typography>
                          )}
                          {!c.isActive && <Chip label={t('admin.categories.status.deactivated')} size="small" color="error" sx={{ ml: 1 }} />}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">{c.icon ? <Chip label={c.icon} size="small" variant="outlined" /> : '—'}</TableCell>
                    <TableCell align="center">{c.imageUrl ? <CheckIcon color="success" fontSize="small" /> : '—'}</TableCell>
                    <TableCell align="center">{c.order}</TableCell>
                    <TableCell align="center">
                      <IconButton onClick={() => openEditCategory(c)} title={t('admin.common.edit')}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton color="error" onClick={() => deleteCategory(c)} title={t('admin.categories.tooltip.deactivate')}>
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
            {t('admin.categories.attrSectionTitle', { count: attrs.length })}
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('admin.categories.attrTable.name')}</TableCell>
                  <TableCell align="center">{t('admin.categories.attrTable.type')}</TableCell>
                  <TableCell align="center">{t('admin.categories.attrTable.unit')}</TableCell>
                  <TableCell align="center">{t('admin.categories.attrTable.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attrs.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Typography variant="body2">{a.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.category?.name || t('admin.categories.allCategories')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={ATTR_TYPES.find((tp) => tp.value === a.type)?.label || a.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">{a.unit || '—'}</TableCell>
                    <TableCell align="center">
                      <IconButton onClick={() => openEditAttr(a)} title={t('admin.common.edit')}>
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
          {t('admin.categories.templates.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {t('admin.categories.templates.description')}
        </Typography>
        <Box display="flex" gap={1} mb={2} flexWrap="wrap" alignItems="center">
          <TextField
            select
            label={t('admin.categories.templates.filterLabel')}
            value={tplFilter}
            onChange={(e) => setTplFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 260 }}
          >
            <MenuItem value="">{t('admin.categories.allCategories')}</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <PrimaryButton startIcon={<AddIcon />} onClick={openNewTemplate}>
            {t('admin.categories.templates.newTemplate')}
          </PrimaryButton>
        </Box>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.categories.templates.table.category')}</TableCell>
                <TableCell>{t('admin.categories.templates.table.name')}</TableCell>
                <TableCell align="center">{t('admin.categories.templates.table.scope')}</TableCell>
                <TableCell align="center">{t('admin.categories.templates.table.attributes')}</TableCell>
                <TableCell align="center">{t('admin.categories.templates.table.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates
                .filter((t2) => !tplFilter || String(t2.categoryId) === tplFilter)
                .map((t2) => (
                  <TableRow key={t2.id}>
                    <TableCell>{t2.category?.name || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {t2.name}
                      </Typography>
                      {!t2.isActive && <Chip label={t('admin.categories.templates.status.inactive')} size="small" color="error" sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        variant="outlined"
                        color={t2.sellerId ? 'secondary' : 'primary'}
                        label={
                          t2.sellerId
                            ? t('admin.categories.templates.scopeStore', {
                                storeName: t2.seller?.storeName || t('admin.categories.templates.privateStoreFallback'),
                              })
                            : t('admin.categories.templates.scopeGlobal')
                        }
                      />
                    </TableCell>
                    <TableCell align="center">{Array.isArray(t2.attributes) ? t2.attributes.length : 0}</TableCell>
                    <TableCell align="center">
                      <IconButton onClick={() => openEditTemplate(t2)} title={t('admin.common.edit')}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton color="error" onClick={() => deleteTemplate(t2)} title={t('admin.common.delete')}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              {templates.filter((t2) => !tplFilter || String(t2.categoryId) === tplFilter).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary">
                      {t('admin.categories.templates.empty')}
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
        <DialogTitle>{editingCatId ? t('admin.categories.dialog.editTitle') : t('admin.categories.dialog.newTitle')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} mt={1}>
            <Box>
              <TextField
                label={t('admin.categories.dialog.nameLabel')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                fullWidth
                error={Boolean(formErrors.name)}
                helperText={formErrors.name || t('admin.categories.dialog.nameHelper')}
                required
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                {t('admin.categories.dialog.parentSectionTitle')}
              </Typography>
              <TextField select label={t('admin.categories.dialog.parentSelectLabel')} value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} fullWidth>
                <MenuItem value="">{t('admin.categories.dialog.parentNone')}</MenuItem>
                {categories.filter((c) => !c.parentId).map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {t('admin.categories.dialog.parentOption', { name: c.name })}
                  </MenuItem>
                ))}
              </TextField>
              <FormHelperText>{t('admin.categories.dialog.parentHelper')}</FormHelperText>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                {t('admin.categories.dialog.iconSectionTitle')}
              </Typography>
              <TextField
                select
                label={t('admin.categories.dialog.iconSelectLabel')}
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                fullWidth
                helperText={t('admin.categories.dialog.iconHelper')}
              >
                <MenuItem value="">{t('admin.categories.dialog.iconNone')}</MenuItem>
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
                {t('admin.categories.dialog.imageSectionTitle')}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                <Trans i18nKey="admin.categories.dialog.imageSizeHelper" components={{ b: <strong /> }} />
              </Typography>
              <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                <Avatar variant="rounded" sx={{ width: 56, height: 56 }}>
                  {form.imageUrl ? (
                    <img src={resolveImageUrl(form.imageUrl)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : null}
                </Avatar>
                <TextField
                  label={t('admin.categories.dialog.imageUrlLabel')}
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder={t('admin.categories.dialog.imageUrlPlaceholder')}
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
                  {t('admin.categories.dialog.cropButton')}
                </SecondaryButton>
              </Box>
            </Box>

            <Box>
              <TextField
                label={t('admin.categories.dialog.orderLabel')}
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
                helperText={t('admin.categories.dialog.orderHelper')}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setDialogOpen(false)}>{t('admin.common.cancel')}</GhostButton>
          <PrimaryButton onClick={saveCategory}>
            {editingCatId ? t('admin.common.saveChanges') : t('admin.categories.dialog.createCategory')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* ============ DIALOG ATRIBUTO ============ */}
      <Dialog open={attrDialog} onClose={() => setAttrDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingAttrId ? t('admin.categories.attrDialog.editTitle') : t('admin.categories.attrDialog.newTitle')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} mt={1}>
            <Box>
              <TextField
                label={t('admin.categories.attrDialog.nameLabel')}
                value={attrForm.name}
                onChange={(e) => setAttrForm({ ...attrForm, name: e.target.value })}
                fullWidth
                error={Boolean(attrErrors.name)}
                helperText={attrErrors.name || t('admin.categories.attrDialog.nameHelper')}
                required
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                {t('admin.categories.attrDialog.typeSectionTitle')}
              </Typography>
              <TextField select label={t('admin.categories.attrDialog.typeSelectLabel')} value={attrForm.type} onChange={(e) => setAttrForm({ ...attrForm, type: e.target.value })} fullWidth>
                {ATTR_TYPES.map((tp) => (
                  <MenuItem key={tp.value} value={tp.value}>
                    {tp.label}
                  </MenuItem>
                ))}
              </TextField>
              <FormHelperText>{ATTR_TYPES.find((tp) => tp.value === attrForm.type)?.hint}</FormHelperText>
            </Box>

            <Box>
              <TextField
                select
                label={t('admin.categories.attrDialog.categoryLabel')}
                value={attrForm.categoryId}
                onChange={(e) => setAttrForm({ ...attrForm, categoryId: e.target.value })}
                fullWidth
                helperText={t('admin.categories.attrDialog.categoryHelper')}
              >
                <MenuItem value="">{t('admin.categories.allCategories')}</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box>
              <TextField
                label={t('admin.categories.attrDialog.unitLabel')}
                value={attrForm.unit}
                onChange={(e) => setAttrForm({ ...attrForm, unit: e.target.value })}
                fullWidth
                placeholder={t('admin.categories.attrDialog.unitPlaceholder')}
                helperText={t('admin.categories.attrDialog.unitHelper')}
              />
            </Box>

            {attrForm.type === 'SELECT' && (
              <Box>
                <TextField
                  label={t('admin.categories.attrDialog.optionsLabel')}
                  value={attrForm.options}
                  onChange={(e) => setAttrForm({ ...attrForm, options: e.target.value })}
                  fullWidth
                  placeholder={t('admin.categories.attrDialog.optionsPlaceholder')}
                  error={Boolean(attrErrors.options)}
                  helperText={attrErrors.options || t('admin.categories.attrDialog.optionsHelper')}
                />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setAttrDialog(false)}>{t('admin.common.cancel')}</GhostButton>
          <PrimaryButton onClick={saveAttr}>
            {editingAttrId ? t('admin.common.saveChanges') : t('admin.categories.attrDialog.createAttribute')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* ============ DIALOG PLANTILLA ============ */}
      <Dialog open={tplDialog} onClose={() => setTplDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTplId ? t('admin.categories.tplDialog.editTitle') : t('admin.categories.tplDialog.newTitle')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} mt={1}>
            <Box>
              <TextField
                label={t('admin.categories.tplDialog.nameLabel')}
                value={tplForm.name}
                onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })}
                fullWidth
                placeholder={t('admin.categories.tplDialog.namePlaceholder')}
                helperText={t('admin.categories.tplDialog.nameHelper')}
                required
              />
            </Box>

            <Box>
              <TextField
                select
                label={t('admin.categories.tplDialog.categoryLabel')}
                value={tplForm.categoryId}
                onChange={(e) => setTplForm({ ...tplForm, categoryId: e.target.value })}
                fullWidth
                helperText={t('admin.categories.tplDialog.categoryHelper')}
              >
                <MenuItem value="">{t('admin.categories.tplDialog.selectCategoryPlaceholder')}</MenuItem>
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
                  {t('admin.categories.tplDialog.attributesTitle')}
                </Typography>
                <SecondaryButton
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() =>
                    setTplForm((f) => ({ ...f, attributes: [...f.attributes, { attributeDefinitionId: '', defaultValue: '', isRequired: false }] }))
                  }
                >
                  {t('admin.categories.tplDialog.addAttribute')}
                </SecondaryButton>
              </Box>
              {tplForm.attributes.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  {t('admin.categories.tplDialog.noAttributesYet')}
                </Typography>
              )}
              <Stack spacing={1}>
                {tplForm.attributes.map((row, idx) => (
                  <Box key={idx} display="flex" gap={1} alignItems="center">
                    <TextField
                      select
                      label={t('admin.categories.tplDialog.attributeLabel')}
                      value={row.attributeDefinitionId}
                      onChange={(e) => {
                        const next = [...tplForm.attributes];
                        next[idx] = { ...next[idx], attributeDefinitionId: Number(e.target.value) };
                        setTplForm((f) => ({ ...f, attributes: next }));
                      }}
                      size="small"
                      sx={{ flex: 1 }}
                    >
                      <MenuItem value="">{t('admin.categories.tplDialog.selectAttributePlaceholder')}</MenuItem>
                      {attrs.map((a) => (
                        <MenuItem key={a.id} value={a.id}>
                          {a.name}
                          {a.unit ? ` (${a.unit})` : ''}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label={t('admin.categories.tplDialog.defaultValueLabel')}
                      value={row.defaultValue}
                      onChange={(e) => {
                        const next = [...tplForm.attributes];
                        next[idx] = { ...next[idx], defaultValue: e.target.value };
                        setTplForm((f) => ({ ...f, attributes: next }));
                      }}
                      size="small"
                      placeholder={t('admin.categories.tplDialog.defaultValuePlaceholder')}
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
                      label={<Typography variant="caption">{t('admin.categories.tplDialog.requiredLabel')}</Typography>}
                      sx={{ m: 0 }}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setTplForm((f) => ({ ...f, attributes: f.attributes.filter((_, i) => i !== idx) }))}
                      title={t('admin.categories.tplDialog.removeTooltip')}
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
          <GhostButton onClick={() => setTplDialog(false)}>{t('admin.common.cancel')}</GhostButton>
          <PrimaryButton onClick={saveTemplate}>
            {editingTplId ? t('admin.common.saveChanges') : t('admin.categories.tplDialog.createTemplate')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* Editor de recorte para imagen de categoría */}
      <ImageCropDialog
        open={cropOpen}
        imageUrl={cropUrl}
        aspect={1}
        title={t('admin.categories.cropDialogTitle')}
        onClose={() => setCropOpen(false)}
        onUploaded={(url) => {
          setForm((f) => ({ ...f, imageUrl: url }));
          setCropOpen(false);
        }}
      />
    </Box>
  );
}
