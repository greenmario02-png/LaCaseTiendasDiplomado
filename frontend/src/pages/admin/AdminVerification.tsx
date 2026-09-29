import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Box, Typography, Paper, Chip, Stack, Avatar, CircularProgress, Alert, Divider } from '@mui/material';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { api, getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface VerificationSeller {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  storeName: string;
  storeDescription?: string;
  locationCity?: string;
  locationState?: string;
  latitude?: number | null;
  longitude?: number | null;
  locationVerified?: boolean;
  nit?: string;
  verificationNote?: string;
  isVerified: boolean;
  createdAt: string;
}

export default function AdminVerification() {
  const { t } = useTranslation();
  const [sellers, setSellers] = useState<VerificationSeller[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/sellers/verification')
      .then((r) => setSellers(r.data.data ?? []))
      .catch(() => setSellers([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const decide = async (id: number, isVerified: boolean) => {
    try {
      await api.put(`/admin/users/${id}`, { isVerified });
      toast.success(isVerified ? t('admin.verification.toastGranted') : t('admin.verification.toastRevoked'));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const decideLocation = async (id: number, locationVerified: boolean) => {
    try {
      await api.put(`/admin/users/${id}`, { locationVerified });
      toast.success(locationVerified ? t('admin.verification.toastLocationVerified') : t('admin.verification.toastLocationUnverified'));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const pending = sellers.filter((s) => !s.isVerified);
  const verified = sellers.filter((s) => s.isVerified);

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 6 }} />;

  const renderCard = (s: VerificationSeller) => (
    <Paper key={s.id} sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" gap={2}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>{s.storeName?.[0] ?? s.firstName[0]}</Avatar>
        <Box flex={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6" fontWeight={700}>
              {s.storeName}
            </Typography>
            {s.isVerified ? (
              <Chip size="small" color="success" icon={<CheckCircleIcon />} label={t('admin.verification.status.verified')} />
            ) : (
              <Chip size="small" color="warning" label={t('admin.verification.status.pending')} />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t('admin.verification.sellerMeta', {
              firstName: s.firstName,
              lastName: s.lastName,
              email: s.email,
              date: new Date(s.createdAt).toLocaleDateString('es-BO'),
            })}
          </Typography>
          <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
            <LocationOnIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {s.locationCity}, {s.locationState}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 1.5 }} />

      <Box mb={1}>
        <Typography variant="caption" fontWeight={700} color="text.secondary">
          {t('admin.verification.nitLabel')}
        </Typography>{' '}
        <Typography component="span" variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {s.nit ?? '—'}
        </Typography>
      </Box>
      {s.verificationNote && (
        <Box mb={1}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            {t('admin.verification.sellerNoteLabel')}
          </Typography>{' '}
          <Typography component="span" variant="body2">
            {s.verificationNote}
          </Typography>
        </Box>
      )}
      {s.storeDescription && (
        <Typography variant="body2" color="text.secondary" mb={1}>
          {s.storeDescription}
        </Typography>
      )}

      <Stack direction="row" spacing={1} mt={1.5}>
        {!s.isVerified ? (
          <>
            <PrimaryButton size="small" color="success" startIcon={<VerifiedUserIcon />} onClick={() => decide(s.id, true)}>
              {t('admin.verification.grantBadge')}
            </PrimaryButton>
            <SecondaryButton size="small" color="error" startIcon={<CancelIcon />} onClick={() => decide(s.id, false)}>
              {t('admin.verification.reject')}
            </SecondaryButton>
          </>
        ) : (
          <SecondaryButton size="small" color="error" startIcon={<CancelIcon />} onClick={() => decide(s.id, false)}>
            {t('admin.verification.revokeBadge')}
          </SecondaryButton>
        )}
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      {/* Verificación de ubicación (tienda física) */}
      <Box>
        <Typography variant="caption" fontWeight={700} color="text.secondary">
          {t('admin.verification.locationSectionTitle')}
        </Typography>
        {s.latitude != null && s.longitude != null ? (
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {t('admin.verification.coordinates', {
              lat: Number(s.latitude).toFixed(5),
              lng: Number(s.longitude).toFixed(5),
              city: s.locationCity,
              state: s.locationState,
            })}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.disabled" mt={0.5}>
            {t('admin.verification.noLocationSet')}
          </Typography>
        )}
        {s.locationVerified ? (
          <Chip size="small" color="success" icon={<LocationOnIcon />} label={t('admin.verification.locationVerifiedChip')} sx={{ mt: 1 }} />
        ) : (
          <Chip size="small" variant="outlined" icon={<LocationOnIcon />} label={t('admin.verification.locationPendingChip')} sx={{ mt: 1 }} />
        )}
        <Stack direction="row" spacing={1} mt={1}>
          {!s.locationVerified ? (
            <PrimaryButton size="small" color="success" startIcon={<LocationOnIcon />} onClick={() => decideLocation(s.id, true)} disabled={!s.latitude}>
              {t('admin.verification.verifyLocation')}
            </PrimaryButton>
          ) : (
            <SecondaryButton size="small" color="error" startIcon={<CancelIcon />} onClick={() => decideLocation(s.id, false)}>
              {t('admin.verification.unmarkLocation')}
            </SecondaryButton>
          )}
        </Stack>
      </Box>
    </Paper>
  );

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <VerifiedUserIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          {t('admin.verification.title')}
        </Typography>
      </Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        {t('admin.verification.infoBanner')}
      </Alert>

      <Typography variant="h6" fontWeight={700} mb={2}>
        {t('admin.verification.pendingSection', { count: pending.length })}
      </Typography>
      {pending.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', mb: 3 }}>
          <Typography color="text.secondary">{t('admin.verification.noPending')}</Typography>
        </Paper>
      ) : (
        pending.map(renderCard)
      )}

      <Typography variant="h6" fontWeight={700} mb={2} mt={3}>
        {t('admin.verification.verifiedSection', { count: verified.length })}
      </Typography>
      {verified.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">{t('admin.verification.noVerified')}</Typography>
        </Paper>
      ) : (
        verified.map(renderCard)
      )}
    </Box>
  );
}
