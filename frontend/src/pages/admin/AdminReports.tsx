import { useEffect, useState } from 'react';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Divider,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Autocomplete,
} from '@mui/material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

// Paleta Unified (Material 3) — reemplaza el rojo viejo #f0320a y azul #4675b9
const CHART_COLORS = ['#4F46E5', '#FEA619', '#006E4B', '#7C3AED', '#BA1A1A', '#0EA5E9', '#F59E0B', '#10B981'];

// Indicadores oficiales BCB (ago 2026) — UFV y TRe no salen del endpoint; TC sí (rates.usd)
const UFV_VAL = 3.33126;
const TRE_VAL = 3.57;

// Tasas impositivas referenciales de Bolivia (Ley 843)
const TAX_IVA = 0.13; // 13% sobre base imponible (débito fiscal)
const TAX_IT = 0.03; // 3% sobre ingresos brutos
const TAX_IUE = 0.25; // 25% sobre utilidad estimada (proxy = neto vendedor)

const fmtNum = (n: number, dec = 2) =>
  (Math.round(n * 100) / 100).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export default function AdminReports() {
  const money = useMoney();
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const [sales, setSales] = useState<any>(null);
  const [sellers, setSellers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [commission, setCommission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sellerOptions, setSellerOptions] = useState<any[]>([]);
  const [buyerOptions, setBuyerOptions] = useState<any[]>([]);
  const [selectedSellers, setSelectedSellers] = useState<number[]>([]);
  const [selectedBuyers, setSelectedBuyers] = useState<number[]>([]);
  const [usdRate, setUsdRate] = useState<number>(11.58);

  const load = (filters?: { sellers: number[]; buyers: number[] }) => {
    setLoading(true);
    const sellers = filters?.sellers ?? selectedSellers;
    const buyers = filters?.buyers ?? selectedBuyers;
    const params: any = {
      from,
      to,
      ...(sellers.length ? { sellers: sellers.join(',') } : {}),
      ...(buyers.length ? { buyers: buyers.join(',') } : {}),
    };
    Promise.all([
      api.get('/admin/reports/sales', { params }).then((r) => r.data.data).catch(() => null),
      api.get('/admin/reports/sellers', { params }).then((r) => r.data.data).catch(() => null),
      api.get('/admin/reports/categories', { params }).then((r) => r.data.data).catch(() => null),
      api.get('/admin/commission').then((r) => r.data.data).catch(() => null),
      api.get('/currencies/rates').then((r) => r.data.data?.rates?.usd).catch(() => null),
    ])
      .then(([s, sel, cat, comm, usd]) => {
        setSales(s);
        setSellers(sel?.sellers ?? []);
        setCategories(cat?.categories ?? []);
        setCommission(comm);
        if (usd) setUsdRate(Number(usd));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    api
      .get('/admin/users', { params: { role: 'SELLER', limit: 50 } })
      .then((r) => setSellerOptions(r.data.data ?? []))
      .catch(() => setSellerOptions([]));
    api
      .get('/admin/users', { params: { limit: 50 } })
      .then((r) => setBuyerOptions((r.data.data ?? []).filter((u: any) => u.role === 'CUSTOMER')))
      .catch(() => setBuyerOptions([]));
  }, []);

  const saveCommission = async () => {
    try {
      await api.put('/admin/commission', commission);
      toast.success('Comisión guardada');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // ── Cálculos impositivos referenciales ─────────────────────────────
  const gross = Number(sales?.summary?.sales ?? 0); // ingresos brutos (ventas)
  const netVend = Number(sales?.summary?.net ?? 0); // neto vendedores (proxy de utilidad)
  const baseIVA = gross; // base imponible estimada = ventas
  const ivaEst = baseIVA * TAX_IVA;
  const itEst = gross * TAX_IT;
  const iueEst = Math.max(0, netVend) * TAX_IUE;
  const usdEquiv = gross / usdRate;

  // ── Export CSV (BOM UTF-8, separador ;) ────────────────────────────
  const exportCSV = () => {
    const header = [
      'Concepto', 'Ventas (Bs)', 'Ordenes', 'Comision (Bs)', 'Neto (Bs)',
      'IVA 13% est (Bs)', 'IT 3% est (Bs)', 'IUE 25% est (Bs)',
    ];
    const rows = sellers.map((s) => [
      s.storeName,
      fmtNum(Number(s.sales)),
      s.orders,
      fmtNum(Number(s.commission)),
      fmtNum(Number(s.net)),
      fmtNum(Number(s.sales) * TAX_IVA),
      fmtNum(Number(s.sales) * TAX_IT),
      fmtNum(Math.max(0, Number(s.net)) * TAX_IUE),
    ]);
    const lines = [
      'REPORTE FINANCIERO — LaCase Multi Tiendas (referencial, no constituye declaracion tributaria)',
      `Periodo: ${from} a ${to}`,
      `Tipo de cambio oficial (BCB): Bs ${fmtNum(usdRate)} por USD`,
      `UFV: Bs ${UFV_VAL} | TRe: ${TRE_VAL}% MN`,
      '',
      header.join(';'),
      ...rows.map((r) => r.join(';')),
      '',
      `TOTAL;${fmtNum(gross)};${sales?.summary?.orders ?? 0};${fmtNum(Number(sales?.summary?.commission ?? 0))};${fmtNum(netVend)};${fmtNum(ivaEst)};${fmtNum(itEst)};${fmtNum(iueEst)}`,
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reporte-financiero-${from}-a-${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('CSV descargado');
  };

  const printReport = () => {
    window.print();
  };

  if (loading) return <CircularProgress />;

  const byDayData = (sales?.byDay ?? []).map((d: any) => ({ date: d.date.slice(5), ventas: Math.round(d.sales), comision: Math.round(d.commission) }));
  const sellerData = sellers.map((s) => ({ name: (s.storeName || '').slice(0, 18), ventas: Math.round(s.sales) }));
  const catData = categories.map((c) => ({ name: c.name, value: Math.round(c.sales) }));

  return (
    <Box id="reporte-print">
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={2}>
        <Typography variant="h6" fontWeight={700}>
          Reportes financieros
        </Typography>
        <Box display="flex" gap={1}>
          <SecondaryButton size="small" onClick={exportCSV}>
            Exportar CSV
          </SecondaryButton>
          <PrimaryButton size="small" onClick={printReport}>
            Imprimir / PDF
          </PrimaryButton>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField label="Desde" type="date" value={from} onChange={(e) => setFrom(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
          <TextField label="Hasta" type="date" value={to} onChange={(e) => setTo(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
          <Autocomplete
            multiple
            size="small"
            sx={{ minWidth: 280 }}
            options={sellerOptions}
            getOptionLabel={(o: any) => o.storeName || o.firstName || o.email}
            value={sellerOptions.filter((o: any) => selectedSellers.includes(o.id))}
            onChange={(_e, v) => setSelectedSellers(v.map((o: any) => o.id))}
            renderInput={(p) => <TextField {...p} label="Tiendas" placeholder="Todas" />}
          />
          <Autocomplete
            multiple
            size="small"
            sx={{ minWidth: 280 }}
            options={buyerOptions}
            getOptionLabel={(o: any) => `${o.firstName} ${o.lastName}`}
            value={buyerOptions.filter((o: any) => selectedBuyers.includes(o.id))}
            onChange={(_e, v) => setSelectedBuyers(v.map((o: any) => o.id))}
            renderInput={(p) => <TextField {...p} label="Usuarios" placeholder="Todos" />}
          />
          <SecondaryButton
            onClick={() => {
              setSelectedSellers([]);
              setSelectedBuyers([]);
              load({ sellers: [], buyers: [] });
            }}
          >
            Limpiar filtros
          </SecondaryButton>
          <PrimaryButton onClick={() => load()}>
            Aplicar
          </PrimaryButton>
        </Box>
      </Paper>

      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Ventas', value: money(sales?.summary?.sales ?? 0), color: 'primary.main' },
          { label: 'Órdenes', value: sales?.summary?.orders ?? 0, color: 'text.secondary' },
          { label: 'Comisiones', value: money(sales?.summary?.commission ?? 0), color: 'success.main' },
          { label: 'Neto vendedores', value: money(sales?.summary?.net ?? 0), color: 'info.main' },
        ].map((k) => (
          <Grid item xs={6} md={3} key={k.label}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700} sx={{ color: k.color }}>
                {k.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {k.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Pizarra Bolivia (indicadores BCB) */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(79,70,229,0.05)' }}>
        <Typography variant="subtitle1" fontWeight={700} mb={1}>
          📊 Pizarra oficial — Banco Central de Bolivia
        </Typography>
        <Grid container spacing={2}>
          {[
            { label: 'Tipo de cambio USD', value: `Bs ${fmtNum(usdRate)}`, sub: 'vigente — BCB' },
            { label: 'UFV', value: `Bs ${UFV_VAL}`, sub: 'Unidad de Fomento a la Vivienda' },
            { label: 'TRe', value: `${TRE_VAL}% MN`, sub: 'Tasa de Referencia' },
            { label: 'Equivalencia en USD', value: `US$ ${fmtNum(usdEquiv)}`, sub: `ventas / ${fmtNum(usdRate)}` },
          ].map((it) => (
            <Grid item xs={6} md={3} key={it.label}>
              <Typography variant="h6" fontWeight={700} color="primary.main">
                {it.value}
              </Typography>
              <Typography variant="body2">{it.label}</Typography>
              <Typography variant="caption" color="text.secondary">
                {it.sub}
              </Typography>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Resumen impositivo referencial */}
      <Paper sx={{ p: 2, mb: 3, border: '1px solid rgba(186,26,26,0.2)' }}>
        <Typography variant="subtitle1" fontWeight={700} mb={1}>
          🧾 Impuestos referenciales estimados (Ley 843)
        </Typography>
        <Grid container spacing={2}>
          {[
            { label: 'IVA 13%', value: money(ivaEst), sub: 'débito fiscal estimado sobre ventas', color: 'primary.main' },
            { label: 'IT 3%', value: money(itEst), sub: 'sobre ingresos brutos', color: 'warning.main' },
            { label: 'IUE 25%', value: money(iueEst), sub: 'sobre utilidad estimada (neto vendedor)', color: 'success.main' },
            { label: 'Total impuestos est.', value: money(ivaEst + itEst + iueEst), sub: 'IVA + IT + IUE', color: 'error.main' },
          ].map((it) => (
            <Grid item xs={6} md={3} key={it.label}>
              <Typography variant="h6" fontWeight={700} sx={{ color: it.color }}>
                {it.value}
              </Typography>
              <Typography variant="body2">{it.label}</Typography>
              <Typography variant="caption" color="text.secondary">
                {it.sub}
              </Typography>
            </Grid>
          ))}
        </Grid>
        <Alert severity="info" sx={{ mt: 1 }}>
          Valores referenciales para gestión interna. Este reporte <strong>NO constituye declaración
          tributaria ni factura fiscal</strong>. Consulte la normativa vigente del SIN (impuestos.gob.bo)
          y a su contador para las obligaciones reales.
        </Alert>
      </Paper>

      <Grid container spacing={3}>
        {/* Ventas por día */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Ventas por día
            </Typography>
            {byDayData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={byDayData}>
                  <defs>
                    <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Area type="monotone" dataKey="ventas" stroke={CHART_COLORS[0]} fill="url(#v)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary">Sin datos en el período</Typography>
            )}
          </Paper>
        </Grid>

        {/* Ventas por categoría */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Ventas por categoría
            </Typography>
            {catData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={catData} dataKey="value" nameKey="name" outerRadius={90} label={(e: any) => `${(e.name || '').slice(0, 12)}`}>
                    {catData.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary">Sin datos</Typography>
            )}
          </Paper>
        </Grid>

        {/* Top tiendas */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Ventas por tienda
            </Typography>
            {sellerData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sellerData}>
                  <XAxis dataKey="name" fontSize={9} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="ventas" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary">Sin datos</Typography>
            )}
          </Paper>
        </Grid>

        {/* Comisiones */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Comisiones de la plataforma
            </Typography>
            {commission && (
              <>
                <FormControlLabel
                  control={<Switch checked={commission.enabled} onChange={(e) => setCommission({ ...commission, enabled: e.target.checked })} />}
                  label="Habilitar comisiones"
                />
                <Grid container spacing={2} mt={1}>
                  <Grid item xs={6}>
                    <TextField
                      label="Porcentaje (%)"
                      type="number"
                      value={commission.percentage}
                      onChange={(e) => setCommission({ ...commission, percentage: Number(e.target.value) })}
                      fullWidth
                      size="small"
                      disabled={commission.fixed > 0}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Comisión mínima (Bs)"
                      type="number"
                      value={commission.minimum}
                      onChange={(e) => setCommission({ ...commission, minimum: Number(e.target.value) })}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Monto fijo (Bs, 0 = usar %)"
                      type="number"
                      value={commission.fixed}
                      onChange={(e) => setCommission({ ...commission, fixed: Number(e.target.value) })}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6} display="flex" alignItems="center">
                    <FormControlLabel
                      control={<Switch checked={commission.onShipping} onChange={(e) => setCommission({ ...commission, onShipping: e.target.checked })} />}
                      label="Aplicar al envío"
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <PrimaryButton onClick={saveCommission} size="small">
                    Guardar configuración
                  </PrimaryButton>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  La comisión se descuenta del neto del vendedor en cada orden.
                </Typography>
              </>
            )}
          </Paper>
        </Grid>

        {/* Tabla de tiendas con impuestos estimados */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Detalle por tienda
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tienda</TableCell>
                    <TableCell align="right">Ventas</TableCell>
                    <TableCell align="right">Órdenes</TableCell>
                    <TableCell align="right">Comisión</TableCell>
                    <TableCell align="right">Neto</TableCell>
                    <TableCell align="right">IVA 13% est.</TableCell>
                    <TableCell align="right">IT 3% est.</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sellers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.storeName}</TableCell>
                      <TableCell align="right">{money(s.sales)}</TableCell>
                      <TableCell align="right">{s.orders}</TableCell>
                      <TableCell align="right">{money(s.commission)}</TableCell>
                      <TableCell align="right">{money(s.net)}</TableCell>
                      <TableCell align="right">{money(Number(s.sales) * TAX_IVA)}</TableCell>
                      <TableCell align="right">{money(Number(s.sales) * TAX_IT)}</TableCell>
                    </TableRow>
                  ))}
                  {sellers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary">Sin ventas en el período</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" color="text.secondary">
              Impuestos estimados con tasas referenciales de la Ley 843 (IVA 13%, IT 3%, IUE 25%). Fuente
              de indicadores: Banco Central de Bolivia (bcb.gob.bo) y SIN (impuestos.gob.bo).
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <style>{`@media print { .MuiPaper-root, .MuiTableContainer-root { box-shadow: none !important; } #reporte-print { padding: 0; } }`}</style>
    </Box>
  );
}
