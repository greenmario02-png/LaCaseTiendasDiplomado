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
      toast.success(isVerified ? 'Sello de vendedor verificado otorgado' : 'Sello revocado');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const decideLocation = async (id: number, locationVerified: boolean) => {
    try {
      await api.put(`/admin/users/${id}`, { locationVerified });
      toast.success(locationVerified ? 'Ubicación verificada' : 'Ubicación marcada como no verificada');
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
              <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Verificado" />
            ) : (
              <Chip size="small" color="warning" label="Pendiente de revisión" />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {s.firstName} {s.lastName} · {s.email} · desde {new Date(s.createdAt).toLocaleDateString('es-BO')}
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
          NIT presentado:
        </Typography>{' '}
        <Typography component="span" variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {s.nit ?? '—'}
        </Typography>
      </Box>
      {s.verificationNote && (
        <Box mb={1}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            Nota del vendedor:
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
              Otorgar sello verificado
            </PrimaryButton>
            <SecondaryButton size="small" color="error" startIcon={<CancelIcon />} onClick={() => decide(s.id, false)}>
              Rechazar
            </SecondaryButton>
          </>
        ) : (
          <SecondaryButton size="small" color="error" startIcon={<CancelIcon />} onClick={() => decide(s.id, false)}>
            Revocar sello
          </SecondaryButton>
        )}
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      {/* Verificación de ubicación (tienda física) */}
      <Box>
        <Typography variant="caption" fontWeight={700} color="text.secondary">
          Ubicación física de la tienda
        </Typography>
        {s.latitude != null && s.longitude != null ? (
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Coordenadas: {Number(s.latitude).toFixed(5)}, {Number(s.longitude).toFixed(5)} · {s.locationCity}, {s.locationState}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.disabled" mt={0.5}>
            La tienda aún no marcó su ubicación en el mapa.
          </Typography>
        )}
        {s.locationVerified ? (
          <Chip size="small" color="success" icon={<LocationOnIcon />} label="Ubicación verificada" sx={{ mt: 1 }} />
        ) : (
          <Chip size="small" variant="outlined" icon={<LocationOnIcon />} label="Ubicación pendiente" sx={{ mt: 1 }} />
        )}
        <Stack direction="row" spacing={1} mt={1}>
          {!s.locationVerified ? (
            <PrimaryButton size="small" color="success" startIcon={<LocationOnIcon />} onClick={() => decideLocation(s.id, true)} disabled={!s.latitude}>
              Verificar ubicación
            </PrimaryButton>
          ) : (
            <SecondaryButton size="small" color="error" startIcon={<CancelIcon />} onClick={() => decideLocation(s.id, false)}>
              Desmarcar
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
          Sello de vendedor verificado
        </Typography>
      </Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Como en Couchsurfing y Twitter (cuenta azul), el sello de verificación se otorga tras la revisión física de la
        tienda: presencia real del local, NIT y documentación. Las tiendas verificadas pagan una suscripción y muestran
        el logo junto a su nombre.
      </Alert>

      <Typography variant="h6" fontWeight={700} mb={2}>
        Solicitudes por revisar ({pending.length})
      </Typography>
      {pending.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', mb: 3 }}>
          <Typography color="text.secondary">No hay solicitudes pendientes de verificación.</Typography>
        </Paper>
      ) : (
        pending.map(renderCard)
      )}

      <Typography variant="h6" fontWeight={700} mb={2} mt={3}>
        Tiendas verificadas ({verified.length})
      </Typography>
      {verified.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">Aún no hay tiendas verificadas.</Typography>
        </Paper>
      ) : (
        verified.map(renderCard)
      )}
    </Box>
  );
}
