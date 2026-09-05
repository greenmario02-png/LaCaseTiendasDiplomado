import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Pagination,
  Stack,
  Typography,
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
import { getErrorMessage } from '../../services/api';
import { EmptyState, LoadingState, ErrorState } from '../../components/redesign/States';

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
  FORUM_ANSWER: <ChatIcon />,
  FORUM_BEST: <VerifiedIcon />,
  FORUM_RANK_UP: <ArticleIcon />,
  FORUM_COIN_EARN: <VerifiedIcon />,
  SYSTEM: <ArticleIcon />,
};

function iconColor(type: string): string {
  if (type.startsWith('AUCTION') || type === 'OUTBID') return 'warning.main';
  if (type.startsWith('PAYMENT') || type === 'PRODUCT_APPROVED' || type.startsWith('FORUM')) return 'success.main';
  if (type.startsWith('CHAT') || type === 'NEW_MESSAGE') return 'info.main';
  if (type === 'NEW_ORDER' || type === 'SELLER_APPROVED') return 'primary.main';
  return 'text.secondary';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString('es-ES');
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);

  const load = useCallback(
    async (p = page, unreadOnly = onlyUnread) => {
      setLoading(true);
      setError('');
      try {
        const params: Record<string, unknown> = { page: p, limit: 20 };
        if (unreadOnly) params.unread = true;
        const res = await api.get('/notifications', { params });
        setNotifications(res.data.data ?? []);
        setTotalPages(res.data.meta?.totalPages ?? 1);
        setTotal(res.data.meta?.total ?? 0);
        setUnread(res.data.meta?.unread ?? 0);
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [page, onlyUnread],
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, onlyUnread]);

  const handleOpen = async (n: Notification) => {
    if (!n.isRead) {
      api.patch(`/notifications/${n.id}/read`).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.refType === 'chat' && n.refId) navigate(`/mensajes/${n.refId}`);
    else if (n.refType === 'auction' && n.refId) navigate(`/subasta/${n.refId}`);
    else if (n.refType === 'order' && n.refId) {
      if (n.type === 'NEW_ORDER' || n.type === 'PAYMENT_PROOF') navigate('/seller/pedidos');
      else navigate(`/cuenta/pedidos/${n.refId}`);
    } else if (n.refType === 'product' && n.refId) navigate(`/producto/${n.refId}/detalle`);
    else if (n.refType === 'seller') navigate('/seller');
    else if (n.refType === 'promotion') navigate('/promociones');
    else if (n.refType === 'forum' && n.refId) navigate(`/foro/post/${n.refId}`);
    else if (n.refType === 'forumProfile') navigate('/foro/u/mi-perfil');
  };

  const markAll = async () => {
    await api.post('/notifications/read-all').catch(() => {});
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Centro de Notificaciones
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {total} notificaciones · {unread} sin leer
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant={onlyUnread ? 'contained' : 'outlined'} onClick={() => setOnlyUnread((v) => !v)}>
            {onlyUnread ? 'Mostrar todas' : 'Solo sin leer'}
          </Button>
          <Button size="small" variant="text" onClick={markAll} disabled={unread === 0}>
            Marcar todas leídas
          </Button>
        </Stack>
      </Stack>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={() => load()} />}
      {!loading && !error && notifications.length === 0 && (
        <EmptyState message={onlyUnread ? 'No tenés notificaciones sin leer 🎉' : 'No tenés notificaciones todavía'} />
      )}
      {!loading && !error && notifications.length > 0 && (
        <>
          <List disablePadding sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
            {notifications.map((n, idx) => (
              <Box key={n.id}>
                {idx > 0 && <Divider component="li" />}
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleOpen(n)} sx={{ bgcolor: n.isRead ? 'transparent' : 'action.selected', py: 1.5 }}>
                    <Avatar sx={{ width: 40, height: 40, mr: 1.5, bgcolor: 'transparent', color: iconColor(n.type) }}>
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
                          <Chip label={timeAgo(n.createdAt)} size="small" variant="outlined" sx={{ mt: 0.5, height: 20, fontSize: 11 }} />
                        </>
                      }
                    />
                    {!n.isRead && <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: 'primary.main', ml: 1 }} />}
                  </ListItemButton>
                </ListItem>
              </Box>
            ))}
          </List>
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination count={totalPages} page={page} onChange={(_e, v) => setPage(v)} color="primary" />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
