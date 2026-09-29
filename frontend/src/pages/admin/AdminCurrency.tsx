import { useEffect, useState } from 'react';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Alert,
  Chip,
  CircularProgress,
  Divider,
  TextField,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { api } from '../../services/api';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function AdminCurrency() {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [manualRate, setManualRate] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/currencies')
      .then((res) => {
        setData(res.data.data);
        const usd = res.data.data.currencies.find((c: any) => c.code === 'USD');
        if (usd) setManualRate(String(usd.rate));
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.post('/admin/currencies/refresh');
      setManualRate(String(res.data.data.rates.USD));
      toast.success(t('admin.currency.rateUpdatedFromApi'));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  };

  const saveManualRate = async () => {
    setSavingRate(true);
    try {
      await api.post('/admin/currencies/manual-rate', { usdToBob: Number(manualRate) });
      toast.success(t('admin.currency.manualRateSaved'));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingRate(false);
    }
  };

  const setDefault = async (code: string) => {
    try {
      await api.post('/admin/currencies/default', { code });
      toast.success(t('admin.currency.defaultCurrencySet', { code }));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={2}>
        {t('admin.currency.title')}
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          {t('admin.currency.baseCurrencyInfoPart1')} <strong>{t('admin.currency.baseCurrencyLabel')}</strong>{' '}
          {t('admin.currency.baseCurrencyInfoPart2')}
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              {t('admin.currency.availableCurrencies')}
            </Typography>
            {data.currencies.map((c: any) => (
              <Box key={c.code} display="flex" justifyContent="space-between" alignItems="center" py={1} borderBottom={1} borderColor="divider">
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    {c.symbol} {c.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    1 {c.code} = {c.rate} Bs
                  </Typography>
                </Box>
                {c.isDefault ? (
                  <Chip label={t('admin.currency.default')} size="small" color="primary" />
                ) : (
                  <GhostButton size="small" onClick={() => setDefault(c.code)}>
                    {t('admin.currency.makeDefault')}
                  </GhostButton>
                )}
              </Box>
            ))}
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              {t('admin.currency.lastRatesUpdate', {
                date: data.ratesUpdatedAt ? new Date(data.ratesUpdatedAt).toLocaleString('es-BO') : t('admin.currency.never'),
              })}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              {t('admin.currency.usdToBobRate')}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('admin.currency.rateSourceInfo')}
            </Typography>

            <Box display="flex" gap={1} mb={2}>
              <PrimaryButton startIcon={<RefreshIcon />} onClick={refresh} disabled={refreshing}>
                {refreshing ? <CircularProgress size={20} color="inherit" /> : t('admin.currency.updateFromApi')}
              </PrimaryButton>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              {t('admin.currency.manualRate')}
            </Typography>
            <Box display="flex" gap={1}>
              <TextField
                label={t('admin.currency.usdInBobLabel')}
                type="number"
                value={manualRate}
                onChange={(e) => setManualRate(e.target.value)}
                inputProps={{ step: '0.01', min: '0.01' }}
                size="small"
              />
              <SecondaryButton onClick={saveManualRate} disabled={savingRate}>
                {savingRate ? <CircularProgress size={18} /> : t('admin.currency.saveManual')}
              </SecondaryButton>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              {t('admin.currency.manualRateHelp')}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={1} display="flex" alignItems="center" gap={1}>
          <MonetizationOnIcon color="primary" /> {t('admin.currency.howItWorksTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>1.</strong> {t('admin.currency.howItWorksStep1Part1')} <strong>{t('admin.currency.bsLabel')}</strong>.
          <br />
          <strong>2.</strong> {t('admin.currency.howItWorksStep2')}
          <br />
          <strong>3.</strong> {t('admin.currency.howItWorksStep3')}
          <br />
          <strong>4.</strong> {t('admin.currency.howItWorksStep4')}
        </Typography>
      </Paper>
    </Box>
  );
}
