import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { Grid, Typography, Box, CircularProgress, Chip } from '@mui/material';
import { PrimaryButton } from '../../components/redesign/Buttons';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import InventoryIcon from '@mui/icons-material/Inventory';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import GavelIcon from '@mui/icons-material/Gavel';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { api } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import SalesTodayWidget from '../../components/ui/SalesTodayWidget';
import { vision } from '../../theme/vision';

const CHART_COLORS = ['#4318ff', '#6ad2ff', '#00d12a', '#ffb800', '#f857a6', '#00b09b', '#8a2be2', '#ff5858'];

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  PREPARING: 'En preparación',
  SHIPPED: 'Enviada',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
};

const KPI_GRADIENTS: Record<string, string> = {
  '#4318ff': 'linear-gradient(135deg, #4318ff 0%, #6ad2ff 100%)',
  '#6ad2ff': 'linear-gradient(135deg, #007cf0 0%, #00dfd8 100%)',
  '#00d12a': 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)',
  '#ffb800': 'linear-gradient(135deg, #ff8008 0%, #ffc837 100%)',
};

export default function AdminDashboard() {
  const money = useMoney();
  const [kpis, setKpis] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copyAlerts, setCopyAlerts] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/admin/dashboard').then((r) => r.data.data).catch(() => null),
      api.get('/admin/stats').then((r) => r.data.data).catch(() => null),
      api.get('/admin/copies/alerts', { params: { min: 5, days: 30 } }).then((r) => r.data.data?.data ?? []).catch(() => []),
    ])
      .then(([k, s, c]) => {
        setKpis(k);
        setStats(s);
        setCopyAlerts(c);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !kpis) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          background: vision.bg,
          borderRadius: '24px',
        }}
      >
        <CircularProgress sx={{ color: '#6ad2ff' }} />
      </Box>
    );
  }

  const k = kpis.kpis;
  const s = stats;

  const kpiCards = [
    { label: 'Productos', value: k.totalProducts, sub: `${k.pendingProducts} pendientes`, icon: <InventoryIcon />, color: '#4318ff', to: '/admin/productos' },
    { label: 'Vendedores', value: k.totalSellers, sub: `${k.pendingSellers} pendientes`, icon: <StorefrontIcon />, color: '#6ad2ff', to: '/admin/vendedores' },
    { label: 'Clientes', value: k.totalUsers, icon: <PeopleIcon />, color: '#00d12a', to: '/admin/usuarios' },
    { label: 'Órdenes', value: k.totalOrders, sub: `${k.pendingOrders} pendientes`, icon: <ReceiptLongIcon />, color: '#ffb800', to: '/admin' },
  ];

  const revenueCards = [
    { label: 'Ingresos totales', value: money(k.totalRevenue), color: '#00d12a' },
    { label: 'Ingresos del mes', value: money(k.monthRevenue), color: '#6ad2ff' },
    { label: 'Ventas de la semana', value: money(s?.weekRevenue ?? 0), color: '#ffb800' },
    {
      label: 'Crecimiento semanal',
      value: `${s?.weekGrowth ?? 0}%`,
      color: (s?.weekGrowth ?? 0) >= 0 ? '#00d12a' : '#ff5858',
    },
  ];

  const auctionCards = [
    { label: 'Activas', value: s?.auctions?.activeAuctions ?? 0, color: '#4318ff' },
    { label: 'Totales', value: s?.auctions?.totalAuctions ?? 0, color: '#6ad2ff' },
    { label: 'Cerradas', value: s?.auctions?.closedAuctions ?? 0, color: '#00d12a' },
  ];

  const salesChart = (s?.salesByDay ?? []).map((d: any) => ({ ...d, revenue: Math.round(Number(d.revenue)) }));
  const statusChart = (s?.ordersByStatus ?? []).map((o: any) => ({ name: STATUS_LABEL[o.status] || o.status, value: o._count }));
  const roleChart = (s?.usersByRole ?? []).map((u: any) => ({
    name: u.role === 'ADMIN' ? 'Admins' : u.role === 'SELLER' ? 'Vendedores' : 'Clientes',
    value: u._count,
  }));
  const topSellerChart = (s?.topSellers ?? []).map((t: any) => ({
    name: t.storeName?.length > 14 ? t.storeName.slice(0, 14) + '…' : t.storeName,
    ingresos: Math.round(Number(t.revenue)),
  }));
  const categoryChart = (s?.salesByCategory ?? []).slice(0, 8).map((c: any) => ({
    name: c.name?.length > 12 ? c.name.slice(0, 12) + '…' : c.name,
    value: Math.round(Number(c.total)),
  }));

  // Tooltip compartido oscuro
  const darkTooltip = {
    contentStyle: {
      backgroundColor: 'rgba(21, 27, 66, 0.95)',
      border: '1px solid rgba(106,210,255,0.3)',
      borderRadius: 12,
      color: '#fff',
      boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
    },
    labelStyle: { color: '#fff', fontWeight: 700 },
    itemStyle: { color: '#fff' },
  };

  return (
    <Box sx={{ position: 'relative', minHeight: '80vh' }}>
      {/* Fondo: gradiente nocturno + glows */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: vision.bg,
          borderRadius: '24px',
          overflow: 'hidden',
          '&::before': { content: '""', position: 'absolute', inset: 0, background: vision.glowPrimary, pointerEvents: 'none' },
          '&::after': { content: '""', position: 'absolute', inset: 0, background: vision.glowCyan, pointerEvents: 'none' },
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1, p: { xs: 2, md: 3 } }}>
        {/* Encabezado */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ fontFamily: vision.font, color: vision.text.primary }}>
              Panel de administración
            </Typography>
            <Typography variant="body2" sx={{ color: vision.text.secondary }}>
              Métricas y tendencias del marketplace en tiempo real
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Box>
              <PrimaryButton to="/admin/reportes" size="small">
                Ver reportes
              </PrimaryButton>
            </Box>
          </Box>
        </Box>

        {copyAlerts.length > 0 && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              borderRadius: '16px',
              border: '1px solid rgba(255,184,0,0.4)',
              background: 'rgba(255,184,0,0.1)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Box>
                <Typography fontWeight={800} sx={{ color: '#ffc837' }}>
                  Copias masivas detectadas
                </Typography>
                <Typography variant="body2" sx={{ color: vision.text.secondary }}>
                  Se detectaron muchas copias de productos en los últimos 30 días. Podés pausar las tiendas sospechosas.
                </Typography>
              </Box>
              <Box>
                <PrimaryButton to="/admin/vendedores" size="small" color="warning">
                  Revisar tiendas
                </PrimaryButton>
              </Box>
            </Box>
            <Box component="ul" sx={{ my: 1, pl: 2 }}>
              {copyAlerts.map((a: any) => (
                <li key={a.actorId}>
                  <Typography variant="body2" sx={{ color: vision.text.secondary }}>
                    {a.actor?.storeName || `${a.actor?.firstName} ${a.actor?.lastName}`} ({a.actor?.email}) — {a.count} copia(s)
                    {a.actor?.storePaused ? ' · Pausada' : ''}
                  </Typography>
                </li>
              ))}
            </Box>
          </Box>
        )}

        <SalesTodayWidget endpoint="/admin/sales-today" dark />

        {/* KPIs principales */}
        <Grid container spacing={2} mb={2}>
          {kpiCards.map((item) => (
            <Grid item xs={6} md={3} key={item.label}>
              <Box
                component={Link}
                to={item.to}
                sx={{
                  ...vision.card,
                  p: 2,
                  textDecoration: 'none',
                  display: 'block',
                  transition: 'transform .25s, box-shadow .25s, border-color .25s',
                  '&:hover': vision.cardHover,
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    background: KPI_GRADIENTS[item.color] ?? vision.gradientPrimary,
                    boxShadow: `0 10px 24px ${item.color}55`,
                    mb: 1.5,
                  }}
                >
                  {item.icon}
                </Box>
                <Typography variant="h4" fontWeight={800} sx={{ color: vision.text.primary, fontFamily: vision.font }}>
                  {item.value}
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: vision.text.primary }}>
                  {item.label}
                </Typography>
                {item.sub && (
                  <Typography variant="caption" sx={{ color: vision.text.muted }}>
                    {item.sub}
                  </Typography>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Ingresos */}
        <Grid container spacing={2} mb={2}>
          {revenueCards.map((item) => (
            <Grid item xs={6} md={3} key={item.label}>
              <Box sx={{ ...vision.card, p: 2 }}>
                <Typography
                  variant="h6"
                  fontWeight={800}
                  sx={{
                    background: `linear-gradient(135deg, ${item.color}, ${item.color}aa)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontFamily: vision.font,
                  }}
                >
                  {item.value}
                </Typography>
                <Typography variant="caption" sx={{ color: vision.text.secondary }}>
                  {item.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Subastas */}
        <Grid container spacing={2} mb={3}>
          {auctionCards.map((item) => (
            <Grid item xs={4} key={item.label}>
              <Box sx={{ ...vision.card, p: 2, textAlign: 'center' }}>
                <Box sx={{ color: item.color, display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                  <GavelIcon />
                </Box>
                <Typography variant="h6" fontWeight={800} sx={{ color: vision.text.primary, fontFamily: vision.font }}>
                  {item.value}
                </Typography>
                <Typography variant="caption" sx={{ color: vision.text.muted }}>
                  Subastas {item.label.toLowerCase()}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Gráfico principal: ventas 30 días */}
        <Box sx={{ ...vision.card, p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={800} sx={{ color: vision.text.primary, mb: 2, fontFamily: vision.font }}>
            Ventas — últimos 30 días
          </Typography>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={salesChart}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4318ff" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#6ad2ff" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6ad2ff" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4318ff" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: vision.text.muted }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: vision.text.muted }} />
              <Tooltip {...darkTooltip} formatter={(v: any) => money(v)} labelFormatter={(l) => 'Día: ' + l} />
              <Area type="monotone" dataKey="revenue" stroke="url(#revGrad)" strokeWidth={3} fill="url(#revFill)" name="Ingresos" />
            </AreaChart>
          </ResponsiveContainer>
        </Box>

        <Grid container spacing={3}>
          {/* Top tiendas */}
          <Grid item xs={12} md={6}>
            <Box sx={{ ...vision.card, p: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={800} sx={{ color: vision.text.primary, mb: 2, fontFamily: vision.font }}>
                Top tiendas por ingresos
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topSellerChart} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: vision.text.muted }} tickFormatter={(v: any) => Math.round(v).toLocaleString()} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: vision.text.secondary }} />
                  <Tooltip {...darkTooltip} formatter={(v: any) => money(v)} />
                  <defs>
                    <linearGradient id="topSellerGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#007cf0" />
                      <stop offset="100%" stopColor="#00dfd8" />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="ingresos" fill="url(#topSellerGrad)" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Ventas por categoría */}
          <Grid item xs={12} md={6}>
            <Box sx={{ ...vision.card, p: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={800} sx={{ color: vision.text.primary, mb: 2, fontFamily: vision.font }}>
                Ventas por categoría
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(e: any) => `${e.name}: ${Math.round(e.percent * 100)}%`}
                    labelLine={false}
                    stroke="rgba(255,255,255,0.15)"
                  >
                    {categoryChart.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...darkTooltip} formatter={(v: any) => money(v)} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Distribución de órdenes */}
          <Grid item xs={12} md={6}>
            <Box sx={{ ...vision.card, p: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={800} sx={{ color: vision.text.primary, mb: 2, fontFamily: vision.font }}>
                Órdenes por estado
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => `${e.name}: ${e.value}`} labelLine={false} stroke="rgba(255,255,255,0.15)">
                    {statusChart.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...darkTooltip} />
                  <Legend wrapperStyle={{ color: vision.text.secondary, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Usuarios por rol */}
          <Grid item xs={12} md={6}>
            <Box sx={{ ...vision.card, p: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={800} sx={{ color: vision.text.primary, mb: 2, fontFamily: vision.font }}>
                Usuarios por rol
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={roleChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: vision.text.secondary }} />
                  <YAxis tick={{ fontSize: 11, fill: vision.text.muted }} />
                  <Tooltip {...darkTooltip} />
                  <defs>
                    <linearGradient id="roleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#96c93d" />
                      <stop offset="100%" stopColor="#00b09b" />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="value" name="Usuarios" fill="url(#roleGrad)" radius={[6, 6, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        </Grid>

        {/* Top productos */}
        <Box sx={{ ...vision.card, p: 3, mt: 3 }}>
          <Typography variant="h6" fontWeight={800} sx={{ color: vision.text.primary, mb: 2, fontFamily: vision.font }}>
            Productos más vendidos
          </Typography>
          <Box>
            {(s?.topProducts ?? []).map((p: any, i: number) => (
              <Box
                key={p.id}
                display="flex"
                alignItems="center"
                gap={2}
                py={1.2}
                sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 13,
                    color: '#fff',
                    background: KPI_GRADIENTS[CHART_COLORS[i % CHART_COLORS.length]] ?? vision.gradientPrimary,
                  }}
                >
                  {i + 1}
                </Box>
                {p.images?.[0] ? (
                  <img src={p.images[0].url} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
                ) : (
                  <Box sx={{ width: 40, height: 40, borderRadius: 10, bgcolor: 'rgba(255,255,255,0.1)' }} />
                )}
                <Box flex={1}>
                  <Typography variant="body2" fontWeight={700} sx={{ color: vision.text.primary }}>
                    {p.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: vision.text.muted }}>
                    {money(p.price)}
                  </Typography>
                </Box>
                <Chip
                  label={`${p.totalSold} vendidos`}
                  size="small"
                  sx={vision.chipGhost('#00d12a')}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
