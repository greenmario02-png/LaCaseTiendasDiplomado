import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Chip,
  Avatar,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import CloseIcon from '@mui/icons-material/Close';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '../../services/api';
import { useUnifiedTokens } from '../../theme';
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';
import { PrimaryButton, GhostButton } from '../../components/redesign/Buttons';
import { EmptyState, LoadingState, ErrorState } from '../../components/redesign/States';
import { FadeIn } from '../../components/motion/FadeIn';
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerList';

type JobStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLOSED';
type PayPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY';

interface JobCategory {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
}

interface Job {
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
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  category: JobCategory;
  _count?: { applications: number };
}

interface FormState {
  categoryId: number | '';
  title: string;
  description: string;
  requirements: string;
  city: string;
  locationState: string;
  payPeriod: PayPeriod;
  salaryMin: string;
  salaryMax: string;
  vacancies: string;
  schedule: string;
  contactPhone: string;
}

const EMPTY_FORM: FormState = {
  categoryId: '',
  title: '',
  description: '',
  requirements: '',
  city: '',
  locationState: '',
  payPeriod: 'MONTHLY',
  salaryMin: '',
  salaryMax: '',
  vacancies: '1',
  schedule: '',
  contactPhone: '',
};

type TFn = (key: string, options?: Record<string, unknown>) => string;

const PAY_PERIODS: PayPeriod[] = ['DAILY', 'WEEKLY', 'MONTHLY'];

function periodLabel(t: TFn, p: PayPeriod): string {
  const map: Record<PayPeriod, string> = {
    DAILY: t('seller.jobs.payPeriod.daily'),
    WEEKLY: t('seller.jobs.payPeriod.weekly'),
    MONTHLY: t('seller.jobs.payPeriod.monthly'),
  };
  return map[p];
}

function statusMeta(t: TFn, status: JobStatus): { label: string; color: 'warning' | 'success' | 'error' | 'default' } {
  const map: Record<JobStatus, { label: string; color: 'warning' | 'success' | 'error' | 'default' }> = {
    PENDING: { label: t('seller.jobs.status.pending'), color: 'warning' },
    APPROVED: { label: t('seller.jobs.status.approved'), color: 'success' },
    REJECTED: { label: t('seller.jobs.status.rejected'), color: 'error' },
    CLOSED: { label: t('seller.jobs.status.closed'), color: 'default' },
  };
  return map[status];
}

function money(v: string | null): string {
  return `Bs ${Number(v).toLocaleString('es-BO', { maximumFractionDigits: 2 })}`;
}

function salaryText(t: TFn, j: Pick<Job, 'salaryMin' | 'salaryMax' | 'payPeriod'>): string {
  const p = periodLabel(t, j.payPeriod).toLowerCase();
  if (j.salaryMin && j.salaryMax) return t('seller.jobs.salary.range', { min: money(j.salaryMin), max: money(j.salaryMax), period: p });
  if (j.salaryMin) return t('seller.jobs.salary.from', { min: money(j.salaryMin), period: p });
  if (j.salaryMax) return t('seller.jobs.salary.upTo', { max: money(j.salaryMax), period: p });
  return t('seller.jobs.salary.negotiable', { period: p });
}

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

function validate(t: TFn, f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.categoryId === '') e.categoryId = t('seller.jobs.form.errors.category');
  if (f.title.trim().length < 5) e.title = t('seller.jobs.form.errors.titleMin');
  if (f.description.trim().length < 20) e.description = t('seller.jobs.form.errors.descriptionMin');
  if (!f.city.trim()) e.city = t('seller.jobs.form.errors.city');
  const vac = Number(f.vacancies);
  if (!Number.isInteger(vac) || vac < 1) e.vacancies = t('seller.jobs.form.errors.vacanciesMin');
  const min = f.salaryMin === '' ? null : Number(f.salaryMin);
  const max = f.salaryMax === '' ? null : Number(f.salaryMax);
  if (min !== null && (Number.isNaN(min) || min < 0)) e.salaryMin = t('seller.jobs.form.errors.salaryInvalid');
  if (max !== null && (Number.isNaN(max) || max < 0)) e.salaryMax = t('seller.jobs.form.errors.salaryInvalid');
  if (!e.salaryMin && !e.salaryMax && min !== null && max !== null && min > max) {
    e.salaryMax = t('seller.jobs.form.errors.salaryMaxLessThanMin');
  }
  return e;
}

type AppStatus = 'RECEIVED' | 'VIEWED' | 'SHORTLISTED' | 'REJECTED' | 'HIRED';
type ActionStatus = Exclude<AppStatus, 'RECEIVED'>;

interface Applicant {
  id: number;
  message: string | null;
  contactPhone: string | null;
  expectedSalary: string | number | null;
  resumeUrl: string | null;
  hasCv?: boolean;
  cvName?: string | null;
  status: AppStatus;
  storeNote: string | null;
  createdAt: string;
  applicant: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    profileImage: string | null;
  };
}

function appStatusMeta(t: TFn): Record<AppStatus, { label: string; color: 'info' | 'default' | 'primary' | 'error' | 'success' }> {
  return {
    RECEIVED: { label: t('seller.jobs.appStatus.received'), color: 'info' },
    VIEWED: { label: t('seller.jobs.appStatus.viewed'), color: 'default' },
    SHORTLISTED: { label: t('seller.jobs.appStatus.shortlisted'), color: 'primary' },
    REJECTED: { label: t('seller.jobs.appStatus.rejected'), color: 'error' },
    HIRED: { label: t('seller.jobs.appStatus.hired'), color: 'success' },
  };
}

function getActions(t: TFn): { status: ActionStatus; label: string; verb: string }[] {
  return [
    { status: 'VIEWED', label: t('seller.jobs.actions.markViewed'), verb: t('seller.jobs.actionVerbs.markViewed') },
    { status: 'SHORTLISTED', label: t('seller.jobs.actions.shortlist'), verb: t('seller.jobs.actionVerbs.shortlist') },
    { status: 'REJECTED', label: t('seller.jobs.actions.reject'), verb: t('seller.jobs.actionVerbs.reject') },
    { status: 'HIRED', label: t('seller.jobs.actions.hire'), verb: t('seller.jobs.actionVerbs.hire') },
  ];
}

function getFilters(t: TFn): { key: 'ALL' | AppStatus; label: string }[] {
  return [
    { key: 'ALL', label: t('seller.jobs.filters.all') },
    { key: 'RECEIVED', label: t('seller.jobs.filters.new') },
    { key: 'SHORTLISTED', label: t('seller.jobs.filters.shortlisted') },
    { key: 'HIRED', label: t('seller.jobs.filters.hired') },
    { key: 'REJECTED', label: t('seller.jobs.filters.rejected') },
  ];
}

function ApplicantsDrawer({ job, onClose, onChanged }: { job: Job | null; onClose: () => void; onChanged: () => void }) {
  const { t: tr } = useTranslation();
  const t = useUnifiedTokens();
  const actions = getActions(tr);
  const filters = getFilters(tr);
  const appStatus = appStatusMeta(tr);
  const [items, setItems] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | AppStatus>('ALL');
  const [pending, setPending] = useState<{ app: Applicant; action: (typeof actions)[number] } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [hiredHint, setHiredHint] = useState(false);
  const jobId = job?.id;

  const fetchList = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/seller/jobs/${jobId}/applications`);
      setItems(res.data.data ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (jobId) {
      setFilter('ALL');
      setHiredHint(false);
      setItems([]);
      void fetchList();
    }
  }, [jobId, fetchList]);

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const body: { status: ActionStatus; note?: string } = { status: pending.action.status };
      if (note.trim()) body.note = note.trim();
      await api.put(`/seller/jobs/applications/${pending.app.id}/status`, body);
      toast.success(tr('seller.jobs.toasts.statusUpdated'));
      if (pending.action.status === 'HIRED') setHiredHint(true);
      setPending(null);
      setNote('');
      await fetchList();
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const downloadCv = async (id: number) => {
    try {
      const r = await api.post(`/jobs/applications/${id}/cv-link`);
      window.open(r.data.data.path, '_blank');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const shown = filter === 'ALL' ? items : items.filter((a) => a.status === filter);
  const hiredCount = items.filter((a) => a.status === 'HIRED').length;

  return (
    <>
      <Drawer anchor="right" open={!!job} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, bgcolor: t.surface } }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" px={2.5} py={2} gap={1}>
          <Typography variant="h6" fontWeight={700} color={t.onSurface} noWrap>
            {tr('seller.jobs.applicants.drawerTitle', { title: job?.title })}
          </Typography>
          <IconButton aria-label={tr('seller.jobs.applicants.closeDrawer')} onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <Box px={2.5} py={1.5}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {filters.map((f) => (
              <Chip
                key={f.key}
                size="small"
                clickable
                label={f.label}
                color={filter === f.key ? 'primary' : 'default'}
                variant={filter === f.key ? 'filled' : 'outlined'}
                onClick={() => setFilter(f.key)}
              />
            ))}
          </Stack>
          {hiredHint && job && (
            <Alert severity="success" sx={{ mt: 1.5 }} onClose={() => setHiredHint(false)}>
              {tr('seller.jobs.applicants.hiredHint', { count: job.vacancies, hired: hiredCount })}
            </Alert>
          )}
        </Box>
        <Box px={2.5} pb={3} flex={1} overflow="auto">
          {loading && items.length === 0 ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchList} />
          ) : items.length === 0 ? (
            <EmptyState message={tr('seller.jobs.applicants.empty')} />
          ) : shown.length === 0 ? (
            <EmptyState message={tr('seller.jobs.applicants.emptyFiltered')} />
          ) : (
            <Stack spacing={2}>
              {shown.map((a) => {
                const p = a.applicant;
                const m = appStatus[a.status];
                const phone = a.contactPhone || p.phone;
                const digits = phone ? phone.replace(/\D/g, '') : '';
                return (
                  <SurfaceCard key={a.id}>
                    <Box display="flex" gap={1.5} alignItems="center" mb={1}>
                      <Avatar src={p.profileImage ?? undefined} alt={p.firstName}>
                        {`${p.firstName?.[0] ?? ''}${p.lastName?.[0] ?? ''}`.toUpperCase()}
                      </Avatar>
                      <Box flex={1} minWidth={0}>
                        <Typography fontWeight={700} color={t.onSurface} noWrap>
                          {p.firstName} {p.lastName}
                        </Typography>
                        <Typography variant="caption" color={t.onSurfaceVariant}>
                          {fmtDate(a.createdAt)}
                        </Typography>
                      </Box>
                      <Chip size="small" label={m.label} color={m.color} />
                    </Box>
                    {a.message && (
                      <Typography variant="body2" color={t.onSurface} sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                        {a.message}
                      </Typography>
                    )}
                    <Stack spacing={0.5} mb={1}>
                      {phone && (
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <PhoneOutlinedIcon sx={{ fontSize: 16, color: t.onSurfaceVariant }} />
                          <Typography variant="body2" component="a" href={`tel:${phone}`} sx={{ color: t.primary }}>
                            {phone}
                          </Typography>
                          {digits && (
                            <Chip
                              size="small"
                              clickable
                              component="a"
                              href={`https://wa.me/${digits}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              icon={<WhatsAppIcon />}
                              label="WhatsApp"
                            />
                          )}
                        </Stack>
                      )}
                      <Stack direction="row" spacing={1} alignItems="center">
                        <EmailOutlinedIcon sx={{ fontSize: 16, color: t.onSurfaceVariant }} />
                        <Typography variant="body2" component="a" href={`mailto:${p.email}`} sx={{ color: t.primary }}>
                          {p.email}
                        </Typography>
                      </Stack>
                      {a.expectedSalary != null && a.expectedSalary !== '' && (
                        <Typography variant="body2" color={t.onSurfaceVariant}>
                          {tr('seller.jobs.applicants.expectedSalary')} <b>{money(String(a.expectedSalary))}</b>
                        </Typography>
                      )}
                      {a.resumeUrl && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <DescriptionOutlinedIcon sx={{ fontSize: 16, color: t.onSurfaceVariant }} />
                          <Typography variant="body2" component="a" href={a.resumeUrl} target="_blank" rel="noopener noreferrer" sx={{ color: t.primary }}>
                            {tr('seller.jobs.applicants.viewCv')}
                          </Typography>
                        </Stack>
                      )}
                      {a.hasCv && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <DescriptionOutlinedIcon sx={{ fontSize: 16, color: t.onSurfaceVariant }} />
                          <GhostButton type="button" size="small" onClick={() => void downloadCv(a.id)}>
                            {a.cvName ? tr('seller.jobs.applicants.downloadCvNamed', { name: a.cvName }) : tr('seller.jobs.applicants.downloadCv')}
                          </GhostButton>
                        </Stack>
                      )}
                      {a.storeNote && (
                        <Typography variant="caption" color={t.onSurfaceVariant}>
                          {tr('seller.jobs.applicants.yourMessage', { note: a.storeNote })}
                        </Typography>
                      )}
                    </Stack>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {actions.filter((x) => x.status !== a.status).map((x) => (
                        <GhostButton
                          key={x.status}
                          type="button"
                          size="small"
                          color={x.status === 'REJECTED' ? 'error' : undefined}
                          onClick={() => {
                            setNote('');
                            setPending({ app: a, action: x });
                          }}
                        >
                          {x.label}
                        </GhostButton>
                      ))}
                    </Stack>
                  </SurfaceCard>
                );
              })}
            </Stack>
          )}
        </Box>
      </Drawer>

      <Dialog open={!!pending} onClose={() => !busy && setPending(null)} fullWidth maxWidth="xs">
        <DialogTitle>{pending?.action.label}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            {tr('seller.jobs.applicants.confirmMessage', {
              verb: pending?.action.verb,
              firstName: pending?.app.applicant.firstName,
              lastName: pending?.app.applicant.lastName,
            })}
          </Typography>
          <TextField
            label={tr('seller.jobs.applicants.noteLabel')}
            size="small"
            multiline
            minRows={2}
            fullWidth
            value={note}
            onChange={(e) => setNote(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <GhostButton type="button" onClick={() => setPending(null)} disabled={busy}>
            {tr('seller.jobs.actions.cancel')}
          </GhostButton>
          <PrimaryButton type="button" onClick={confirm} disabled={busy}>
            {busy ? <CircularProgress size={20} color="inherit" /> : tr('seller.jobs.applicants.confirm')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function SellerJobs() {
  const { t: tr } = useTranslation();
  const t = useUnifiedTokens();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [isVerified, setIsVerified] = useState(true);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [closing, setClosing] = useState<Job | null>(null);
  const [closeBusy, setCloseBusy] = useState(false);
  const [applicantsJob, setApplicantsJob] = useState<Job | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [jobsRes, catRes] = await Promise.all([api.get('/seller/jobs'), api.get('/jobs/categories')]);
      const d = jobsRes.data.data;
      setJobs(d.jobs ?? []);
      setCanPost(!!d.canPost);
      setIsVerified(d.isVerified !== false);
      setCategories(catRes.data.data ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (j: Job) => {
    setEditing(j);
    setForm({
      categoryId: j.category.id,
      title: j.title,
      description: j.description,
      requirements: j.requirements ?? '',
      city: j.city,
      locationState: j.locationState ?? '',
      payPeriod: j.payPeriod,
      salaryMin: j.salaryMin ? String(Number(j.salaryMin)) : '',
      salaryMax: j.salaryMax ? String(Number(j.salaryMax)) : '',
      vacancies: String(j.vacancies),
      schedule: j.schedule ?? '',
      contactPhone: j.contactPhone ?? '',
    });
    setErrors({});
    setDialogOpen(true);
  };

  const submit = async () => {
    const e = validate(tr, form);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    const body: Record<string, unknown> = {
      categoryId: form.categoryId,
      title: form.title.trim(),
      description: form.description.trim(),
      city: form.city.trim(),
      payPeriod: form.payPeriod,
      vacancies: Number(form.vacancies),
    };
    if (form.requirements.trim()) body.requirements = form.requirements.trim();
    if (form.locationState.trim()) body.locationState = form.locationState.trim();
    if (form.salaryMin !== '') body.salaryMin = Number(form.salaryMin);
    if (form.salaryMax !== '') body.salaryMax = Number(form.salaryMax);
    if (form.schedule.trim()) body.schedule = form.schedule.trim();
    if (form.contactPhone.trim()) body.contactPhone = form.contactPhone.trim();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/seller/jobs/${editing.id}`, body);
        toast.success(tr('seller.jobs.toasts.updated'));
      } else {
        await api.post('/seller/jobs', body);
        toast.success(tr('seller.jobs.toasts.created'));
      }
      setDialogOpen(false);
      void load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmClose = async () => {
    if (!closing) return;
    setCloseBusy(true);
    try {
      await api.post(`/seller/jobs/${closing.id}/close`);
      toast.success(tr('seller.jobs.toasts.closed'));
      setClosing(null);
      void load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCloseBusy(false);
    }
  };

  const postDisabled = !isVerified || !canPost;

  return (
    <Box>
      <PageHeader
        title={tr('seller.jobs.title')}
        subtitle={tr('seller.jobs.subtitle')}
        icon={<WorkOutlineIcon />}
        actions={
          <PrimaryButton type="button" startIcon={postDisabled ? <LockOutlinedIcon /> : <AddIcon />} onClick={openCreate} disabled={postDisabled}>
            {tr('seller.jobs.actions.create')}
          </PrimaryButton>
        }
      />

      {!loading && !isVerified && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <GhostButton type="button" to="/seller/configuracion" size="small" color="inherit">
              {tr('seller.jobs.verification.goToSettings')}
            </GhostButton>
          }
        >
          {tr('seller.jobs.verification.notVerifiedPrefix')}{' '}
          <Link to="/seller/configuracion">{tr('seller.jobs.verification.settingsLink')}</Link>.
        </Alert>
      )}
      {!loading && isVerified && !canPost && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {tr('seller.jobs.verification.notApproved')}
        </Alert>
      )}
      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        {tr('seller.jobs.infoBanner')}
      </Alert>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : jobs.length === 0 ? (
        <SurfaceCard>
          <EmptyState message={tr('seller.jobs.empty')} />
        </SurfaceCard>
      ) : (
        <StaggerContainer>
          <Stack spacing={2}>
            {jobs.map((j) => {
              const meta = statusMeta(tr, j.status);
              return (
                <StaggerItem key={j.id}>
                  <SurfaceCard>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
                      <Box minWidth={0} flex={1}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mb={0.5}>
                          <Typography variant="subtitle1" fontWeight={700} color={t.onSurface}>
                            {j.title}
                          </Typography>
                          <Chip size="small" label={meta.label} color={meta.color} />
                        </Stack>
                        <Typography variant="body2" color={t.onSurfaceVariant}>
                          {j.category.icon ?? ''} {j.category.name} ·{' '}
                          <PlaceOutlinedIcon sx={{ fontSize: 14, verticalAlign: 'text-bottom' }} /> {j.city}
                          {j.locationState ? `, ${j.locationState}` : ''} · {tr('seller.jobs.vacancyCount', { count: j.vacancies })}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color={t.primary} mt={0.5}>
                          {salaryText(tr, j)}
                        </Typography>
                        <Typography variant="caption" color={t.onSurfaceVariant}>
                          {j.status === 'APPROVED' ? tr('seller.jobs.expiresOn', { date: fmtDate(j.expiresAt) }) : tr('seller.jobs.createdOn', { date: fmtDate(j.createdAt) })}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        {(j.status === 'APPROVED' || j.status === 'CLOSED') && (
                          <Chip
                            clickable
                            icon={<GroupsOutlinedIcon />}
                            label={tr('seller.jobs.applicantsChip', { count: j._count?.applications ?? 0 })}
                            color={(j._count?.applications ?? 0) > 0 ? 'primary' : 'default'}
                            variant={(j._count?.applications ?? 0) > 0 ? 'filled' : 'outlined'}
                            onClick={() => setApplicantsJob(j)}
                            sx={{ alignSelf: 'center', fontWeight: 600 }}
                          />
                        )}
                        {j.status !== 'CLOSED' && (
                          <Tooltip title={tr('seller.jobs.editTooltip')}>
                            <IconButton aria-label={tr('seller.jobs.editAriaLabel')} onClick={() => openEdit(j)}>
                              <EditOutlinedIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(j.status === 'APPROVED' || j.status === 'PENDING') && (
                          <GhostButton type="button" color="error" size="small" onClick={() => setClosing(j)}>
                            {tr('seller.jobs.actions.closeJob')}
                          </GhostButton>
                        )}
                      </Stack>
                    </Box>
                    {j.status === 'REJECTED' && j.rejectionReason && (
                      <FadeIn>
                        <Alert severity="error" sx={{ mt: 1.5 }}>
                          {tr('seller.jobs.rejectionReason', { reason: j.rejectionReason })}
                        </Alert>
                      </FadeIn>
                    )}
                  </SurfaceCard>
                </StaggerItem>
              );
            })}
          </Stack>
        </StaggerContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? tr('seller.jobs.dialog.editTitle') : tr('seller.jobs.actions.create')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={0.5}>
            {editing && (
              <Alert severity="warning">{tr('seller.jobs.dialog.editWarning')}</Alert>
            )}
            <FormControl fullWidth size="small" error={!!errors.categoryId}>
              <InputLabel id="job-cat">{tr('seller.jobs.form.category')}</InputLabel>
              <Select
                labelId="job-cat"
                label={tr('seller.jobs.form.category')}
                value={form.categoryId}
                onChange={(e) => set('categoryId', Number(e.target.value))}
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.icon ?? ''} {c.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.categoryId && <FormHelperText>{errors.categoryId}</FormHelperText>}
            </FormControl>
            <TextField label={tr('seller.jobs.form.title')} size="small" value={form.title} onChange={(e) => set('title', e.target.value)} error={!!errors.title} helperText={errors.title} fullWidth />
            <TextField
              label={tr('seller.jobs.form.description')}
              size="small"
              multiline
              minRows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              error={!!errors.description}
              helperText={errors.description || tr('seller.jobs.form.descriptionHint')}
              fullWidth
            />
            <TextField label={tr('seller.jobs.form.requirements')} size="small" multiline minRows={2} value={form.requirements} onChange={(e) => set('requirements', e.target.value)} fullWidth />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label={tr('seller.jobs.form.city')} size="small" value={form.city} onChange={(e) => set('city', e.target.value)} error={!!errors.city} helperText={errors.city} fullWidth />
              <TextField label={tr('seller.jobs.form.locationState')} size="small" value={form.locationState} onChange={(e) => set('locationState', e.target.value)} fullWidth />
            </Stack>
            <Box>
              <Typography variant="caption" color={t.onSurfaceVariant}>
                {tr('seller.jobs.form.payPeriodLabel')}
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                color="primary"
                value={form.payPeriod}
                onChange={(_, v: PayPeriod | null) => v && set('payPeriod', v)}
                sx={{ mt: 0.5 }}
              >
                {PAY_PERIODS.map((p) => (
                  <ToggleButton key={p} value={p} sx={{ textTransform: 'none' }}>
                    {periodLabel(tr, p)}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={tr('seller.jobs.form.salaryMin')}
                size="small"
                type="number"
                value={form.salaryMin}
                onChange={(e) => set('salaryMin', e.target.value)}
                error={!!errors.salaryMin}
                helperText={errors.salaryMin}
                slotProps={{ input: { startAdornment: <InputAdornment position="start">Bs</InputAdornment> }, htmlInput: { min: 0 } }}
                fullWidth
              />
              <TextField
                label={tr('seller.jobs.form.salaryMax')}
                size="small"
                type="number"
                value={form.salaryMax}
                onChange={(e) => set('salaryMax', e.target.value)}
                error={!!errors.salaryMax}
                helperText={errors.salaryMax}
                slotProps={{ input: { startAdornment: <InputAdornment position="start">Bs</InputAdornment> }, htmlInput: { min: 0 } }}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={tr('seller.jobs.form.vacancies')}
                size="small"
                type="number"
                value={form.vacancies}
                onChange={(e) => set('vacancies', e.target.value)}
                error={!!errors.vacancies}
                helperText={errors.vacancies}
                slotProps={{ htmlInput: { min: 1 } }}
                fullWidth
              />
              <TextField label={tr('seller.jobs.form.schedule')} size="small" value={form.schedule} onChange={(e) => set('schedule', e.target.value)} fullWidth />
            </Stack>
            <TextField label={tr('seller.jobs.form.contactPhone')} size="small" value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <GhostButton type="button" onClick={() => setDialogOpen(false)} disabled={saving}>
            {tr('seller.jobs.actions.cancel')}
          </GhostButton>
          <PrimaryButton type="button" onClick={submit} disabled={saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : editing ? tr('seller.jobs.actions.saveAndSubmit') : tr('seller.jobs.actions.submit')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      <ApplicantsDrawer job={applicantsJob} onClose={() => setApplicantsJob(null)} onChanged={() => void load()} />

      <Dialog open={!!closing} onClose={() => !closeBusy && setClosing(null)}>
        <DialogTitle>{tr('seller.jobs.closeDialog.title')}</DialogTitle>
        <DialogContent>
          <Typography>
            {tr('seller.jobs.closeDialog.confirm', { title: closing?.title })}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <GhostButton type="button" onClick={() => setClosing(null)} disabled={closeBusy}>
            {tr('seller.jobs.actions.cancel')}
          </GhostButton>
          <PrimaryButton type="button" color="error" onClick={confirmClose} disabled={closeBusy}>
            {tr('seller.jobs.closeDialog.title')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
