import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  IconButton,
  Avatar,
  Badge,
  Tab,
  Tabs,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Stack,
  Chip,
  TextField,
  InputAdornment,
  Button,
  Fab,
  CircularProgress,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatIcon from '@mui/icons-material/Chat';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import NotificationsOffOutlinedIcon from '@mui/icons-material/NotificationsOffOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import BlockIcon from '@mui/icons-material/Block';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import PhotoOutlinedIcon from '@mui/icons-material/PhotoOutlined';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { api, resolveImageUrl } from '../services/api';
import { productUrl } from '../utils/format';
import { useAuthStore } from '../stores/authStore';
import { getErrorMessage } from '../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useUnifiedTokens } from '../theme';
import { PageHeader, SurfaceCard } from '../components/redesign/PageHeader';
import { PrimaryButton } from '../components/redesign/Buttons';
import { LoadingState } from '../components/redesign/States';
import { chatApi } from '../services/chat.api';
import { filterConversations, statusOf, withDaySeparators, type ChatMessage } from '../lib/chat/chatModel';
import { dayLabel, listTime, presenceLabel, previewOf, useC } from '../lib/chat/i18n';
import MessageBubble from '../components/chat/MessageBubble';
import MessageTicks from '../components/chat/MessageTicks';
import ImageViewer from '../components/chat/ImageViewer';
import OrderContextCard from '../components/chat/OrderContextCard';
import ChatComposer from '../components/chat/ChatComposer';
import { ChatSettingsDialog, ReportDialog } from '../components/chat/ChatDialogs';
import { useChatThread } from '../components/chat/useChatThread';

interface LastMessage {
  id: number;
  kind: ChatMessage['kind'];
  content: string;
  senderId: number;
  createdAt: string;
  readAt?: string | null;
  deliveredAt?: string | null;
  deleted?: boolean;
  hasImage?: boolean;
}

interface Conversation {
  id: number;
  buyerId: number;
  sellerId: number;
  productId?: number | null;
  orderId?: number | null;
  product?: { id: number | null; name: string; images?: Array<{ url: string }> } | null;
  seller?: { id: number; storeName: string; storeLogo?: string | null } | null;
  buyer?: { id: number; firstName: string; lastName: string; profileImage?: string | null } | null;
  updatedAt: string;
  lastMessage?: LastMessage | null;
  messages?: LastMessage[];
  unreadCount?: number;
  muted?: boolean;
  order?: { id: number; status: string; paymentStatus: string; total: number } | null;
  _count?: { messages: number };
}

type TabKind = 'compras' | 'ventas';

export default function ChatPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const theme = useTheme();
  const tokens = useUnifiedTokens();
  const { t } = useTranslation();
  const c = useC();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const readColor = theme.palette.mode === 'dark' ? tokens.tertiaryContainer : '#A7F3D0';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(id ? Number(id) : null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKind>('compras');
  const [query, setQuery] = useState('');
  const [avatarAnchor, setAvatarAnchor] = useState<null | HTMLElement>(null);
  const [moreAnchor, setMoreAnchor] = useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [viewer, setViewer] = useState<{ src: string; alt: string } | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [proofRequest, setProofRequest] = useState(0);
  const [atBottom, setAtBottom] = useState(true);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<{ region?: string; inactive?: boolean; followUps?: string[]; noSaleReplies?: string[] } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevHeight = useRef<number | null>(null);
  const listTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadConversations = useCallback(() => {
    api
      .get('/chat')
      .then((res) => setConversations(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  // Varias senales seguidas (mensaje + estado) recargan la lista una sola vez.
  const refreshList = useCallback(() => {
    if (listTimer.current) clearTimeout(listTimer.current);
    listTimer.current = setTimeout(loadConversations, 300);
  }, [loadConversations]);

  const thread = useChatThread({ activeId, myId: user?.id, onListChange: refreshList });
  const active = thread.conv;

  const isBuyer = (conv: { buyerId: number }) => conv.buyerId === user?.id;
  const unreadOf = (conv: Conversation): number => conv.unreadCount ?? (conv.messages?.[0] && conv.messages[0].senderId !== user?.id && !conv.messages[0].readAt ? 1 : 0);
  const unreadByTab = (k: TabKind) => conversations.filter((x) => (k === 'ventas' ? !isBuyer(x) : isBuyer(x))).reduce((sum, x) => sum + unreadOf(x), 0);

  const otherName = (conv: Pick<Conversation, 'buyerId' | 'buyer' | 'seller'>) => {
    if (!isBuyer(conv)) return conv.buyer ? `${conv.buyer.firstName} ${conv.buyer.lastName}` : t('chat.buyer');
    return conv.seller?.storeName || t('chat.seller');
  };
  const lastOf = (conv: Conversation) => conv.lastMessage ?? conv.messages?.[0] ?? null;

  const tabList = conversations.filter((x) => (tab === 'ventas' ? !isBuyer(x) : isBuyer(x)));
  const list = filterConversations(tabList, query, (x) => [otherName(x), x.product?.name ?? '', lastOf(x)?.content ?? '', x.order ? `#${x.order.id}` : '']);

  useEffect(() => {
    if (!user) return;
    loadConversations();
    api.get('/chat/icebreakers').then((r) => setIcebreakers(r.data.data?.icebreakers ?? [])).catch(() => {});
    return () => {
      if (listTimer.current) clearTimeout(listTimer.current);
    };
  }, [user, loadConversations]);

  // /mensajes?pedido=123 abre (o crea) la conversacion del pedido; la usa el flujo de pago.
  useEffect(() => {
    const orderId = Number(searchParams.get('pedido'));
    if (!user || !Number.isInteger(orderId) || orderId <= 0) return;
    chatApi
      .openOrder(orderId)
      .then((conv) => {
        setActiveId(conv.id);
        navigate(`/mensajes/${conv.id}`, { replace: true });
        refreshList();
      })
      .catch((e) => toast.error(getErrorMessage(e)));
  }, [searchParams, user, navigate, refreshList]);

  // Al cambiar de conversacion se descarta la cita y las sugerencias (durante el render, sin efecto en cascada).
  const [shownId, setShownId] = useState(activeId);
  if (shownId !== activeId) {
    setShownId(activeId);
    setReplyTo(null);
    setSuggestions(null);
    setAtBottom(true);
  }

  useEffect(() => {
    if (!activeId) return;
    api
      .get(`/chat/${activeId}/suggestions?inactivityMinutes=10`)
      .then((r) => setSuggestions(r.data.data))
      .catch(() => setSuggestions(null));
  }, [activeId]);

  // Si la conversacion activa es de ventas, la pestana sigue a la conversacion (una vez por conversacion abierta).
  const [tabFor, setTabFor] = useState<number | null>(null);
  if (active && user && tabFor !== active.id) {
    setTabFor(active.id);
    setTab(active.buyerId === user.id ? 'compras' : 'ventas');
  }

  // Desplazamiento: mantener posicion al cargar antiguos; bajar al final si se estaba abajo o el mensaje es propio.
  const lastMsg = thread.messages[thread.messages.length - 1];
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prevHeight.current != null) {
      el.scrollTop += el.scrollHeight - prevHeight.current;
      prevHeight.current = null;
      return;
    }
    if (atBottom || lastMsg?.senderId === user?.id) {
      el.scrollTop = el.scrollHeight;
      thread.resetIncoming();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMsg?.id, lastMsg?.clientId, thread.otherTyping]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setAtBottom(bottom);
    if (bottom) thread.resetIncoming();
  };

  const goLatest = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    thread.resetIncoming();
  };

  const loadOlder = () => {
    prevHeight.current = scrollRef.current?.scrollHeight ?? null;
    thread.loadOlder();
  };

  const openConversation = (convId: number) => {
    setActiveId(convId);
    navigate(`/mensajes/${convId}`, { replace: true });
  };

  const goBack = () => {
    setActiveId(null);
    navigate('/mensajes');
  };

  const otherIsSeller = active ? isBuyer(active) : false;
  const otherId = active ? (isBuyer(active) ? active.sellerId : active.buyerId) : null;
  const headerTitle = active ? otherName(active) : '';
  const subtitle = thread.otherTyping ? c('typing') : presenceLabel(thread.presence, c);

  const goStore = () => {
    setAvatarAnchor(null);
    if (active?.seller) navigate(`/vendedor/${active.seller.id}`);
  };

  const goProduct = () => {
    setAvatarAnchor(null);
    if (active?.product?.id) navigate(productUrl(active.product as { id: number; name: string }));
  };

  const toggleMute = async () => {
    setMoreAnchor(null);
    if (!active) return;
    try {
      await chatApi.mute(active.id, !active.muted);
      thread.setConv({ ...active, muted: !active.muted });
      refreshList();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const toggleBlock = async () => {
    setMoreAnchor(null);
    if (!active || !otherId) return;
    try {
      if (active.blockedByMe) {
        await chatApi.unblock(otherId);
        thread.setConv({ ...active, blockedByMe: false, canSend: true });
      } else {
        if (!window.confirm(c('blockConfirm', { name: headerTitle }))) return;
        await chatApi.block(otherId);
        thread.setConv({ ...active, blockedByMe: true, canSend: false });
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const onDelete = (m: ChatMessage, scope: 'me' | 'all') => {
    if (scope === 'all' && !window.confirm(c('deleteConfirmAll'))) return;
    thread.remove(m, scope);
  };

  const sendQr = () => thread.sendQr();

  const rows = useMemo(() => withDaySeparators(thread.messages), [thread.messages]);

  const renderList = () => (
    <SurfaceCard sx={{ p: 0, height: isMobile ? 'calc(100vh - 260px)' : 'calc(100vh - 220px)', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ borderBottom: `1px solid ${tokens.outline}33` }}>
        <Tab
          label={
            <Badge badgeContent={unreadByTab('compras')} color="error">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ShoppingCartIcon fontSize="small" /> {t('chat.tabs.purchases')}
              </Box>
            </Badge>
          }
          value="compras"
        />
        <Tab
          label={
            <Badge badgeContent={unreadByTab('ventas')} color="error">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StorefrontIcon fontSize="small" /> {t('chat.tabs.sales')}
              </Box>
            </Badge>
          }
          value="ventas"
        />
      </Tabs>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 1, borderBottom: `1px solid ${tokens.outline}33` }}>
        <TextField
          size="small"
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={c('search')}
          slotProps={{
            htmlInput: { 'aria-label': c('searchLabel') },
            input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
          }}
        />
        <IconButton onClick={() => setSettingsOpen(true)} aria-label={c('settings')} sx={{ width: 44, height: 44 }}>
          <SettingsOutlinedIcon />
        </IconButton>
      </Box>

      {list.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          {query.trim() ? (
            <Typography color={tokens.onSurface} variant="body2">{c('noResults')}</Typography>
          ) : (
            <>
              <Typography color={tokens.onSurface} variant="body2">
                {tab === 'compras' ? t('chat.emptyList.purchases') : t('chat.emptyList.sales')}
              </Typography>
              <Typography variant="caption" color={tokens.onSurfaceVariant} sx={{ display: 'block', mt: 1 }}>
                {tab === 'compras' ? t('chat.emptyList.purchasesHint') : t('chat.emptyList.salesHint')}
              </Typography>
            </>
          )}
        </Box>
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {list.map((conv) => {
            const unread = unreadOf(conv);
            const last = lastOf(conv);
            const lastStatus = last ? statusOf({ ...last, conversationId: conv.id } as ChatMessage, user?.id) : null;
            const thumb = conv.product?.images?.[0]?.url;
            const name = otherName(conv);
            return (
              <Box component="li" key={conv.id}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => openConversation(conv.id)}
                  aria-current={activeId === conv.id ? 'true' : undefined}
                  aria-label={`${name}${unread ? `, ${c('unreadCount', { count: unread })}` : ''}`}
                  sx={{
                    all: 'unset',
                    boxSizing: 'border-box',
                    width: '100%',
                    display: 'block',
                    p: 2,
                    minHeight: 64,
                    cursor: 'pointer',
                    borderBottom: `1px solid ${tokens.outline}33`,
                    bgcolor: activeId === conv.id ? `${tokens.primary}1A` : 'transparent',
                    '&:hover': { bgcolor: `${tokens.primary}0D` },
                    '&:focus-visible': { outline: `2px solid ${tokens.primary}`, outlineOffset: -2 },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 38, height: 38, bgcolor: tokens.primary, color: tokens.onPrimary, fontSize: '0.9rem' }} aria-hidden>
                      {(name[0] ?? 'V').toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color={tokens.onSurface} noWrap sx={{ fontWeight: unread > 0 ? 700 : 600 }}>
                          {name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                          {conv.muted && <NotificationsOffOutlinedIcon sx={{ fontSize: 16, color: tokens.onSurfaceVariant }} aria-label={c('muted')} />}
                          <Typography variant="caption" color={unread > 0 ? tokens.primary : tokens.onSurfaceVariant} sx={{ fontWeight: unread > 0 ? 700 : 400 }}>
                            {listTime(last?.createdAt ?? conv.updatedAt, c)}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {lastStatus && <Box sx={{ color: tokens.onSurfaceVariant, display: 'inline-flex' }}><MessageTicks status={lastStatus} readColor={tokens.primary} /></Box>}
                        {last?.hasImage && <PhotoOutlinedIcon sx={{ fontSize: 16, color: tokens.onSurfaceVariant }} aria-hidden />}
                        <Typography variant="caption" color={unread > 0 ? tokens.onSurface : tokens.onSurfaceVariant} noWrap sx={{ fontWeight: unread > 0 ? 600 : 400, flex: 1, fontStyle: last?.deleted ? 'italic' : undefined }}>
                          {last ? previewOf(last, c) : t('chat.messagesCount', { count: conv._count?.messages ?? 0 })}
                        </Typography>
                        {unread > 0 && (
                          <Box component="span" sx={{ minWidth: 20, height: 20, px: 0.75, borderRadius: 10, bgcolor: tokens.primary, color: tokens.onPrimary, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden>
                            {unread}
                          </Box>
                        )}
                      </Box>
                      {(conv.product || conv.order) && (
                        <Typography variant="caption" color={tokens.primary} noWrap sx={{ display: 'block', mt: 0.25 }}>
                          {conv.order ? c('order.title', { id: conv.order.id }) : conv.product?.name}
                        </Typography>
                      )}
                    </Box>
                    {thumb && <Avatar variant="rounded" src={resolveImageUrl(thumb)} alt="" sx={{ width: 40, height: 40 }} imgProps={{ loading: 'lazy' }} />}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </SurfaceCard>
  );

  const renderChat = () => (
    <SurfaceCard sx={{ p: 0, overflow: 'hidden', height: isMobile ? 'calc(100vh - 200px)' : 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}>
      {active ? (
        <>
          <Box sx={{ p: 1.5, borderBottom: `1px solid ${tokens.outline}33` }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              {isMobile && (
                <IconButton onClick={goBack} aria-label={t('a11y.back', { defaultValue: 'Volver' })} sx={{ width: 44, height: 44 }}>
                  <ArrowBackIcon />
                </IconButton>
              )}
              <IconButton onClick={(e) => setAvatarAnchor(e.currentTarget)} sx={{ p: 0.25 }} aria-label={headerTitle} aria-haspopup="menu">
                <Avatar sx={{ bgcolor: tokens.primary, color: tokens.onPrimary }}>{headerTitle?.[0]?.toUpperCase() ?? 'V'}</Avatar>
              </IconButton>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" component="h2" color={tokens.onSurface} noWrap sx={{ fontWeight: 700 }}>
                  {headerTitle}
                </Typography>
                {subtitle ? (
                  <Typography variant="caption" color={thread.otherTyping ? tokens.primary : tokens.onSurfaceVariant} sx={{ display: 'block' }} aria-live="polite">
                    {subtitle}
                  </Typography>
                ) : (
                  active.product?.id && (
                    <Typography
                      variant="caption"
                      color={tokens.onSurfaceVariant}
                      component={Link}
                      to={productUrl(active.product as { id: number; name: string })}
                      noWrap
                      sx={{ display: 'block', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      {active.product.name}
                    </Typography>
                  )
                )}
              </Box>
              {active.muted && <NotificationsOffOutlinedIcon sx={{ color: tokens.onSurfaceVariant }} aria-label={c('muted')} />}
              <IconButton onClick={(e) => setMoreAnchor(e.currentTarget)} aria-label={c('more')} aria-haspopup="menu" sx={{ width: 44, height: 44 }}>
                <MoreVertIcon />
              </IconButton>
            </Stack>
          </Box>
          {active.order && (
            <OrderContextCard order={active.order} role={active.role} tokens={tokens} canSend={active.canSend} onSendQr={sendQr} onSendProof={() => setProofRequest((n) => n + 1)} />
          )}

          <Box ref={scrollRef} onScroll={onScroll} sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: tokens.background, position: 'relative' }} role="log" aria-live="polite" aria-relevant="additions">
            {thread.hasMore && (
              <Box sx={{ textAlign: 'center', mb: 1 }}>
                <Button onClick={loadOlder} disabled={thread.loadingMore} size="small" sx={{ minHeight: 44 }}>
                  {thread.loadingMore ? <CircularProgress size={18} /> : c('loadMore')}
                </Button>
              </Box>
            )}
            {thread.messages.length === 0 && (
              <Typography color={tokens.onSurfaceVariant} sx={{ textAlign: 'center', mt: 4 }}>
                {t('chat.noMessagesYet')}
              </Typography>
            )}
            {thread.messages.length === 0 && otherIsSeller && icebreakers.length > 0 && active.canSend && (
              <Box sx={{ mt: 2, mb: 1 }}>
                <Typography variant="caption" color={tokens.onSurfaceVariant} sx={{ display: 'block', mb: 0.5 }}>
                  {t('chat.icebreakersHint')}
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  {icebreakers.slice(0, 4).map((p) => (
                    <Chip key={p} label={p} sx={{ cursor: 'pointer', minHeight: 36 }} onClick={() => thread.sendText(p, null)} />
                  ))}
                </Stack>
              </Box>
            )}
            {rows.map((r) =>
              r.type === 'day' ? (
                <Box key={r.key} sx={{ display: 'flex', justifyContent: 'center', my: 1.5 }}>
                  <Typography variant="caption" sx={{ px: 1.5, py: 0.25, borderRadius: 2, bgcolor: tokens.surfaceContainerLowest, color: tokens.onSurfaceVariant, border: `1px solid ${tokens.outline}33` }}>
                    {dayLabel(r.date, c)}
                  </Typography>
                </Box>
              ) : (
                <MessageBubble
                  key={r.key}
                  msg={r.msg}
                  myId={user?.id}
                  otherName={headerTitle}
                  tokens={tokens}
                  readColor={readColor}
                  onReply={active.canSend ? setReplyTo : undefined}
                  onDelete={onDelete}
                  onRetry={thread.retry}
                  onOpenImage={(src, alt) => setViewer({ src, alt })}
                />
              ),
            )}
            {thread.otherTyping && (
              <Typography variant="caption" color={tokens.onSurfaceVariant} sx={{ px: 1, pb: 0.5, display: 'block' }}>
                {t('chat.typing')}
              </Typography>
            )}
          </Box>
          {!atBottom && (
            <Box sx={{ position: 'relative' }}>
              <Fab size="small" onClick={goLatest} aria-label={c('goToLatest')} sx={{ position: 'absolute', right: 16, bottom: 12, bgcolor: tokens.surfaceContainerLowest, color: tokens.primary }}>
                <Badge badgeContent={thread.incoming} color="error">
                  <KeyboardDoubleArrowDownIcon />
                </Badge>
              </Fab>
            </Box>
          )}

          <Box sx={{ p: 1.5, borderTop: `1px solid ${tokens.outline}33` }}>
            {!active.canSend ? (
              <Typography variant="body2" color={tokens.onSurfaceVariant} sx={{ textAlign: 'center', py: 1 }}>
                {active.blockedByMe ? c('blockedNotice') : c('cannotSend')}
              </Typography>
            ) : (
              <ChatComposer
                tokens={tokens}
                placeholder={t('chat.messagePlaceholder')}
                disabled={!active.canSend}
                replyTo={replyTo}
                replyName={replyTo?.senderId === user?.id ? c('you') : headerTitle}
                onCancelReply={() => setReplyTo(null)}
                onSendText={(text) => {
                  thread.sendText(text, replyTo);
                  setReplyTo(null);
                }}
                onSendFile={(file, caption) => {
                  thread.sendFile(file, caption, replyTo);
                  setReplyTo(null);
                }}
                onTyping={thread.onTyping}
                onError={(msg) => toast.error(msg)}
                proofRequest={proofRequest}
              >
                {suggestions?.inactive && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color={tokens.onSurfaceVariant} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <AccessTimeIcon sx={{ fontSize: 14 }} aria-hidden /> {t('chat.inactivityHint', { region: suggestions.region ?? '' })}
                    </Typography>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                      {(suggestions.followUps ?? []).slice(0, 2).map((p) => (
                        <Chip key={p} label={p} variant="outlined" sx={{ cursor: 'pointer', minHeight: 36 }} onClick={() => thread.sendText(p, null)} />
                      ))}
                      {(suggestions.noSaleReplies ?? []).slice(0, 2).map((p) => (
                        <Chip key={p} label={p} sx={{ cursor: 'pointer', minHeight: 36 }} onClick={() => thread.sendText(p, null)} />
                      ))}
                    </Stack>
                  </Box>
                )}
              </ChatComposer>
            )}
          </Box>
        </>
      ) : activeId ? (
        <LoadingState />
      ) : (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <ChatIcon sx={{ fontSize: 64, color: tokens.outline, mb: 2 }} />
          <Typography color={tokens.onSurfaceVariant}>{t('chat.selectConversation')}</Typography>
        </Box>
      )}
    </SurfaceCard>
  );

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <ChatIcon sx={{ fontSize: 64, color: tokens.outline, mb: 2 }} />
        <Typography variant="h5" color={tokens.onSurface} sx={{ mb: 2 }}>
          {t('chat.loginPrompt')}
        </Typography>
        <PrimaryButton type="button" to="/login">
          {t('chat.loginButton')}
        </PrimaryButton>
      </Container>
    );
  }

  if (loading && conversations.length === 0) {
    return <LoadingState />;
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <PageHeader
          title={t('chat.title')}
          subtitle={t('chat.subtitle')}
          icon={
            <Badge badgeContent={unreadByTab('compras') + unreadByTab('ventas')} color="error">
              <ChatIcon />
            </Badge>
          }
        />

        {isMobile ? (
          activeId ? renderChat() : renderList()
        ) : (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ width: '38%', flexShrink: 0 }}>{renderList()}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>{renderChat()}</Box>
          </Box>
        )}
      </Container>

      <Menu anchorEl={avatarAnchor} open={Boolean(avatarAnchor)} onClose={() => setAvatarAnchor(null)} anchorOrigin={{ vertical: 'top', horizontal: 'left' }}>
        {otherIsSeller && active?.seller && (
          <MenuItem onClick={goStore} sx={{ minHeight: 44 }}>
            <StorefrontIcon fontSize="small" sx={{ mr: 1 }} /> {t('chat.menu.visitStore')}
          </MenuItem>
        )}
        {otherIsSeller && active?.seller && (
          <MenuItem onClick={goStore} sx={{ minHeight: 44 }}>
            <PersonIcon fontSize="small" sx={{ mr: 1 }} /> {t('chat.menu.viewProfile')}
          </MenuItem>
        )}
        {active?.product?.id && (
          <MenuItem onClick={goProduct} sx={{ minHeight: 44 }}>
            <ShoppingCartIcon fontSize="small" sx={{ mr: 1 }} /> {t('chat.menu.goToProduct')}
          </MenuItem>
        )}
      </Menu>

      <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
        <MenuItem onClick={toggleMute} sx={{ minHeight: 44 }}>
          {active?.muted ? <NotificationsActiveOutlinedIcon fontSize="small" sx={{ mr: 1 }} /> : <NotificationsOffOutlinedIcon fontSize="small" sx={{ mr: 1 }} />}
          {active?.muted ? c('unmute') : c('mute')}
        </MenuItem>
        <MenuItem onClick={toggleBlock} sx={{ minHeight: 44 }}>
          <BlockIcon fontSize="small" sx={{ mr: 1 }} /> {active?.blockedByMe ? c('unblockUser') : c('block')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMoreAnchor(null);
            setReportOpen(true);
          }}
          sx={{ minHeight: 44 }}
        >
          <FlagOutlinedIcon fontSize="small" sx={{ mr: 1 }} /> {c('report')}
        </MenuItem>
      </Menu>

      <ImageViewer src={viewer?.src ?? null} alt={viewer?.alt ?? ''} onClose={() => setViewer(null)} />
      <ChatSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ReportDialog
        open={reportOpen}
        conversationId={active?.id ?? null}
        onClose={() => setReportOpen(false)}
        onBlocked={() => active && thread.setConv({ ...active, blockedByMe: true, canSend: false })}
      />
    </>
  );
}
