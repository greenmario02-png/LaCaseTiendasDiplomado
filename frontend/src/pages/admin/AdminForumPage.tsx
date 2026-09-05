import { useEffect, useState } from 'react';
import { MapPinned, Tags, ScrollText } from 'lucide-react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  getForumAdminStats,
  listReports,
  resolveReport,
  rejectReport,
  listRules,
  adminCreateRule,
  adminUpdateRule,
  adminDeleteRule,
  adminListCities,
  adminCreateCity,
  adminUpdateCity,
  adminDeleteCity,
  adminSetCityCategories,
  adminListModerators,
  adminListCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  adminGenerateCitySubforos,
  adminGenerateAllCitySubforos,
  type ForumRule,
  type ForumModerator,
  type ForumCategory,
} from '../../services/forum.api';
import { forumPalette } from '../../theme/forumTheme';
import { getUnifiedTokens } from '../../theme';
import { StatCard } from '../../components/redesign/StatCard';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import toast from 'react-hot-toast';

interface ForumStats {
  totalPosts: number;
  totalReplies: number;
  totalUsers: number;
  activeUsers7d: number;
  postsByCategory: { slug: string; name: string; count: number }[];
  postsByCity: { city: string; count: number }[];
  topUsers: { forumUsername: string; karma: number; tag: string }[];
  pendingReports: number;
  postsWithNoReply: number;
}

interface ForumReport {
  id: number;
  targetType: string;
  reason: string;
  status: string;
  createdAt: string;
  detail?: string;
}

interface AdminCity {
  id: number;
  name: string;
  department: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  isActive: boolean;
  sortOrder: number;
  categories: { categoryId: number; category: { id: number; name: string; slug: string } }[];
}

const REASON_LABEL: Record<string, string> = {
  SPAM: 'Spam',
  CONTENIDO_INAPROPIADO: 'Contenido inapropiado',
  DESINFORMACION: 'Desinformación',
  CONTENIDO_FALSO: 'Contenido falso / engañoso',
  CONTENIDO_IA: 'Contenido generado por IA',
  ESTAFA: 'Posible estafa',
  DATOS_PERSONALES: 'Expone datos personales',
  PUBLICIDAD_ENCUBIERTA: 'Publicidad encubierta',
  ES_UN_BOT: 'Es un bot',
  ACOSO: 'Acoso',
  OTRO: 'Otro',
};

export default function AdminForumPage() {
  const [tab, setTab] = useState(0);
  const tokens = getUnifiedTokens(false);

  // Moderación
  const [stats, setStats] = useState<ForumStats | null>(null);
  const [reports, setReports] = useState<ForumReport[]>([]);
  const [active, setActive] = useState<ForumReport | null>(null);
  const [resolution, setResolution] = useState('');

  // Ciudades y foros
  const [cities, setCities] = useState<AdminCity[]>([]);
  const [cityDialog, setCityDialog] = useState(false);
  const [editingCityId, setEditingCityId] = useState<number | null>(null);
  const [cityForm, setCityForm] = useState({ name: '', department: '', latitude: '', longitude: '', radiusKm: '30' });
  const [cityCatsOpen, setCityCatsOpen] = useState<AdminCity | null>(null);
  const [allCategories, setAllCategories] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [cityCatSel, setCityCatSel] = useState<Set<number>>(new Set());
  const [savingCityCats, setSavingCityCats] = useState(false);

  // Reglas de uso
  const [rules, setRules] = useState<ForumRule[]>([]);
  const [ruleDialog, setRuleDialog] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [ruleForm, setRuleForm] = useState({ title: '', body: '', sortOrder: '0' });

  // Moderadores
  const [moderators, setModerators] = useState<ForumModerator[]>([]);

  // Categorías (etiquetas de subforo)
  const [cats, setCats] = useState<ForumCategory[]>([]);
  const [catDialog, setCatDialog] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catForm, setCatForm] = useState({ slug: '', name: '', description: '', icon: '', color: '#FF6B35', sortOrder: '0' });
  const [savingSubforos, setSavingSubforos] = useState<number | null>(null);

  const load = () => {
    getForumAdminStats().then(setStats).catch(() => {});
    listReports({ status: 'PENDING', limit: 50 })
      .then((r) => setReports((r.data ?? []) as ForumReport[]))
      .catch(() => {});
  };

  const loadCities = () => {
    adminListCities().then(setCities).catch(() => {});
  };

  const loadRules = () => {
    listRules().then(setRules).catch(() => {});
  };

  const loadModerators = () => {
    adminListModerators().then(setModerators).catch(() => {});
  };

  const loadCategories = () => {
    adminListCategories().then(setCats).catch(() => {});
  };

  useEffect(() => {
    load();
    loadCities();
    loadRules();
    loadModerators();
    loadCategories();
    adminListCategories().then(setAllCategories).catch(() => {});
  }, []);

  const handleResolve = async () => {
    if (!active) return;
    await resolveReport(active.id, resolution);
    setActive(null);
    setResolution('');
    load();
  };

  const handleReject = async () => {
    if (!active) return;
    await rejectReport(active.id, resolution);
    setActive(null);
    setResolution('');
    load();
  };

  const openNewCity = () => {
    setEditingCityId(null);
    setCityForm({ name: '', department: '', latitude: '', longitude: '', radiusKm: '30' });
    setCityDialog(true);
  };

  const openEditCity = (c: AdminCity) => {
    setEditingCityId(c.id);
    setCityForm({
      name: c.name,
      department: c.department,
      latitude: String(c.latitude),
      longitude: String(c.longitude),
      radiusKm: String(c.radiusKm),
    });
    setCityDialog(true);
  };

  const saveCity = async () => {
    if (!cityForm.name.trim() || !cityForm.department.trim()) {
      toast.error('Nombre y departamento son obligatorios');
      return;
    }
    const payload = {
      name: cityForm.name.trim(),
      department: cityForm.department.trim(),
      latitude: Number(cityForm.latitude) || 0,
      longitude: Number(cityForm.longitude) || 0,
      radiusKm: Number(cityForm.radiusKm) || 30,
    };
    if (editingCityId) {
      await adminUpdateCity(editingCityId, payload);
      toast.success('Ciudad actualizada');
    } else {
      await adminCreateCity(payload);
      toast.success('Ciudad creada');
    }
    setCityDialog(false);
    loadCities();
  };

  const removeCity = async (c: AdminCity) => {
    if (!window.confirm(`¿Desactivar la ciudad "${c.name}"?`)) return;
    await adminDeleteCity(c.id);
    toast.success('Ciudad desactivada');
    loadCities();
  };

  const openCityCats = (c: AdminCity) => {
    setCityCatsOpen(c);
    setCityCatSel(new Set(c.categories.map((x) => x.categoryId)));
  };

  const saveCityCats = async () => {
    if (!cityCatsOpen) return;
    setSavingCityCats(true);
    try {
      await adminSetCityCategories(cityCatsOpen.id, [...cityCatSel]);
      toast.success('Foros por defecto actualizados');
      setCityCatsOpen(null);
      loadCities();
    } catch {
      toast.error('No se pudieron guardar los foros por defecto');
    } finally {
      setSavingCityCats(false);
    }
  };

  const openNewRule = () => {
    setEditingRuleId(null);
    setRuleForm({ title: '', body: '', sortOrder: '0' });
    setRuleDialog(true);
  };

  const openEditRule = (r: ForumRule) => {
    setEditingRuleId(r.id);
    setRuleForm({ title: r.title, body: r.body, sortOrder: String(r.sortOrder) });
    setRuleDialog(true);
  };

  const saveRule = async () => {
    if (!ruleForm.title.trim() || !ruleForm.body.trim()) {
      toast.error('Título y texto son obligatorios');
      return;
    }
    const payload = { title: ruleForm.title.trim(), body: ruleForm.body.trim(), sortOrder: Number(ruleForm.sortOrder) || 0 };
    if (editingRuleId) {
      await adminUpdateRule(editingRuleId, payload);
      toast.success('Regla actualizada');
    } else {
      await adminCreateRule(payload);
      toast.success('Regla creada');
    }
    setRuleDialog(false);
    loadRules();
  };

  const removeRule = async (r: ForumRule) => {
    if (!window.confirm(`¿Eliminar la regla "${r.title}"?`)) return;
    await adminDeleteRule(r.id);
    toast.success('Regla eliminada');
    loadRules();
  };

  const toggleRule = async (r: ForumRule) => {
    await adminUpdateRule(r.id, { isActive: !r.isActive });
    loadRules();
  };

  const openNewCategory = () => {
    setEditingCatId(null);
    setCatForm({ slug: '', name: '', description: '', icon: '', color: '#FF6B35', sortOrder: '0' });
    setCatDialog(true);
  };

  const openEditCategory = (c: ForumCategory) => {
    setEditingCatId(c.id);
    setCatForm({
      slug: c.slug,
      name: c.name,
      description: c.description ?? '',
      icon: c.icon,
      color: c.color,
      sortOrder: String(c.sortOrder ?? 0),
    });
    setCatDialog(true);
  };

  const saveCategory = async () => {
    if (!catForm.slug.trim() || !catForm.name.trim()) {
      toast.error('Slug y nombre son obligatorios');
      return;
    }
    const payload = {
      slug: catForm.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      name: catForm.name.trim(),
      description: catForm.description.trim() || undefined,
      icon: catForm.icon.trim() || 'general',
      color: catForm.color.trim() || '#FF6B35',
      sortOrder: Number(catForm.sortOrder) || 0,
    };
    if (editingCatId) {
      await updateCategory(editingCatId, payload);
      toast.success('Categoría actualizada');
    } else {
      await createCategory(payload);
      toast.success('Categoría creada');
    }
    setCatDialog(false);
    loadCategories();
    adminListCategories().then(setAllCategories).catch(() => {});
  };

  const removeCategory = async (c: ForumCategory) => {
    if (!window.confirm(`¿Desactivar la categoría "${c.name}"?`)) return;
    await deleteCategory(c.id);
    toast.success('Categoría desactivada');
    loadCategories();
    adminListCategories().then(setAllCategories).catch(() => {});
  };

  const toggleCategory = async (c: ForumCategory) => {
    await updateCategory(c.id, { isActive: !c.isActive });
    loadCategories();
  };

  const generateCitySubforos = async (c: AdminCity) => {
    setSavingSubforos(c.id);
    try {
      const res = await adminGenerateCitySubforos(c.id);
      toast.success(`Subforos generados para ${c.name} (${(res?.categories ?? []).length})`);
      loadCities();
    } catch {
      toast.error('No se pudieron generar los subforos');
    } finally {
      setSavingSubforos(null);
    }
  };

  const generateAllCitySubforos = async () => {
    if (!window.confirm('¿Asignar todos los subforos activos a todas las ciudades?')) return;
    try {
      const res = await adminGenerateAllCitySubforos();
      toast.success(`Subforos asignados en ${res?.cities ?? 0} ciudades (${res?.categories ?? 0} categorías)`);
      loadCities();
    } catch {
      toast.error('No se pudieron generar los subforos');
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2} sx={{ color: forumPalette.accent }}>
        Foro LaCASE — administración
      </Typography>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2, borderBottom: `1px solid ${forumPalette.border}` }}>
        <Tab label="Moderación" />
        <Tab label="Ciudades y foros" />
        <Tab label="Categorías (etiquetas)" />
        <Tab label="Reglas de uso" />
        <Tab label="Moderadores" />
      </Tabs>

      {tab === 0 && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}>
              <StatCard title="Preguntas" value={stats?.totalPosts ?? '—'} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard title="Respuestas" value={stats?.totalReplies ?? '—'} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard title="Usuarios del foro" value={stats?.totalUsers ?? '—'} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard title="Reportes pendientes" value={stats?.pendingReports ?? '—'} />
            </Grid>
          </Grid>

          <Card sx={{ bgcolor: forumPalette.bgCard, border: `1px solid ${forumPalette.border}` }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>🚩 Reportes pendientes ({reports.length})</Typography>
              {reports.length === 0 ? (
                <Alert severity="success">No hay reportes pendientes</Alert>
              ) : (
                <Stack spacing={1}>
                  {reports.map((r) => (
                    <Box key={r.id} display="flex" alignItems="center" gap={1} flexWrap="wrap"
                      sx={{ borderBottom: `1px solid ${forumPalette.border}`, pb: 1 }}>
                      <Chip label={r.targetType} size="small" sx={{ bgcolor: forumPalette.bgInput, color: forumPalette.textSecondary }} />
                      <Chip label={REASON_LABEL[r.reason] ?? r.reason} size="small" color={r.reason === 'ES_UN_BOT' ? 'warning' : 'default'} />
                      <Typography variant="caption" sx={{ color: forumPalette.textMuted }} flex={1}>
                        {new Date(r.createdAt).toLocaleString()}
                        {r.detail ? ` — ${r.detail}` : ''}
                      </Typography>
                      <SecondaryButton size="small" color="error" onClick={() => { setActive(r); setResolution(''); }}>
                        Resolver
                      </SecondaryButton>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Dialog open={Boolean(active)} onClose={() => setActive(null)} fullWidth maxWidth="sm">
            <DialogTitle>Resolver reporte</DialogTitle>
            <DialogContent>
              <Typography variant="body2" mb={2} sx={{ color: forumPalette.textSecondary }}>
                Reporte <b>{REASON_LABEL[active?.reason ?? ''] ?? active?.reason}</b> sobre <b>{active?.targetType}</b>.
                Aprobarlo eliminará el contenido y aplicará -5 karma al autor. Rechazarlo lo restaura.
              </Typography>
              <TextField fullWidth label="Nota de resolución" multiline minRows={2}
                value={resolution} onChange={(e) => setResolution(e.target.value)} />
            </DialogContent>
            <DialogActions>
              <GhostButton onClick={handleReject}>Rechazar (restaurar)</GhostButton>
              <PrimaryButton color="error" onClick={handleResolve}>Aprobar (eliminar)</PrimaryButton>
            </DialogActions>
          </Dialog>
        </>
      )}

      {tab === 1 && (
        <Card sx={{ bgcolor: forumPalette.bgCard, border: `1px solid ${forumPalette.border}` }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={1} flexWrap="wrap">
              <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><MapPinned size={20} strokeWidth={2.2} /> Ciudades y foros por defecto ({cities.length})</Typography>
              <Box display="flex" gap={1}>
                <SecondaryButton onClick={generateAllCitySubforos}>
                  Generar todas
                </SecondaryButton>
                <PrimaryButton startIcon={<AddIcon />} onClick={openNewCity}>
                  Nueva ciudad
                </PrimaryButton>
              </Box>
            </Box>
            <Typography variant="body2" mb={2} sx={{ color: forumPalette.textSecondary }}>
              Definí las ciudades y qué categorías (foros) están activas por defecto en cada una.
            </Typography>
            {cities.length === 0 ? (
              <Alert severity="info">Todavía no hay ciudades configuradas.</Alert>
            ) : (
              <Stack spacing={1}>
                {cities.map((c) => (
                  <Box key={c.id} display="flex" alignItems="center" gap={1} flexWrap="wrap"
                    sx={{ borderBottom: `1px solid ${forumPalette.border}`, pb: 1 }}>
                    <Typography fontWeight={700} sx={{ minWidth: 180, display: 'flex', alignItems: 'center', gap: 0.75 }}><MapPinned size={15} strokeWidth={2.2} color={forumPalette.accent} /> {c.name}</Typography>
                    <Chip label={c.department} size="small" sx={{ bgcolor: forumPalette.bgInput, color: forumPalette.textSecondary }} />
                    <Chip label={`${c.radiusKm} km`} size="small" color="default" variant="outlined" />
                    <Typography variant="caption" sx={{ color: forumPalette.textMuted }} flex={1}>
                      {c.categories.length > 0
                        ? `Foros: ${c.categories.map((x) => x.category.name).join(', ')}`
                        : 'Sin foros por defecto'}
                    </Typography>
                    <GhostButton size="small" onClick={() => openCityCats(c)}>Foros por defecto</GhostButton>
                    <SecondaryButton size="small"
                      disabled={savingSubforos === c.id}
                      onClick={() => generateCitySubforos(c)}>
                      {savingSubforos === c.id ? 'Generando…' : 'Generar subforos'}
                    </SecondaryButton>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEditCity(c)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    {c.isActive && (
                      <Tooltip title="Desactivar">
                        <IconButton size="small" color="error" onClick={() => removeCity(c)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 2 && (
        <Card sx={{ bgcolor: forumPalette.bgCard, border: `1px solid ${forumPalette.border}` }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Tags size={20} strokeWidth={2.2} /> Categorías (etiquetas de subforo) ({cats.length})</Typography>
              <PrimaryButton startIcon={<AddIcon />} onClick={openNewCategory}>
                Nueva categoría
              </PrimaryButton>
            </Box>
            <Typography variant="body2" mb={2} sx={{ color: forumPalette.textSecondary }}>
              Las categorías funcionan como etiquetas: cada post se publica en una (Empleos, General,
              Alquileres…). Las ciudades activas muestran estas etiquetas como sus subforos por defecto.
            </Typography>
            {cats.length === 0 ? (
              <Alert severity="info">Todavía no hay categorías configuradas.</Alert>
            ) : (
              <Stack spacing={1}>
                {cats.map((c) => (
                  <Box key={c.id} display="flex" alignItems="center" gap={1} flexWrap="wrap"
                    sx={{ borderBottom: `1px solid ${forumPalette.border}`, pb: 1 }}>
                    <Typography sx={{ fontSize: 20 }}>{c.icon}</Typography>
                    <Typography fontWeight={700} sx={{ minWidth: 150 }}>{c.name}</Typography>
                    <Chip label={c.slug} size="small" variant="outlined" />
                    <Chip label={c.isActive ? 'Activa' : 'Inactiva'} size="small"
                      sx={c.isActive
                        ? { bgcolor: '#E8F5E9', color: '#2E7D32' }
                        : { bgcolor: '#FFEBEE', color: '#C62828' }} />
                    <Typography variant="caption" sx={{ color: forumPalette.textMuted }} flex={1}>
                      {c.description || '—'}
                    </Typography>
                    <GhostButton size="small" onClick={() => toggleCategory(c)}>
                      {c.isActive ? 'Desactivar' : 'Activar'}
                    </GhostButton>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEditCategory(c)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => removeCategory(c)}><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 3 && (
        <Card sx={{ bgcolor: forumPalette.bgCard, border: `1px solid ${forumPalette.border}` }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ScrollText size={20} strokeWidth={2.2} /> Reglas de uso ({rules.length})</Typography>
              <PrimaryButton startIcon={<AddIcon />} onClick={openNewRule}>
                Nueva regla
              </PrimaryButton>
            </Box>
            <Typography variant="body2" mb={2} sx={{ color: forumPalette.textSecondary }}>
              Estas reglas se muestran públicamente en el foro para evitar abuso.
            </Typography>
            {rules.length === 0 ? (
              <Alert severity="info">Todavía no hay reglas de uso.</Alert>
            ) : (
              <Stack spacing={1}>
                {rules.map((r) => (
                  <Box key={r.id} display="flex" alignItems="flex-start" gap={1}
                    sx={{ borderBottom: `1px solid ${forumPalette.border}`, pb: 1 }}>
                    <Box flex={1}>
                      <Typography fontWeight={700}>
                        {r.sortOrder}. {r.title}
                        {!r.isActive && <Chip label="Inactiva" size="small" color="default" sx={{ ml: 1 }} />}
                      </Typography>
                      <Typography variant="body2" sx={{ color: forumPalette.textSecondary }}>{r.body}</Typography>
                    </Box>
                    <GhostButton size="small" onClick={() => toggleRule(r)}>{r.isActive ? 'Desactivar' : 'Activar'}</GhostButton>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEditRule(r)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => removeRule(r)}><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 4 && (
        <Card sx={{ bgcolor: forumPalette.bgCard, border: `1px solid ${forumPalette.border}` }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={1}>Moderadores ({moderators.length})</Typography>
            <Typography variant="body2" mb={2} sx={{ color: forumPalette.textSecondary }}>
              Moderadores de foro por departamento. Para asignar la moderación a un usuario, dale
              el rol «Moderador de foro» desde «Roles y permisos» (cada uno modera el departamento
              donde tiene su perfil de foro).
            </Typography>
            {moderators.length === 0 ? (
              <Alert severity="info">No hay moderadores de foro. Asigná el rol «Moderador de foro» desde «Roles y permisos».</Alert>
            ) : (
              <Stack spacing={1}>
                {moderators.map((m) => (
                  <Box key={m.id} display="flex" alignItems="center" gap={1} flexWrap="wrap"
                    sx={{ borderBottom: `1px solid ${forumPalette.border}`, pb: 1 }}>
                    <Chip label={m.forumUsername} size="small" sx={{ bgcolor: forumPalette.bgInput }} />
                    <Typography variant="body2">{m.user.firstName} {m.user.lastName} · {m.user.email}</Typography>
                    <Chip label={m.department ?? 'Sin departamento'} size="small" color="default" variant="outlined" />
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog ciudad */}
      <Dialog open={cityDialog} onClose={() => setCityDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingCityId ? 'Editar ciudad' : 'Nueva ciudad'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Nombre" value={cityForm.name} onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })}
              placeholder="Ej: La Paz" fullWidth required />
            <TextField label="Departamento" value={cityForm.department} onChange={(e) => setCityForm({ ...cityForm, department: e.target.value })}
              placeholder="Ej: La Paz" fullWidth required />
            <Box display="flex" gap={1}>
              <TextField label="Latitud" type="number" value={cityForm.latitude} onChange={(e) => setCityForm({ ...cityForm, latitude: e.target.value })}
                placeholder="-16.4897" fullWidth />
              <TextField label="Longitud" type="number" value={cityForm.longitude} onChange={(e) => setCityForm({ ...cityForm, longitude: e.target.value })}
                placeholder="-68.1193" fullWidth />
            </Box>
            <TextField label="Radio (km)" type="number" value={cityForm.radiusKm} onChange={(e) => setCityForm({ ...cityForm, radiusKm: e.target.value })}
              fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setCityDialog(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={saveCity}>
            {editingCityId ? 'Guardar cambios' : 'Crear ciudad'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* Dialog foros por defecto de una ciudad */}
      <Dialog open={Boolean(cityCatsOpen)} onClose={() => setCityCatsOpen(null)} fullWidth maxWidth="sm">
        <DialogTitle>Foros por defecto — {cityCatsOpen?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2} sx={{ color: forumPalette.textSecondary }}>
            Seleccioná las categorías que estarán activas por defecto en esta ciudad.
          </Typography>
          <Stack spacing={0.5}>
            {allCategories.map((cat) => (
              <FormControlLabel
                key={cat.id}
                control={
                  <Checkbox size="small" checked={cityCatSel.has(cat.id)}
                    onChange={(e) => {
                      const next = new Set(cityCatSel);
                      if (e.target.checked) next.add(cat.id); else next.delete(cat.id);
                      setCityCatSel(next);
                    }} />
                }
                label={`${cat.name}`}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setCityCatsOpen(null)}>Cancelar</GhostButton>
          <PrimaryButton onClick={saveCityCats} disabled={savingCityCats}>
            {savingCityCats ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* Dialog regla */}
      <Dialog open={ruleDialog} onClose={() => setRuleDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingRuleId ? 'Editar regla' : 'Nueva regla'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Título" value={ruleForm.title} onChange={(e) => setRuleForm({ ...ruleForm, title: e.target.value })}
              placeholder="Ej: Respeto entre usuarios" fullWidth required />
            <TextField label="Texto de la regla" value={ruleForm.body} onChange={(e) => setRuleForm({ ...ruleForm, body: e.target.value })}
              multiline minRows={3} fullWidth required />
            <TextField label="Orden" type="number" value={ruleForm.sortOrder} onChange={(e) => setRuleForm({ ...ruleForm, sortOrder: e.target.value })}
              fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setRuleDialog(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={saveRule}>
            {editingRuleId ? 'Guardar cambios' : 'Crear regla'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      <Dialog open={catDialog} onClose={() => setCatDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingCatId ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Slug" value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
              placeholder="Ej: empleos" fullWidth required
              helperText="Identificador en minúsculas con guiones (se usa en las URLs del foro)." />
            <TextField label="Nombre" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              placeholder="Ej: Empleos" fullWidth required />
            <Box display="flex" gap={2}>
              <TextField label="Icono (emoji)" value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                placeholder="Briefcase" sx={{ width: 140 }} />
              <TextField label="Color (hex)" value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                placeholder="#00897B" fullWidth />
            </Box>
            <TextField label="Descripción" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              placeholder="Ej: Ofertas laborales, currículums y búsqueda de trabajo." multiline minRows={2} fullWidth />
            <TextField label="Orden" type="number" value={catForm.sortOrder} onChange={(e) => setCatForm({ ...catForm, sortOrder: e.target.value })}
              fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setCatDialog(false)}>Cancelar</GhostButton>
          <PrimaryButton onClick={saveCategory}>
            {editingCatId ? 'Guardar cambios' : 'Crear categoría'}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
