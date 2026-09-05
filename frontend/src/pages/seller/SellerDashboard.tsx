import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Grid, Typography, Box, Chip, CircularProgress, } from '@mui/material';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/redesign/Buttons';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ChatIcon from '@mui/icons-material/Chat';
import PendingIcon from '@mui/icons-material/Pending';
import { api } from '../../services/api';
import { useMoney } from '../../hooks/useMoney';
import { useAuthStore } from '../../stores/authStore';
import SalesTodayWidget from '../../components/ui/SalesTodayWidget';
import { vision } from '../../theme/vision';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  PREPARING: 'En preparación',
  SHIPPED: 'Enviada',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
};

const STATUS_COLORS = ['#4318ff', '#6ad2ff', '#ffb800', '#00d12a', '#f857a6', '#ff5858'];

const KPI_GRADIENTS: Record<string, string> = {
  'primary.main': 'linear-gradient(135deg, #4318ff 0%, #6ad2ff 100%)',
  'info.main': 'linear-gradient(135deg, #007cf0 0%, #00dfd8 100%)',
  'success.main': 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)',
  'warning.main': 'linear-gradient(135deg, #ff8008 0%, #ffc837 100%)',
  'error.main': 'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)',
};

export default function SellerDashboard() {
  const money = useMoney();
  const [data, setData] = useState<any>(null);
  const [promoStats, setPromoStats] = useState<any>(null);
  const storeRole = useAuthStore((s) => s.user?.storeRole);
  const isEmployee = storeRole === 'EMPLOYEE';

  useEffect(() => {
    api.get('/seller/dashboard').then((res) => setData(res.data.data)).catch(() => {});
    api.get('/seller/promotions/stats').then((res) => setPromoStats(res.data.data)).catch(() => {});
  }, []);

  if (!data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: '#6ad2ff' }} />
      </Box>
    );
  }

  const kpis = isEmployee
    ? [
        { label: 'Ventas realizadas', value: data.totalSales, icon: <ReceiptLongIcon />, color: 'info.main' },
        { label: 'Clientes atendidos', value: data.customersServed ?? 0, icon: <ChatIcon />, color: 'success.main' },
        { label: 'Ingresos', value: money(data.totalRevenue), icon: <AttachMoneyIcon />, color: 'warning.main' },
        { label: 'Mensajes sin leer', value: data.unreadMessages, icon: <PendingIcon />, color: 'error.main' },
      ]
    : [
        { label: 'Productos totales', value: data.totalProducts, sub: `${data.activeProducts} activos`, icon: <InventoryIcon />, color: 'primary.main' },
        { label: 'Pendientes moderación', value: data.pendingProducts, icon: <PendingIcon />, color: 'error.main' },
        { label: 'Ventas', value: data.totalSales, icon: <ReceiptLongIcon />, color: 'info.main' },
        { label: 'Ingresos totales', value: money(data.totalRevenue), icon: <AttachMoneyIcon />, color: 'warning.main' },
      ];

  const revenueKpis = [
    { label: 'Ingresos de la semana', value: money(data.revenueWeek), color: '#00d12a' },
    { label: 'Ingresos del mes', value: money(data.revenueMonth), color: '#6ad2ff' },
    { label: 'Mensajes sin leer', value: data.unreadMessages, color: '#ff5858' },
  ];

  const salesChart = (data.salesByDay ?? []).map((d: any) => ({ ...d, revenue: Math.round(Number(d.revenue)) }));
  const statusChart = (data.ordersByStatus ?? []).map((o: any) => ({ name: STATUS_LABEL[o.status] || o.status, value: o._count }));

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
          '&::before': { content: '""', position: 'absolute', inset: 0, background: vision.glowViolet, pointerEvents: 'none' },
          '&::after': { content: '""', position: 'absolute', inset: 0, background: vision.glowCyan, pointerEvents: 'none' },
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1, p: { xs: 2, md: 3 } }}>
        {/* Encabezado */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ fontFamily: vision.font, color: vision.text.primary }}>
              {isEmployee ? 'Panel del empleado' : 'Panel del vendedor'}
            </Typography>
            <Typography variant="body2" sx={{ color: vision.text.secondary }}>
              Desempeño de tu tienda en LaCase Multi Tiendas
            </Typography>
          </Box>
          <Box>
            <SecondaryButton to="/seller/promociones"
              size="small"
              startIcon={<LocalOfferOutlinedIcon />}
            >
              Promociones: {promoStats?.active ?? 0} activas · {promoStats?.finished ?? 0} finalizadas
              {promoStats?.totalSpent ? ` · invertido ${money(promoStats.totalSpent)}` : ''}
            </SecondaryButton>
          </Box>
        </Box>

        <SalesTodayWidget endpoint="/seller/sales-today" dark />

        {/* KPIs principales */}
        <Grid container spacing={2} mb={2}>
          {kpis.map((k) => (
            <Grid item xs={6} md={3} key={k.label}>
              <Box sx={{ ...vision.card, p: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    background: KPI_GRADIENTS[k.color] ?? vision.gradientPrimary,
                    boxShadow: `0 10px 24px ${k.color === 'primary.main' ? '#4318ff' : k.color === 'info.main' ? '#007cf0' : k.color === 'success.main' ? '#00b09b' : k.color === 'warning.main' ? '#ff8008' : '#ff5858'}55`,
                    mb: 1.5,
                  }}
                >
                  {k.icon}
                </Box>
                <Typography variant="h4" fontWeight={800} sx={{ color: vision.text.primary, fontFamily: vision.font }}>
                  {k.value}
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: vision.text.primary }}>
                  {k.label}
                </Typography>
                {k.sub && (
                  <Typography variant="caption" sx={{ color: vision.text.muted }}>
                    {k.sub}
                  </Typography>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Ingresos semana/mes + mensajes */}
        <Grid container spacing={2} mb={3}>
          {revenueKpis.map((k) => (
            <Grid item xs={4} key={k.label}>
              <Box sx={{ ...vision.card, p: 2, textAlign: 'center' }}>
                <Typography
                  variant="h6"
                  fontWeight={800}
                  sx={{
                    background: `linear-gradient(135deg, ${k.color}, ${k.color}aa)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontFamily: vision.font,
                  }}
                >
                  {k.value}
                </Typography>
                <Typography variant="caption" sx={{ color: vision.text.secondary }}>
                  {k.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          {/* Ventas 30 días */}
          <Grid item xs={12} md={8}>
            <Box sx={{ ...vision.card, p: 3 }}>
              <Typography variant="h6" fontWeight={800} sx={{ color: vision.text.primary, mb: 2, fontFamily: vision.font }}>
                Tus ventas — últimos 30 días
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={salesChart}>
                  <defs>
                    <linearGradient id="sellerGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#007cf0" />
                      <stop offset="100%" stopColor="#00dfd8" />
                    </linearGradient>
                    <linearGradient id="sellerFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00dfd8" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#007cf0" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: vision.text.muted }} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: vision.text.muted }} />
                  <Tooltip {...darkTooltip} formatter={(v: any) => money(v)} />
                  <Area type="monotone" dataKey="revenue" stroke="url(#sellerGrad)" strokeWidth={3} fill="url(#sellerFill)" name="Ingresos" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Pedidos por estado */}
          <Grid item xs={12} md={4}>
            <Box sx={{ ...vision.card, p: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={800} sx={{ color: vision.text.primary, mb: 2, fontFamily: vision.font }}>
                Pedidos por estado
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => `${e.name}: ${e.value}`} labelLine={false} stroke="rgba(255,255,255,0.15)">
                    {statusChart.map((_: any, i: number) => (
                      <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...darkTooltip} />
                  <Legend wrapperStyle={{ color: vision.text.secondary, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        </Grid>

        {/* Top productos */}
        {data.topProducts?.length > 0 && (
          <Box sx={{ ...vision.card, p: 3, mt: 3 }}>
            <Typography variant="h6" fontWeight={800} sx={{ color: vision.text.primary, mb: 2, fontFamily: vision.font }}>
              Tus productos más vendidos
            </Typography>
            <Box>
              {data.topProducts.map((p: any, i: number) => (
                <Box key={p.id} display="flex" alignItems="center" gap={2} py={1.2} sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
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
                      background: KPI_GRADIENTS[STATUS_COLORS[i % STATUS_COLORS.length]] ?? vision.gradientPrimary,
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
                      {money(p.price)} · stock {p.stock}
                    </Typography>
                  </Box>
                  <Chip label={`${p.totalSold} vendidos`} size="small" sx={vision.chipGhost('#00d12a')} />
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Pedidos recientes */}
        <Box sx={{ ...vision.card, p: 3, mt: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={800} sx={{ color: vision.text.primary, fontFamily: vision.font }}>
              Pedidos recientes
            </Typography>
            <Typography component={Link} to="/seller/pedidos" variant="body2" sx={{ color: '#6ad2ff', textDecoration: 'none' }}>
              Ver todos →
            </Typography>
          </Box>
          {data.recentOrders.length === 0 && (
            <Typography sx={{ color: vision.text.muted }}>Aún no recibiste pedidos.</Typography>
          )}
          {data.recentOrders.map((o: any) => (
            <Box key={o.id} py={1} sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" fontWeight={700} sx={{ color: vision.text.primary }}>
                    #{o.id} — {o.buyer?.firstName} {o.buyer?.lastName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: vision.text.muted }}>
                    {new Date(o.createdAt).toLocaleString('es-BO')} · {o.items?.length} ítems
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="body2" fontWeight={800} sx={{ color: vision.text.primary }}>
                    {money(o.total)}
                  </Typography>
                  <Chip label={STATUS_LABEL[o.status] || o.status} size="small" variant="outlined" sx={vision.chipGhost('#6ad2ff')} />
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
