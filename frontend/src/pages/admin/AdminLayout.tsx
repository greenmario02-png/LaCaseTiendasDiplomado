import { Outlet, Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
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
  useMediaQuery,
  useTheme,
  Divider,
  Button,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PeopleIcon from '@mui/icons-material/People';
import CategoryIcon from '@mui/icons-material/Category';
import ImageIcon from '@mui/icons-material/Image';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ArticleIcon from '@mui/icons-material/Article';
import StoreIcon from '@mui/icons-material/Store';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PaymentsIcon from '@mui/icons-material/Payments';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import PercentIcon from '@mui/icons-material/Percent';
import GroupIcon from '@mui/icons-material/Group';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReportIcon from '@mui/icons-material/Report';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HistoryIcon from '@mui/icons-material/History';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ForumIcon from '@mui/icons-material/Forum';
import SettingsIcon from '@mui/icons-material/Settings';
import { useRbacStore, type RbacMenu } from '../../stores/rbacStore';

const MENU = [
  { to: '/admin', label: 'Dashboard', icon: <DashboardIcon />, end: true },
  { to: '/admin/productos', label: 'Moderación productos', icon: <InventoryIcon /> },
  { to: '/admin/verificacion', label: 'Verificación de tiendas', icon: <VerifiedUserIcon /> },
  { to: '/admin/vendedores', label: 'Vendedores', icon: <StorefrontIcon /> },
  { to: '/admin/usuarios', label: 'Usuarios', icon: <PeopleIcon /> },
  { to: '/admin/categorias', label: 'Categorías y atributos', icon: <CategoryIcon /> },
  { to: '/admin/banners', label: 'Banners', icon: <ImageIcon /> },
  { to: '/admin/promociones', label: 'Promociones', icon: <LocalOfferIcon /> },
  { to: '/admin/cupones', label: 'Cupones', icon: <LocalOfferIcon /> },
  { to: '/admin/pagos', label: 'Payouts', icon: <PaymentsIcon /> },
  { to: '/admin/devoluciones', label: 'Devoluciones', icon: <AssignmentReturnIcon /> },
  { to: '/admin/impuestos', label: 'Impuestos', icon: <PercentIcon /> },
  { to: '/admin/afiliados', label: 'Afiliados', icon: <GroupIcon /> },
  { to: '/admin/reportes', label: 'Reportes', icon: <AssessmentIcon /> },
  { to: '/admin/contenido', label: 'Contenido del sitio', icon: <ArticleIcon /> },
  { to: '/admin/moneda', label: 'Moneda', icon: <MonetizationOnIcon /> },
  { to: '/admin/logs', label: 'Logs de acciones', icon: <HistoryIcon /> },
  { to: '/admin/calendario', label: 'Calendario', icon: <CalendarMonthIcon /> },
  { to: '/admin/foro', label: 'Foro LaCASE', icon: <ForumIcon /> },
  { to: '/admin/configuracion', label: 'Configuración global', icon: <SettingsIcon /> },
  { to: '/admin/rbac', label: 'Roles y permisos', icon: <ManageAccountsIcon /> },
];

// Iconos por path (para los menús dinámicos del RBAC; fallback DashboardIcon).
const ADMIN_ICONS: Record<string, ReactNode> = Object.fromEntries(MENU.map((m) => [m.to, m.icon]));

// Convierte los menús RBAC (módulo admin) en el mismo shape que MENU.
function rbacAdminMenus(rbacMenus: RbacMenu[]) {
  return rbacMenus
    .filter((m) => m.path.startsWith('/admin') && m.isActive !== false && !m.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => ({
      to: m.path,
      label: m.label,
      icon: ADMIN_ICONS[m.path] ?? <DashboardIcon />,
      end: m.path === '/admin',
    }));
}

export default function AdminLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const rbacMenus = useRbacStore((s) => s.menus);
  const rbacLoaded = useRbacStore((s) => s.loaded);

  const dynamicAdmin = rbacAdminMenus(rbacMenus);
  const menu = rbacLoaded && dynamicAdmin.length > 0 ? dynamicAdmin : MENU;

  return (
    <Box display="flex">
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: 260,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: 260, boxSizing: 'border-box', pt: 8 },
          }}
        >
          <List>
            {MENU.map((item) => (
              <ListItem key={item.to} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.to}
                  selected={item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
            <Divider sx={{ my: 1 }} />
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/" color="inherit">
                <ListItemIcon>
                  <StoreIcon />
                </ListItemIcon>
                <ListItemText primary="Volver a la tienda" />
              </ListItemButton>
            </ListItem>
          </List>
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 } }}>
        <Container maxWidth="lg">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight={700}>
              Panel de administración
            </Typography>
            <Button component={Link} to="/" variant="outlined" startIcon={<StoreIcon />} size="small">
              Volver a la tienda
            </Button>
          </Box>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
