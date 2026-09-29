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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
      toast.success(t('admin.reports.commissionSaved'));
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
          {t('admin.reports.title')}
        </Typography>
        <Box display="flex" gap={1}>
          <SecondaryButton size="small" onClick={exportCSV}>
            {t('admin.reports.exportCsv')}
          </SecondaryButton>
          <PrimaryButton size="small" onClick={printReport}>
            {t('admin.reports.printPdf')}
          </PrimaryButton>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField label={t('admin.reports.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
          <TextField label={t('admin.reports.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
          <Autocomplete
            multiple
            size="small"
            sx={{ minWidth: 280 }}
            options={sellerOptions}
            getOptionLabel={(o: any) => o.storeName || o.firstName || o.email}
            value={sellerOptions.filter((o: any) => selectedSellers.includes(o.id))}
            onChange={(_e, v) => setSelectedSellers(v.map((o: any) => o.id))}
            renderInput={(p) => <TextField {...p} label={t('admin.reports.storesLabel')} placeholder={t('admin.reports.storesPlaceholder')} />}
          />
          <Autocomplete
            multiple
            size="small"
            sx={{ minWidth: 280 }}
            options={buyerOptions}
            getOptionLabel={(o: any) => `${o.firstName} ${o.lastName}`}
            value={buyerOptions.filter((o: any) => selectedBuyers.includes(o.id))}
            onChange={(_e, v) => setSelectedBuyers(v.map((o: any) => o.id))}
            renderInput={(p) => <TextField {...p} label={t('admin.reports.usersLabel')} placeholder={t('admin.reports.usersPlaceholder')} />}
          />
          <SecondaryButton
            onClick={() => {
              setSelectedSellers([]);
              setSelectedBuyers([]);
              load({ sellers: [], buyers: [] });
            }}
          >
            {t('admin.reports.clearFilters')}
          </SecondaryButton>
          <PrimaryButton onClick={() => load()}>
            {t('admin.reports.apply')}
          </PrimaryButton>
        </Box>
      </Paper>

      <Grid container spacing={2} mb={3}>
        {[
          { label: t('admin.reports.stats.sales'), value: money(sales?.summary?.sales ?? 0), color: 'primary.main' },
          { label: t('admin.reports.stats.orders'), value: sales?.summary?.orders ?? 0, color: 'text.secondary' },
          { label: t('admin.reports.stats.commissions'), value: money(sales?.summary?.commission ?? 0), color: 'success.main' },
          { label: t('admin.reports.stats.netSellers'), value: money(sales?.summary?.net ?? 0), color: 'info.main' },
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
          {t('admin.reports.bcb.title')}
        </Typography>
        <Grid container spacing={2}>
          {[
            { label: t('admin.reports.bcb.usdRate'), value: `Bs ${fmtNum(usdRate)}`, sub: t('admin.reports.bcb.usdRateSub') },
            { label: t('admin.reports.bcb.ufv'), value: `Bs ${UFV_VAL}`, sub: t('admin.reports.bcb.ufvSub') },
            { label: t('admin.reports.bcb.tre'), value: `${TRE_VAL}% MN`, sub: t('admin.reports.bcb.treSub') },
            { label: t('admin.reports.bcb.usdEquiv'), value: `US$ ${fmtNum(usdEquiv)}`, sub: t('admin.reports.bcb.usdEquivSub', { rate: fmtNum(usdRate) }) },
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
          {t('admin.reports.taxSection.title')}
        </Typography>
        <Grid container spacing={2}>
          {[
            { label: t('admin.reports.taxSection.iva'), value: money(ivaEst), sub: t('admin.reports.taxSection.ivaSub'), color: 'primary.main' },
            { label: t('admin.reports.taxSection.it'), value: money(itEst), sub: t('admin.reports.taxSection.itSub'), color: 'warning.main' },
            { label: t('admin.reports.taxSection.iue'), value: money(iueEst), sub: t('admin.reports.taxSection.iueSub'), color: 'success.main' },
            { label: t('admin.reports.taxSection.total'), value: money(ivaEst + itEst + iueEst), sub: t('admin.reports.taxSection.totalSub'), color: 'error.main' },
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
          {t('admin.reports.disclaimer.intro')} <strong>{t('admin.reports.disclaimer.bold')}</strong>.{' '}
          {t('admin.reports.disclaimer.outro')}
        </Alert>
      </Paper>

      <Grid container spacing={3}>
        {/* Ventas por día */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              {t('admin.reports.charts.salesByDay')}
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
              <Typography color="text.secondary">{t('admin.reports.charts.noDataPeriod')}</Typography>
            )}
          </Paper>
        </Grid>

        {/* Ventas por categoría */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              {t('admin.reports.charts.salesByCategory')}
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
              <Typography color="text.secondary">{t('admin.reports.charts.noData')}</Typography>
            )}
          </Paper>
        </Grid>

        {/* Top tiendas */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              {t('admin.reports.charts.salesByStore')}
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
              <Typography color="text.secondary">{t('admin.reports.charts.noData')}</Typography>
            )}
          </Paper>
        </Grid>

        {/* Comisiones */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              {t('admin.reports.charts.platformCommissions')}
            </Typography>
            {commission && (
              <>
                <FormControlLabel
                  control={<Switch checked={commission.enabled} onChange={(e) => setCommission({ ...commission, enabled: e.target.checked })} />}
                  label={t('admin.reports.commission.enable')}
                />
                <Grid container spacing={2} mt={1}>
                  <Grid item xs={6}>
                    <TextField
                      label={t('admin.reports.commission.percentage')}
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
                      label={t('admin.reports.commission.minimum')}
                      type="number"
                      value={commission.minimum}
                      onChange={(e) => setCommission({ ...commission, minimum: Number(e.target.value) })}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label={t('admin.reports.commission.fixedAmount')}
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
                      label={t('admin.reports.commission.onShipping')}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <PrimaryButton onClick={saveCommission} size="small">
                    {t('admin.reports.commission.saveConfig')}
                  </PrimaryButton>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  {t('admin.reports.commission.note')}
                </Typography>
              </>
            )}
          </Paper>
        </Grid>

        {/* Tabla de tiendas con impuestos estimados */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              {t('admin.reports.detailByStore')}
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('admin.reports.detailColumns.store')}</TableCell>
                    <TableCell align="right">{t('admin.reports.detailColumns.sales')}</TableCell>
                    <TableCell align="right">{t('admin.reports.detailColumns.orders')}</TableCell>
                    <TableCell align="right">{t('admin.reports.detailColumns.commission')}</TableCell>
                    <TableCell align="right">{t('admin.reports.detailColumns.net')}</TableCell>
                    <TableCell align="right">{t('admin.reports.detailColumns.ivaEst')}</TableCell>
                    <TableCell align="right">{t('admin.reports.detailColumns.itEst')}</TableCell>
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
                        <Typography color="text.secondary">{t('admin.reports.noSalesInPeriod')}</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" color="text.secondary">
              {t('admin.reports.footerNote')}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <style>{`@media print { .MuiPaper-root, .MuiTableContainer-root { box-shadow: none !important; } #reporte-print { padding: 0; } }`}</style>
    </Box>
  );
}
