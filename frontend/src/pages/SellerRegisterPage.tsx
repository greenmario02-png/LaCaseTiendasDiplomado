import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '../components/redesign/Buttons';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Grid,
  MenuItem,
  Autocomplete,
  Chip,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useAuthStore } from '../stores/authStore';
import { getErrorMessage } from '../services/api';
import { COUNTRIES, STORE_CATEGORIES, getDivisions, DEFAULT_COUNTRY } from '../data/geo';
import toast from 'react-hot-toast';

interface FieldError {
  path: string;
  message: string;
}

export default function SellerRegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const registerSeller = useAuthStore((s) => s.registerSeller);

  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    storeName: '',
    storeDescription: '',
    storeCategory: '',
    country: DEFAULT_COUNTRY,
    locationCity: '',
    locationState: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const country = COUNTRIES.find((c) => c.code === form.country);
  const divisions = getDivisions(form.country);

  const handleChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleCountryChange = (code: string) => {
    setForm((f) => ({ ...f, country: code, locationState: '' }));
    setErrors((prev) => ({ ...prev, country: '', locationState: '' }));
  };

  const setFieldError = (field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  // Validación local antes de enviar
  const validateLocal = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.storeName.trim() || form.storeName.trim().length < 2) newErrors.storeName = t('auth.sellerRegister.errors.storeName');
    if (!form.storeDescription.trim() || form.storeDescription.trim().length < 10)
      newErrors.storeDescription = t('auth.sellerRegister.errors.storeDescription');
    if (!form.storeCategory) newErrors.storeCategory = t('auth.sellerRegister.errors.storeCategory');
    if (!form.country) newErrors.country = t('auth.sellerRegister.errors.country');
    if (!form.locationState) newErrors.locationState = t('auth.sellerRegister.errors.locationState', { division: country?.divisionLabel.toLowerCase() || 'departamento/provincia' });
    if (!form.locationCity.trim() || form.locationCity.trim().length < 2) newErrors.locationCity = t('auth.sellerRegister.errors.locationCity');
    if (!form.phone.trim() || form.phone.trim().length < 7) newErrors.phone = t('auth.sellerRegister.errors.phone');
    if (!form.firstName.trim() || form.firstName.trim().length < 2) newErrors.firstName = t('auth.sellerRegister.errors.firstName');
    if (!form.lastName.trim() || form.lastName.trim().length < 2) newErrors.lastName = t('auth.sellerRegister.errors.lastName');
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = t('auth.sellerRegister.errors.email');
    if (form.password.length < 8) newErrors.password = t('auth.sellerRegister.errors.password');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Mapear errores del backend a los campos
  const applyServerErrors = (details: FieldError[] | undefined) => {
    const mapped: Record<string, string> = {};
    for (const d of details ?? []) {
      const field = d.path.replace('body.', '');
      mapped[field] = d.message;
    }
    setErrors(mapped);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    setErrors({});

    if (!validateLocal()) {
      setServerError(t('auth.sellerRegister.reviewFields'));
      return;
    }

    setLoading(true);
    try {
      await registerSeller(form);
      toast.success(t('auth.sellerRegister.successToast'));
      navigate('/login');
    } catch (err) {
      const msg = getErrorMessage(err);
      if (msg.includes('Validación')) {
        const details = (err as any)?.response?.data?.error?.details;
        applyServerErrors(details);
        setServerError(t('auth.sellerRegister.reviewFields'));
      } else {
        setServerError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (key: string) => (errors[key] ? { error: true, helperText: errors[key] } : {});

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, bgcolor: 'primary.main', color: 'white', height: '100%' }}>
            <StorefrontIcon sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h5" fontWeight={700} mb={2}>
              {t('auth.sellerRegister.heroTitle')}
            </Typography>
            <List>
              {(t('auth.sellerRegister.heroItems', { returnObjects: true }) as string[]).map((item) => (
                <ListItem key={item} disableGutters>
                  <ListItemIcon sx={{ color: 'white', minWidth: 32 }}>
                    <CheckCircleOutlineIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={item} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 4 }}>
            <Typography variant="h5" fontWeight={700} mb={1}>
              {t('auth.sellerRegister.formTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {t('auth.sellerRegister.formSubtitle')}
            </Typography>

            {serverError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {serverError}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
              <Typography variant="subtitle2" fontWeight={700} color="primary">
                {t('auth.sellerRegister.section1Title')}
              </Typography>
              <TextField
                label={t('auth.sellerRegister.storeNameLabel')}
                required
                value={form.storeName}
                onChange={handleChange('storeName')}
                {...fieldError('storeName')}
              />
              <TextField
                label={t('auth.sellerRegister.storeDescriptionLabel')}
                multiline
                rows={2}
                required
                value={form.storeDescription}
                onChange={handleChange('storeDescription')}
                helperText={errors.storeDescription || t('auth.sellerRegister.storeDescriptionHelper')}
                error={Boolean(errors.storeDescription)}
              />
              <TextField
                select
                label={t('auth.sellerRegister.storeCategoryLabel')}
                required
                value={form.storeCategory}
                onChange={handleChange('storeCategory')}
                {...fieldError('storeCategory')}
              >
                {STORE_CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>

              <Divider />

              <Typography variant="subtitle2" fontWeight={700} color="primary">
                {t('auth.sellerRegister.section2Title')}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label={t('auth.sellerRegister.countryLabel')}
                    required
                    value={form.country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    {...fieldError('country')}
                  >
                    {COUNTRIES.map((c) => (
                      <MenuItem key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Autocomplete
                    freeSolo
                    options={divisions.map((d) => d.name)}
                    value={form.locationState}
                    onChange={(_, val) => setForm((f) => ({ ...f, locationState: val || '' }))}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={`${country?.divisionLabel || 'Departamento/Provincia'} *`}
                        error={Boolean(errors.locationState)}
                        helperText={errors.locationState || t('auth.sellerRegister.divisionHelper')}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label={t('auth.sellerRegister.cityLabel')}
                    required
                    value={form.locationCity}
                    onChange={handleChange('locationCity')}
                    {...fieldError('locationCity')}
                  />
                </Grid>
              </Grid>

              <TextField
                label={t('auth.sellerRegister.phoneLabel', { code: country?.phoneCode || '+xxx' })}
                required
                placeholder={country?.code === 'BO' ? t('auth.sellerRegister.phonePlaceholderBolivia') : t('auth.sellerRegister.phonePlaceholderOther')}
                value={form.phone}
                onChange={handleChange('phone')}
                {...fieldError('phone')}
                helperText={errors.phone || t('auth.sellerRegister.phoneHelper')}
              />

              <Divider />

              <Typography variant="subtitle2" fontWeight={700} color="primary">
                {t('auth.sellerRegister.section3Title')}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField label={t('auth.sellerRegister.firstNameLabel')} required value={form.firstName} onChange={handleChange('firstName')} {...fieldError('firstName')} fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label={t('auth.sellerRegister.lastNameLabel')} required value={form.lastName} onChange={handleChange('lastName')} {...fieldError('lastName')} fullWidth />
                </Grid>
                <Grid item xs={12}>
                  <TextField label={t('auth.sellerRegister.emailLabel')} type="email" required value={form.email} onChange={handleChange('email')} {...fieldError('email')} fullWidth />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label={t('auth.sellerRegister.passwordLabel')}
                    type="password"
                    required
                    value={form.password}
                    onChange={handleChange('password')}
                    {...fieldError('password')}
                    fullWidth
                    helperText={errors.password || t('auth.sellerRegister.passwordHelper')}
                  />
                </Grid>
              </Grid>

              <Box mt={1}>
                <PrimaryButton type="submit" size="large" disabled={loading}>
                  {loading ? <CircularProgress size={22} color="inherit" /> : t('auth.sellerRegister.submit')}
                </PrimaryButton>
              </Box>
            </Box>

            <Box mt={2} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                {t('auth.sellerRegister.alreadyHaveStore')} <Link to="/login">{t('auth.sellerRegister.signIn')}</Link>
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
