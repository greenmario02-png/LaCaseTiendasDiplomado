import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    if (!form.storeName.trim() || form.storeName.trim().length < 2) newErrors.storeName = 'El nombre de la tienda es obligatorio';
    if (!form.storeDescription.trim() || form.storeDescription.trim().length < 10)
      newErrors.storeDescription = 'La descripción debe tener al menos 10 caracteres';
    if (!form.storeCategory) newErrors.storeCategory = 'Seleccioná la categoría de productos que vendés';
    if (!form.country) newErrors.country = 'Seleccioná el país';
    if (!form.locationState) newErrors.locationState = `Seleccioná el ${country?.divisionLabel.toLowerCase() || 'departamento/provincia'}`;
    if (!form.locationCity.trim() || form.locationCity.trim().length < 2) newErrors.locationCity = 'La ciudad es obligatoria';
    if (!form.phone.trim() || form.phone.trim().length < 7) newErrors.phone = 'El celular de contacto es obligatorio';
    if (!form.firstName.trim() || form.firstName.trim().length < 2) newErrors.firstName = 'El nombre es obligatorio';
    if (!form.lastName.trim() || form.lastName.trim().length < 2) newErrors.lastName = 'El apellido es obligatorio';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Email inválido';
    if (form.password.length < 8) newErrors.password = 'La contraseña debe tener al menos 8 caracteres';

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
      setServerError('Revisá los campos marcados en rojo');
      return;
    }

    setLoading(true);
    try {
      await registerSeller(form);
      toast.success('Solicitud enviada. Esperá la aprobación del administrador.');
      navigate('/login');
    } catch (err) {
      const msg = getErrorMessage(err);
      if (msg.includes('Validación')) {
        const details = (err as any)?.response?.data?.error?.details;
        applyServerErrors(details);
        setServerError('Revisá los campos marcados en rojo');
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
              Abrí tu tienda en LaCase Multi Tiendas
            </Typography>
            <List>
              {[
                'Publicá productos de cualquier rubro',
                'Elegí tu país y departamento/provincia',
                'El envío se calcula según tu ubicación',
                'Recibí pagos por QR',
                'Te contactamos por celular',
              ].map((item) => (
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
              Registro de vendedor
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Tu solicitud será revisada por un administrador. Podés publicar productos una vez aprobada.
            </Typography>

            {serverError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {serverError}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
              <Typography variant="subtitle2" fontWeight={700} color="primary">
                1. Datos de tu tienda
              </Typography>
              <TextField
                label="Nombre de tu tienda"
                required
                value={form.storeName}
                onChange={handleChange('storeName')}
                {...fieldError('storeName')}
              />
              <TextField
                label="Descripción de tu tienda"
                multiline
                rows={2}
                required
                value={form.storeDescription}
                onChange={handleChange('storeDescription')}
                helperText={errors.storeDescription || 'Mínimo 10 caracteres'}
                error={Boolean(errors.storeDescription)}
              />
              <TextField
                select
                label="Categoría de productos que vendés"
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
                2. Ubicación
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="País"
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
                        helperText={errors.locationState || 'Podés escribir o seleccionar'}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Ciudad"
                    required
                    value={form.locationCity}
                    onChange={handleChange('locationCity')}
                    {...fieldError('locationCity')}
                  />
                </Grid>
              </Grid>

              <TextField
                label={`Celular de contacto (${country?.phoneCode || '+xxx'})`}
                required
                placeholder={country?.code === 'BO' ? 'Ej: 71234567' : 'Ej: 1123456789'}
                value={form.phone}
                onChange={handleChange('phone')}
                {...fieldError('phone')}
                helperText={errors.phone || `Los vendedores y clientes te contactarán por este número`}
              />

              <Divider />

              <Typography variant="subtitle2" fontWeight={700} color="primary">
                3. Datos de acceso
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField label="Nombre" required value={form.firstName} onChange={handleChange('firstName')} {...fieldError('firstName')} fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Apellido" required value={form.lastName} onChange={handleChange('lastName')} {...fieldError('lastName')} fullWidth />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Email" type="email" required value={form.email} onChange={handleChange('email')} {...fieldError('email')} fullWidth />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Contraseña"
                    type="password"
                    required
                    value={form.password}
                    onChange={handleChange('password')}
                    {...fieldError('password')}
                    fullWidth
                    helperText={errors.password || 'Mínimo 8 caracteres'}
                  />
                </Grid>
              </Grid>

              <Box mt={1}>
                <PrimaryButton type="submit" size="large" disabled={loading}>
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Enviar solicitud'}
                </PrimaryButton>
              </Box>
            </Box>

            <Box mt={2} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                ¿Ya tenés tienda? <Link to="/login">Iniciá sesión</Link>
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
