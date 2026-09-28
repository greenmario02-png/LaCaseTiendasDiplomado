import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TextField, Box, Alert, CircularProgress } from '@mui/material';
import AuthCard from '../components/redesign/AuthCard';
import { PrimaryButton } from '../components/redesign/Buttons';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { getErrorMessage } from '../services/api';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const merge = useCartStore((s) => s.merge);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // merge carrito guest
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        merge(sessionId).catch(() => {});
        localStorage.removeItem('sessionId');
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footer={
        <>
          {t('auth.login.noAccount')} <Link to="/register">{t('auth.login.signUp')}</Link> · {t('auth.login.wantToSell')}{' '}
          <Link to="/registro-vendedor">{t('auth.login.openStore')}</Link>
        </>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
        <TextField label={t('auth.login.emailLabel')} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label={t('auth.login.passwordLabel')} type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <PrimaryButton type="submit" size="large" fullWidth disabled={loading}>
          {loading ? <CircularProgress size={22} color="inherit" /> : t('auth.login.submit')}
        </PrimaryButton>
      </Box>
    </AuthCard>
  );
}
