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

export default function AdminCurrency() {
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
      toast.success('Tasa actualizada desde la API oficial');
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
      toast.success('Tasa manual guardada');
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
      toast.success(`Moneda por defecto: ${code}`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={2}>
        Moneda del sistema
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          El sistema usa <strong>Bs (Boliviano)</strong> como moneda base: todos los precios se guardan en bolivianos.
          Los usuarios pueden elegir ver los precios en dólares (US$), que se calculan con la tasa de cambio.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Monedas disponibles
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
                  <Chip label="Por defecto" size="small" color="primary" />
                ) : (
                  <GhostButton size="small" onClick={() => setDefault(c.code)}>
                    Hacer por defecto
                  </GhostButton>
                )}
              </Box>
            ))}
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Última actualización de tasas: {data.ratesUpdatedAt ? new Date(data.ratesUpdatedAt).toLocaleString('es-BO') : 'nunca'}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Tasa USD → Bs
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              El valor se obtiene automáticamente de APIs públicas de tasas de cambio (ej: open.er-api.com). Como hay
              devaluación frecuente, podés actualizarla manualmente en cualquier momento.
            </Typography>

            <Box display="flex" gap={1} mb={2}>
              <PrimaryButton startIcon={<RefreshIcon />} onClick={refresh} disabled={refreshing}>
                {refreshing ? <CircularProgress size={20} color="inherit" /> : 'Actualizar desde API'}
              </PrimaryButton>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Tasa manual
            </Typography>
            <Box display="flex" gap={1}>
              <TextField
                label="1 USD en Bs"
                type="number"
                value={manualRate}
                onChange={(e) => setManualRate(e.target.value)}
                inputProps={{ step: '0.01', min: '0.01' }}
                size="small"
              />
              <SecondaryButton onClick={saveManualRate} disabled={savingRate}>
                {savingRate ? <CircularProgress size={18} /> : 'Guardar manual'}
              </SecondaryButton>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Ej: si 1 USD = 6.96 Bs, escribí 6.96. Los precios en dólares se calculan como precio_Bs / 6.96.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={1} display="flex" alignItems="center" gap={1}>
          <MonetizationOnIcon color="primary" /> ¿Cómo funciona?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>1.</strong> Los vendedores publican sus precios en <strong>Bs</strong>.
          <br />
          <strong>2.</strong> El sistema guarda siempre el precio en Bs (moneda base).
          <br />
          <strong>3.</strong> Cada usuario elige su moneda (Bs o US$) en el selector de la barra superior.
          <br />
          <strong>4.</strong> Si elige US$, el precio se muestra como precio_Bs ÷ tasa. La tasa se actualiza desde la API
          o manualmente desde este panel.
        </Typography>
      </Paper>
    </Box>
  );
}
