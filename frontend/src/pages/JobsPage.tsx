import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SendIcon from '@mui/icons-material/Send';
import { useAuthStore } from '../stores/authStore';
import {
  Alert, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, Grid, InputAdornment,
  MenuItem, Pagination, TextField, Typography,
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import SearchIcon from '@mui/icons-material/Search';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import VerifiedIcon from '@mui/icons-material/Verified';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { api, getErrorMessage } from '../services/api';
import { useUnifiedTokens } from '../theme';
import { useLocationStore } from '../stores/locationStore';
import { PageHeader } from '../components/redesign/PageHeader';
import { NearMeButton } from '../components/redesign/NearMeButton';
import { PrimaryButton, GhostButton } from '../components/redesign/Buttons';
import { EmptyState, LoadingState, ErrorState } from '../components/redesign/States';
import { JobCard, timeAgo, useSalaryLabel, type Job } from '../components/redesign/JobCard';
import { FadeIn } from '../components/motion/FadeIn';
import { StaggerContainer, StaggerItem } from '../components/motion/StaggerList';

interface JobCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
}

const LIMIT = 12;

interface MyApplication {
  id: string;
  status: string;
  createdAt: string;
}

export default function JobsPage() {
  const { t: tr } = useTranslation();
  const APP_STATUS: Record<string, { label: string; color: 'default' | 'info' | 'success' | 'error' }> = {
    RECEIVED: { label: tr('jobs.appStatus.received'), color: 'default' },
    VIEWED: { label: tr('jobs.appStatus.viewed'), color: 'info' },
    SHORTLISTED: { label: tr('jobs.appStatus.shortlisted'), color: 'info' },
    REJECTED: { label: tr('jobs.appStatus.rejected'), color: 'error' },
    HIRED: { label: tr('jobs.appStatus.hired'), color: 'success' },
    WITHDRAWN: { label: tr('jobs.appStatus.withdrawn'), color: 'default' },
  };
  const t = useUnifiedTokens();
  const salaryLabel = useSalaryLabel();
  const coords = useLocationStore((s) => s.coords);

  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [payPeriod, setPayPeriod] = useState('');
  const [qInput, setQInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<Job | null>(null);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [myApp, setMyApp] = useState<MyApplication | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ message: '', contactPhone: '', expectedSalary: '', resumeUrl: '' });
  const [cvFile, setCvFile] = useState<File | null>(null);

  useEffect(() => {
    api.get('/jobs/categories').then((r) => setCategories(r.data.data ?? [])).catch(() => setCategories([]));
  }, []);

  // Debounce de los campos de texto
  useEffect(() => {
    const id = setTimeout(() => {
      setQ(qInput.trim());
      setCity(cityInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [qInput, cityInput]);

  const lat = coords?.lat;
  const lng = coords?.lng;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .get('/jobs', {
        params: {
          q: q || undefined,
          categoryId: categoryId || undefined,
          payPeriod: payPeriod || undefined,
          city: city || undefined,
          page,
          limit: LIMIT,
          lat,
          lng,
        },
      })
      .then((r) => {
        if (!active) return;
        setJobs(r.data.data ?? []);
        setTotalPages(r.data.pagination?.totalPages ?? 1);
      })
      .catch((e) => {
        if (active) setError(getErrorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [q, city, categoryId, payPeriod, page, lat, lng, reload]);

  const pickCategory = (id: string) => {
    setCategoryId(id);
    setPage(1);
  };

  // Detalle: consulta myApplication
  useEffect(() => {
    setMyApp(null);
    if (!selected) return;
    let active = true;
    api
      .get(`/jobs/${selected.id}`)
      .then((r) => {
        if (active) setMyApp(r.data.data?.myApplication ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selected]);

  const openApply = () => {
    if (!user) {
      navigate('/login', { state: { from: '/empleos' } });
      return;
    }
    setForm({ message: '', contactPhone: (user as { phone?: string | null }).phone ?? '', expectedSalary: '', resumeUrl: '' });
    setErrors({});
    setApplyError('');
    setCvFile(null);
    setApplyOpen(true);
  };

  const setField = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onPickCv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!/\.(pdf|doc|docx)$/i.test(f.name)) {
      setErrors((x) => ({ ...x, cv: tr('jobs.errors.cvType') }));
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErrors((x) => ({ ...x, cv: tr('jobs.errors.cvSize') }));
      return;
    }
    setErrors((x) => {
      const { cv: _cv, ...rest } = x;
      return rest;
    });
    setCvFile(f);
  };

  const submitApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const errs: Record<string, string> = {};
    if (form.message.trim().length < 10) errs.message = tr('jobs.errors.messageMinLength');
    if (form.contactPhone.trim().length < 6) errs.contactPhone = tr('jobs.errors.phoneMinLength');
    if (form.expectedSalary !== '' && !(Number(form.expectedSalary) >= 0)) errs.expectedSalary = tr('jobs.errors.invalidAmount');
    if (form.resumeUrl.trim()) {
      try {
        new URL(form.resumeUrl.trim());
      } catch {
        errs.resumeUrl = tr('jobs.errors.invalidUrl');
      }
    }
    if (errors.cv && !cvFile) errs.cv = errors.cv;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    setApplyError('');
    try {
      const body: Record<string, unknown> = { message: form.message.trim(), contactPhone: form.contactPhone.trim() };
      if (form.expectedSalary !== '') body.expectedSalary = Number(form.expectedSalary);
      if (form.resumeUrl.trim()) body.resumeUrl = form.resumeUrl.trim();
      let r;
      if (cvFile) {
        const fd = new FormData();
        Object.entries(body).forEach(([k, v]) => fd.append(k, String(v)));
        fd.append('cv', cvFile);
        r = await api.post(`/jobs/${selected.id}/apply`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        r = await api.post(`/jobs/${selected.id}/apply`, body);
      }
      setMyApp(r.data.data ?? { id: '', status: 'RECEIVED', createdAt: new Date().toISOString() });
      setApplyOpen(false);
      toast.success(tr('jobs.toasts.applicationSent'));
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      setApplyError(
        status === 403 ? tr('jobs.errors.ownStore') : getErrorMessage(err),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const withdraw = async () => {
    if (!selected || !window.confirm(tr('jobs.confirmWithdraw'))) return;
    setWithdrawing(true);
    try {
      await api.delete(`/jobs/${selected.id}/apply`);
      setMyApp((m) => (m ? { ...m, status: 'WITHDRAWN' } : m));
      toast.success(tr('jobs.toasts.applicationWithdrawn'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setWithdrawing(false);
    }
  };

  const phone = selected?.contactPhone?.replace(/\D/g, '') ?? '';

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <PageHeader
        title={tr('jobs.title')}
        subtitle={tr('jobs.subtitle')}
        icon={<WorkIcon />}
        actions={<NearMeButton />}
      />

      <FadeIn>
        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
          <TextField
            size="small"
            placeholder={tr('jobs.search.placeholder')}
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            sx={{ flex: '2 1 200px' }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          />
          <TextField
            size="small"
            placeholder={tr('jobs.search.city')}
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            sx={{ flex: '1 1 140px' }}
          />
          <TextField
            select
            size="small"
            label={tr('jobs.filters.pay')}
            value={payPeriod}
            onChange={(e) => {
              setPayPeriod(e.target.value);
              setPage(1);
            }}
            sx={{ flex: '1 1 140px' }}
          >
            <MenuItem value="">{tr('jobs.filters.payAll')}</MenuItem>
            <MenuItem value="DAILY">{tr('jobs.filters.payDaily')}</MenuItem>
            <MenuItem value="WEEKLY">{tr('jobs.filters.payWeekly')}</MenuItem>
            <MenuItem value="MONTHLY">{tr('jobs.filters.payMonthly')}</MenuItem>
          </TextField>
        </Box>

        <Box display="flex" gap={1} sx={{ overflowX: 'auto', pb: 1, mb: 2 }}>
          <Chip
            label={tr('jobs.filters.categoryAll')}
            clickable
            onClick={() => pickCategory('')}
            color={categoryId === '' ? 'primary' : 'default'}
            variant={categoryId === '' ? 'filled' : 'outlined'}
            sx={{ flexShrink: 0 }}
          />
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={`${c.icon ? c.icon + ' ' : ''}${c.name}`}
              clickable
              onClick={() => pickCategory(c.id)}
              color={categoryId === c.id ? 'primary' : 'default'}
              variant={categoryId === c.id ? 'filled' : 'outlined'}
              sx={{ flexShrink: 0 }}
            />
          ))}
        </Box>
      </FadeIn>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
      ) : jobs.length === 0 ? (
        <EmptyState message={tr('jobs.empty')} />
      ) : (
        <>
          <StaggerContainer>
            <Grid container spacing={2}>
              {jobs.map((job) => (
                <Grid item xs={12} sm={6} md={4} key={job.id}>
                  <StaggerItem className="h-full">
                    <JobCard job={job} onClick={() => setSelected(job)} />
                  </StaggerItem>
                </Grid>
              ))}
            </Grid>
          </StaggerContainer>
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination count={totalPages} page={page} color="primary" onChange={(_, p) => setPage(p)} />
            </Box>
          )}
        </>
      )}

      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        {selected && (
          <>
            <DialogTitle sx={{ fontWeight: 800, pb: 0.5 }}>{selected.title}</DialogTitle>
            <DialogContent>
              <Box display="flex" alignItems="center" gap={0.5} mb={1} color={t.onSurfaceVariant} flexWrap="wrap">
                <StorefrontIcon fontSize="small" />
                <Typography variant="body2">
                  {selected.store?.storeName}
                  {selected.city ? ` · ${selected.city}` : ''}
                  {selected.distanceKm != null ? ` · a ${selected.distanceKm.toFixed(1)} km` : ''}
                </Typography>
                {selected.store?.isVerified && (
                  <Chip size="small" icon={<VerifiedIcon />} label={tr('jobs.detail.verified')} color="primary" variant="outlined" sx={{ ml: 0.5 }} />
                )}
              </Box>
              <Typography fontWeight={800} color={t.primary} mb={0.5}>
                {salaryLabel(selected)}
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                <Chip size="small" label={selected.vacancies === 1 ? tr('jobs.detail.vacancyOne') : tr('jobs.detail.vacanciesCount', { count: selected.vacancies })} />
                {selected.schedule && <Chip size="small" variant="outlined" label={tr('jobs.detail.schedule', { schedule: selected.schedule })} />}
                <Chip size="small" variant="outlined" label={timeAgo(selected.publishedAt)} />
              </Box>
              <Typography variant="subtitle2" fontWeight={700}>{tr('jobs.detail.description')}</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mb: 2 }}>{selected.description}</Typography>
              {selected.requirements && (
                <>
                  <Typography variant="subtitle2" fontWeight={700}>{tr('jobs.detail.requirements')}</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{selected.requirements}</Typography>
                </>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
              {myApp && myApp.status !== 'WITHDRAWN' && (
                <Chip
                  label={tr('jobs.detail.yourApplication', { status: APP_STATUS[myApp.status]?.label ?? myApp.status })}
                  color={APP_STATUS[myApp.status]?.color ?? 'default'}
                  variant={APP_STATUS[myApp.status]?.color === 'default' ? 'outlined' : 'filled'}
                />
              )}
              {myApp && !['HIRED', 'REJECTED', 'WITHDRAWN'].includes(myApp.status) && (
                <GhostButton type="button" color="error" disabled={withdrawing} onClick={withdraw}>
                  {tr('jobs.detail.withdrawApplication')}
                </GhostButton>
              )}
              {(!myApp || myApp.status === 'WITHDRAWN') && (
                <PrimaryButton type="button" startIcon={<SendIcon />} onClick={openApply}>
                  {tr('jobs.detail.applyButton')}
                </PrimaryButton>
              )}
              {selected.store && (
                <GhostButton type="button" to={`/vendedor/${selected.store.id}`}>
                  {tr('jobs.detail.viewStore')}
                </GhostButton>
              )}
              <GhostButton type="button" onClick={() => setSelected(null)}>{tr('jobs.detail.close')}</GhostButton>
              {phone && (
                <PrimaryButton
                  type="button"
                  startIcon={<WhatsAppIcon />}
                  onClick={() => window.open(`https://wa.me/${phone}`, '_blank', 'noopener,noreferrer')}
                >
                  {tr('jobs.detail.contactWhatsApp')}
                </PrimaryButton>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={applyOpen} onClose={() => !submitting && setApplyOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={submitApply} noValidate>
          <DialogTitle sx={{ fontWeight: 800 }}>{tr('jobs.applyDialog.title', { title: selected?.title })}</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <TextField
                label={tr('jobs.applyDialog.messageLabel')}
                multiline
                minRows={3}
                value={form.message}
                onChange={(e) => setField('message', e.target.value)}
                error={!!errors.message}
                helperText={errors.message || tr('jobs.applyDialog.messageHelp')}
                required
              />
              <TextField
                label={tr('jobs.applyDialog.phoneLabel')}
                value={form.contactPhone}
                onChange={(e) => setField('contactPhone', e.target.value)}
                error={!!errors.contactPhone}
                helperText={errors.contactPhone}
                required
              />
              <TextField
                label={tr('jobs.applyDialog.salaryLabel')}
                type="number"
                value={form.expectedSalary}
                onChange={(e) => setField('expectedSalary', e.target.value)}
                error={!!errors.expectedSalary}
                helperText={errors.expectedSalary}
                inputProps={{ min: 0 }}
              />
              <TextField
                label={tr('jobs.applyDialog.resumeLabel')}
                placeholder="https://..."
                value={form.resumeUrl}
                onChange={(e) => setField('resumeUrl', e.target.value)}
                error={!!errors.resumeUrl}
                helperText={errors.resumeUrl}
              />
              <Box>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <Button component="label" variant="text" disabled={submitting} sx={{ textTransform: 'none', fontWeight: 600, minHeight: 44 }}>
                    {tr('jobs.applyDialog.attachCv')}
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={onPickCv}
                    />
                  </Button>
                  {cvFile && (
                    <Chip size="small" label={cvFile.name} onDelete={() => setCvFile(null)} />
                  )}
                </Box>
                {errors.cv && <Typography variant="caption" color="error">{errors.cv}</Typography>}
              </Box>
              {applyError && <Alert severity="error">{applyError}</Alert>}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <GhostButton type="button" disabled={submitting} onClick={() => setApplyOpen(false)}>{tr('jobs.applyDialog.cancel')}</GhostButton>
            <PrimaryButton type="submit" disabled={submitting}>{submitting ? tr('jobs.applyDialog.sending') : tr('jobs.applyDialog.submit')}</PrimaryButton>
          </DialogActions>
        </Box>
      </Dialog>
    </Container>
  );
}
