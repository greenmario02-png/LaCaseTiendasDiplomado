import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Chip,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import { api, getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

interface RatesData {
  base: string;
  rates: { usd: number; eur: number; jpy: number; ars: number; pen: number; clp: number; uyu: number; brl: number; usdt: number };
  source: { usd: string; eur: string; jpy: string; ars: string; pen: string; clp: string; uyu: string; brl: string; usdt: string };
  updatedAt: string;
}

const MONEDAS: { code: string; label: string; symbol: string }[] = [
  { code: 'BOB', label: 'Boliviano (Bs)', symbol: 'Bs' },
  { code: 'USD', label: 'Dólar (USD)', symbol: 'US$' },
  { code: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { code: 'JPY', label: 'Yen (JPY)', symbol: '¥' },
  { code: 'ARS', label: 'Peso argentino (AR$)', symbol: 'AR$' },
  { code: 'PEN', label: 'Sol peruano (S/)', symbol: 'S/' },
  { code: 'CLP', label: 'Peso chileno (CL$)', symbol: 'CL$' },
  { code: 'UYU', label: 'Peso uruguayo ($U)', symbol: '$U' },
  { code: 'BRL', label: 'Real brasileño (R$)', symbol: 'R$' },
  { code: 'USDT', label: 'USDT (Tether)', symbol: 'USDT' },
];

// Monedas que circulan en el letrero LED del header (USD queda fijo a la izquierda)
const LED_RATES: { key: keyof RatesData['rates']; label: string; dec: number }[] = [
  { key: 'eur', label: 'EUR', dec: 2 },
  { key: 'jpy', label: 'JPY', dec: 2 },
  { key: 'usdt', label: 'USDT', dec: 2 },
  { key: 'ars', label: 'AR$', dec: 3 },
  { key: 'pen', label: 'S/', dec: 2 },
  { key: 'clp', label: 'CL$', dec: 4 },
  { key: 'uyu', label: '$U', dec: 2 },
  { key: 'brl', label: 'R$', dec: 2 },
];

export default function CurrencyRates() {
  const [rates, setRates] = useState<RatesData | null>(null);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('100');
  const [from, setFrom] = useState('BOB');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/currencies/rates');
      setRates(res.data.data);
    } catch {
      /* silencioso: las cotizaciones son aditivas */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60 * 1000); // refresh cada 5 min
    return () => clearInterval(id);
  }, [load]);

  const rateOf = (code: string): number => {
    if (!rates) return 0;
    if (code === 'BOB') return 1;
    const key = code.toLowerCase() as keyof typeof rates.rates;
    return rates.rates[key] ?? 0;
  };

  const convert = (value: number, to: string): number => {
    const base = rateOf(from);
    if (!base) return 0;
    return (value * base) / (rateOf(to) || 1);
  };

  const num = Number(amount) || 0;

  const format = (v: number, code: string) =>
    v.toLocaleString('es-BO', {
      maximumFractionDigits: code === 'JPY' ? 0 : 2,
      minimumFractionDigits: code === 'JPY' ? 0 : 2,
    });

  return (
    <>
      <style>{`@keyframes ledTicker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
      {rates && (
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 0.5 }}
          aria-label="Cotizaciones de divisas"
        >
          <Tooltip
            title={
              <Box sx={{ fontSize: '0.75rem' }}>
                <Box>Dólar: Bs {rates.rates.usd.toFixed(2)} — {rates.source.usd}</Box>
                <Box>💶 Euro: Bs {rates.rates.eur.toFixed(2)} — {rates.source.eur}</Box>
                <Box>💴 Yen: Bs {rates.rates.jpy.toFixed(4)} — {rates.source.jpy}</Box>
                <Box>🇦🇷 Peso arg.: Bs {rates.rates.ars.toFixed(4)} — {rates.source.ars}</Box>
                <Box>🇵🇪 Sol: Bs {rates.rates.pen.toFixed(2)} — {rates.source.pen}</Box>
                <Box>🇨🇱 Peso chileno: Bs {rates.rates.clp.toFixed(5)} — {rates.source.clp}</Box>
                <Box>🇺🇾 Peso uruguayo: Bs {rates.rates.uyu.toFixed(2)} — {rates.source.uyu}</Box>
                <Box>🇧🇷 Real: Bs {rates.rates.brl.toFixed(2)} — {rates.source.brl}</Box>
                <Box>USDT: Bs {rates.rates.usdt.toFixed(2)} — {rates.source.usdt}</Box>
                <Box sx={{ mt: 0.5, color: 'text.secondary' }}>
                  Actualizado: {new Date(rates.updatedAt).toLocaleString('es-BO')}
                </Box>
              </Box>
            }
          >
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                gap: 0.5,
                fontSize: '0.78rem',
                color: 'inherit',
                opacity: 0.95,
                cursor: 'default',
              }}
            >
              {/* USD siempre visible */}
              <Chip size="small" variant="outlined" sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.5)', fontWeight: 700 }} label={`USD Bs ${rates.rates.usd.toFixed(2)}`} />
              {/* El resto circula como letrero LED */}
              <Box sx={{ overflow: 'hidden', width: { md: 150, lg: 230 }, maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)' }}>
                <Box sx={{ display: 'flex', gap: 1, width: 'max-content', animation: 'ledTicker 28s linear infinite' }}>
                  {[...LED_RATES, ...LED_RATES].map((m, i) => (
                    <Chip key={`${m.key}-${i}`} size="small" variant="outlined" sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }} label={`${m.label} Bs ${rates.rates[m.key].toFixed(m.dec)}`} />
                  ))}
                </Box>
              </Box>
            </Box>
          </Tooltip>
          <Tooltip title="Calculadora de divisas">
            <IconButton color="inherit" size="small" onClick={() => setOpen(true)} aria-label="Calculadora de divisas">
              <CalculateIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Calculadora de divisas</DialogTitle>
        <DialogContent dividers>
          {!rates ? (
            <Typography color="text.secondary">Cargando cotizaciones…</Typography>
          ) : (
            <>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Cantidad"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  size="small"
                  sx={{ flex: 1, minWidth: 120 }}
                />
                <TextField
                  select
                  label="Desde"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  size="small"
                  sx={{ minWidth: 180 }}
                >
                  {MONEDAS.map((m) => (
                    <MenuItem key={m.code} value={m.code}>
                      {m.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Table size="small">
                <TableBody>
                  {MONEDAS.map((m) => {
                    const v = convert(num, m.code);
                    return (
                      <TableRow key={m.code} selected={m.code === from}>
                        <TableCell>{m.label}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: m.code === from ? 700 : 400 }}>
                          {m.symbol} {format(v, m.code)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                Fuentes: {rates.source.usd} · {rates.source.eur} · {rates.source.usdt}. Cotización
                actualizada el {new Date(rates.updatedAt).toLocaleString('es-BO')}.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
