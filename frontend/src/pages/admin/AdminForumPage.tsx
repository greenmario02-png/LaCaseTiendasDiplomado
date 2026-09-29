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
import { useTranslation } from 'react-i18next';
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
import { useForumPalette } from '../../theme/forumTheme';
import { useUnifiedTokens } from '../../theme';
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

export default function AdminForumPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const tokens = useUnifiedTokens();
  const forumPalette = useForumPalette();

  const REASON_LABEL: Record<string, string> = {
    SPAM: t('admin.forum.reasons.spam'),
    CONTENIDO_INAPROPIADO: t('admin.forum.reasons.inappropriateContent'),
    DESINFORMACION: t('admin.forum.reasons.misinformation'),
    CONTENIDO_FALSO: t('admin.forum.reasons.fakeContent'),
    CONTENIDO_IA: t('admin.forum.reasons.aiContent'),
    ESTAFA: t('admin.forum.reasons.scam'),
    DATOS_PERSONALES: t('admin.forum.reasons.personalData'),
    PUBLICIDAD_ENCUBIERTA: t('admin.forum.reasons.disguisedAds'),
    ES_UN_BOT: t('admin.forum.reasons.bot'),
    ACOSO: t('admin.forum.reasons.harassment'),
    OTRO: t('admin.forum.reasons.other'),
  };

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
      toast.error(t('admin.forum.toast.cityNameDeptRequired'));
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
      toast.success(t('admin.forum.toast.cityUpdated'));
    } else {
      await adminCreateCity(payload);
      toast.success(t('admin.forum.toast.cityCreated'));
    }
    setCityDialog(false);
    loadCities();
  };

  const removeCity = async (c: AdminCity) => {
    if (!window.confirm(t('admin.forum.confirmDeactivateCity', { name: c.name }))) return;
    await adminDeleteCity(c.id);
    toast.success(t('admin.forum.toast.cityDeactivated'));
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
      toast.success(t('admin.forum.toast.defaultForumsUpdated'));
      setCityCatsOpen(null);
      loadCities();
    } catch {
      toast.error(t('admin.forum.toast.defaultForumsSaveError'));
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
      toast.error(t('admin.forum.toast.ruleTitleBodyRequired'));
      return;
    }
    const payload = { title: ruleForm.title.trim(), body: ruleForm.body.trim(), sortOrder: Number(ruleForm.sortOrder) || 0 };
    if (editingRuleId) {
      await adminUpdateRule(editingRuleId, payload);
      toast.success(t('admin.forum.toast.ruleUpdated'));
    } else {
      await adminCreateRule(payload);
      toast.success(t('admin.forum.toast.ruleCreated'));
    }
    setRuleDialog(false);
    loadRules();
  };

  const removeRule = async (r: ForumRule) => {
    if (!window.confirm(t('admin.forum.confirmDeleteRule', { title: r.title }))) return;
    await adminDeleteRule(r.id);
    toast.success(t('admin.forum.toast.ruleDeleted'));
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
      toast.error(t('admin.forum.toast.categorySlugNameRequired'));
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
      toast.success(t('admin.forum.toast.categoryUpdated'));
    } else {
      await createCategory(payload);
      toast.success(t('admin.forum.toast.categoryCreated'));
    }
    setCatDialog(false);
    loadCategories();
    adminListCategories().then(setAllCategories).catch(() => {});
  };

  const removeCategory = async (c: ForumCategory) => {
    if (!window.confirm(t('admin.forum.confirmDeactivateCategory', { name: c.name }))) return;
    await deleteCategory(c.id);
    toast.success(t('admin.forum.toast.categoryDeactivated'));
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
      toast.success(t('admin.forum.toast.subforosGeneratedForCity', { city: c.name, count: (res?.categories ?? []).length }));
      loadCities();
    } catch {
      toast.error(t('admin.forum.toast.subforosGenerateError'));
    } finally {
      setSavingSubforos(null);
    }
  };

  const generateAllCitySubforos = async () => {
    if (!window.confirm(t('admin.forum.confirmGenerateAllSubforos'))) return;
    try {
      const res = await adminGenerateAllCitySubforos();
      toast.success(t('admin.forum.toast.subforosGeneratedAll', { cities: res?.cities ?? 0, categories: res?.categories ?? 0 }));
      loadCities();
    } catch {
      toast.error(t('admin.forum.toast.subforosGenerateError'));
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2} sx={{ color: forumPalette.accent }}>
        {t('admin.forum.title')}
      </Typography>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2, borderBottom: `1px solid ${forumPalette.border}` }}>
        <Tab label={t('admin.forum.tabs.moderation')} />
        <Tab label={t('admin.forum.tabs.citiesAndForums')} />
        <Tab label={t('admin.forum.tabs.categories')} />
        <Tab label={t('admin.forum.tabs.rules')} />
        <Tab label={t('admin.forum.tabs.moderators')} />
      </Tabs>

      {tab === 0 && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}>
              <StatCard title={t('admin.forum.stats.questions')} value={stats?.totalPosts ?? '—'} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard title={t('admin.forum.stats.replies')} value={stats?.totalReplies ?? '—'} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard title={t('admin.forum.stats.forumUsers')} value={stats?.totalUsers ?? '—'} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard title={t('admin.forum.stats.pendingReports')} value={stats?.pendingReports ?? '—'} />
            </Grid>
          </Grid>

          <Card sx={{ bgcolor: forumPalette.bgCard, border: `1px solid ${forumPalette.border}` }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>🚩 {t('admin.forum.pendingReportsTitle', { count: reports.length })}</Typography>
              {reports.length === 0 ? (
                <Alert severity="success">{t('admin.forum.noPendingReports')}</Alert>
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
                        {t('admin.forum.resolve')}
                      </SecondaryButton>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Dialog open={Boolean(active)} onClose={() => setActive(null)} fullWidth maxWidth="sm">
            <DialogTitle>{t('admin.forum.resolveDialog.title')}</DialogTitle>
            <DialogContent>
              <Typography variant="body2" mb={2} sx={{ color: forumPalette.textSecondary }}>
                {t('admin.forum.resolveDialog.summaryPrefix')} <b>{REASON_LABEL[active?.reason ?? ''] ?? active?.reason}</b> {t('admin.forum.resolveDialog.summaryMiddle')} <b>{active?.targetType}</b>.
                {' '}{t('admin.forum.resolveDialog.summarySuffix')}
              </Typography>
              <TextField fullWidth label={t('admin.forum.resolveDialog.resolutionNoteLabel')} multiline minRows={2}
                value={resolution} onChange={(e) => setResolution(e.target.value)} />
            </DialogContent>
            <DialogActions>
              <GhostButton onClick={handleReject}>{t('admin.forum.resolveDialog.reject')}</GhostButton>
              <PrimaryButton color="error" onClick={handleResolve}>{t('admin.forum.resolveDialog.approve')}</PrimaryButton>
            </DialogActions>
          </Dialog>
        </>
      )}

      {tab === 1 && (
        <Card sx={{ bgcolor: forumPalette.bgCard, border: `1px solid ${forumPalette.border}` }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={1} flexWrap="wrap">
              <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><MapPinned size={20} strokeWidth={2.2} /> {t('admin.forum.citiesTitle', { count: cities.length })}</Typography>
              <Box display="flex" gap={1}>
                <SecondaryButton onClick={generateAllCitySubforos}>
                  {t('admin.forum.generateAll')}
                </SecondaryButton>
                <PrimaryButton startIcon={<AddIcon />} onClick={openNewCity}>
                  {t('admin.forum.newCity')}
                </PrimaryButton>
              </Box>
            </Box>
            <Typography variant="body2" mb={2} sx={{ color: forumPalette.textSecondary }}>
              {t('admin.forum.citiesDescription')}
            </Typography>
            {cities.length === 0 ? (
              <Alert severity="info">{t('admin.forum.noCitiesConfigured')}</Alert>
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
                        ? t('admin.forum.forumsList', { list: c.categories.map((x) => x.category.name).join(', ') })
                        : t('admin.forum.noDefaultForums')}
                    </Typography>
                    <GhostButton size="small" onClick={() => openCityCats(c)}>{t('admin.forum.defaultForumsButton')}</GhostButton>
                    <SecondaryButton size="small"
                      disabled={savingSubforos === c.id}
                      onClick={() => generateCitySubforos(c)}>
                      {savingSubforos === c.id ? t('admin.forum.generatingSubforums') : t('admin.forum.generateSubforums')}
                    </SecondaryButton>
                    <Tooltip title={t('admin.common.edit')}>
                      <IconButton size="small" onClick={() => openEditCity(c)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    {c.isActive && (
                      <Tooltip title={t('admin.common.deactivate')}>
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
              <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Tags size={20} strokeWidth={2.2} /> {t('admin.forum.categoriesTitle', { count: cats.length })}</Typography>
              <PrimaryButton startIcon={<AddIcon />} onClick={openNewCategory}>
                {t('admin.forum.newCategory')}
              </PrimaryButton>
            </Box>
            <Typography variant="body2" mb={2} sx={{ color: forumPalette.textSecondary }}>
              {t('admin.forum.categoriesDescription')}
            </Typography>
            {cats.length === 0 ? (
              <Alert severity="info">{t('admin.forum.noCategoriesConfigured')}</Alert>
            ) : (
              <Stack spacing={1}>
                {cats.map((c) => (
                  <Box key={c.id} display="flex" alignItems="center" gap={1} flexWrap="wrap"
                    sx={{ borderBottom: `1px solid ${forumPalette.border}`, pb: 1 }}>
                    <Typography sx={{ fontSize: 20 }}>{c.icon}</Typography>
                    <Typography fontWeight={700} sx={{ minWidth: 150 }}>{c.name}</Typography>
                    <Chip label={c.slug} size="small" variant="outlined" />
                    <Chip label={c.isActive ? t('admin.common.active') : t('admin.common.inactive')} size="small"
                      sx={c.isActive
                        ? { bgcolor: '#E8F5E9', color: '#2E7D32' }
                        : { bgcolor: '#FFEBEE', color: '#C62828' }} />
                    <Typography variant="caption" sx={{ color: forumPalette.textMuted }} flex={1}>
                      {c.description || '—'}
                    </Typography>
                    <GhostButton size="small" onClick={() => toggleCategory(c)}>
                      {c.isActive ? t('admin.common.deactivate') : t('admin.common.activate')}
                    </GhostButton>
                    <Tooltip title={t('admin.common.edit')}>
                      <IconButton size="small" onClick={() => openEditCategory(c)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={t('admin.common.delete')}>
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
              <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ScrollText size={20} strokeWidth={2.2} /> {t('admin.forum.rulesTitle', { count: rules.length })}</Typography>
              <PrimaryButton startIcon={<AddIcon />} onClick={openNewRule}>
                {t('admin.forum.newRule')}
              </PrimaryButton>
            </Box>
            <Typography variant="body2" mb={2} sx={{ color: forumPalette.textSecondary }}>
              {t('admin.forum.rulesDescription')}
            </Typography>
            {rules.length === 0 ? (
              <Alert severity="info">{t('admin.forum.noRulesConfigured')}</Alert>
            ) : (
              <Stack spacing={1}>
                {rules.map((r) => (
                  <Box key={r.id} display="flex" alignItems="flex-start" gap={1}
                    sx={{ borderBottom: `1px solid ${forumPalette.border}`, pb: 1 }}>
                    <Box flex={1}>
                      <Typography fontWeight={700}>
                        {r.sortOrder}. {r.title}
                        {!r.isActive && <Chip label={t('admin.common.inactive')} size="small" color="default" sx={{ ml: 1 }} />}
                      </Typography>
                      <Typography variant="body2" sx={{ color: forumPalette.textSecondary }}>{r.body}</Typography>
                    </Box>
                    <GhostButton size="small" onClick={() => toggleRule(r)}>{r.isActive ? t('admin.common.deactivate') : t('admin.common.activate')}</GhostButton>
                    <Tooltip title={t('admin.common.edit')}>
                      <IconButton size="small" onClick={() => openEditRule(r)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={t('admin.common.delete')}>
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
            <Typography variant="h6" fontWeight={700} mb={1}>{t('admin.forum.moderatorsTitle', { count: moderators.length })}</Typography>
            <Typography variant="body2" mb={2} sx={{ color: forumPalette.textSecondary }}>
              {t('admin.forum.moderatorsDescription')}
            </Typography>
            {moderators.length === 0 ? (
              <Alert severity="info">{t('admin.forum.noModerators')}</Alert>
            ) : (
              <Stack spacing={1}>
                {moderators.map((m) => (
                  <Box key={m.id} display="flex" alignItems="center" gap={1} flexWrap="wrap"
                    sx={{ borderBottom: `1px solid ${forumPalette.border}`, pb: 1 }}>
                    <Chip label={m.forumUsername} size="small" sx={{ bgcolor: forumPalette.bgInput }} />
                    <Typography variant="body2">{m.user.firstName} {m.user.lastName} · {m.user.email}</Typography>
                    <Chip label={m.department ?? t('admin.forum.noDepartment')} size="small" color="default" variant="outlined" />
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog ciudad */}
      <Dialog open={cityDialog} onClose={() => setCityDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingCityId ? t('admin.forum.cityDialog.editTitle') : t('admin.forum.cityDialog.newTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label={t('admin.forum.cityDialog.nameLabel')} value={cityForm.name} onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })}
              placeholder={t('admin.forum.cityDialog.namePlaceholder')} fullWidth required />
            <TextField label={t('admin.forum.cityDialog.departmentLabel')} value={cityForm.department} onChange={(e) => setCityForm({ ...cityForm, department: e.target.value })}
              placeholder={t('admin.forum.cityDialog.departmentPlaceholder')} fullWidth required />
            <Box display="flex" gap={1}>
              <TextField label={t('admin.forum.cityDialog.latitudeLabel')} type="number" value={cityForm.latitude} onChange={(e) => setCityForm({ ...cityForm, latitude: e.target.value })}
                placeholder="-16.4897" fullWidth />
              <TextField label={t('admin.forum.cityDialog.longitudeLabel')} type="number" value={cityForm.longitude} onChange={(e) => setCityForm({ ...cityForm, longitude: e.target.value })}
                placeholder="-68.1193" fullWidth />
            </Box>
            <TextField label={t('admin.forum.cityDialog.radiusLabel')} type="number" value={cityForm.radiusKm} onChange={(e) => setCityForm({ ...cityForm, radiusKm: e.target.value })}
              fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setCityDialog(false)}>{t('admin.common.cancel')}</GhostButton>
          <PrimaryButton onClick={saveCity}>
            {editingCityId ? t('admin.forum.cityDialog.saveChanges') : t('admin.forum.cityDialog.create')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* Dialog foros por defecto de una ciudad */}
      <Dialog open={Boolean(cityCatsOpen)} onClose={() => setCityCatsOpen(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t('admin.forum.cityCatsDialog.title', { city: cityCatsOpen?.name })}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2} sx={{ color: forumPalette.textSecondary }}>
            {t('admin.forum.cityCatsDialog.description')}
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
          <GhostButton onClick={() => setCityCatsOpen(null)}>{t('admin.common.cancel')}</GhostButton>
          <PrimaryButton onClick={saveCityCats} disabled={savingCityCats}>
            {savingCityCats ? <CircularProgress size={18} color="inherit" /> : t('admin.common.save')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* Dialog regla */}
      <Dialog open={ruleDialog} onClose={() => setRuleDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingRuleId ? t('admin.forum.ruleDialog.editTitle') : t('admin.forum.ruleDialog.newTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label={t('admin.forum.ruleDialog.titleLabel')} value={ruleForm.title} onChange={(e) => setRuleForm({ ...ruleForm, title: e.target.value })}
              placeholder={t('admin.forum.ruleDialog.titlePlaceholder')} fullWidth required />
            <TextField label={t('admin.forum.ruleDialog.bodyLabel')} value={ruleForm.body} onChange={(e) => setRuleForm({ ...ruleForm, body: e.target.value })}
              multiline minRows={3} fullWidth required />
            <TextField label={t('admin.forum.ruleDialog.orderLabel')} type="number" value={ruleForm.sortOrder} onChange={(e) => setRuleForm({ ...ruleForm, sortOrder: e.target.value })}
              fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setRuleDialog(false)}>{t('admin.common.cancel')}</GhostButton>
          <PrimaryButton onClick={saveRule}>
            {editingRuleId ? t('admin.forum.ruleDialog.saveChanges') : t('admin.forum.ruleDialog.create')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      <Dialog open={catDialog} onClose={() => setCatDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingCatId ? t('admin.forum.categoryDialog.editTitle') : t('admin.forum.categoryDialog.newTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label={t('admin.forum.categoryDialog.slugLabel')} value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
              placeholder={t('admin.forum.categoryDialog.slugPlaceholder')} fullWidth required
              helperText={t('admin.forum.categoryDialog.slugHelperText')} />
            <TextField label={t('admin.forum.categoryDialog.nameLabel')} value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              placeholder={t('admin.forum.categoryDialog.namePlaceholder')} fullWidth required />
            <Box display="flex" gap={2}>
              <TextField label={t('admin.forum.categoryDialog.iconLabel')} value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                placeholder={t('admin.forum.categoryDialog.iconPlaceholder')} sx={{ width: 140 }} />
              <TextField label={t('admin.forum.categoryDialog.colorLabel')} value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                placeholder={t('admin.forum.categoryDialog.colorPlaceholder')} fullWidth />
            </Box>
            <TextField label={t('admin.forum.categoryDialog.descriptionLabel')} value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              placeholder={t('admin.forum.categoryDialog.descriptionPlaceholder')} multiline minRows={2} fullWidth />
            <TextField label={t('admin.forum.categoryDialog.orderLabel')} type="number" value={catForm.sortOrder} onChange={(e) => setCatForm({ ...catForm, sortOrder: e.target.value })}
              fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <GhostButton onClick={() => setCatDialog(false)}>{t('admin.common.cancel')}</GhostButton>
          <PrimaryButton onClick={saveCategory}>
            {editingCatId ? t('admin.forum.categoryDialog.saveChanges') : t('admin.forum.categoryDialog.create')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
