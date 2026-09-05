import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  IconButton,
  Avatar,
  Button,
  CircularProgress,
  Badge,
  Divider,
  Tab,
  Tabs,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Stack,
  Chip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatIcon from '@mui/icons-material/Chat';
import PersonIcon from '@mui/icons-material/Person';
import { api } from '../services/api';
import { connectSocket, disconnectSocket, joinChat, leaveChat, sendTyping } from '../services/socket';
import { productUrl } from '../utils/format';
import { useAuthStore } from '../stores/authStore';
import { getErrorMessage } from '../services/api';
import toast from 'react-hot-toast';

interface Message {
  id: number;
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
  product?: { id: number; name: string; images?: Array<{ url: string }> } | null;
  seller?: { id: number; storeName: string } | null;
  buyer?: { id: number; firstName: string; lastName: string } | null;
  updatedAt: string;
  messages?: Message[];
  _count?: { messages: number };
}

type TabKind = 'compras' | 'ventas';

export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(id ? Number(id) : null);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
const [otherTyping, setOtherTyping] = useState(false);
const typingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<TabKind>('compras');
  const bottomRef = useRef<HTMLDivElement>(null);
  const [avatarAnchor, setAvatarAnchor] = useState<null | HTMLElement>(null);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<{
    region?: string;
    inactive?: boolean;
    followUps?: string[];
    noSaleReplies?: string[];
  } | null>(null);

  const isBuyer = (c: Conversation) => c.buyerId === user?.id;
  const unreadOf = (c: Conversation): number => {
    const last = c.messages?.[0];
    if (last && last.senderId !== user?.id && !last.readAt) return 1;
    return 0;
  };
  const unreadByTab = (t: TabKind) =>
    conversations
      .filter((c) => (t === 'ventas' ? !isBuyer(c) : isBuyer(c)))
      .reduce((sum, c) => sum + unreadOf(c), 0);

  const buyConversations = conversations.filter((c) => isBuyer(c));
  const sellConversations = conversations.filter((c) => !isBuyer(c));
  const list = tab === 'ventas' ? sellConversations : buyConversations;

  const loadConversations = () => {
    api
      .get('/chat')
      .then((res) => {
        setConversations(res.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // Conexión Socket.IO para tiempo real
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const socket = connectSocket(token);

    socket.on('chat:message', (payload: any) => {
      if (payload.conversationId === activeId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.message.id)) return prev;
          return [...prev, payload.message];
        });
      }
      loadConversations();
    });

    socket.on('chat:unread', () => {
      loadConversations();
    });

    socket.on('chat:typing', (payload: any) => {
      if (payload.conversationId === activeId && payload.userId !== user?.id) {
        setOtherTyping(payload.isTyping);
      }
    });

    if (activeId) joinChat(activeId);

    return () => {
      socket.off('chat:message');
      socket.off('chat:unread');
      socket.off('chat:typing');
      if (activeId) leaveChat(activeId);
      disconnectSocket();
    };
  }, [activeId]);

  useEffect(() => {
    loadConversations();
    // Bolivianismos: frases de inicio según la región del usuario
    api
      .get('/chat/icebreakers')
      .then((r) => setIcebreakers(r.data.data?.icebreakers ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeId) {
      setActive(null);
      setMessages([]);
      setSuggestions(null);
      return;
    }
    api
      .get(`/chat/${activeId}`)
      .then((res) => {
        const data = res.data.data;
        setActive({ ...data, messages: undefined });
        setMessages(data.messages || []);
      })
      .catch(() => {});
    // Sugerencias por inactividad (bolivianismos)
    api
      .get(`/chat/${activeId}/suggestions?inactivityMinutes=10`)
      .then((r) => setSuggestions(r.data.data))
      .catch(() => setSuggestions(null));
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = (convId: number) => {
    setActiveId(convId);
    navigate(`/mensajes/${convId}`, { replace: true });
  };

  const goBack = () => {
    setActiveId(null);
    navigate('/mensajes');
  };

  const send = async () => {
    if (!text.trim() || !activeId) return;
    setSending(true);
    try {
      const { data } = await api.post(`/chat/${activeId}/messages`, { content: text.trim() });
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.data.id)) return prev;
        return [...prev, data.data];
      });
      setText('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  // Envía una frase sugerida (bolivianismo de inicio o respuesta pre-programada)
  const sendPhrase = async (phrase: string) => {
    if (!activeId) return;
    setSending(true);
    try {
      const { data } = await api.post(`/chat/${activeId}/messages`, { content: phrase });
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.data.id)) return prev;
        return [...prev, data.data];
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const otherName = (c: Conversation) => {
    if (!isBuyer(c)) return c.buyer ? `${c.buyer.firstName} ${c.buyer.lastName}` : 'Comprador';
    return c.seller?.storeName || 'Vendedor';
  };

  const lastMsg = (c: Conversation) => c.messages?.[0]?.content || `${c._count?.messages ?? 0} mensajes`;

  const otherAvatarLabel = (c: Conversation) => {
    if (!isBuyer(c)) return c.buyer ? `${c.buyer.firstName?.[0] ?? ''}${c.buyer.lastName?.[0] ?? ''}` : 'C';
    return (c.seller?.storeName?.[0] ?? 'V').toUpperCase();
  };

  const headerTitle = () => {
    if (!active) return '';
    if (!isBuyer(active)) return active.buyer ? `${active.buyer.firstName} ${active.buyer.lastName}` : 'Comprador';
    return active.seller?.storeName || 'Vendedor';
  };

  // El "otro" participante es un vendedor cuando YO soy el comprador de la conversación
  const otherIsSeller = active ? isBuyer(active) : false;

  const goStore = () => {
    setAvatarAnchor(null);
    if (active?.seller) navigate(`/vendedor/${active.seller.id}`);
  };

  const goProduct = () => {
    setAvatarAnchor(null);
    if (active?.product) navigate(productUrl(active.product));
  };

  const renderList = () => (
    <Paper
      sx={{
        height: isMobile ? 'calc(100vh - 260px)' : 'calc(100vh - 220px)',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab
          label={
            <Badge badgeContent={unreadByTab('compras')} color="error">
              <Box display="flex" alignItems="center" gap={0.5}>
                <ShoppingCartIcon fontSize="small" /> Compras
              </Box>
            </Badge>
          }
          value="compras"
        />
        <Tab
          label={
            <Badge badgeContent={unreadByTab('ventas')} color="error">
              <Box display="flex" alignItems="center" gap={0.5}>
                <StorefrontIcon fontSize="small" /> Ventas
              </Box>
            </Badge>
          }
          value="ventas"
        />
      </Tabs>

      {list.length === 0 ? (
        <Box p={3} textAlign="center">
          <Typography color="text.secondary" variant="body2">
            {tab === 'compras' ? 'No tenés compras/consultas aún.' : 'No tenés ventas en curso.'}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            {tab === 'compras'
              ? 'Iniciá una desde la ficha de un producto o de una tienda.'
              : 'Cuando un comprador te escriba o compre, aparecerá acá.'}
          </Typography>
        </Box>
      ) : (
        list.map((c) => {
          const unread = unreadOf(c);
          return (
            <Box
              key={c.id}
              onClick={() => openConversation(c.id)}
              sx={{
                p: 2,
                cursor: 'pointer',
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: activeId === c.id ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <Badge badgeContent={unread} color="error" invisible={unread === 0} overlap="circular">
                  <Avatar sx={{ width: 38, height: 38, bgcolor: 'primary.main', fontSize: '0.9rem' }}>
                    {otherAvatarLabel(c)}
                  </Avatar>
                </Badge>
                <Box flex={1} minWidth={0}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {otherName(c)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1, flexShrink: 0 }}>
                      {new Date(c.updatedAt).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' })}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    color={unread > 0 ? 'text.primary' : 'text.secondary'}
                    fontWeight={unread > 0 ? 600 : 400}
                    noWrap
                    display="block"
                  >
                    {lastMsg(c)}
                  </Typography>
                </Box>
              </Box>
              {c.product && (
                <Typography variant="caption" color="primary" noWrap display="block" mt={0.5} sx={{ pl: 6 }}>
                  {c.product.name}
                </Typography>
              )}
            </Box>
          );
        })
      )}
    </Paper>
  );

  const renderChat = () => (
    <Paper sx={{ height: isMobile ? 'calc(100vh - 200px)' : 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}>
      {active ? (
        <>
          <Box p={1.5} borderBottom={1} borderColor="divider">
            <Stack direction="row" alignItems="center" spacing={1}>
              {isMobile && (
                <IconButton onClick={goBack} size="small">
                  <ArrowBackIcon />
                </IconButton>
              )}
              <IconButton size="small" onClick={(e) => setAvatarAnchor(e.currentTarget)} sx={{ p: 0 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>{headerTitle()?.[0]?.toUpperCase() ?? 'V'}</Avatar>
              </IconButton>
              <Box flex={1} minWidth={0}>
                <Typography variant="subtitle1" fontWeight={700} noWrap>
                  {headerTitle()}
                </Typography>
                {active.product && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
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
            </Stack>
          </Box>

          <Box flex={1} overflow="auto" p={2} sx={{ bgcolor: 'background.default' }}>
            {messages.length === 0 && (
              <Typography color="text.secondary" textAlign="center" mt={4}>
                Sin mensajes todavía. Escribí para consultar por el producto.
              </Typography>
            )}
            {messages.length === 0 && otherIsSeller && icebreakers.length > 0 && (
              <Box mt={2} mb={1}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  💬 Sugerencias para empezar la conversación:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {icebreakers.slice(0, 4).map((p) => (
                    <Chip key={p} label={p} size="small" sx={{ cursor: 'pointer' }} onClick={() => sendPhrase(p)} />
                  ))}
                </Stack>
              </Box>
            )}
            {messages.map((m) => {
              const mine = m.senderId === user?.id;
              return (
                <Box key={m.id} display="flex" justifyContent={mine ? 'flex-end' : 'flex-start'} mb={1}>
                  <Box
                    sx={{
                      maxWidth: isMobile ? '85%' : '75%',
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: mine ? 'primary.main' : 'background.paper',
                      color: mine ? 'white' : 'inherit',
                      boxShadow: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                      {m.content}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', textAlign: 'right', mt: 0.5 }}>
                      {new Date(m.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                      {mine && (
                        <Box component="span" ml={0.5} color={m.readAt ? '#4caf50' : 'inherit'}>
                          {m.readAt ? '✓✓' : '✓'}
                        </Box>
                      )}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
            <div ref={bottomRef} />
            {otherTyping && (
              <Typography variant="caption" color="text.secondary" sx={{ px: 1, pb: 0.5 }}>
                Escribiendo...
              </Typography>
            )}
          </Box>

          <Box p={1.5} borderTop={1} borderColor="divider">
            {suggestions?.inactive && (
              <Box mb={1}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  ⏰ Sin respuesta todavía — sugerencias ({suggestions.region ?? ''}):
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {(suggestions.followUps ?? []).slice(0, 2).map((p) => (
                    <Chip key={p} label={p} size="small" variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => sendPhrase(p)} />
                  ))}
                  {(suggestions.noSaleReplies ?? []).slice(0, 2).map((p) => (
                    <Chip key={p} label={p} size="small" sx={{ cursor: 'pointer' }} onClick={() => sendPhrase(p)} />
                  ))}
                </Stack>
              </Box>
            )}
            <Box display="flex" gap={1} alignItems="center">
            <TextField
              fullWidth
              size="small"
              placeholder="Escribí un mensaje..."
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (activeId) {
                  const isTyping = e.target.value.trim().length > 0;
                  if (isTyping !== typingRef.current) {
                    typingRef.current = isTyping;
                    sendTyping(activeId, isTyping);
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  typingRef.current = false;
                  if (activeId) sendTyping(activeId, false);
                  send();
                }
              }}
            />
            <IconButton color="primary" onClick={send} disabled={sending || !text.trim()}>
              {sending ? <CircularProgress size={20} /> : <SendIcon />}
            </IconButton>
            </Box>
          </Box>
        </>
      ) : (
        <Box p={4} textAlign="center">
          <ChatIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary">Seleccioná una conversación de la lista para ver los mensajes.</Typography>
        </Box>
      )}
    </Paper>
  );

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <ChatIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" mb={2}>
          Iniciá sesión para ver tus conversaciones
        </Typography>
        <Button component={Link} to="/login" variant="contained" color="primary">
          Iniciar sesión
        </Button>
      </Container>
    );
  }

  if (loading && conversations.length === 0) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Badge badgeContent={unreadByTab('compras') + unreadByTab('ventas')} color="error">
            <ChatIcon color="primary" />
          </Badge>
          <Typography variant="h5" fontWeight={700}>
            Mensajes
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Compras y ventas separadas
          </Typography>
        </Box>

        {isMobile ? (
          activeId && active ? renderChat() : renderList()
        ) : (
          <Box display="flex" gap={2}>
            <Box sx={{ width: '38%', flexShrink: 0 }}>{renderList()}</Box>
            <Box sx={{ flex: 1 }}>{renderChat()}</Box>
          </Box>
        )}
      </Container>

      <Menu
        anchorEl={avatarAnchor}
        open={Boolean(avatarAnchor)}
        onClose={() => setAvatarAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {otherIsSeller && active?.seller && (
          <MenuItem onClick={goStore}>
            <StorefrontIcon fontSize="small" sx={{ mr: 1 }} /> Visitar tienda
          </MenuItem>
        )}
        {otherIsSeller && active?.seller && (
          <MenuItem onClick={goStore}>
            <PersonIcon fontSize="small" sx={{ mr: 1 }} /> Ver perfil
          </MenuItem>
        )}
        {active?.product && (
          <MenuItem onClick={goProduct}>
            <ShoppingCartIcon fontSize="small" sx={{ mr: 1 }} /> Ir al producto
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
