import { useEffect, useRef, useState } from 'react';
import { MapPin, BadgeCheck } from 'lucide-react';
import { Box, Typography, Paper, TextField, Grid, Alert, CircularProgress, MenuItem, Chip, Avatar, IconButton } from '@mui/material';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import VerifiedIcon from '@mui/icons-material/Verified';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { getErrorMessage } from '../../services/api';
import { COUNTRIES, STORE_CATEGORIES, getDivisions } from '../../data/geo';
import LocationPicker, { LocationPoint } from '../../components/ui/LocationPicker';
import toast from 'react-hot-toast';

export default function SellerSettings() {
  const user = useAuthStore((s) => s.user);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    storeName: '',
    storeDescription: '',
    storeCategory: '',
    country: '',
    storeLogo: '',
    storeBanner: '',
    profileImage: '',
    bio: '',
    locationCity: '',
    locationState: '',
    locationPostalCode: '',
    latitude: '',
    longitude: '',
    youtubeUrl: '',
    tiktokUrl: '',
    instagramUrl: '',
    facebookUrl: '',
    whatsappPhone: '',
    paymentQrUrl: '',
    freeShippingThreshold: '',
  });
    const [loading, setLoading] = useState(false);
  const [verif, setVerif] = useState({ isVerified: false, isVerificationRequested: false, nit: '', note: '', sending: false });
  const requestVerification = async () => {
    if (!verif.nit.trim()) {
      toast.error('El NIT es obligatorio para solicitar la verificación');
      return;
    }
    setVerif((v) => ({ ...v, sending: true }));
    try {
      const { data } = await api.post('/seller/verification/request', { nit: verif.nit, note: verif.note });
      setVerif((v) => ({ ...v, isVerificationRequested: true, sending: false }));
      toast.success(data.data.message || 'Solicitud enviada');
    } catch (err) {
      setVerif((v) => ({ ...v, sending: false }));
      toast.error(getErrorMessage(err));
    }
  };

  const divisions = getDivisions(form.country);

  const uploadProfileImage = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const { data } = await api.post('/account/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = data.data?.url ?? data.data?.fileUrl ?? data.data?.path;
      if (url) {
        setForm((f) => ({ ...f, profileImage: url }));
        toast.success('Foto de perfil lista — guardá los cambios');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setForm({
        storeName: user.storeName || '',
        storeDescription: (user as any).storeDescription || '',
        storeCategory: (user as any).storeCategory || '',
        country: (user as any).country || '',
        storeLogo: (user as any).storeLogo || '',
        storeBanner: (user as any).storeBanner || '',
        profileImage: (user as any).profileImage || '',
        bio: (user as any).bio || '',
        locationCity: (user as any).locationCity || '',
        locationState: (user as any).locationState || '',
        locationPostalCode: (user as any).locationPostalCode || '',
        latitude: (user as any).latitude != null ? String((user as any).latitude) : '',
        longitude: (user as any).longitude != null ? String((user as any).longitude) : '',
        youtubeUrl: (user as any).youtubeUrl || '',
        tiktokUrl: (user as any).tiktokUrl || '',
        instagramUrl: (user as any).instagramUrl || '',
        facebookUrl: (user as any).facebookUrl || '',
        whatsappPhone: (user as any).whatsappPhone || '',
        paymentQrUrl: (user as any).paymentQrUrl || '',
        freeShippingThreshold: (user as any).freeShippingThreshold != null ? String((user as any).freeShippingThreshold) : '',
      });
      api
        .get('/seller/verification/status')
        .then((r) => {
          const v = r.data.data;
          setVerif({
            isVerified: Boolean(v.isVerified),
            isVerificationRequested: Boolean(v.isVerificationRequested),
            nit: v.nit || '',
            note: v.verificationNote || '',
            sending: false,
          });
        })
        .catch(() => {});
    }
  }, [user]);

  const save = async () => {
    setLoading(true);
    try {
      await api.put('/seller/profile', form);
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxWidth="md">
      <Typography variant="h6" fontWeight={700} mb={2}>
        Configuración de tu tienda
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} display="flex" alignItems="center" gap={2}>
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <Avatar
                src={form.profileImage}
                sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: 28 }}
              >
                {form.storeName?.[0]?.toUpperCase() ?? '🏪'}
              </Avatar>
              <IconButton
                size="small"
                sx={{ position: 'absolute', bottom: 0, right: 0, bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } }}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <CircularProgress size={14} color="inherit" /> : <PhotoCameraIcon fontSize="small" />}
              </IconButton>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadProfileImage(f);
                  e.target.value = '';
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Foto de perfil de la tienda
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField label="Nombre de la tienda" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} fullWidth />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Descripción" value={form.storeDescription} onChange={(e) => setForm({ ...form, storeDescription: e.target.value })} fullWidth multiline rows={3} />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Bio del dueño / tienda"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="Contá la historia de tu tienda o lo que vendés..."
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Categoría de productos"
              value={form.storeCategory}
              onChange={(e) => setForm({ ...form, storeCategory: e.target.value })}
              fullWidth
            >
              {STORE_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="País"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value, locationState: '' })}
              fullWidth
            >
              {COUNTRIES.map((c) => (
                <MenuItem key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Logo (URL)" value={form.storeLogo} onChange={(e) => setForm({ ...form, storeLogo: e.target.value })} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Banner (URL)" value={form.storeBanner} onChange={(e) => setForm({ ...form, storeBanner: e.target.value })} fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Ciudad" value={form.locationCity} onChange={(e) => setForm({ ...form, locationCity: e.target.value })} fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Departamento/Provincia"
              value={form.locationState}
              onChange={(e) => setForm({ ...form, locationState: e.target.value })}
              fullWidth
            >
              <MenuItem value="">
                <em>Seleccionar...</em>
              </MenuItem>
              {divisions.map((d) => (
                <MenuItem key={d.name} value={d.name}>
                  {d.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Código postal (opcional)" value={form.locationPostalCode} onChange={(e) => setForm({ ...form, locationPostalCode: e.target.value })} fullWidth />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              Ubicación en el mapa
            </Typography>
            <LocationPicker
              value={
                form.latitude && form.longitude
                  ? { lat: Number(form.latitude), lng: Number(form.longitude), label: `${form.locationCity || ''} ${form.locationState || ''}`.trim() || 'Tienda' }
                  : null
              }
              onChange={(p) => {
                if (!p) {
                  setForm((f) => ({ ...f, latitude: '', longitude: '' }));
                  return;
                }
                setForm((f) => ({ ...f, latitude: String(p.lat), longitude: String(p.lng), locationCity: f.locationCity || p.label.split(',')[0] }));
              }}
              countryHint={COUNTRIES.find((c) => c.code === form.country)?.name}
            />
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
              Buscá tu ciudad, hacé clic en el mapa o en un resultado para marcar el punto exacto. Esta ubicación se mostrará a tus clientes.
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={700} mt={2} mb={1}>
              🌐 Redes sociales y contacto
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Instagram (URL)" value={form.instagramUrl} onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })} fullWidth placeholder="https://instagram.com/tutienda" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Facebook (URL)" value={form.facebookUrl} onChange={(e) => setForm({ ...form, facebookUrl: e.target.value })} fullWidth placeholder="https://facebook.com/tutienda" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="TikTok (URL)" value={form.tiktokUrl} onChange={(e) => setForm({ ...form, tiktokUrl: e.target.value })} fullWidth placeholder="https://tiktok.com/@tutienda" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="YouTube (URL)" value={form.youtubeUrl} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })} fullWidth placeholder="https://youtube.com/@tutienda" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="WhatsApp (número)"
                  value={form.whatsappPhone}
                  onChange={(e) => setForm({ ...form, whatsappPhone: e.target.value })}
                  fullWidth
                  placeholder="59170000000 (con código de país, sin +)"
                />
              </Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary">
              Son opcionales. Solo se muestran en tu perfil público si los completás.
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 1 }}>
              Tu ubicación se usa para calcular el costo de envío hacia el comprador.
            </Alert>
            <TextField label="QR de pago (URL de imagen)" value={form.paymentQrUrl} onChange={(e) => setForm({ ...form, paymentQrUrl: e.target.value })} fullWidth placeholder="https://img.example.com/mi-qr.png" />
            <Typography variant="caption" color="text.secondary">
              Subí una imagen con tu alias/QR de Mercado Pago o CBU. Se mostrará al comprador al finalizar la compra.
            </Typography>
            <TextField
              label="Envío gratis desde (Bs)"
              type="number"
              value={form.freeShippingThreshold}
              onChange={(e) => setForm({ ...form, freeShippingThreshold: e.target.value })}
              fullWidth
              placeholder="Ej: 500"
              helperText="Si el comprador supera este monto, el envío es gratis. Dejalo vacío para no ofrecer envío gratis."
            />
          </Grid>
        </Grid>
        <Box mt={3}>
          <PrimaryButton onClick={save} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Guardar'}
          </PrimaryButton>
        </Box>
      </Paper>

      {/* Sello de vendedor verificado */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <VerifiedIcon color={verif.isVerified ? 'success' : 'disabled'} />
          <Typography variant="h6" fontWeight={700}>
            Sello de vendedor verificado
          </Typography>
          {verif.isVerified && <Chip size="small" color="success" label="Verificado" />}
        </Box>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <LocationOnIcon color={(user as any).locationVerified ? 'success' : 'disabled'} />
          <Typography variant="subtitle2" fontWeight={600}>
            Ubicación de la tienda
          </Typography>
          {(user as any).locationVerified ? (
            <Chip size="small" color="success" label="Verificada por el admin" />
          ) : (
            <Chip size="small" variant="outlined" label="Pendiente de verificación" />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          El administrador comprueba la existencia física de tu tienda (coincidencia con NIT y documentación) para
          verificar tu ubicación en el mapa. Las tiendas con ubicación verificada inspiran más confianza.
        </Typography>
        {verif.isVerified ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Tu tienda está verificada. Mostrás el logo junto a tu nombre, lo que genera más confianza en los compradores.
          </Alert>
        ) : (
          <Alert severity={verif.isVerificationRequested ? 'info' : 'warning'} sx={{ mb: 2 }}>
            {verif.isVerificationRequested
              ? 'Tu solicitud de verificación está en revisión por el administrador. Como en Couchsurfing o Twitter, se verifica la existencia física de tu tienda (NIT y documentación) antes de otorgar el sello.'
              : 'Obtiene el sello de vendedor verificado (como la cuenta azul de Twitter): presentá tu NIT y el administrador verificará físicamente tu tienda. Las tiendas verificadas generan más confianza y más ventas.'}
          </Alert>
        )}

        {!verif.isVerified && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="NIT (Número de Identificación Tributaria)"
                value={verif.nit}
                onChange={(e) => setVerif({ ...verif, nit: e.target.value })}
                fullWidth
                placeholder="Ej: 10203040123"
                disabled={verif.isVerificationRequested}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Nota para el administrador (documentos, dirección del local, etc.)"
                value={verif.note}
                onChange={(e) => setVerif({ ...verif, note: e.target.value })}
                fullWidth
                multiline
                rows={2}
                disabled={verif.isVerificationRequested}
                placeholder="Ej: Mi tienda está en Calle 5, zona Central. Adjunto mi NIT y matrícula de comercio."
              />
            </Grid>
            <Grid item xs={12}>
              <PrimaryButton
                color="success"
                startIcon={<VerifiedIcon />}
                disabled={verif.isVerificationRequested || verif.sending}
                onClick={requestVerification}
              >
                {verif.isVerificationRequested
                  ? 'Solicitud enviada — en revisión'
                  : verif.sending
                    ? 'Enviando...'
                    : 'Solicitar verificación'}
              </PrimaryButton>
            </Grid>
          </Grid>
        )}
      </Paper>
    </Box>
  );
}
