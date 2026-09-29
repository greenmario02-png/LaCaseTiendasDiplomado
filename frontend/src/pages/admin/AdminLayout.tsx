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
  useMediaQuery,
  useTheme,
  Divider,
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
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import { useTranslation } from 'react-i18next';
import { useUnifiedTokens } from '../../theme';
import { PageHeader } from '../../components/redesign/PageHeader';
import { SecondaryButton } from '../../components/redesign/Buttons';
import { useRbacStore, type RbacMenu } from '../../stores/rbacStore';

const MENU = [
  { to: '/admin', labelKey: 'admin.menu.dashboard', fallback: 'Dashboard', icon: <DashboardIcon />, end: true },
  { to: '/admin/productos', labelKey: 'admin.menu.products', fallback: 'Moderación productos', icon: <InventoryIcon /> },
  { to: '/admin/verificacion', labelKey: 'admin.menu.verification', fallback: 'Verificación de tiendas', icon: <VerifiedUserIcon /> },
  { to: '/admin/vendedores', labelKey: 'admin.menu.sellers', fallback: 'Vendedores', icon: <StorefrontIcon /> },
  { to: '/admin/empleos', labelKey: 'admin.menu.jobs', fallback: 'Empleos', icon: <WorkOutlineIcon /> },
  { to: '/admin/postulaciones', labelKey: 'admin.menu.jobApplications', fallback: 'Postulaciones', icon: <AssignmentIndOutlinedIcon /> },
  { to: '/admin/usuarios', labelKey: 'admin.menu.users', fallback: 'Usuarios', icon: <PeopleIcon /> },
  { to: '/admin/categorias', labelKey: 'admin.menu.categories', fallback: 'Categorías y atributos', icon: <CategoryIcon /> },
  { to: '/admin/banners', labelKey: 'admin.menu.banners', fallback: 'Banners', icon: <ImageIcon /> },
  { to: '/admin/promociones', labelKey: 'admin.menu.promotions', fallback: 'Promociones', icon: <LocalOfferIcon /> },
  { to: '/admin/cupones', labelKey: 'admin.menu.coupons', fallback: 'Cupones', icon: <LocalOfferIcon /> },
  { to: '/admin/pagos', labelKey: 'admin.menu.payouts', fallback: 'Payouts', icon: <PaymentsIcon /> },
  { to: '/admin/devoluciones', labelKey: 'admin.menu.returns', fallback: 'Devoluciones', icon: <AssignmentReturnIcon /> },
  { to: '/admin/impuestos', labelKey: 'admin.menu.taxes', fallback: 'Impuestos', icon: <PercentIcon /> },
  { to: '/admin/afiliados', labelKey: 'admin.menu.affiliates', fallback: 'Afiliados', icon: <GroupIcon /> },
  { to: '/admin/reportes', labelKey: 'admin.menu.reports', fallback: 'Reportes', icon: <AssessmentIcon /> },
  { to: '/admin/contenido', labelKey: 'admin.menu.content', fallback: 'Contenido del sitio', icon: <ArticleIcon /> },
  { to: '/admin/moneda', labelKey: 'admin.menu.currency', fallback: 'Moneda', icon: <MonetizationOnIcon /> },
  { to: '/admin/logs', labelKey: 'admin.menu.logs', fallback: 'Logs de acciones', icon: <HistoryIcon /> },
  { to: '/admin/calendario', labelKey: 'admin.menu.calendar', fallback: 'Calendario', icon: <CalendarMonthIcon /> },
  { to: '/admin/foro', labelKey: 'admin.menu.forum', fallback: 'Foro LaCASE', icon: <ForumIcon /> },
  { to: '/admin/configuracion', labelKey: 'admin.menu.settings', fallback: 'Configuración global', icon: <SettingsIcon /> },
  { to: '/admin/rbac', labelKey: 'admin.menu.rbac', fallback: 'Roles y permisos', icon: <ManageAccountsIcon /> },
];

// Códigos del RBAC seed (backend, ver Menu.code en prisma/seed.ts) -> misma clave que MENU.
// El backend ya expone `code` en cada menú (rbac.controller.ts), así que no hace falta tocar
// el backend para traducir esto: solo mapear code -> clave de i18n en el frontend.
const ADMIN_CODE_TO_KEY: Record<string, string> = {
  'admin.dashboard': 'admin.menu.dashboard',
  'admin.products': 'admin.menu.products',
  'admin.verification': 'admin.menu.verification',
  'admin.sellers': 'admin.menu.sellers',
  'admin.jobs': 'admin.menu.jobs',
  'admin.jobApplications': 'admin.menu.jobApplications',
  'admin.users': 'admin.menu.users',
  'admin.categories': 'admin.menu.categories',
  'admin.banners': 'admin.menu.banners',
  'admin.promotions': 'admin.menu.promotions',
  'admin.coupons': 'admin.menu.coupons',
  'admin.payouts': 'admin.menu.payouts',
  'admin.returns': 'admin.menu.returns',
  'admin.taxes': 'admin.menu.taxes',
  'admin.affiliates': 'admin.menu.affiliates',
  'admin.reports': 'admin.menu.reports',
  'admin.content': 'admin.menu.content',
  'admin.currency': 'admin.menu.currency',
  'admin.logs': 'admin.menu.logs',
  'admin.calendar': 'admin.menu.calendar',
  'admin.forum': 'admin.menu.forum',
  'admin.rbac': 'admin.menu.rbac',
};

// Iconos por path (para los menús dinámicos del RBAC; fallback DashboardIcon).
const ADMIN_ICONS: Record<string, ReactNode> = Object.fromEntries(MENU.map((m) => [m.to, m.icon]));

// Convierte los menús RBAC (módulo admin) en el mismo shape que MENU.
function rbacAdminMenus(rbacMenus: RbacMenu[]) {
  return rbacMenus
    .filter((m) => m.path.startsWith('/admin') && m.isActive !== false && !m.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => ({
      to: m.path,
      labelKey: ADMIN_CODE_TO_KEY[m.code] ?? '',
      fallback: m.label,
      icon: ADMIN_ICONS[m.path] ?? <DashboardIcon />,
      end: m.path === '/admin',
    }));
}

export default function AdminLayout() {
  const theme = useTheme();
  const t = useUnifiedTokens();
  const { t: tr } = useTranslation();
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
            '& .MuiDrawer-paper': { width: 260, boxSizing: 'border-box', pt: 8, bgcolor: t.surfaceContainerLowest, borderColor: `${t.outline}33` },
          }}
        >
          <List>
            {MENU.map((item) => (
              <ListItem key={item.to} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.to}
                  selected={item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)}
                  sx={{
                    borderRadius: '12px',
                    mx: 1,
                    color: t.onSurfaceVariant,
                    '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 40 },
                    '&.Mui-selected, &.Mui-selected:hover': { bgcolor: `${t.primary}1F`, color: t.primary, fontWeight: 700 },
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.labelKey ? tr(item.labelKey, { defaultValue: item.fallback }) : item.fallback} />
                </ListItemButton>
              </ListItem>
            ))}
            <Divider sx={{ my: 1, borderColor: `${t.outline}33` }} />
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/" color="inherit" sx={{
                    borderRadius: '12px',
                    mx: 1,
                    color: t.onSurfaceVariant,
                    '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 40 },
                    '&.Mui-selected, &.Mui-selected:hover': { bgcolor: `${t.primary}1F`, color: t.primary, fontWeight: 700 },
                  }}>
                <ListItemIcon>
                  <StoreIcon />
                </ListItemIcon>
                <ListItemText primary={tr('admin.menu.backToStore', { defaultValue: 'Volver a la tienda' })} />
              </ListItemButton>
            </ListItem>
          </List>
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 } }}>
        <Container maxWidth="lg">
          <PageHeader
            title={tr('admin.menu.title', { defaultValue: 'Panel de administración' })}
            icon={<DashboardIcon />}
            actions={
              <SecondaryButton type="button" to="/" size="small" startIcon={<StoreIcon />}>
                {tr('admin.menu.backToStore', { defaultValue: 'Volver a la tienda' })}
              </SecondaryButton>
            }
          />
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
