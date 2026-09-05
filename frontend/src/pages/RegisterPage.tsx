import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Paper, Typography, TextField, Button, Box, Alert, CircularProgress } from '@mui/material';
import { useAuthStore } from '../stores/authStore';
import { getErrorMessage } from '../services/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const refParam = new URLSearchParams(window.location.search).get('ref') ?? '';
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '', referralCode: refParam });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      toast.success('Registro exitoso. Ahora iniciá sesión.');
      navigate('/login');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" fontWeight={700} mb={3} textAlign="center">
          Crear cuenta
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
          <TextField label="Nombre" required value={form.firstName} onChange={handleChange('firstName')} />
          <TextField label="Apellido" required value={form.lastName} onChange={handleChange('lastName')} />
          <TextField label="Email" type="email" required value={form.email} onChange={handleChange('email')} />
          <TextField label="Teléfono" value={form.phone} onChange={handleChange('phone')} />
          <TextField label="Contraseña" type="password" required value={form.password} onChange={handleChange('password')} helperText="Mínimo 8 caracteres" />
          <TextField
            label="Código de invitación (opcional)"
            value={form.referralCode}
            onChange={handleChange('referralCode')}
            helperText="¿Te invitó un amigo? Escribí su código y quien te invitó gana 50 monedas del proyecto."
          />
          <Button type="submit" variant="contained" color="primary" size="large" disabled={loading}>
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Registrarme'}
          </Button>
        </Box>
        <Box mt={2} textAlign="center">
          <Typography variant="body2" color="text.secondary">
            ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link> · ¿Querés vender? <Link to="/registro-vendedor">Abrí tu tienda</Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
