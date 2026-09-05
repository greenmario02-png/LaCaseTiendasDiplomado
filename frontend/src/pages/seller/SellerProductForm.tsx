import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Switch,
  FormControlLabel,
  InputAdornment,
  IconButton,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import AddIcon from '@mui/icons-material/Add';
import { api } from '../../services/api';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';
import ProductCard from '../../components/ui/ProductCard';

const WIZARD_STEPS = ['Información', 'Fotos', 'Atributos', 'Vista previa'];

export default function SellerProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const isEmployee = user?.storeRole === 'EMPLOYEE';
  const isEdit = Boolean(id);

  const [categories, setCategories] = useState<any[]>([]);
  const [attrs, setAttrs] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    name: '',
    categoryId: '',
    description: '',
    condition: 'NEW',
    price: '',
    originalPrice: '',
    stock: '0',
    sku: '',
    warrantyInfo: '',
    attributes: [],
    // Subasta
    asAuction: false,
    auctionStartingPrice: '',
    auctionMinIncrement: '1',
    auctionMaxIncrement: '100',
    auctionReservePrice: '',
    auctionBuyNowPrice: '',
    auctionExtensionMinutes: '0',
    auctionIncrementType: 'dynamic',
    auctionEndDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<Array<{ url: string; isPrimary?: boolean }>>([]);
  const [uploading, setUploading] = useState(false);

  // Wizard: paso activo + atributos de la categoría descartados con la X
  const [activeStep, setActiveStep] = useState(0);
  const [removedAttrs, setRemovedAttrs] = useState<number[]>([]);

  // Atributos dinámicos: definiciones agregadas a mano (+), sugerencias de valores y diálogo de búsqueda
  const [customAttrs, setCustomAttrs] = useState<any[]>([]);
  const [attrSuggestions, setAttrSuggestions] = useState<Record<number, string[]>>({});
  const [attrDialogOpen, setAttrDialogOpen] = useState(false);
  const [defsQuery, setDefsQuery] = useState('');
  const [defOptions, setDefOptions] = useState<any[]>([]);
  // Crear atributos nuevos con comas (tipo etiquetas) → attribute_definitions globales
  const [bulkNames, setBulkNames] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');

  // Productos conocidos por categoría (globales del admin + presets propios)
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [newKnownName, setNewKnownName] = useState('');
  const [knownLoading, setKnownLoading] = useState(false);

  const close = () => navigate('/seller/productos');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('image', file);
        const { data } = await api.post('/seller/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setImages((prev) => [...prev, { url: data.data.url, isPrimary: prev.length === 0 }]);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (url: string) => {
    setImages((prev) => {
      const next = prev.filter((i) => i.url !== url);
      return next.map((img, i) => ({ ...img, isPrimary: i === 0 }));
    });
  };

  const setPrimary = (url: string) => {
    setImages((prev) => prev.map((img) => ({ ...img, isPrimary: img.url === url })));
  };

  const loadAttrs = async (categoryId: number) => {
    try {
      const res = await api.get(`/products/categories/${categoryId}/attributes`);
      setAttrs(res.data.data);
      return res.data.data;
    } catch {
      setAttrs([]);
      return [];
    }
  };

  useEffect(() => {
    api.get('/products/categories').then((res) => setCategories(res.data.data));
    const copyData = (location.state as any)?.copyData;
    if (!isEdit && copyData) {
      // Precarga de "copiar producto": datos copiados SIN imagen ni precio
      setForm({
        ...form,
        name: copyData.name ?? '',
        categoryId: copyData.categoryId ?? '',
        description: copyData.description ?? '',
        condition: copyData.condition ?? 'NEW',
        warrantyInfo: copyData.warrantyInfo ?? '',
        price: '',
        originalPrice: '',
        stock: '0',
        sku: '',
        attributes: (copyData.attributes ?? []).map((a: any) => ({
          attributeDefinitionId: a.attributeDefinitionId,
          value: a.valueText ?? a.valueNumber ?? '',
        })),
      });
      setSelectedTemplate('');
      loadAttrs(copyData.categoryId).then((defs) => {
        const usedIds = (copyData.attributes ?? []).map((a: any) => a.attributeDefinitionId);
        const missing = usedIds.filter((usedId: number) => !defs.some((d: any) => d.id === usedId));
        if (missing.length > 0) {
          api
            .get('/products/attribute-definitions', { params: { ids: missing.join(',') } })
            .then((dres) => setCustomAttrs(dres.data.data))
            .catch(() => {
              // atributos opcionales: si falla la carga de defs, se omiten
            });
        }
      });
    }
    if (isEdit) {
      api.get(`/products/${id}`).then(async (res) => {
        const p = res.data.data;
        setForm({
          name: p.name,
          categoryId: p.categoryId,
          description: p.description || '',
          condition: p.condition,
          price: String(p.price),
          originalPrice: p.originalPrice ? String(p.originalPrice) : '',
          stock: String(p.stock),
          sku: p.sku,
          warrantyInfo: p.warrantyInfo || '',
          attributes: (p.attributes || []).map((a: any) => ({
            attributeDefinitionId: a.attributeDefinitionId,
            value: a.valueText ?? a.valueNumber ?? '',
          })),
        });
        setImages((p.images || []).map((img: any, i: number) => ({ url: img.url, isPrimary: i === 0 })));
        // En edición también cargamos las definiciones de la categoría y las de
        // atributos agregados a mano que no pertenecen a la categoría.
        const defs = await loadAttrs(p.categoryId);
        const usedIds = (p.attributes || []).map((a: any) => a.attributeDefinitionId);
        const missing = usedIds.filter((usedId: number) => !defs.some((d: any) => d.id === usedId));
        if (missing.length > 0) {
          try {
            const dres = await api.get('/products/attribute-definitions', { params: { ids: missing.join(',') } });
            setCustomAttrs(dres.data.data);
          } catch {
            // silencio: si no cargan las definiciones extra, se pierden solo del form
          }
        }
      });
    }
  }, [id, isEdit]);

  const handleCategoryChange = (categoryId: number) => {
    setForm({ ...form, categoryId });
    setSelectedTemplate('');
    setNewKnownName('');
    setRemovedAttrs([]);
    loadAttrs(categoryId);
    api
      .get('/seller/known-products', { params: { categoryId } })
      .then((res) => setTemplates(res.data.data))
      .catch(() => setTemplates([]));
  };

  // Crea un producto conocido nuevo desde el form (autocompletado) y lo deja
  // seleccionado. Los atributos se le asignan después con el botón '+' de comas.
  const createKnownProduct = async () => {
    if (!newKnownName.trim() || !form.categoryId) return;
    setKnownLoading(true);
    try {
      const { data } = await api.post('/seller/known-products', {
        name: newKnownName.trim(),
        categoryId: Number(form.categoryId),
        attributes: [],
      });
      toast.success('Producto conocido creado. Asignale atributos con el botón +');
      setTemplates((prev) => [...prev, data.data]);
      setSelectedTemplate(String(data.data.id));
      setNewKnownName('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setKnownLoading(false);
    }
  };

  // Aplica una plantilla: precarga las definiciones de atributo con su valor por
  // defecto (agrega a mano las que no pertenecen a la categoría seleccionada).
  const applyTemplate = (tpl: any) => {
    const items: any[] = tpl?.attributes || [];
    if (items.length === 0) return;
    const known = attrs.filter((a: any) => items.some((t: any) => t.attributeDefinitionId === a.id));
    const knownIds = new Set(known.map((a: any) => a.id));
    const missingIds = items
      .filter((t: any) => !knownIds.has(t.attributeDefinitionId))
      .map((t: any) => t.attributeDefinitionId);

    const fill = (defs: any[]) => {
      const defMap = new Map(defs.map((d: any) => [d.id, d]));
      setCustomAttrs((prev) => {
        const next = [...prev];
        for (const t of items) {
          const def = defMap.get(t.attributeDefinitionId);
          if (def && !next.some((a) => a.id === def.id)) next.push(def);
        }
        return next;
      });
      setForm((f: any) => {
        let attributes = [...f.attributes];
        for (const t of items) {
          const def = defMap.get(t.attributeDefinitionId);
          if (!def) continue;
          let value = String(t.defaultValue ?? '').trim();
          if (def.type === 'BOOLEAN') value = value === 'true' || value === '1' ? 'true' : 'false';
          attributes = [...attributes.filter((a: any) => a.attributeDefinitionId !== def.id), { attributeDefinitionId: def.id, value }];
        }
        return { ...f, attributes };
      });
    };

    fill(known);
    if (missingIds.length > 0) {
      api
        .get('/products/attribute-definitions', { params: { ids: missingIds.join(',') } })
        .then((res) => fill([...known, ...res.data.data]))
        .catch(() => {
          // silencio: si no cargan las definiciones extra, quedan las de la categoría
        });
    }
  };

  // Sugiere un SKU con el prefijo de la categoría (formato: PRO-0001). El backend
  // genera el definitivo si el campo queda en blanco al crear.
  const handleGenerateSku = () => {
    const cat = categories.find((c: any) => c.id === form.categoryId);
    const prefix = (cat?.name ?? 'GEN').substring(0, 3).toUpperCase();
    setForm({ ...form, sku: `${prefix}-${String(Math.floor(Math.random() * 9000) + 1000)}` });
  };

  const setAttrValue = (attrId: number, value: string) => {
    setForm((f: any) => {
      const existing = f.attributes.filter((a: any) => a.attributeDefinitionId !== attrId);
      return { ...f, attributes: [...existing, { attributeDefinitionId: attrId, value }] };
    });
  };

  // Quitar un atributo (con la X): lo saca del form y si es de la categoría lo
  // oculta para que no vuelva a mostrarse como campo por completar.
  const removeAttr = (attrId: number, fromCategory = false) => {
    if (fromCategory) {
      setRemovedAttrs((prev) => (prev.includes(attrId) ? prev : [...prev, attrId]));
    } else {
      setCustomAttrs((prev) => prev.filter((a) => a.id !== attrId));
    }
    setForm((f: any) => ({ ...f, attributes: f.attributes.filter((a: any) => a.attributeDefinitionId !== attrId) }));
  };

  // Agregar una definición de atributo a mano (botón "+")
  const handleAddDef = (def: any) => {
    setCustomAttrs((prev) => (prev.some((a) => a.id === def.id) ? prev : [...prev, def]));
    setRemovedAttrs((prev) => prev.filter((x) => x !== def.id));
    setForm((f: any) => {
      const already = f.attributes.some((a: any) => a.attributeDefinitionId === def.id);
      return already ? f : { ...f, attributes: [...f.attributes, { attributeDefinitionId: def.id, value: '' }] };
    });
  };

  // Crear atributos nuevos separados por coma (etiquetas) → van a attribute_definitions globales
  const handleBulkCreate = async () => {
    setBulkError('');
    const raw = bulkNames.trim();
    if (!raw) {
      setBulkError('Escribí al menos un nombre.');
      return;
    }
    setBulkLoading(true);
    try {
      const { data } = await api.post('/seller/attributes', { names: raw });
      const defs: any[] = data.data;
      if (!defs.length) {
        setBulkError('No se pudo crear ningún atributo.');
        return;
      }
      setCustomAttrs((prev) => [...prev, ...defs.filter((d) => !prev.some((a) => a.id === d.id))]);
      setForm((f: any) => {
        const next = [...f.attributes];
        for (const d of defs) {
          if (!next.some((a: any) => a.attributeDefinitionId === d.id)) {
            next.push({ attributeDefinitionId: d.id, value: '' });
          }
        }
        return { ...f, attributes: next };
      });
      toast.success(`Se crearon ${defs.length} atributo(s). Asignales un valor a cada uno.`);
      setBulkNames('');
      setAttrDialogOpen(false);
      setDefsQuery('');
    } catch (err) {
      setBulkError(getErrorMessage(err));
    } finally {
      setBulkLoading(false);
    }
  };

  // Autocompletado: valores ya usados para una definición (TEXT)
  const loadValueSuggestions = async (attrId: number) => {
    if (attrSuggestions[attrId]) return;
    try {
      const { data } = await api.get('/products/attribute-values', { params: { attributeDefinitionId: attrId } });
      setAttrSuggestions((prev) => ({ ...prev, [attrId]: data.data }));
    } catch {
      // silencio: sin sugerencias el input sigue siendo funcional
    }
  };

  // Debounce de la búsqueda de definiciones para el diálogo "+"
  useEffect(() => {
    if (!attrDialogOpen) return;
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/products/attribute-definitions', {
          params: { q: defsQuery.trim() || undefined },
        });
        const used = new Set([...attrs.map((a) => a.id), ...customAttrs.map((a) => a.id)]);
        setDefOptions(data.data.filter((d: any) => !used.has(d.id)));
      } catch {
        setDefOptions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [attrDialogOpen, defsQuery, attrs, customAttrs]);

  const attrLabel = (attr: any) => `${attr.name}${attr.unit ? ` (${attr.unit})` : ''}`;

  // Renderiza el campo de entrada para una definición de atributo (compartido
  // entre atributos de la categoría y los agregados a mano).
  const renderAttrInput = (attr: any, keyPrefix: string) => {
    const current = form.attributes.find((a: any) => a.attributeDefinitionId === attr.id);
    const label = attrLabel(attr);
    const input =
      attr.type === 'SELECT' ? (
        <TextField
          select
          label={label}
          value={current?.value || ''}
          onChange={(e) => setAttrValue(attr.id, e.target.value)}
          fullWidth
          size="small"
        >
          {(attr.options?.values ?? []).map((opt: string) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
        </TextField>
      ) : attr.type === 'NUMBER' ? (
        <TextField
          label={label}
          type="number"
          value={current?.value || ''}
          onChange={(e) => setAttrValue(attr.id, e.target.value)}
          fullWidth
          size="small"
        />
      ) : attr.type === 'BOOLEAN' ? (
        <TextField
          select
          label={label}
          value={current?.value || ''}
          onChange={(e) => setAttrValue(attr.id, e.target.value)}
          fullWidth
          size="small"
        >
          <MenuItem value="true">Sí</MenuItem>
          <MenuItem value="false">No</MenuItem>
        </TextField>
      ) : (
        <Autocomplete
          freeSolo
          size="small"
          options={attrSuggestions[attr.id] || []}
          inputValue={current?.value || ''}
          onInputChange={(_e, v) => setAttrValue(attr.id, v)}
          onFocus={() => loadValueSuggestions(attr.id)}
          renderInput={(params) => <TextField {...params} label={label} />}
        />
      );
    return (
      <Grid item xs={12} sm={6} key={`${keyPrefix}-${attr.id}`}>
        <Box display="flex" alignItems="flex-start" gap={0.5}>
          <Box flexGrow={1}>{input}</Box>
          <IconButton
            size="small"
            onClick={() => removeAttr(attr.id, keyPrefix === 'cat')}
            title={`Quitar ${attr.name}`}
            sx={{ mt: 0.5, flexShrink: 0 }}
          >
            <CloseIcon fontSize="small" color="error" />
          </IconButton>
        </Box>
      </Grid>
    );
  };

  const validateStep = (step: number): string => {
    if (step === 0) {
      if (!form.name.trim()) return 'Escribí el nombre del producto.';
      if (!form.categoryId) return 'Elegí la categoría del producto.';
      if (!form.asAuction && !form.price) return 'Indicá el precio del producto.';
      if (form.asAuction && !form.auctionEndDate) return 'Para subasta, indicá la fecha de fin.';
    }
    return '';
  };

  const handleNext = () => {
    const v = validateStep(activeStep);
    if (v) {
      setError(v);
      return;
    }
    setError('');
    setActiveStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };

  const handleBack = () => {
    setError('');
    setActiveStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      // Publicar como SUBASTA
      if (form.asAuction) {
        if (!form.auctionEndDate) {
          setError('Para subasta, indicá la fecha de fin');
          setLoading(false);
          return;
        }
        const auctionPayload = {
          title: form.name,
          description: form.description || undefined,
          categoryId: Number(form.categoryId),
          startingPrice: Number(form.auctionStartingPrice || form.price),
          minIncrement: Number(form.auctionMinIncrement) || 1,
          maxIncrement: Number(form.auctionMaxIncrement) || 100,
          reservePrice: form.auctionReservePrice ? Number(form.auctionReservePrice) : undefined,
          buyNowPrice: form.auctionBuyNowPrice ? Number(form.auctionBuyNowPrice) : undefined,
          extensionMinutes: Number(form.auctionExtensionMinutes) || 0,
          incrementType: form.auctionIncrementType || 'dynamic',
          endDate: new Date(form.auctionEndDate).toISOString(),
        };
        await api.post('/auctions', auctionPayload);
        toast.success('Subasta creada. Aparecerá en la sección de subastas.');
        close();
        return;
      }

      const payload: any = {
        name: form.name,
        categoryId: Number(form.categoryId),
        description: form.description,
        condition: form.condition,
        price: Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
        stock: Number(form.stock),
        sku: form.sku,
        warrantyInfo: form.warrantyInfo || undefined,
      };
      if (images.length > 0) {
        payload.images = images;
      }
      if (form.attributes.length > 0) {
        payload.attributes = form.attributes
          .filter((a: any) => !removedAttrs.includes(a.attributeDefinitionId))
          .map((a: any) => {
            const def = attrs.find((x) => x.id === a.attributeDefinitionId) ?? customAttrs.find((x) => x.id === a.attributeDefinitionId);
            if (def?.type === 'NUMBER') return { attributeDefinitionId: a.attributeDefinitionId, valueNumber: Number(a.value) };
            if (def?.type === 'BOOLEAN') return { attributeDefinitionId: a.attributeDefinitionId, valueBoolean: a.value === 'true' };
            return { attributeDefinitionId: a.attributeDefinitionId, valueText: String(a.value) };
          });
      }

      if (isEdit) {
        await api.put(`/seller/products/${id}`, payload);
        toast.success('Producto actualizado');
      } else {
        await api.post('/seller/products', payload);
        toast.success('Producto creado. Espera la moderación del admin.');
      }
      close();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Objeto para la vista previa del card (ProductCard)
  const previewProduct: any = {
    id: 0,
    name: form.name || 'Sin nombre',
    price: Number(form.price) || 0,
    originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
    stock: Number(form.stock) || 0,
    condition: form.condition || 'NEW',
    seller: { storeName: user?.storeName || 'Mi tienda' },
    images: images.length > 0 ? images : [],
    tags: [],
    saleCount: 0,
  };

  return (
    <Dialog open fullWidth maxWidth="lg" onClose={close} scroll="body" PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={700}>
            {isEdit ? 'Editar producto' : 'Nuevo producto'}
          </Typography>
          <IconButton onClick={close} title="Cerrar" aria-label="Cerrar">
            <CloseIcon />
          </IconButton>
        </Box>
        {!isEdit && (
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mt: 1, mb: 1 }}>
            {WIZARD_STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* ===== WIZARD (creación): paso 0 — Información ===== */}
        {!isEdit && activeStep === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Nombre del producto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Categoría"
                value={form.categoryId}
                onChange={(e) => handleCategoryChange(Number(e.target.value))}
                fullWidth
                required
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {templates.length > 0 && (
              <Grid item xs={12}>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={templates}
                  getOptionLabel={(o: any) => (typeof o === 'string' ? o : `${o.name}${o.sellerId ? '' : ' · Global'}`)}
                  value={selectedTemplate ? (templates.find((t) => String(t.id) === selectedTemplate) as any) ?? null : null}
                  onChange={(_e, v) => {
                    if (v && typeof v !== 'string') {
                      setSelectedTemplate(String(v.id));
                      setNewKnownName('');
                      applyTemplate(v);
                    } else {
                      setSelectedTemplate('');
                      setNewKnownName(typeof v === 'string' ? v : '');
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Producto conocido (atributos precargados)"
                      helperText={
                        newKnownName
                          ? 'No existe todavía: podés crearlo y luego asignarle atributos con el botón +.'
                          : 'Elegí un producto conocido de la categoría para precargar atributos, o escribí uno nuevo.'
                      }
                    />
                  )}
                />
                {newKnownName && (
                  <Box display="flex" gap={1} mt={1}>
                    <Button size="small" variant="contained" onClick={createKnownProduct} disabled={knownLoading || !form.categoryId}>
                      {knownLoading ? 'Creando…' : `Crear producto conocido «${newKnownName}»`}
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => setNewKnownName('')}>
                      Descartar
                    </Button>
                  </Box>
                )}
              </Grid>
            )}
            {selectedTemplate && (
              <Grid item xs={12}>
                <Chip
                  label={`Producto conocido seleccionado: ${templates.find((t) => String(t.id) === selectedTemplate)?.name ?? ''}`}
                  onDelete={() => {
                    setSelectedTemplate('');
                    setNewKnownName('');
                  }}
                  color="info"
                  size="small"
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Condición"
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
                fullWidth
              >
                <MenuItem value="NEW">Nuevo</MenuItem>
                <MenuItem value="USED">Usado</MenuItem>
                <MenuItem value="REFURBISHED">Reacondicionado</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={3} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Precio (Bs)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Precio original" type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="SKU"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                fullWidth
                placeholder="Ej: PRO-0001"
                helperText="Dejalo en blanco y se genera automáticamente según la categoría"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button size="small" onClick={handleGenerateSku}>
                        Generar
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Garantía" value={form.warrantyInfo} onChange={(e) => setForm({ ...form, warrantyInfo: e.target.value })} fullWidth placeholder="Ej: Garantía 12 meses" />
            </Grid>

            {/* ===== PUBLICAR COMO SUBASTA ===== */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <FormControlLabel
                  control={
                    <Switch checked={form.asAuction} onChange={(e) => setForm({ ...form, asAuction: e.target.checked })} color="primary" />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <GavelIcon color="primary" />
                      <Typography variant="body1" fontWeight={600}>
                        Publicar como subasta
                      </Typography>
                    </Box>
                  }
                />
                <Typography variant="caption" color="text.secondary" display="block" mb={form.asAuction ? 2 : 0}>
                  Los compradores ofertarán por este producto en tiempo real hasta la fecha de fin.
                </Typography>

                {form.asAuction && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Precio inicial (Bs)"
                        type="number"
                        value={form.auctionStartingPrice}
                        onChange={(e) => setForm({ ...form, auctionStartingPrice: e.target.value })}
                        fullWidth
                        placeholder={form.price || '5000'}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        label="Incremento mín."
                        type="number"
                        value={form.auctionMinIncrement}
                        onChange={(e) => setForm({ ...form, auctionMinIncrement: e.target.value })}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        label="Incremento máx."
                        type="number"
                        value={form.auctionMaxIncrement}
                        onChange={(e) => setForm({ ...form, auctionMaxIncrement: e.target.value })}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        select
                        label="Tipo de incremento"
                        value={form.auctionIncrementType}
                        onChange={(e) => setForm({ ...form, auctionIncrementType: e.target.value })}
                        fullWidth
                      >
                        <MenuItem value="dynamic">Dinámico (sube con el precio)</MenuItem>
                        <MenuItem value="fixed">Fijo</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Precio de reserva (opcional)"
                        type="number"
                        value={form.auctionReservePrice}
                        onChange={(e) => setForm({ ...form, auctionReservePrice: e.target.value })}
                        fullWidth
                        helperText="Mínimo para que la subasta se cierre con éxito"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Buy It Now (opcional)"
                        type="number"
                        value={form.auctionBuyNowPrice}
                        onChange={(e) => setForm({ ...form, auctionBuyNowPrice: e.target.value })}
                        fullWidth
                        helperText="Compra directa inmediata a este precio"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Anti-sniping (minutos)"
                        type="number"
                        value={form.auctionExtensionMinutes}
                        onChange={(e) => setForm({ ...form, auctionExtensionMinutes: e.target.value })}
                        fullWidth
                        helperText="Extiende el tiempo si ofertan al final (0 = desactivado)"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <DateTimePicker
                        label="Fecha de fin"
                        value={form.auctionEndDate ? dayjs(form.auctionEndDate) : null}
                        onChange={(v) => setForm({ ...form, auctionEndDate: v ? v.toISOString() : '' })}
                        format="DD/MM/YYYY HH:mm"
                        slotProps={{ textField: { fullWidth: true, required: true, helperText: 'Elegí la fecha y hora de cierre de la subasta.' } }}
                      />
                    </Grid>
                  </Grid>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* ===== WIZARD (creación): paso 1 — Fotos ===== */}
        {!isEdit && activeStep === 1 && (
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              Fotos del producto
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
              {images.map((img) => (
                <Box key={img.url} sx={{ position: 'relative', width: 96, height: 96 }}>
                  <img
                    src={img.url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: img.isPrimary ? '2px solid #f0320a' : '1px solid #ddd' }}
                  />
                  {img.isPrimary && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 2,
                        left: 2,
                        bgcolor: 'primary.main',
                        color: 'white',
                        borderRadius: 1,
                        px: 0.5,
                        fontSize: 10,
                      }}
                    >
                      Principal
                    </Box>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => removeImage(img.url)}
                    sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', boxShadow: 1 }}
                  >
                    <CloseIcon fontSize="small" color="error" />
                  </IconButton>
                  {!img.isPrimary && (
                    <IconButton
                      size="small"
                      onClick={() => setPrimary(img.url)}
                      sx={{ position: 'absolute', bottom: -8, left: -8, bgcolor: 'background.paper', boxShadow: 1 }}
                      title="Hacer principal"
                    >
                      <StarIcon fontSize="small" color="primary" />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Button variant="outlined" component="label" startIcon={<AddPhotoAlternateIcon />} disabled={uploading || images.length >= 8}>
                {uploading ? <CircularProgress size={18} /> : 'Subir fotos'}
                <input type="file" accept="image/*" multiple hidden onChange={handleUpload} />
              </Button>
              <Typography variant="caption" color="text.secondary">
                {images.length}/8 · Podés subir una o varias fotos (JPG, PNG, WebP, SVG · máx 5MB)
              </Typography>
            </Box>
          </Box>
        )}

        {/* ===== WIZARD (creación): paso 2 — Atributos ===== */}
        {!isEdit && activeStep === 2 && (
          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle2" fontWeight={700}>
                Especificaciones ({attrs.filter((a) => !removedAttrs.includes(a.id)).length + customAttrs.length})
              </Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setAttrDialogOpen(true)}>
                Agregar atributo
              </Button>
            </Box>

            {customAttrs.length > 0 && (
              <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
                {customAttrs.map((attr) => (
                  <Chip
                    key={attr.id}
                    size="small"
                    label={attr.name}
                    onDelete={() => removeAttr(attr.id, false)}
                    title={`Quitar ${attr.name}`}
                  />
                ))}
              </Box>
            )}

            <Grid container spacing={2}>
              {attrs
                .filter((a: any) => !removedAttrs.includes(a.id))
                .map((attr) => renderAttrInput(attr, 'cat'))}
              {customAttrs.map((attr) => renderAttrInput(attr, 'custom'))}
            </Grid>
          </Box>
        )}

        {/* ===== WIZARD (creación): paso 3 — Vista previa ===== */}
        {!isEdit && activeStep === 3 && (
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={2}>
              Vista previa del card del producto
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <ProductCard product={previewProduct} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>
                    Resumen del producto
                  </Typography>
                  <Typography variant="body2">
                    <strong>Nombre:</strong> {form.name || '—'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Categoría:</strong> {categories.find((c) => c.id === form.categoryId)?.name ?? '—'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Condición:</strong> {form.condition || '—'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Precio:</strong> {form.price ? `Bs ${Number(form.price).toLocaleString('es-BO')}` : '—'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Stock:</strong> {form.stock ?? '0'}
                  </Typography>
                  {form.sku && (
                    <Typography variant="body2">
                      <strong>SKU:</strong> {form.sku}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    <strong>Fotos:</strong> {images.length}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Atributos:</strong> {attrs.filter((a) => !removedAttrs.includes(a.id)).length + customAttrs.length}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Garantía:</strong> {form.warrantyInfo || '—'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Revisá que la información esté completa. Al publicar, el producto queda pendiente de moderación del administrador.
            </Typography>
          </Box>
        )}

        {/* ===== EDICIÓN: formulario completo ===== */}
        {isEdit && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Nombre del producto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Categoría"
                value={form.categoryId}
                onChange={(e) => handleCategoryChange(Number(e.target.value))}
                fullWidth
                required
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {templates.length > 0 && (
              <Grid item xs={12}>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={templates}
                  getOptionLabel={(o: any) => (typeof o === 'string' ? o : `${o.name}${o.sellerId ? '' : ' · Global'}`)}
                  value={selectedTemplate ? (templates.find((t) => String(t.id) === selectedTemplate) as any) ?? null : null}
                  onChange={(_e, v) => {
                    if (v && typeof v !== 'string') {
                      setSelectedTemplate(String(v.id));
                      setNewKnownName('');
                      applyTemplate(v);
                    } else {
                      setSelectedTemplate('');
                      setNewKnownName(typeof v === 'string' ? v : '');
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Producto conocido (atributos precargados)"
                      helperText={
                        newKnownName
                          ? 'No existe todavía: podés crearlo y luego asignarle atributos con el botón +.'
                          : 'Elegí un producto conocido de la categoría para precargar atributos, o escribí uno nuevo.'
                      }
                    />
                  )}
                />
                {newKnownName && (
                  <Box display="flex" gap={1} mt={1}>
                    <Button size="small" variant="contained" onClick={createKnownProduct} disabled={knownLoading || !form.categoryId}>
                      {knownLoading ? 'Creando…' : `Crear producto conocido «${newKnownName}»`}
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => setNewKnownName('')}>
                      Descartar
                    </Button>
                  </Box>
                )}
              </Grid>
            )}
            {selectedTemplate && (
              <Grid item xs={12}>
                <Chip
                  label={`Producto conocido seleccionado: ${templates.find((t) => String(t.id) === selectedTemplate)?.name ?? ''}`}
                  onDelete={() => {
                    setSelectedTemplate('');
                    setNewKnownName('');
                  }}
                  color="info"
                  size="small"
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Condición"
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
                fullWidth
              >
                <MenuItem value="NEW">Nuevo</MenuItem>
                <MenuItem value="USED">Usado</MenuItem>
                <MenuItem value="REFURBISHED">Reacondicionado</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={3} />
            </Grid>
            <Grid item xs={12}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Fotos del producto
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                  {images.map((img) => (
                    <Box key={img.url} sx={{ position: 'relative', width: 96, height: 96 }}>
                      <img
                        src={img.url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: img.isPrimary ? '2px solid #f0320a' : '1px solid #ddd' }}
                      />
                      {img.isPrimary && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 2,
                            left: 2,
                            bgcolor: 'primary.main',
                            color: 'white',
                            borderRadius: 1,
                            px: 0.5,
                            fontSize: 10,
                          }}
                        >
                          Principal
                        </Box>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => removeImage(img.url)}
                        sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', boxShadow: 1 }}
                      >
                        <CloseIcon fontSize="small" color="error" />
                      </IconButton>
                      {!img.isPrimary && (
                        <IconButton
                          size="small"
                          onClick={() => setPrimary(img.url)}
                          sx={{ position: 'absolute', bottom: -8, left: -8, bgcolor: 'background.paper', boxShadow: 1 }}
                          title="Hacer principal"
                        >
                          <StarIcon fontSize="small" color="primary" />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Button variant="outlined" component="label" startIcon={<AddPhotoAlternateIcon />} disabled={uploading || images.length >= 8}>
                    {uploading ? <CircularProgress size={18} /> : 'Subir fotos'}
                    <input type="file" accept="image/*" multiple hidden onChange={handleUpload} />
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {images.length}/8 · Podés subir una o varias fotos (JPG, PNG, WebP, SVG · máx 5MB)
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Precio (Bs)"
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                fullWidth
                required
                disabled={isEmployee && isEdit}
                helperText={isEmployee && isEdit ? 'Solo el administrador de la tienda puede modificar el precio' : undefined}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Precio original" type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} fullWidth />
            </Grid>

            {/* ===== PUBLICAR COMO SUBASTA ===== */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <FormControlLabel
                  control={
                    <Switch checked={form.asAuction} onChange={(e) => setForm({ ...form, asAuction: e.target.checked })} color="primary" />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <GavelIcon color="primary" />
                      <Typography variant="body1" fontWeight={600}>
                        Publicar como subasta
                      </Typography>
                    </Box>
                  }
                />
                <Typography variant="caption" color="text.secondary" display="block" mb={form.asAuction ? 2 : 0}>
                  Los compradores ofertarán por este producto en tiempo real hasta la fecha de fin.
                </Typography>

                {form.asAuction && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Precio inicial (Bs)"
                        type="number"
                        value={form.auctionStartingPrice}
                        onChange={(e) => setForm({ ...form, auctionStartingPrice: e.target.value })}
                        fullWidth
                        placeholder={form.price || '5000'}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        label="Incremento mín."
                        type="number"
                        value={form.auctionMinIncrement}
                        onChange={(e) => setForm({ ...form, auctionMinIncrement: e.target.value })}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        label="Incremento máx."
                        type="number"
                        value={form.auctionMaxIncrement}
                        onChange={(e) => setForm({ ...form, auctionMaxIncrement: e.target.value })}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        select
                        label="Tipo de incremento"
                        value={form.auctionIncrementType}
                        onChange={(e) => setForm({ ...form, auctionIncrementType: e.target.value })}
                        fullWidth
                      >
                        <MenuItem value="dynamic">Dinámico (sube con el precio)</MenuItem>
                        <MenuItem value="fixed">Fijo</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Precio de reserva (opcional)"
                        type="number"
                        value={form.auctionReservePrice}
                        onChange={(e) => setForm({ ...form, auctionReservePrice: e.target.value })}
                        fullWidth
                        helperText="Mínimo para que la subasta se cierre con éxito"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Buy It Now (opcional)"
                        type="number"
                        value={form.auctionBuyNowPrice}
                        onChange={(e) => setForm({ ...form, auctionBuyNowPrice: e.target.value })}
                        fullWidth
                        helperText="Compra directa inmediata a este precio"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Anti-sniping (minutos)"
                        type="number"
                        value={form.auctionExtensionMinutes}
                        onChange={(e) => setForm({ ...form, auctionExtensionMinutes: e.target.value })}
                        fullWidth
                        helperText="Extiende el tiempo si ofertan al final (0 = desactivado)"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <DateTimePicker
                        label="Fecha de fin"
                        value={form.auctionEndDate ? dayjs(form.auctionEndDate) : null}
                        onChange={(v) => setForm({ ...form, auctionEndDate: v ? v.toISOString() : '' })}
                        format="DD/MM/YYYY HH:mm"
                        slotProps={{ textField: { fullWidth: true, required: true, helperText: 'Elegí la fecha y hora de cierre de la subasta.' } }}
                      />
                    </Grid>
                  </Grid>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="SKU"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                fullWidth
                placeholder="Ej: PRO-0001"
                helperText="Dejalo en blanco y se genera automáticamente según la categoría"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button size="small" onClick={handleGenerateSku}>
                        Generar
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Garantía" value={form.warrantyInfo} onChange={(e) => setForm({ ...form, warrantyInfo: e.target.value })} fullWidth placeholder="Ej: Garantía 12 meses" />
            </Grid>
          </Grid>
        )}

        {/* ===== SECCIÓN DE ATRIBUTOS (edición) ===== */}
        {isEdit && (
          <Box mt={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle2" fontWeight={700}>
                Especificaciones ({attrs.filter((a) => !removedAttrs.includes(a.id)).length + customAttrs.length})
              </Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setAttrDialogOpen(true)}>
                Agregar atributo
              </Button>
            </Box>

            {customAttrs.length > 0 && (
              <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
                {customAttrs.map((attr) => (
                  <Chip
                    key={attr.id}
                    size="small"
                    label={attr.name}
                    onDelete={() => removeAttr(attr.id, false)}
                    title={`Quitar ${attr.name}`}
                  />
                ))}
              </Box>
            )}

            <Grid container spacing={2}>
              {attrs
                .filter((a: any) => !removedAttrs.includes(a.id))
                .map((attr) => renderAttrInput(attr, 'cat'))}
              {customAttrs.map((attr) => renderAttrInput(attr, 'custom'))}
            </Grid>
          </Box>
        )}

        {/* Diálogo "+" Agregar atributo (compartido por wizard y edición) */}
        <Dialog open={attrDialogOpen} onClose={() => setAttrDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Agregar atributo</DialogTitle>
          <DialogContent>
            <Autocomplete
              options={defOptions}
              filterOptions={(x) => x}
              getOptionLabel={(o: any) => (o.category?.name ? `${o.name} (${o.category.name})` : o.name)}
              onChange={(_e, def) => {
                if (def) {
                  handleAddDef(def);
                  setDefsQuery('');
                  setAttrDialogOpen(false);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Buscar atributo por nombre"
                  placeholder="Ej: Velocidad, Tamaño, Color..."
                  autoFocus
                  onChange={(e) => setDefsQuery(e.target.value)}
                />
              )}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Podés sumar atributos de otras categorías o que no están definidos para la actual. Se guardan como
              especificación del producto.
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              ¿Falta un atributo? Creá varios separándolos con coma
            </Typography>
            <Box display="flex" gap={1} alignItems="flex-start">
              <TextField
                label="Nombres separados por coma"
                placeholder="Ej: Marca, Color, Tamaño"
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleBulkCreate();
                  }
                }}
                fullWidth
                size="small"
                error={Boolean(bulkError)}
                helperText={bulkError || 'Se crean como atributos globales y quedan listos para asignarles valor.'}
                disabled={bulkLoading}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleBulkCreate}
                disabled={bulkLoading || !bulkNames.trim()}
                sx={{ whiteSpace: 'nowrap', mt: 0.5 }}
              >
                {bulkLoading ? <CircularProgress size={18} color="inherit" /> : 'Crear'}
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setAttrDialogOpen(false);
                setDefsQuery('');
              }}
            >
              Cancelar
            </Button>
          </DialogActions>
        </Dialog>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        {isEdit ? (
          <Box display="flex" gap={1} alignItems="center">
            <Button variant="outlined" onClick={close}>
              Cancelar
            </Button>
            <Button variant="contained" color="primary" onClick={submit} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : 'Guardar cambios'}
            </Button>
          </Box>
        ) : (
          <>
            <Box display="flex" gap={1} alignItems="center">
              <Button variant="outlined" onClick={close}>
                Cancelar
              </Button>
              <Button variant="outlined" onClick={handleBack} disabled={activeStep === 0}>
                Anterior
              </Button>
            </Box>
            {activeStep < WIZARD_STEPS.length - 1 ? (
              <Button variant="contained" color="primary" onClick={handleNext}>
                Siguiente
              </Button>
            ) : (
              <Button variant="contained" color="primary" onClick={submit} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : 'Publicar producto'}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
