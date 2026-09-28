import { useCallback, useRef, useState } from 'react';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Stack,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import { api, getErrorMessage, resolveImageUrl } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface BulkItem {
  id: string;
  url: string;
  name: string;
  price: string;
}

/**
 * Agregar varios productos: carga muchas fotos de distintos productos y publícalos
 * de a uno reutilizando etiquetas/datos base (categoría, condición, precio, stock,
 * garantía, atributos o plantilla) para todos.
 */
export default function SellerBulkProducts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isEmployee = user?.storeRole === 'EMPLOYEE';

  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [condition, setCondition] = useState('NEW');
  const [basePrice, setBasePrice] = useState('');
  const [baseStock, setBaseStock] = useState('');
  const [warranty, setWarranty] = useState('');
  const [description, setDescription] = useState('');

  // Atributos/plantilla reutilizados para todos los productos
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [baseAttrs, setBaseAttrs] = useState<any[]>([]);
  const [baseAttrValues, setBaseAttrValues] = useState<Record<number, string>>({});

  const [items, setItems] = useState<BulkItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get('/products/categories');
      setCategories(res.data.data || []);
    } catch {
      /* silencioso */
    }
  }, []);

  const handleCategoryChange = useCallback(
    async (id: string) => {
      setCategoryId(id);
      setSelectedTemplate('');
      setBaseAttrs([]);
      setBaseAttrValues({});
      try {
        const res = await api.get('/seller/known-products', { params: { categoryId: id } });
        setTemplates(res.data.data || []);
      } catch {
        setTemplates([]);
      }
    },
    [],
  );

  const applyTemplate = useCallback(
    async (tpl: any) => {
      const itemsTpl = tpl.attributes || [];
      setBaseAttrs(itemsTpl);
      const values: Record<number, string> = {};
      itemsTpl.forEach((it: any) => {
        if (it.attributeDefinitionId != null) {
          values[it.attributeDefinitionId] = String(it.defaultValue ?? '').trim();
        }
      });
      setBaseAttrValues(values);
    },
    [],
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      const newItems: BulkItem[] = [];
      for (const file of Array.from(files)) {
        try {
          const fd = new FormData();
          fd.append('image', file);
          const res = await api.post('/seller/upload', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          newItems.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            url: res.data.data.url,
            name: '',
            price: '',
          });
        } catch (err) {
          toast.error(
            t('seller.bulkProducts.errors.uploadFailed', {
              fileName: file.name,
              error: getErrorMessage(err),
            }),
          );
        }
      }
      setItems((prev) => [...prev, ...newItems]);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [],
  );

  const updateItem = (id: string, patch: Partial<BulkItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));

  const publishAll = async () => {
    if (!categoryId) {
      toast.error(t('seller.bulkProducts.errors.selectCategory'));
      return;
    }
    if (items.length === 0) {
      toast.error(t('seller.bulkProducts.errors.uploadAtLeastOne'));
      return;
    }
    const price = basePrice.trim();
    if (!price) {
      toast.error(t('seller.bulkProducts.errors.enterPrice'));
      return;
    }
    setSubmitting(true);
    let okCount = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const attributes = Object.entries(baseAttrValues)
        .filter(([, v]) => String(v ?? '').trim() !== '')
        .map(([defId, value]) => {
          const def = baseAttrs.find((a: any) => String(a.attributeDefinitionId ?? a.id) === defId);
          const v = String(value ?? '').trim();
          if (def?.type === 'NUMBER') return { attributeDefinitionId: Number(defId), valueNumber: Number(v) };
          if (def?.type === 'BOOLEAN') return { attributeDefinitionId: Number(defId), valueBoolean: v === 'true' || v === '1' };
          return { attributeDefinitionId: Number(defId), valueText: v };
        });
      try {
        await api.post('/seller/products', {
          name: it.name.trim() || t('seller.bulkProducts.defaultProductName', { index: i + 1 }),
          categoryId: Number(categoryId),
          description: description.trim() || undefined,
          condition,
          price: Number(it.price.trim() || price),
          stock: Number(baseStock) || 0,
          warrantyInfo: warranty.trim() || undefined,
          attributes: attributes.length > 0 ? attributes : undefined,
          images: [{ url: it.url, isPrimary: true }],
        });
        okCount++;
      } catch (err) {
        toast.error(
          t('seller.bulkProducts.errors.productFailed', {
            index: i + 1,
            name: it.name.trim() || t('seller.bulkProducts.errors.unnamedProduct'),
            error: getErrorMessage(err),
          }),
        );
      }
    }
    setSubmitting(false);
    if (okCount > 0) {
      toast.success(t('seller.bulkProducts.success.published', { count: okCount }));
      navigate('/seller/productos');
    } else {
      toast.error(t('seller.bulkProducts.errors.noneCould'));
    }
  };

  return (
    <Box maxWidth="md" sx={{ mx: 'auto', py: 2 }}>
      <Typography variant="h5" gutterBottom>
        {t('seller.bulkProducts.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {t('seller.bulkProducts.subtitle')}
      </Typography>

      {isEmployee && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('seller.bulkProducts.employeeWarning')}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('seller.bulkProducts.baseData.title')}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label={t('seller.bulkProducts.baseData.categoryLabel')}
              value={categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              fullWidth
              onFocus={() => {
                if (categories.length === 0) loadCategories();
              }}
            >
              <MenuItem value="">{t('seller.bulkProducts.baseData.categoryPlaceholder')}</MenuItem>
              {categories.map((c: any) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label={t('seller.bulkProducts.baseData.conditionLabel')}
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              fullWidth
            >
              <MenuItem value="NEW">{t('seller.bulkProducts.baseData.conditionNew')}</MenuItem>
              <MenuItem value="USED">{t('seller.bulkProducts.baseData.conditionUsed')}</MenuItem>
              <MenuItem value="REFURBISHED">
                {t('seller.bulkProducts.baseData.conditionRefurbished')}
              </MenuItem>
            </TextField>
          </Grid>
          {templates.length > 0 && (
            <Grid item xs={12}>
              <TextField
                select
                label={t('seller.bulkProducts.baseData.templateLabel')}
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value);
                  const tpl = templates.find((t) => String(t.id) === e.target.value);
                  if (tpl) applyTemplate(tpl);
                }}
                fullWidth
                helperText={t('seller.bulkProducts.baseData.templateHelper')}
              >
                <MenuItem value="">{t('seller.bulkProducts.baseData.templateNone')}</MenuItem>
                {templates.map((tpl: any) => (
                  <MenuItem key={tpl.id} value={String(tpl.id)}>
                    {tpl.name}
                    {tpl.sellerId ? '' : t('seller.bulkProducts.baseData.templateGlobalSuffix')}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          <Grid item xs={12} sm={4}>
            <TextField
              label={t('seller.bulkProducts.baseData.basePriceLabel')}
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              fullWidth
              disabled={isEmployee}
              helperText={
                isEmployee
                  ? t('seller.bulkProducts.baseData.basePriceHelperEmployee')
                  : t('seller.bulkProducts.baseData.basePriceHelperSeller')
              }
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label={t('seller.bulkProducts.baseData.baseStockLabel')}
              type="number"
              value={baseStock}
              onChange={(e) => setBaseStock(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label={t('seller.bulkProducts.baseData.warrantyLabel')}
              value={warranty}
              onChange={(e) => setWarranty(e.target.value)}
              fullWidth
              placeholder={t('seller.bulkProducts.baseData.warrantyPlaceholder')}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label={t('seller.bulkProducts.baseData.descriptionLabel')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Grid>
          {baseAttrs.length > 0 && (
            <Grid item xs={12}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {baseAttrs.map((a: any) => (
                  <TextField
                    key={a.attributeDefinitionId ?? a.id}
                    label={a.name}
                    size="small"
                    value={baseAttrValues[a.attributeDefinitionId ?? a.id] ?? ''}
                    onChange={(e) =>
                      setBaseAttrValues((prev) => ({
                        ...prev,
                        [a.attributeDefinitionId ?? a.id]: e.target.value,
                      }))
                    }
                    sx={{ minWidth: 160 }}
                  />
                ))}
              </Stack>
            </Grid>
          )}
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('seller.bulkProducts.photos.title', { count: items.length })}
        </Typography>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        <SecondaryButton
          startIcon={<AddPhotoAlternateIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || items.length >= 50}
        >
          {uploading
            ? t('seller.bulkProducts.photos.uploading')
            : t('seller.bulkProducts.photos.uploadButton')}
        </SecondaryButton>
        {uploading && <CircularProgress size={20} sx={{ ml: 2, verticalAlign: 'middle' }} />}

        {items.length > 0 && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {items.map((it, i) => (
              <Grid item xs={12} sm={6} md={4} key={it.id}>
                <Box
                  sx={{
                    position: 'relative',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1,
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => removeItem(it.id)}
                    sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper' }}
                    title={t('seller.bulkProducts.photos.removeTitle')}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                  <img
                    src={resolveImageUrl(it.url)}
                    alt={t('seller.bulkProducts.photos.itemAlt', { index: i + 1 })}
                    style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {t('seller.bulkProducts.photos.itemLabel', { index: i + 1 })}
                  </Typography>
                  <TextField
                    label={t('seller.bulkProducts.photos.nameLabel')}
                    size="small"
                    fullWidth
                    value={it.name}
                    onChange={(e) => updateItem(it.id, { name: e.target.value })}
                    placeholder={t('seller.bulkProducts.photos.namePlaceholder', { index: i + 1 })}
                    sx={{ mt: 1 }}
                  />
                  <TextField
                    label={t('seller.bulkProducts.photos.priceLabel')}
                    type="number"
                    size="small"
                    fullWidth
                    value={it.price}
                    onChange={(e) => updateItem(it.id, { price: e.target.value })}
                    placeholder={basePrice || t('seller.bulkProducts.photos.pricePlaceholder')}
                    disabled={isEmployee}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      <Stack direction="row" spacing={2}>
        <PrimaryButton
          startIcon={<LibraryAddIcon />}
          onClick={publishAll}
          disabled={submitting || items.length === 0}
        >
          {submitting ? (
            <>
              <CircularProgress size={18} sx={{ mr: 1 }} /> {t('seller.bulkProducts.actions.publishing')}
            </>
          ) : (
            t('seller.bulkProducts.actions.publish', { count: items.length })
          )}
        </PrimaryButton>
        <SecondaryButton onClick={() => navigate('/seller/productos')}>
          {t('seller.bulkProducts.actions.cancel')}
        </SecondaryButton>
      </Stack>

      {items.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
          <Chip
            icon={<DeleteIcon />}
            label={t('seller.bulkProducts.actions.clearPhotos')}
            onClick={() => setItems([])}
            size="small"
          />
        </Stack>
      )}
    </Box>
  );
}
