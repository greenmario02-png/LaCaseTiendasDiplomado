import { useEffect, useState } from 'react';import { useNavigate } from 'react-router-dom';
import {
  Badge,
  IconButton,
  Menu,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Button,
  Avatar,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import InventoryIcon from '@mui/icons-material/Inventory';
import ChatIcon from '@mui/icons-material/Chat';
import GavelIcon from '@mui/icons-material/Gavel';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import StorefrontIcon from '@mui/icons-material/Storefront';
import VerifiedIcon from '@mui/icons-material/Verified';
import ArticleIcon from '@mui/icons-material/Article';
import { api } from '../../services/api';
import { connectSocket, getSocket } from '../../services/socket';
import { useAuthStore } from '../../stores/authStore';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  refType?: string | null;
  refId?: number | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  NEW_ORDER: <LocalMallIcon />,
  ORDER_STATUS: <LocalMallIcon />,
  PAYMENT_VERIFIED: <VerifiedIcon />,
  PAYMENT_PROOF: <InventoryIcon />,
  NEW_CHAT: <ChatIcon />,
  NEW_MESSAGE: <ChatIcon />,
  OUTBID: <GavelIcon />,
  AUCTION_WON: <GavelIcon />,
  AUCTION_SOLD: <GavelIcon />,
  AUCTION_ENDED: <GavelIcon />,
  PRODUCT_APPROVED: <VerifiedIcon />,
  PRODUCT_REJECTED: <InventoryIcon />,
  SELLER_APPROVED: <StorefrontIcon />,
  SELLER_REJECTED: <StorefrontIcon />,
  SYSTEM: <ArticleIcon />,
};

function iconColor(type: string): string {
  if (type.startsWith('AUCTION') || type === 'OUTBID') return 'warning.main';
  if (type.startsWith('PAYMENT') || type === 'PRODUCT_APPROVED') return 'success.main';
  if (type.startsWith('CHAT') || type === 'NEW_MESSAGE') return 'info.main';
  if (type === 'NEW_ORDER' || type === 'SELLER_APPROVED') return 'primary.main';
  return 'text.secondary';
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);

  // Actualiza el reloj relativo cada minuto mientras el menú está abierto
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadUnread = () => {
    if (!user) return;
    api.get('/notifications/unread-count').then((res) => setUnread(res.data.data.count)).catch(() => {});
  };

  const openMenu = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    setLoading(true);
    api
      .get('/notifications', { params: { limit: 30 } })
      .then((res) => {
        setNotifications(res.data.data);
        setUnread(res.data.meta.unread);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // Socket en vivo: actualiza badge al recibir notificación
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const socket = connectSocket(token);
    socket.on('notification:new', (payload: any) => {
      setUnread(payload.unreadCount ?? ((n: number) => n + 1));
    });
    return () => {
      socket.off('notification:new');
    };
  }, [user]);

  // Cargar al montar y cuando el usuario cambia
  useEffect(() => {
    loadUnread();
    if (user) {
      const interval = setInterval(loadUnread, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleNavigate = (n: Notification) => {
    // Marcar como leída
    api.patch(`/notifications/${n.id}/read`).catch(() => {});
    setUnread((u) => Math.max(0, u - 1));
    setAnchorEl(null);

    if (n.refType === 'chat' && n.refId) navigate(`/mensajes/${n.refId}`);
    else if (n.refType === 'auction' && n.refId) navigate(`/subasta/${n.refId}`);
    else if (n.refType === 'order' && n.refId) {
      // Notificaciones dirigidas al vendedor vs comprador
      if (n.type === 'NEW_ORDER' || n.type === 'PAYMENT_PROOF') navigate('/seller/pedidos');
      else navigate(`/cuenta/pedidos/${n.refId}`);
    } else if (n.refType === 'product' && n.refId) navigate(`/producto/${n.refId}/detalle`);
    else if (n.refType === 'seller') navigate('/seller');
    else if (n.refType === 'promotion') navigate('/promociones');
  };

  const markAll = async () => {
    await api.post('/notifications/read-all').catch(() => {});
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const timeAgo = (iso: string, now: number) => {
    const diff = now - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'ahora';
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return `hace ${d} d`;
  };

  return (
    <>
      <Tooltip title="Notificaciones">
        <IconButton color="inherit" onClick={openMenu}>
          <Badge badgeContent={unread} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 480, mt: 1 } } }}
      >
        <Box px={2} py={1} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" fontWeight={700}>
            Notificaciones
          </Typography>
          {unread > 0 && (
            <Button size="small" onClick={markAll}>
              Marcar todas leídas
            </Button>
          )}
        </Box>
        <Divider />

        {loading && (
          <Box textAlign="center" py={3}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!loading && notifications.length === 0 && (
          <Box textAlign="center" py={4}>
            <NotificationsIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No tenés notificaciones
            </Typography>
          </Box>
        )}

        {!loading && notifications.length > 0 && (
          <List disablePadding sx={{ maxHeight: 360, overflow: 'auto' }}>
            {notifications.map((n) => (
              <ListItem key={n.id} disablePadding>
                <ListItemButton
                  onClick={() => handleNavigate(n)}
                  sx={{ bgcolor: n.isRead ? 'transparent' : 'action.selected', py: 1 }}
                >
                  <Avatar sx={{ width: 34, height: 34, mr: 1.5, bgcolor: 'transparent', color: iconColor(n.type) }}>
                    {TYPE_ICONS[n.type] || <NotificationsIcon fontSize="small" />}
                  </Avatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={n.isRead ? 400 : 700}>
                        {n.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {n.message}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {timeAgo(n.createdAt, now)}
                        </Typography>
                      </>
                    }
                  />
                  {!n.isRead && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', ml: 1 }} />}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Menu>
    </>
  );
}
