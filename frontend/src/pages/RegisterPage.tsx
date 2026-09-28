import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TextField, Box, Alert, CircularProgress } from '@mui/material';
import AuthCard from '../components/redesign/AuthCard';
import { PrimaryButton } from '../components/redesign/Buttons';
import { useAuthStore } from '../stores/authStore';
import { getErrorMessage } from '../services/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { t } = useTranslation();
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
      toast.success(t('auth.register.successToast'));
      navigate('/login');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      footer={
        <>
          {t('auth.register.alreadyHaveAccount')} <Link to="/login">{t('auth.register.signIn')}</Link> · {t('auth.register.wantToSell')} <Link to="/registro-vendedor">{t('auth.register.openStore')}</Link>
        </>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
        <TextField label={t('auth.register.firstNameLabel')} required value={form.firstName} onChange={handleChange('firstName')} />
          <TextField label={t('auth.register.lastNameLabel')} required value={form.lastName} onChange={handleChange('lastName')} />
          <TextField label={t('auth.register.emailLabel')} type="email" required value={form.email} onChange={handleChange('email')} />
          <TextField label={t('auth.register.phoneLabel')} value={form.phone} onChange={handleChange('phone')} />
          <TextField label={t('auth.register.passwordLabel')} type="password" required value={form.password} onChange={handleChange('password')} helperText={t('auth.register.passwordHelper')} />
          <TextField
            label={t('auth.register.referralCodeLabel')}
            value={form.referralCode}
            onChange={handleChange('referralCode')}
            helperText={t('auth.register.referralCodeHelper')}
          />
        <PrimaryButton type="submit" size="large" fullWidth disabled={loading}>
          {loading ? <CircularProgress size={22} color="inherit" /> : t('auth.register.submit')}
        </PrimaryButton>
      </Box>
    </AuthCard>
  );
}
