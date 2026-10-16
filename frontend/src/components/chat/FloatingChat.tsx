import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Box,
  CircularProgress,
  Fab,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PersonIcon from '@mui/icons-material/Person';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { api, getErrorMessage } from '../../services/api';
import { connectSocket, disconnectSocket, joinChat, leaveChat, sendTyping } from '../../services/socket';
import { useAuthStore } from '../../stores/authStore';
import { productUrl } from '../../utils/format';
import toast from 'react-hot-toast';
import MessageTicks from './MessageTicks';
import { mergeMessages, statusOf, type ChatMessage } from '../../lib/chat/chatModel';
import { previewOf, timeOf, useC } from '../../lib/chat/i18n';

interface Message {
  id: number;
  conversationId?: number;
  kind?: ChatMessage['kind'];
  deleted?: boolean;
  deliveredAt?: string | null;
  clientId?: string | null;
  content: string;
  senderId: number;
  createdAt: string;
  readAt?: string | null;
  sender?: { id: number; firstName: string; lastName: string; storeName?: string | null };
}

interface Conversation {
  id: number;
  buyerId: number;
  sellerId: number;
  productId?: number | null;
  product?: { id: number; name: string; price: number; images?: Array<{ url: string }> } | null;
  seller?: { id: number; storeName: string } | null;
  buyer?: { id: number; firstName: string; lastName: string } | null;
  updatedAt: string;
  messages?: Array<{ id: number; content: string; senderId: number; createdAt: string; readAt?: string | null; kind?: ChatMessage['kind']; deleted?: boolean }>;
  lastMessage?: { id: number; content: string; senderId: number; createdAt: string; readAt?: string | null; kind?: ChatMessage['kind']; deleted?: boolean } | null;
  unreadCount?: number;
  _count?: { messages: number };
}

const PANEL_W = 372;
const PANEL_H = 540;

export default function FloatingChat() {
  const { t: tr } = useTranslation();
  const c = useC();
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [avatarAnchor, setAvatarAnchor] = useState<null | HTMLElement>(null);
  const typingRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<number | null>(null);

  const isBuyer = (c: Conversation) => c.buyerId === user?.id;
  const visible = !location.pathname.startsWith('/mensajes');

  const loadUnread = () => {
    if (!user) return;
    api
      .get('/chat/unread')
      .then((res) => setUnread(res.data.data.count ?? 0))
      .catch(() => {});
  };

  const loadConversations = () => {
    if (!user) return;
    api
      .get('/chat')
      .then((res) => setConversations(res.data.data ?? []))
      .catch(() => {});
  };

  const openConversation = (c: Conversation) => {
    setActive(c);
    setMessages(c.messages ?? []);
    setText('');
    setOtherTyping(false);
    api
      .get(`/chat/${c.id}`)
      .then((res) => {
        if (res.data.data) {
          const data = res.data.data;
          setActive(data);
          setMessages(data.messages ?? []);
        }
        loadUnread();
      })
      .catch(() => {});
  };

  useEffect(() => {
    activeIdRef.current = active?.id ?? null;
  }, [active]);

  // Socket en tiempo real (conecta solo si hay sesión)
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const socket = connectSocket(token);

    // Manejadores con nombre: al limpiar se quitan solo estos (la página de Mensajes usa el mismo socket).
    const onMessage = (payload: { conversationId: number; message: Message }) => {
      if (payload.conversationId === activeIdRef.current) {
        setMessages((prev) => mergeMessages(prev as ChatMessage[], [payload.message as ChatMessage]) as Message[]);
      }
      loadConversations();
      loadUnread();
    };
    const onUnread = () => {
      loadUnread();
      loadConversations();
    };
    const onTyping = (payload: { conversationId: number; userId: number; isTyping: boolean }) => {
      if (payload.conversationId === activeIdRef.current && payload.userId !== user.id) {
        setOtherTyping(payload.isTyping);
      }
    };
    socket.on('chat:message', onMessage);
    socket.on('chat:unread', onUnread);
    socket.on('chat:typing', onTyping);

    loadUnread();
    loadConversations();

    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:unread', onUnread);
      socket.off('chat:typing', onTyping);
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Unirse a la sala de la conversación activa
  useEffect(() => {
    if (!active) return;
    joinChat(active.id);
    return () => leaveChat(active.id);
  }, [active]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  const send = async () => {
    if (!text.trim() || !active) return;
    setSending(true);
    try {
      const { data } = await api.post(`/chat/${active.id}/messages`, { content: text.trim() });
      setMessages((prev) => mergeMessages(prev as ChatMessage[], [data.data as ChatMessage]) as Message[]);
      setText('');
      loadConversations();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const otherName = (c: Conversation) => {
    if (!isBuyer(c)) return c.buyer ? `${c.buyer.firstName} ${c.buyer.lastName}` : tr('chat.buyer');
    return c.seller?.storeName || tr('chat.seller');
  };

  const otherAvatarLabel = (c: Conversation) => {
    if (!isBuyer(c)) return c.buyer ? `${c.buyer.firstName?.[0] ?? ''}${c.buyer.lastName?.[0] ?? ''}` : tr('chat.buyerInitial');
    return (c.seller?.storeName?.[0] ?? tr('chat.sellerInitial')).toUpperCase();
  };

  const unreadOf = (conv: Conversation): number => {
    if (typeof conv.unreadCount === 'number') return conv.unreadCount;
    const last = conv.messages?.[0];
    if (last && last.senderId !== user?.id && !last.readAt) return 1;
    return 0;
  };

  // Fotos, PDF, QR y comprobantes se ven completos en /mensajes; aquí va su descripción.
  const lastMsg = (conv: Conversation) => {
    const last = conv.lastMessage ?? conv.messages?.[0];
    return (last ? previewOf(last, c) : '') || tr('chat.messagesCount', { count: conv._count?.messages ?? 0 });
  };

  // El "otro" participante es un vendedor cuando YO soy el comprador de la conversación
  const otherIsSeller = active ? isBuyer(active) : false;

  const goProduct = () => {
    setAvatarAnchor(null);
    if (active?.product) navigate(productUrl(active.product));
  };

  const goStore = () => {
    setAvatarAnchor(null);
    if (active?.seller) navigate(`/vendedor/${active.seller.id}`);
  };

  const renderList = () => (
    <Box sx={{ height: PANEL_H - 56, overflow: 'auto' }}>
      {conversations.length === 0 ? (
        <Box p={3} textAlign="center">
          <Typography color="text.secondary" variant="body2">
            {tr('chat.floating.noConversations')}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            {tr('chat.emptyList.purchasesHint')}
          </Typography>
        </Box>
      ) : (
        conversations.map((c) => {
          const unreadC = unreadOf(c);
          return (
            <Box
              key={c.id}
              onClick={() => openConversation(c)}
              sx={{
                p: 1.5,
                cursor: 'pointer',
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: active?.id === c.id ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <Badge badgeContent={unreadC} color="error" invisible={unreadC === 0} overlap="circular">
                  <Avatar sx={{ width: 38, height: 38, bgcolor: 'primary.main', fontSize: '0.9rem' }}>
                    {otherAvatarLabel(c)}
                  </Avatar>
                </Badge>
                <Box flex={1} minWidth={0}>
                  <Typography variant="body2" fontWeight={unreadC > 0 ? 700 : 600} noWrap>
                    {otherName(c)}
                  </Typography>
                  <Typography
                    variant="caption"
                    color={unreadC > 0 ? 'text.primary' : 'text.secondary'}
                    fontWeight={unreadC > 0 ? 600 : 400}
                    noWrap
                    display="block"
                  >
                    {lastMsg(c)}
                  </Typography>
                  {c.product && (
                    <Typography variant="caption" color="primary" noWrap display="block">
                      {c.product.name}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );

  const renderThread = () => {
    if (!active) return null;
    return (
      <>
        <Box p={1} borderBottom={1} borderColor="divider" display="flex" alignItems="center" gap={1}>
          <IconButton size="small" onClick={() => setActive(null)}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={(e) => setAvatarAnchor(e.currentTarget)}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '0.85rem' }}>
              {otherAvatarLabel(active)}
            </Avatar>
          </IconButton>
          <Box flex={1} minWidth={0}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              {otherName(active)}
            </Typography>
            {active.product && (
              <Typography
                variant="caption"
                color="primary"
                component={Link}
                to={productUrl(active.product)}
                noWrap
                display="block"
                sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {active.product.name}
              </Typography>
            )}
          </Box>
        </Box>

        <Box flex={1} overflow="auto" p={1.5} sx={{ bgcolor: 'background.default' }}>
          {messages.length === 0 && (
            <Typography color="text.secondary" textAlign="center" mt={3} variant="body2">
              {tr('chat.floating.noMessagesYet')}
            </Typography>
          )}
          {messages.map((m) => {
            const mine = m.senderId === user?.id;
            return (
              <Box key={m.id} display="flex" justifyContent={mine ? 'flex-end' : 'flex-start'} mb={1}>
                <Box
                  sx={{
                    maxWidth: '85%',
                    p: 1,
                    borderRadius: 2,
                    bgcolor: mine ? 'primary.main' : 'background.paper',
                    color: mine ? 'white' : 'inherit',
                    boxShadow: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', fontStyle: m.deleted ? 'italic' : undefined }}>
                    {m.deleted || (m.kind && m.kind !== 'TEXT') ? previewOf(m, c) : m.content}
                  </Typography>
                  <Typography variant="caption" component="div" sx={{ opacity: 0.85, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 0.25 }}>
                    {timeOf(m.createdAt)}
                    {mine && <MessageTicks status={statusOf(m as ChatMessage, user?.id) ?? 'sent'} readColor="#A7F3D0" />}
                  </Typography>
                </Box>
              </Box>
            );
          })}
          <div ref={bottomRef} />
          {otherTyping && (
            <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
              {tr('chat.typing')}
            </Typography>
          )}
        </Box>

        <Box p={1} borderTop={1} borderColor="divider" display="flex" gap={0.5} alignItems="center">
          <TextField
            fullWidth
            size="small"
            placeholder={tr('chat.messagePlaceholder')}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              const isTyping = e.target.value.trim().length > 0;
              if (isTyping !== typingRef.current) {
                typingRef.current = isTyping;
                sendTyping(active.id, isTyping);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                typingRef.current = false;
                sendTyping(active.id, false);
                send();
              }
            }}
          />
          <IconButton color="primary" onClick={send} disabled={sending || !text.trim()}>
            {sending ? <CircularProgress size={20} /> : <SendIcon />}
          </IconButton>
        </Box>
      </>
    );
  };

  if (!user || !visible) return null;

  return (
    <>
      <Fab
        color="primary"
        aria-label="Chat"
        onClick={() => setOpen((o) => !o)}
        sx={{ position: 'fixed', right: 20, bottom: 20, zIndex: 1400 }}
      >
        <Badge badgeContent={unread} color="error" invisible={unread === 0}>
          {open ? <CloseIcon /> : <ChatIcon />}
        </Badge>
      </Fab>

      {open && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            right: 20,
            bottom: 84,
            zIndex: 1400,
            width: { xs: 'calc(100vw - 40px)', sm: PANEL_W },
            height: PANEL_H,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <Box p={1.5} borderBottom={1} borderColor="divider" display="flex" alignItems="center" gap={1}>
            <Box flex={1}>
              <Typography variant="subtitle1" fontWeight={700}>
                {tr('chat.title')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {tr('chat.floating.purchaseAndSaleConversations')}
              </Typography>
            </Box>
            <Tooltip title={tr('chat.floating.viewFullPage')}>
              <IconButton size="small" onClick={() => navigate('/mensajes')}>
                <ChatIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {active ? renderThread() : renderList()}
        </Paper>
      )}

      <Menu
        anchorEl={avatarAnchor}
        open={Boolean(avatarAnchor)}
        onClose={() => setAvatarAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ root: { style: { zIndex: 1500 } } }}
      >
        {otherIsSeller && active?.seller && (
          <MenuItem onClick={goStore}>
            <StorefrontIcon fontSize="small" sx={{ mr: 1 }} /> {tr('chat.menu.visitStore')}
          </MenuItem>
        )}
        {otherIsSeller && active?.seller && (
          <MenuItem onClick={goStore}>
            <PersonIcon fontSize="small" sx={{ mr: 1 }} /> {tr('chat.menu.viewProfile')}
          </MenuItem>
        )}
        {active?.product && (
          <MenuItem onClick={goProduct}>
            <ShoppingCartIcon fontSize="small" sx={{ mr: 1 }} /> {tr('chat.menu.goToProduct')}
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
