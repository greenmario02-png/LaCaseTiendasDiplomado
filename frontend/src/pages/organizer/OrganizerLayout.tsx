import { Outlet, Link, useLocation } from 'react-router-dom';
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography, Divider, Toolbar } from '@mui/material';
import { EventNote, ReceiptLong, Group, BarChart, Settings, Storefront } from '@mui/icons-material';
import { getUnifiedTokens } from '../../theme';

const MENU = [
  { to: '/organizador', label: 'Eventos', icon: <EventNote />, end: true },
  { to: '/organizador/pedidos', label: 'Pedidos', icon: <ReceiptLong /> },
  { to: '/organizador/equipo', label: 'Equipo', icon: <Group /> },
  { to: '/organizador/estadisticas', label: 'Estadísticas', icon: <BarChart /> },
  { to: '/organizador/configuracion', label: 'Configuración', icon: <Settings /> },
];

const DRAWER_W = 260;

export default function OrganizerLayout() {
  const tokens = getUnifiedTokens(false);
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_W,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_W, boxSizing: 'border-box', bgcolor: tokens.surfaceContainerLowest },
        }}
      >
        <Toolbar sx={{ mt: 1, px: 2 }}>
          <Typography variant="h6" fontWeight={800} sx={{ color: tokens.primary }}>
            🎟️ Organizador
          </Typography>
        </Toolbar>
        <Divider />
        <List sx={{ px: 1 }}>
          {MENU.map((item) => {
            const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <ListItemButton
                key={item.to}
                component={Link}
                to={item.to}
                selected={active}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': { bgcolor: `${tokens.primary}14`, color: tokens.primary },
                }}
              >
                <ListItemIcon sx={{ color: active ? tokens.primary : 'inherit', minWidth: 36 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          })}
          <Divider sx={{ my: 1 }} />
          <ListItemButton component={Link} to="/" sx={{ borderRadius: 2 }}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Storefront />
            </ListItemIcon>
            <ListItemText primary="Volver a la tienda" />
          </ListItemButton>
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: tokens.background, minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
}