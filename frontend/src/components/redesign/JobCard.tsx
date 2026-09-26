import { Box, Chip, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import StorefrontIcon from '@mui/icons-material/Storefront';
import GroupsIcon from '@mui/icons-material/Groups';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useUnifiedTokens } from '../../theme';
import { SurfaceCard } from './PageHeader';
import { useMoney } from '../../hooks/useMoney';

export interface Job {
  id: string;
  title: string;
  description: string;
  requirements?: string | null;
  city?: string | null;
  locationState?: string | null;
  payPeriod: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  salaryMin: string | null;
  salaryMax: string | null;
  vacancies: number;
  schedule?: string | null;
  contactPhone?: string | null;
  publishedAt?: string | null;
  expiresAt?: string | null;
  category?: { id: string; name: string; slug: string; icon?: string | null } | null;
  store?: { id: string; storeName: string; storeLogo?: string | null; isVerified?: boolean; locationCity?: string | null } | null;
  distanceKm?: number | null;
}

export const PAY_PERIOD_LABEL: Record<Job['payPeriod'], string> = {
  DAILY: 'por día',
  WEEKLY: 'por semana',
  MONTHLY: 'por mes',
};

/** Devuelve una función que arma "Bs 700 – 900 por semana" (o "Sueldo a convenir"). */
export function useSalaryLabel() {
  const money = useMoney();
  return (job: Job) => {
    const min = job.salaryMin != null ? Number(job.salaryMin) : null;
    const max = job.salaryMax != null ? Number(job.salaryMax) : null;
    const per = PAY_PERIOD_LABEL[job.payPeriod];
    if (min == null && max == null) return 'Sueldo a convenir';
    if (min != null && max != null && min !== max) return `${money(min)} – ${money(max)} ${per}`;
    return `${money((min ?? max) as number)} ${per}`;
  };
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Recién publicado';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return d === 1 ? 'Hace 1 día' : `Hace ${d} días`;
  const m = Math.floor(d / 30);
  return m === 1 ? 'Hace 1 mes' : `Hace ${m} meses`;
}

interface JobCardProps {
  job: Job;
  onClick?: () => void;
}

export function JobCard({ job, onClick }: JobCardProps) {
  const t = useUnifiedTokens();
  const salary = useSalaryLabel()(job);
  const city = job.city || job.store?.locationCity;

  return (
    <SurfaceCard
      onClick={onClick}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform .15s, border-color .15s',
        '&:hover': onClick ? { transform: 'translateY(-2px)', borderColor: t.primary } : undefined,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
        {job.category && (
          <Chip
            size="small"
            label={`${job.category.icon ? job.category.icon + ' ' : ''}${job.category.name}`}
            sx={{ bgcolor: `${t.primary}1F`, color: t.primary, fontWeight: 700 }}
          />
        )}
        <Typography variant="caption" color={t.onSurfaceVariant}>
          {timeAgo(job.publishedAt)}
        </Typography>
      </Box>

      <Typography variant="h6" fontWeight={800} color={t.onSurface} sx={{ lineHeight: 1.25 }}>
        {job.title}
      </Typography>

      <Box display="flex" alignItems="center" gap={0.5} color={t.onSurfaceVariant} minWidth={0}>
        <StorefrontIcon fontSize="small" />
        <Typography variant="body2" noWrap>
          {job.store?.storeName}
        </Typography>
        {job.store?.isVerified && <VerifiedIcon fontSize="small" sx={{ color: t.primary }} titleAccess="Tienda verificada" />}
      </Box>

      {(city || job.distanceKm != null) && (
        <Box display="flex" alignItems="center" gap={0.5} color={t.onSurfaceVariant}>
          <PlaceIcon fontSize="small" />
          <Typography variant="body2">
            {city}
            {job.distanceKm != null && `${city ? ' · ' : ''}a ${job.distanceKm < 10 ? job.distanceKm.toFixed(1) : Math.round(job.distanceKm)} km`}
          </Typography>
        </Box>
      )}

      <Box flexGrow={1} />

      <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap" mt={1}>
        <Typography fontWeight={800} color={t.primary}>
          {salary}
        </Typography>
        <Chip
          size="small"
          icon={<GroupsIcon />}
          label={job.vacancies === 1 ? '1 vacante' : `${job.vacancies} vacantes`}
          variant="outlined"
          sx={{ borderColor: `${t.outline}66`, color: t.onSurfaceVariant }}
        />
      </Box>
    </SurfaceCard>
  );
}
