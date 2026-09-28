import { useCallback, useEffect, useState } from 'react';
import { Box, Chip, Container, Typography } from '@mui/material';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import StorefrontIcon from '@mui/icons-material/Storefront';
import VerifiedIcon from '@mui/icons-material/Verified';
import PlaceIcon from '@mui/icons-material/Place';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '../../services/api';
import { useUnifiedTokens } from '../../theme';
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';
import { PrimaryButton, GhostButton } from '../../components/redesign/Buttons';
import { EmptyState, LoadingState, ErrorState } from '../../components/redesign/States';
import { useSalaryLabel, type Job } from '../../components/redesign/JobCard';
import { FadeIn } from '../../components/motion/FadeIn';
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerList';

type AppStatus = 'RECEIVED' | 'VIEWED' | 'SHORTLISTED' | 'REJECTED' | 'HIRED' | 'WITHDRAWN';

const STATUS: Record<AppStatus, { label: string; color: 'default' | 'info' | 'success' | 'error' }> = {
  RECEIVED: { label: 'Recibida', color: 'default' },
  VIEWED: { label: 'Vista por la tienda', color: 'info' },
  SHORTLISTED: { label: 'Preseleccionado/a', color: 'info' },
  REJECTED: { label: 'No seleccionado/a', color: 'error' },
  HIRED: { label: '¡Contratado/a!', color: 'success' },
  WITHDRAWN: { label: 'Retirada', color: 'default' },
};

const CLOSED: AppStatus[] = ['HIRED', 'REJECTED', 'WITHDRAWN'];

interface Application {
  id: string;
  jobId: string;
  status: AppStatus;
  storeNote?: string | null;
  hasCv?: boolean;
  cvName?: string | null;
  createdAt: string;
  job: {
    id: string;
    title: string;
    city?: string | null;
    payPeriod: Job['payPeriod'];
    salaryMin: string | null;
    salaryMax: string | null;
    status: string;
    expiresAt?: string | null;
    store?: { id: string; storeName: string; isVerified?: boolean } | null;
  };
}

export default function MyApplicationsPage() {
  const t = useUnifiedTokens();
  const salaryLabel = useSalaryLabel();
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get('/jobs/applications/mine')
      .then((r) => setItems(r.data.data ?? []))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const withdraw = async (a: Application) => {
    if (!window.confirm(`¿Quieres retirar tu postulación a "${a.job.title}"?`)) return;
    setBusyId(a.id);
    try {
      await api.delete(`/jobs/${a.jobId}/apply`);
      setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: 'WITHDRAWN' } : x)));
      toast.success('Postulación retirada');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const downloadCv = async (a: Application) => {
    try {
      const r = await api.post(`/jobs/applications/${a.id}/cv-link`);
      window.open(r.data.data.path, '_blank');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const jobClosed = (j: Application['job']) =>
    j.status !== 'APPROVED' || (!!j.expiresAt && new Date(j.expiresAt).getTime() < now);

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <PageHeader title="Mis postulaciones" subtitle="Sigue el estado de tus postulaciones a empleos" icon={<AssignmentIndIcon />} />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          message="Todavía no te postulaste a ningún empleo."
          action={<PrimaryButton type="button" to="/empleos">Ver empleos</PrimaryButton>}
        />
      ) : (
        <StaggerContainer>
          <Box display="flex" flexDirection="column" gap={2}>
            {items.map((a) => {
              const st = STATUS[a.status] ?? STATUS.RECEIVED;
              const closed = jobClosed(a.job);
              return (
                <StaggerItem key={a.id}>
                  <FadeIn>
                    <SurfaceCard sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} flexWrap="wrap">
                        <Typography variant="h6" fontWeight={800} color={t.onSurface}>{a.job.title}</Typography>
                        <Chip size="small" label={st.label} color={st.color} variant={st.color === 'default' ? 'outlined' : 'filled'} />
                      </Box>
                      <Box display="flex" alignItems="center" gap={0.5} color={t.onSurfaceVariant} flexWrap="wrap">
                        <StorefrontIcon fontSize="small" />
                        <Typography variant="body2">{a.job.store?.storeName}</Typography>
                        {a.job.store?.isVerified && <VerifiedIcon fontSize="small" sx={{ color: t.primary }} titleAccess="Tienda verificada" />}
                        {a.job.city && (
                          <>
                            <PlaceIcon fontSize="small" sx={{ ml: 1 }} />
                            <Typography variant="body2">{a.job.city}</Typography>
                          </>
                        )}
                      </Box>
                      <Typography fontWeight={800} color={t.primary}>{salaryLabel(a.job as unknown as Job)}</Typography>
                      <Typography variant="caption" color={t.onSurfaceVariant}>
                        Te postulaste el {new Date(a.createdAt).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </Typography>
                      {a.hasCv && (
                        <Typography variant="body2" color={t.onSurfaceVariant}>
                          CV adjunto{a.cvName ? `: ${a.cvName}` : ''}
                        </Typography>
                      )}
                      {a.storeNote && (
                        <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: `${t.primary}14` }}>
                          <Typography variant="caption" fontWeight={700} color={t.onSurfaceVariant}>Mensaje de la tienda</Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{a.storeNote}</Typography>
                        </Box>
                      )}
                      {closed && (
                        <Box display="flex" alignItems="center" gap={0.5} color="warning.main">
                          <WarningAmberIcon fontSize="small" />
                          <Typography variant="body2">Este empleo ya venció o se cerró.</Typography>
                        </Box>
                      )}
                      <Box display="flex" gap={1} justifyContent="flex-end" flexWrap="wrap" mt={0.5}>
                        {a.hasCv && (
                          <GhostButton type="button" onClick={() => void downloadCv(a)}>
                            Descargar CV
                          </GhostButton>
                        )}
                        {!CLOSED.includes(a.status) && (
                          <GhostButton type="button" color="error" disabled={busyId === a.id} onClick={() => withdraw(a)}>
                            Retirar
                          </GhostButton>
                        )}
                        <GhostButton type="button" to="/empleos">Ver empleo</GhostButton>
                      </Box>
                    </SurfaceCard>
                  </FadeIn>
                </StaggerItem>
              );
            })}
          </Box>
        </StaggerContainer>
      )}
    </Container>
  );
}
