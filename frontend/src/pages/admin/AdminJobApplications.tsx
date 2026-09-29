import { useCallback, useEffect, useState } from 'react';
import { Box, Chip, InputAdornment, Pagination, Stack, TextField, Typography } from '@mui/material';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage } from '../../services/api';
import { useUnifiedTokens } from '../../theme';
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';
import { GhostButton } from '../../components/redesign/Buttons';
import { EmptyState, LoadingState, ErrorState } from '../../components/redesign/States';
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerList';

type AppStatus = 'RECEIVED' | 'VIEWED' | 'SHORTLISTED' | 'REJECTED' | 'HIRED' | 'WITHDRAWN';

const STATUS_LABEL_KEY: Record<AppStatus, string> = {
  RECEIVED: 'admin.jobApplications.status.received',
  VIEWED: 'admin.jobApplications.status.viewed',
  SHORTLISTED: 'admin.jobApplications.status.shortlisted',
  REJECTED: 'admin.jobApplications.status.rejected',
  HIRED: 'admin.jobApplications.status.hired',
  WITHDRAWN: 'admin.jobApplications.status.withdrawn',
};
const STATUS_COLOR: Record<AppStatus, 'default' | 'info' | 'primary' | 'error' | 'success' | 'warning'> = {
  RECEIVED: 'info',
  VIEWED: 'default',
  SHORTLISTED: 'primary',
  REJECTED: 'error',
  HIRED: 'success',
  WITHDRAWN: 'warning',
};
const STATUSES = Object.keys(STATUS_LABEL_KEY) as AppStatus[];
const LIMIT = 20;

interface Application {
  id: number;
  message: string | null;
  contactPhone: string | null;
  expectedSalary: string | number | null;
  status: AppStatus;
  storeNote: string | null;
  createdAt: string;
  hasCv: boolean;
  cvName: string | null;
  applicant: { id: number; firstName: string; lastName: string; email: string; phone: string | null };
  job: { id: number; title: string; store: { id: number; firstName: string; lastName: string; storeName: string | null } };
}

export default function AdminJobApplications() {
  const t = useUnifiedTokens();
  const { t: tr } = useTranslation();
  const [status, setStatus] = useState<AppStatus | ''>('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Partial<Record<AppStatus, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const h = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(h);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/job-applications', {
        params: { status: status || undefined, q: q || undefined, page, limit: LIMIT },
      });
      const d = res.data.data;
      setItems(d.items ?? []);
      setTotal(d.total ?? 0);
      setStats(d.stats ?? {});
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status, q, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const downloadCv = async (id: number) => {
    try {
      const res = await api.post(`/jobs/applications/${id}/cv-link`);
      window.open(res.data.data.path, '_blank');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const allCount = STATUSES.reduce((s, k) => s + (stats[k] ?? 0), 0);
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const storeName = (a: Application) =>
    a.job.store.storeName || `${a.job.store.firstName} ${a.job.store.lastName}`.trim();

  return (
    <Box>
      <PageHeader title={tr('admin.jobApplications.title')} subtitle={tr('admin.jobApplications.subtitle')} icon={<AssignmentIndOutlinedIcon />} />

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mb={2}>
        <Chip
          label={tr('admin.jobApplications.allFilter', { count: allCount })}
          color={status === '' ? 'primary' : 'default'}
          onClick={() => { setStatus(''); setPage(1); }}
        />
        {STATUSES.map((s) => (
          <Chip
            key={s}
            label={`${tr(STATUS_LABEL_KEY[s])} (${stats[s] ?? 0})`}
            color={status === s ? 'primary' : 'default'}
            variant={status === s ? 'filled' : 'outlined'}
            onClick={() => { setStatus(s); setPage(1); }}
          />
        ))}
      </Stack>

      <TextField
        size="small"
        fullWidth
        placeholder={tr('admin.jobApplications.searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, maxWidth: 420 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <SurfaceCard>
          <EmptyState message={tr('admin.jobApplications.emptyState')} />
        </SurfaceCard>
      ) : (
        <>
          <StaggerContainer>
            <Stack spacing={2}>
              {items.map((a) => (
                <StaggerItem key={a.id}>
                  <SurfaceCard>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
                      <Box minWidth={0} flex={1}>
                        <Typography variant="subtitle1" fontWeight={700} color={t.onSurface}>
                          {a.applicant.firstName} {a.applicant.lastName}
                        </Typography>
                        <Typography variant="body2" color={t.onSurfaceVariant}>
                          {a.applicant.email}
                        </Typography>
                        <Typography variant="body2" color={t.onSurface} mt={0.5}>
                          <b>{a.job.title}</b> · {storeName(a)}
                        </Typography>
                        <Typography variant="caption" color={t.onSurfaceVariant}>
                          {new Date(a.createdAt).toLocaleDateString('es-BO')}
                          {a.expectedSalary != null && a.expectedSalary !== ''
                            ? ` · ${tr('admin.jobApplications.expectedSalary', { amount: Number(a.expectedSalary).toLocaleString('es-BO', { maximumFractionDigits: 2 }) })}`
                            : ''}
                        </Typography>
                      </Box>
                      <Stack alignItems="flex-end" spacing={1}>
                        <Chip size="small" color={STATUS_COLOR[a.status]} label={tr(STATUS_LABEL_KEY[a.status])} />
                        {a.hasCv && (
                          <GhostButton type="button" size="small" startIcon={<DownloadIcon />} onClick={() => downloadCv(a.id)}>
                            {tr('admin.jobApplications.downloadCv')}
                          </GhostButton>
                        )}
                      </Stack>
                    </Box>
                  </SurfaceCard>
                </StaggerItem>
              ))}
            </Stack>
          </StaggerContainer>
          {pages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination count={pages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
