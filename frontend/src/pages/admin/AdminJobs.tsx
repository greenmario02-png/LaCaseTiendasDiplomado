import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import VerifiedIcon from '@mui/icons-material/Verified';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage } from '../../services/api';
import { useUnifiedTokens } from '../../theme';
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';
import { PrimaryButton, GhostButton } from '../../components/redesign/Buttons';
import { EmptyState, LoadingState, ErrorState } from '../../components/redesign/States';
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerList';

type JobStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLOSED';
type PayPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY';

interface AdminJob {
  id: number;
  title: string;
  description: string;
  requirements: string | null;
  city: string;
  locationState: string | null;
  payPeriod: PayPeriod;
  salaryMin: string | null;
  salaryMax: string | null;
  vacancies: number;
  schedule: string | null;
  contactPhone: string | null;
  status: JobStatus;
  rejectionReason: string | null;
  createdAt: string;
  category: { id: number; name: string; icon: string | null };
  store: { id: number; storeName: string; isVerified: boolean; locationCity: string | null };
  reviewedBy?: { id: number; name?: string; email?: string } | null;
}

interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { jobs: number };
}

type TFn = (key: string, opts?: Record<string, unknown>) => string;

const TABS: { key: JobStatus | 'CATS'; labelKey: string }[] = [
  { key: 'PENDING', labelKey: 'admin.jobs.tabs.pending' },
  { key: 'APPROVED', labelKey: 'admin.jobs.tabs.approved' },
  { key: 'REJECTED', labelKey: 'admin.jobs.tabs.rejected' },
  { key: 'CLOSED', labelKey: 'admin.jobs.tabs.closed' },
  { key: 'CATS', labelKey: 'admin.jobs.tabs.categories' },
];

const PERIOD_KEY: Record<PayPeriod, string> = {
  DAILY: 'admin.jobs.period.daily',
  WEEKLY: 'admin.jobs.period.weekly',
  MONTHLY: 'admin.jobs.period.monthly',
};

function money(v: string | null): string {
  return `Bs ${Number(v).toLocaleString('es-BO', { maximumFractionDigits: 2 })}`;
}

function salaryText(j: AdminJob, t: TFn): string {
  const p = t(PERIOD_KEY[j.payPeriod]).toLowerCase();
  if (j.salaryMin && j.salaryMax) return `${money(j.salaryMin)} - ${money(j.salaryMax)} (${p})`;
  if (j.salaryMin) return t('admin.jobs.salaryFrom', { amount: money(j.salaryMin), period: p });
  if (j.salaryMax) return t('admin.jobs.salaryTo', { amount: money(j.salaryMax), period: p });
  return t('admin.jobs.salaryNegotiable', { period: p });
}

export default function AdminJobs() {
  const t = useUnifiedTokens();
  const { t: tr } = useTranslation();
  const [tab, setTab] = useState<JobStatus | 'CATS'>('PENDING');
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const [rejecting, setRejecting] = useState<AdminJob | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [catDialog, setCatDialog] = useState(false);
  const [catEditing, setCatEditing] = useState<AdminCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('');
  const [catOrder, setCatOrder] = useState('0');
  const [catBusy, setCatBusy] = useState(false);
  const [catDeleting, setCatDeleting] = useState<AdminCategory | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'CATS') {
        const res = await api.get('/admin/job-categories');
        setCats(res.data.data ?? []);
      } else {
        const res = await api.get('/admin/jobs', { params: { status: tab } });
        setJobs(res.data.data ?? []);
        if (tab === 'PENDING') setPendingCount((res.data.data ?? []).length);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  // Contador de pendientes disponible desde otras pestañas.
  useEffect(() => {
    api
      .get('/admin/jobs', { params: { status: 'PENDING' } })
      .then((res) => setPendingCount((res.data.data ?? []).length))
      .catch(() => undefined);
  }, []);

  const moderate = async (job: AdminJob, action: 'approve' | 'reject', why?: string) => {
    setBusyId(job.id);
    try {
      await api.put(`/admin/jobs/${job.id}/moderate`, action === 'reject' ? { action, reason: why } : { action });
      toast.success(action === 'approve' ? tr('admin.jobs.jobApproved') : tr('admin.jobs.jobRejected'));
      setRejecting(null);
      setReason('');
      setPendingCount((c) => Math.max(0, c - 1));
      void load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const openCatDialog = (c: AdminCategory | null) => {
    setCatEditing(c);
    setCatName(c?.name ?? '');
    setCatIcon(c?.icon ?? '');
    setCatOrder(String(c?.sortOrder ?? 0));
    setCatDialog(true);
  };

  const saveCat = async () => {
    if (catName.trim().length < 2) {
      toast.error(tr('admin.jobs.categoryNameTooShort'));
      return;
    }
    const body: Record<string, unknown> = { name: catName.trim(), sortOrder: Number(catOrder) || 0 };
    if (catIcon.trim()) body.icon = catIcon.trim();
    setCatBusy(true);
    try {
      if (catEditing) await api.put(`/admin/job-categories/${catEditing.id}`, body);
      else await api.post('/admin/job-categories', body);
      toast.success(catEditing ? tr('admin.jobs.categoryUpdated') : tr('admin.jobs.categoryCreated'));
      setCatDialog(false);
      void load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCatBusy(false);
    }
  };

  const toggleCat = async (c: AdminCategory) => {
    try {
      await api.put(`/admin/job-categories/${c.id}`, { name: c.name, icon: c.icon ?? undefined, sortOrder: c.sortOrder, isActive: !c.isActive });
      void load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const deleteCat = async () => {
    if (!catDeleting) return;
    setCatBusy(true);
    try {
      await api.delete(`/admin/job-categories/${catDeleting.id}`);
      toast.success(tr('admin.jobs.categoryDeleted'));
      setCatDeleting(null);
      void load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCatBusy(false);
    }
  };

  const reasonValid = reason.trim().length >= 5;

  return (
    <Box>
      <PageHeader title={tr('admin.jobs.title')} subtitle={tr('admin.jobs.subtitle')} icon={<WorkOutlineIcon />} />

      <Tabs value={tab} onChange={(_, v) => { setTab(v); setExpanded(null); }} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
        {TABS.map((x) => (
          <Tab
            key={x.key}
            value={x.key}
            sx={{ textTransform: 'none', fontWeight: 600 }}
            label={x.key === 'PENDING' && pendingCount > 0 ? `${tr(x.labelKey)} (${pendingCount})` : tr(x.labelKey)}
          />
        ))}
      </Tabs>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : tab === 'CATS' ? (
        <SurfaceCard>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
            <Typography fontWeight={700} color={t.onSurface}>
              {tr('admin.jobs.categoriesTitle')}
            </Typography>
            <PrimaryButton type="button" size="small" startIcon={<AddIcon />} onClick={() => openCatDialog(null)}>
              {tr('admin.jobs.newCategory')}
            </PrimaryButton>
          </Box>
          {cats.length === 0 ? (
            <EmptyState message={tr('admin.jobs.noCategoriesEmptyState')} />
          ) : (
            <Stack divider={<Box sx={{ borderBottom: `1px solid ${t.outline}33` }} />}>
              {cats.map((c) => (
                <Box key={c.id} display="flex" alignItems="center" gap={1.5} py={1} flexWrap="wrap">
                  <Typography fontSize={24} width={36} textAlign="center">
                    {c.icon ?? '💼'}
                  </Typography>
                  <Box flex={1} minWidth={140}>
                    <Typography fontWeight={600} color={c.isActive ? t.onSurface : t.onSurfaceVariant}>
                      {c.name}
                    </Typography>
                    <Typography variant="caption" color={t.onSurfaceVariant}>
                      {tr('admin.jobs.order', { order: c.sortOrder })}
                      {c._count ? ` · ${tr('admin.jobs.jobsCount', { count: c._count.jobs })}` : ''}
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={<Switch checked={c.isActive} onChange={() => toggleCat(c)} />}
                    label={c.isActive ? tr('admin.common.active') : tr('admin.common.inactive')}
                  />
                  <IconButton aria-label={tr('admin.jobs.editCategoryAriaLabel')} onClick={() => openCatDialog(c)}>
                    <EditOutlinedIcon />
                  </IconButton>
                  <IconButton aria-label={tr('admin.jobs.deleteCategoryAriaLabel')} color="error" onClick={() => setCatDeleting(c)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}
        </SurfaceCard>
      ) : jobs.length === 0 ? (
        <SurfaceCard>
          <EmptyState message={tr('admin.jobs.noJobsEmptyState')} />
        </SurfaceCard>
      ) : (
        <StaggerContainer>
          <Stack spacing={2}>
            {jobs.map((j) => (
              <StaggerItem key={j.id}>
                <SurfaceCard>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
                    <Box minWidth={0} flex={1}>
                      <Typography variant="subtitle1" fontWeight={700} color={t.onSurface}>
                        {j.title}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mt={0.5}>
                        <Typography variant="body2" color={t.onSurfaceVariant}>
                          {j.store.storeName}
                        </Typography>
                        {j.store.isVerified && <Chip size="small" color="success" variant="outlined" icon={<VerifiedIcon />} label={tr('admin.jobs.verifiedChip')} />}
                        <Chip size="small" label={`${j.category.icon ?? ''} ${j.category.name}`.trim()} />
                      </Stack>
                      <Typography variant="body2" color={t.onSurfaceVariant} mt={0.5}>
                        {j.city}
                        {j.locationState ? `, ${j.locationState}` : ''} · {tr('admin.jobs.vacanciesCount', { count: j.vacancies })}
                      </Typography>
                      <Typography variant="body2" fontWeight={600} color={t.primary}>
                        {salaryText(j, tr)}
                      </Typography>
                    </Box>
                    <IconButton
                      aria-label={tr('admin.common.viewDetail')}
                      onClick={() => setExpanded(expanded === j.id ? null : j.id)}
                      sx={{ transform: expanded === j.id ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
                    >
                      <ExpandMoreIcon />
                    </IconButton>
                  </Box>
                  <Collapse in={expanded === j.id} unmountOnExit>
                    <Box mt={1.5} display="grid" gap={1}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        <b>{tr('admin.jobs.descriptionLabel')}</b> {j.description}
                      </Typography>
                      {j.requirements && (
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          <b>{tr('admin.jobs.requirementsLabel')}</b> {j.requirements}
                        </Typography>
                      )}
                      {j.schedule && (
                        <Typography variant="body2">
                          <b>{tr('admin.jobs.scheduleLabel')}</b> {j.schedule}
                        </Typography>
                      )}
                      {j.contactPhone && (
                        <Typography variant="body2">
                          <b>{tr('admin.jobs.contactLabel')}</b> {j.contactPhone}
                        </Typography>
                      )}
                    </Box>
                  </Collapse>
                  {j.status === 'REJECTED' && j.rejectionReason && (
                    <Alert severity="error" sx={{ mt: 1.5 }}>
                      {tr('admin.jobs.reasonLabel')} {j.rejectionReason}
                    </Alert>
                  )}
                  {j.status === 'PENDING' && (
                    <Stack direction="row" spacing={1} mt={2} justifyContent="flex-end">
                      <GhostButton type="button" color="error" startIcon={<CloseIcon />} disabled={busyId === j.id} onClick={() => { setRejecting(j); setReason(''); }}>
                        {tr('admin.jobs.reject')}
                      </GhostButton>
                      <PrimaryButton type="button" color="success" startIcon={<CheckIcon />} disabled={busyId === j.id} onClick={() => moderate(j, 'approve')}>
                        {tr('admin.jobs.approve')}
                      </PrimaryButton>
                    </Stack>
                  )}
                </SurfaceCard>
              </StaggerItem>
            ))}
          </Stack>
        </StaggerContainer>
      )}

      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} fullWidth maxWidth="xs">
        <DialogTitle>{tr('admin.jobs.rejectDialogTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            {tr('admin.jobs.rejectDialogWarning', { title: rejecting?.title })}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label={tr('admin.jobs.rejectReasonLabel')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={reason.length > 0 && !reasonValid}
            helperText={reason.length > 0 && !reasonValid ? tr('admin.jobs.rejectReasonMinLength') : tr('admin.jobs.rejectReasonRequired')}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <GhostButton type="button" onClick={() => setRejecting(null)}>
            {tr('admin.common.cancel')}
          </GhostButton>
          <PrimaryButton type="button" color="error" disabled={!reasonValid || busyId !== null} onClick={() => rejecting && moderate(rejecting, 'reject', reason.trim())}>
            {tr('admin.jobs.reject')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      <Dialog open={catDialog} onClose={() => !catBusy && setCatDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>{catEditing ? tr('admin.jobs.editCategoryDialogTitle') : tr('admin.jobs.newCategory')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label={tr('admin.jobs.categoryNameLabel')} size="small" value={catName} onChange={(e) => setCatName(e.target.value)} fullWidth autoFocus />
            <TextField label={tr('admin.jobs.categoryIconLabel')} size="small" value={catIcon} onChange={(e) => setCatIcon(e.target.value)} placeholder="💼" fullWidth />
            <TextField label={tr('admin.jobs.orderLabel')} size="small" type="number" value={catOrder} onChange={(e) => setCatOrder(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <GhostButton type="button" onClick={() => setCatDialog(false)} disabled={catBusy}>
            {tr('admin.common.cancel')}
          </GhostButton>
          <PrimaryButton type="button" onClick={saveCat} disabled={catBusy}>
            {tr('admin.common.save')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      <Dialog open={!!catDeleting} onClose={() => !catBusy && setCatDeleting(null)}>
        <DialogTitle>{tr('admin.jobs.deleteCategoryDialogTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {tr('admin.jobs.deleteCategoryConfirm', { name: catDeleting?.name })}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <GhostButton type="button" onClick={() => setCatDeleting(null)} disabled={catBusy}>
            {tr('admin.common.cancel')}
          </GhostButton>
          <PrimaryButton type="button" color="error" onClick={deleteCat} disabled={catBusy}>
            {tr('admin.common.delete')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
