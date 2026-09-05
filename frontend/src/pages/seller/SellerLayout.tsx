import { useState } from 'react';
import type { ReactNode } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Drawer,
  Typography,
  Modal,
  TextField,
  Button,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { api, getErrorMessage } from '../../services/api';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SettingsIcon from '@mui/icons-material/Settings';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ChatIcon from '@mui/icons-material/Chat';
import GavelIcon from '@mui/icons-material/Gavel';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PaymentsIcon from '@mui/icons-material/Payments';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import RedeemIcon from '@mui/icons-material/Redeem';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import GroupIcon from '@mui/icons-material/Group';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useAuthStore } from '../../stores/authStore';
import { useRbacStore, type RbacMenu } from '../../stores/rbacStore';

const MENU = [
  { to: '/seller', label: 'Dashboard', icon: <DashboardIcon />, end: true },
  { to: '/seller/productos', label: 'Productos', icon: <InventoryIcon /> },
  { to: '/seller/etiquetas', label: 'Etiquetas', icon: <QrCode2Icon /> },
  { to: '/seller/calendario', label: 'Calendario', icon: <CalendarMonthIcon /> },
  { to: '/seller/subastas', label: 'Subastas', icon: <GavelIcon /> },
  { to: '/seller/privilegiados', label: 'Compradores VIP', icon: <WorkspacePremiumIcon />, adminOnly: true },
        { to: '/seller/promociones', label: 'Promociones', icon: <LocalOfferOutlinedIcon />, adminOnly: true },
        { to: '/seller/cupones', label: 'Cupones', icon: <LocalOfferIcon />, adminOnly: true },
        { to: '/seller/regalos', label: 'Promos de regalo', icon: <RedeemIcon />, adminOnly: true },
  { to: '/seller/pagos', label: 'Mis pagos', icon: <PaymentsIcon />, adminOnly: true },
  { to: '/seller/equipo', label: 'Equipo', icon: <GroupIcon />, adminOnly: true },
  { to: '/seller/devoluciones', label: 'Devoluciones', icon: <AssignmentReturnIcon /> },
  { to: '/mensajes', label: 'Mensajes', icon: <ChatIcon /> },
  { to: '/seller/pedidos', label: 'Pedidos', icon: <ReceiptLongIcon /> },
  { to: '/seller/configuracion', label: 'Configuración', icon: <SettingsIcon />, adminOnly: true },
];

// Paths que solo ven OWNER/ADMIN de tienda (para ocultar a empleados en menús dinámicos).
const SELLER_ADMIN_ONLY_PATHS = [
  '/seller/privilegiados',
  '/seller/promociones',
  '/seller/cupones',
  '/seller/regalos',
  '/seller/pagos',
  '/seller/equipo',
  '/seller/configuracion',
];

// Iconos por path (menús dinámicos RBAC; fallback DashboardIcon).
const SELLER_ICONS: Record<string, ReactNode> = Object.fromEntries(MENU.map((m) => [m.to, m.icon]));

// Convierte los menús RBAC del módulo seller (+ /mensajes) al shape de MENU.
function rbacSellerMenus(rbacMenus: RbacMenu[], isEmployee: boolean) {
  return rbacMenus
    .filter((m) => (m.path.startsWith('/seller') || m.path === '/mensajes') && m.isActive !== false && !m.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => ({
      to: m.path,
      label: m.label,
      icon: SELLER_ICONS[m.path] ?? <DashboardIcon />,
      end: m.path === '/seller',
      adminOnly: SELLER_ADMIN_ONLY_PATHS.includes(m.path),
    }))
    .filter((item) => !(item.adminOnly && isEmployee));
}

const REAUTH_TTL_MS = 15 * 60 * 1000; // 15 minutos
const REAUTH_KEY = 'sellerReauth';

function isReauthValid(userId: number): boolean {
  try {
    const raw = sessionStorage.getItem(REAUTH_KEY);
    if (!raw) return false;
    const stored = JSON.parse(raw) as { userId: number; at: number };
    return stored.userId === userId && Date.now() - stored.at < REAUTH_TTL_MS;
  } catch {
    return false;
  }
}

export default function SellerLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const storeRole = user?.storeRole;
  const isEmployee = storeRole === 'EMPLOYEE';
  const rbacMenus = useRbacStore((s) => s.menus);
  const rbacLoaded = useRbacStore((s) => s.loaded);
  const dynamicSeller = rbacSellerMenus(rbacMenus, isEmployee);
  const menu = rbacLoaded && dynamicSeller.length > 0 ? dynamicSeller : MENU.filter((item) => !(item.adminOnly && isEmployee));

  // Re-autenticación al entrar al panel (verify-password + TTL por sesión).
  // El layout solo se monta con sesión activa (Protected espera a `booted`), así que
  // el estado inicial ya captura el userId correcto; verificar no necesita efectos.
  const userId = user?.id ?? 0;
  const [reauthOpen, setReauthOpen] = useState(() => (userId ? !isReauthValid(userId) : false));
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [reauthSubmitting, setReauthSubmitting] = useState(false);

  const handleVerifyPassword = async () => {
    setReauthSubmitting(true);
    setReauthError('');
    try {
      await api.post('/auth/verify-password', { password: reauthPassword });
      sessionStorage.setItem(REAUTH_KEY, JSON.stringify({ userId, at: Date.now() }));
      setReauthPassword('');
      setReauthOpen(false);
    } catch (err) {
      setReauthError(getErrorMessage(err));
    } finally {
      setReauthSubmitting(false);
    }
  };

  return (
    <Box display="flex">
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: 240,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box', pt: 8 },
          }}
        >
          <List>
            {menu.map((item) => (
              <ListItem key={item.to} disablePadding>
                <ListItemButton component={Link} to={item.to} selected={item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 } }}>
        <Container maxWidth="lg">
          <Box display="flex" alignItems="center" gap={1} mb={3}>
            <StorefrontIcon color="primary" />
            <Typography variant="h5" fontWeight={700}>
              {isEmployee ? 'Panel del empleado' : 'Panel del vendedor'}
            </Typography>
          </Box>
          <Outlet />
        </Container>
      </Box>

      <Modal open={reauthOpen} onClose={() => {}} aria-labelledby="reauth-title">
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 420 },
            bgcolor: 'background.paper',
            boxShadow: 24,
            borderRadius: 2,
            p: 4,
            outline: 'none',
          }}
        >
          <Typography id="reauth-title" variant="h6" fontWeight={700} mb={1}>
            Verificación de seguridad
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Para ingresar al panel de la tienda, confirmá tu contraseña.
          </Typography>
          <TextField
            label="Contraseña"
            type="password"
            value={reauthPassword}
            onChange={(e) => setReauthPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && reauthPassword && !reauthSubmitting) handleVerifyPassword();
            }}
            error={!!reauthError}
            helperText={reauthError}
            fullWidth
            autoFocus
            size="small"
          />
          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            disabled={reauthSubmitting || !reauthPassword}
            onClick={handleVerifyPassword}
          >
            {reauthSubmitting ? 'Verificando…' : 'Verificar'}
          </Button>
        </Box>
      </Modal>
    </Box>
  );
}
