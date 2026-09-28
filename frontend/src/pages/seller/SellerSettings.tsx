import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      toast.error(t('seller.settings.errors.nitRequired'));
      return;
    }
    setVerif((v) => ({ ...v, sending: true }));
    try {
      const { data } = await api.post('/seller/verification/request', { nit: verif.nit, note: verif.note });
      setVerif((v) => ({ ...v, isVerificationRequested: true, sending: false }));
      toast.success(data.data.message || t('seller.settings.toasts.requestSent'));
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
        toast.success(t('seller.settings.toasts.profileImageReady'));
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
      toast.success(t('seller.settings.toasts.settingsSaved'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxWidth="md">
      <Typography variant="h6" fontWeight={700} mb={2}>
        {t('seller.settings.title')}
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
              {t('seller.settings.profilePhotoLabel')}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField label={t('seller.settings.storeNameLabel')} value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} fullWidth />
          </Grid>
          <Grid item xs={12}>
            <TextField label={t('seller.settings.descriptionLabel')} value={form.storeDescription} onChange={(e) => setForm({ ...form, storeDescription: e.target.value })} fullWidth multiline rows={3} />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label={t('seller.settings.bioLabel')}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder={t('seller.settings.bioPlaceholder')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label={t('seller.settings.categoryLabel')}
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
              label={t('seller.settings.countryLabel')}
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
            <TextField label={t('seller.settings.logoLabel')} value={form.storeLogo} onChange={(e) => setForm({ ...form, storeLogo: e.target.value })} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label={t('seller.settings.bannerLabel')} value={form.storeBanner} onChange={(e) => setForm({ ...form, storeBanner: e.target.value })} fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label={t('seller.settings.cityLabel')} value={form.locationCity} onChange={(e) => setForm({ ...form, locationCity: e.target.value })} fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              label={t('seller.settings.stateLabel')}
              value={form.locationState}
              onChange={(e) => setForm({ ...form, locationState: e.target.value })}
              fullWidth
            >
              <MenuItem value="">
                <em>{t('seller.settings.selectPlaceholder')}</em>
              </MenuItem>
              {divisions.map((d) => (
                <MenuItem key={d.name} value={d.name}>
                  {d.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label={t('seller.settings.postalCodeLabel')} value={form.locationPostalCode} onChange={(e) => setForm({ ...form, locationPostalCode: e.target.value })} fullWidth />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              {t('seller.settings.mapLocationTitle')}
            </Typography>
            <LocationPicker
              value={
                form.latitude && form.longitude
                  ? { lat: Number(form.latitude), lng: Number(form.longitude), label: `${form.locationCity || ''} ${form.locationState || ''}`.trim() || t('seller.settings.defaultLocationLabel') }
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
              {t('seller.settings.mapHelperText')}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={700} mt={2} mb={1}>
              {t('seller.settings.socialTitle')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label={t('seller.settings.instagramLabel')} value={form.instagramUrl} onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })} fullWidth placeholder="https://instagram.com/tutienda" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('seller.settings.facebookLabel')} value={form.facebookUrl} onChange={(e) => setForm({ ...form, facebookUrl: e.target.value })} fullWidth placeholder="https://facebook.com/tutienda" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('seller.settings.tiktokLabel')} value={form.tiktokUrl} onChange={(e) => setForm({ ...form, tiktokUrl: e.target.value })} fullWidth placeholder="https://tiktok.com/@tutienda" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('seller.settings.youtubeLabel')} value={form.youtubeUrl} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })} fullWidth placeholder="https://youtube.com/@tutienda" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label={t('seller.settings.whatsappLabel')}
                  value={form.whatsappPhone}
                  onChange={(e) => setForm({ ...form, whatsappPhone: e.target.value })}
                  fullWidth
                  placeholder={t('seller.settings.whatsappPlaceholder')}
                />
              </Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary">
              {t('seller.settings.socialHelperText')}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 1 }}>
              {t('seller.settings.shippingLocationInfo')}
            </Alert>
            <TextField label={t('seller.settings.paymentQrLabel')} value={form.paymentQrUrl} onChange={(e) => setForm({ ...form, paymentQrUrl: e.target.value })} fullWidth placeholder="https://img.example.com/mi-qr.png" />
            <Typography variant="caption" color="text.secondary">
              {t('seller.settings.paymentQrHelperText')}
            </Typography>
            <TextField
              label={t('seller.settings.freeShippingLabel')}
              type="number"
              value={form.freeShippingThreshold}
              onChange={(e) => setForm({ ...form, freeShippingThreshold: e.target.value })}
              fullWidth
              placeholder={t('seller.settings.freeShippingPlaceholder')}
              helperText={t('seller.settings.freeShippingHelperText')}
            />
          </Grid>
        </Grid>
        <Box mt={3}>
          <PrimaryButton onClick={save} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : t('seller.settings.saveButton')}
          </PrimaryButton>
        </Box>
      </Paper>

      {/* Sello de vendedor verificado */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <VerifiedIcon color={verif.isVerified ? 'success' : 'disabled'} />
          <Typography variant="h6" fontWeight={700}>
            {t('seller.settings.verifiedSealTitle')}
          </Typography>
          {verif.isVerified && <Chip size="small" color="success" label={t('seller.settings.verifiedChip')} />}
        </Box>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <LocationOnIcon color={(user as any).locationVerified ? 'success' : 'disabled'} />
          <Typography variant="subtitle2" fontWeight={600}>
            {t('seller.settings.storeLocationLabel')}
          </Typography>
          {(user as any).locationVerified ? (
            <Chip size="small" color="success" label={t('seller.settings.locationVerifiedChip')} />
          ) : (
            <Chip size="small" variant="outlined" label={t('seller.settings.locationPendingChip')} />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {t('seller.settings.verificationDescription')}
        </Typography>
        {verif.isVerified ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t('seller.settings.verifiedSuccessAlert')}
          </Alert>
        ) : (
          <Alert severity={verif.isVerificationRequested ? 'info' : 'warning'} sx={{ mb: 2 }}>
            {verif.isVerificationRequested
              ? t('seller.settings.pendingReviewAlert')
              : t('seller.settings.requestVerificationAlert')}
          </Alert>
        )}

        {!verif.isVerified && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label={t('seller.settings.nitLabel')}
                value={verif.nit}
                onChange={(e) => setVerif({ ...verif, nit: e.target.value })}
                fullWidth
                placeholder={t('seller.settings.nitPlaceholder')}
                disabled={verif.isVerificationRequested}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={t('seller.settings.noteLabel')}
                value={verif.note}
                onChange={(e) => setVerif({ ...verif, note: e.target.value })}
                fullWidth
                multiline
                rows={2}
                disabled={verif.isVerificationRequested}
                placeholder={t('seller.settings.notePlaceholder')}
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
                  ? t('seller.settings.requestSentButton')
                  : verif.sending
                    ? t('seller.settings.sendingButton')
                    : t('seller.settings.requestVerificationButton')}
              </PrimaryButton>
            </Grid>
          </Grid>
        )}
      </Paper>
    </Box>
  );
}
