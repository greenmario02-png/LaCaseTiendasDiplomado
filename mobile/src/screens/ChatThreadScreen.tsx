import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Pressable, Alert, AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ArrowLeft, ArrowDown, MoreVertical, Paperclip, Send, BellOff, Bell, Ban, Flag, X, Package, Clock } from 'lucide-react-native';
import { api, getErrorMessage } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { LoadingState } from '../components/redesign/States';
import { useAppTheme } from '../theme/ThemeContext';
import {
  acquireChatSocket,
  applyStatus,
  chatApi,
  createTypingEmitter,
  markDeleted,
  mergeMessages,
  newClientId,
  releaseChatSocket,
  withDaySeparators,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  type ChatMessage,
  type LocalFile,
  type Presence,
  type Row,
} from '../services/chat';
import {
  AttachSheet,
  ImageViewerModal,
  MessageActions,
  MessageBubble,
  OrderCard,
  PreviewModal,
  RateBuyerModal,
  ReportModal,
  dayLabel,
  presenceLabel,
  previewOf,
  useChatText,
} from '../components/chat/ChatParts';
import type { Socket } from 'socket.io-client';

type Job = { type: 'text'; content: string; replyToId: number | null } | { type: 'file'; file: LocalFile; caption: string; replyToId: number | null } | { type: 'qr' };

/**
 * Conversacion (chat mejorado): adjuntos (galeria, camara, PDF) con vista previa, QR de la tienda y comprobante
 * del pedido, estados ✓/✓✓ con iconos, escribiendo, presencia, citas, eliminar, cargar anteriores, ir al ultimo,
 * envio optimista con reintento y reconexion del socket compartido.
 */
export default function ChatThreadScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const c = useChatText();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const id = Number(route.params?.id);
  const user = useAuthStore((s) => s.user);
  const myId = user?.id;
  const [conv, setConv] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [presence, setPresence] = useState<Presence | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [actionsFor, setActionsFor] = useState<ChatMessage | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [preview, setPreview] = useState<LocalFile | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [incoming, setIncoming] = useState(0);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [rateBuyerOpen, setRateBuyerOpen] = useState(false);
  const [buyerReviewed, setBuyerReviewed] = useState(false);
  const [ratingBuyer, setRatingBuyer] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList<Row>>(null);
  const jobs = useRef(new Map<string, Job>());
  const proofMode = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typing = useMemo(() => createTypingEmitter((v) => socketRef.current?.emit('chat:typing', { conversationId: id, isTyping: v })), [id]);

  const load = useCallback(async () => {
    try {
      const data = await chatApi.page(id);
      const { messages: msgs, ...rest } = data;
      setConv(rest);
      setMessages((prev) => mergeMessages(prev, msgs ?? []));
      setHasMore(!!data.hasMore);
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Bolivianismos: sugerencias para iniciar (sin mensajes) y respuestas por inactividad.
  useEffect(() => {
    api.get('/chat/icebreakers', { params: { conversationId: id } }).then((r: any) => setIcebreakers(r.data.data?.icebreakers ?? [])).catch(() => {});
    api.get(`/chat/${id}/suggestions?inactivityMinutes=10`).then((r: any) => setSuggestions(r.data.data ?? null)).catch(() => {});
  }, [id]);

  const markRead = useCallback(() => {
    if (AppState.currentState === 'active') chatApi.read(id).catch(() => undefined);
  }, [id]);

  // Socket compartido: la sala del chat (escribiendo, presencia) y los eventos personales (mensajes, estados, borrados).
  useEffect(() => {
    let disposed = false;
    let s: Socket | null = null;
    const join = () => s?.emit('chat:join', { conversationId: id }, (p: Presence) => !disposed && setPresence(p));
    const onMessage = (p: any) => {
      if (p.conversationId !== id) return;
      setMessages((prev) => mergeMessages(prev, [p.message]));
      if (p.message.senderId !== myId) {
        setOtherTyping(false);
        setIncoming((n) => n + 1);
        markRead();
      }
    };
    const onStatus = (p: any) => p.conversationId === id && setMessages((prev) => applyStatus(prev, p, myId));
    const onDeleted = (p: any) => p.conversationId === id && setMessages((prev) => markDeleted(prev, p.messageId));
    const onTyping = (p: any) => {
      if (p.conversationId !== id || p.userId === myId) return;
      setOtherTyping(!!p.isTyping);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (p.isTyping) typingTimer.current = setTimeout(() => setOtherTyping(false), 6000);
    };
    const onPresence = (p: any) => p.conversationId === id && p.userId !== myId && setPresence({ visible: true, online: p.online, lastSeenAt: p.lastSeenAt });
    // Reconexion: volver a la sala y traer lo que llego mientras tanto.
    const onConnect = () => {
      join();
      load();
    };
    (async () => {
      s = await acquireChatSocket();
      if (disposed) {
        if (s) releaseChatSocket();
        return;
      }
      socketRef.current = s;
      if (!s) return;
      s.on('chat:message', onMessage);
      s.on('chat:status', onStatus);
      s.on('chat:deleted', onDeleted);
      s.on('chat:typing', onTyping);
      s.on('chat:presence', onPresence);
      s.on('connect', onConnect);
      if (s.connected) join();
    })();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && markRead());
    return () => {
      disposed = true;
      sub.remove();
      typing.stop();
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (s) {
        s.emit('chat:leave', { conversationId: id });
        s.off('chat:message', onMessage);
        s.off('chat:status', onStatus);
        s.off('chat:deleted', onDeleted);
        s.off('chat:typing', onTyping);
        s.off('chat:presence', onPresence);
        s.off('connect', onConnect);
        releaseChatSocket();
      }
      socketRef.current = null;
    };
  }, [id, myId, load, markRead, typing]);

  const optimistic = (clientId: string, base: Partial<ChatMessage>): ChatMessage => ({
    id: -Date.now(),
    conversationId: id,
    senderId: myId ?? 0,
    kind: 'TEXT',
    content: '',
    createdAt: new Date().toISOString(),
    clientId,
    localStatus: 'pending',
    ...base,
  });

  const run = async (clientId: string, job: Job) => {
    jobs.current.set(clientId, job);
    setMessages((prev) => prev.map((m) => (m.clientId === clientId && m.id < 0 ? { ...m, localStatus: 'pending' } : m)));
    try {
      const saved =
        job.type === 'text'
          ? await chatApi.sendText(id, { content: job.content, clientId, replyToId: job.replyToId })
          : job.type === 'file'
            ? await chatApi.sendFile(id, job.file, { clientId, caption: job.caption, replyToId: job.replyToId, orderId: conv?.orderId })
            : await chatApi.sendQr(id, clientId);
      jobs.current.delete(clientId);
      setMessages((prev) => mergeMessages(prev, [saved]));
    } catch (err) {
      setMessages((prev) => prev.map((m) => (m.clientId === clientId && m.id < 0 ? { ...m, localStatus: 'failed' } : m)));
      const msg = getErrorMessage(err);
      if (job.type === 'qr') Alert.alert(c('kind.PAYMENT_QR'), msg);
    }
  };

  const replyOf = (m: ChatMessage | null): ChatMessage['replyTo'] =>
    m ? { id: m.id, senderId: m.senderId, kind: m.kind, preview: previewOf(m, c), deleted: !!m.deleted, hasImage: !!m.attachment?.mime.startsWith('image/') } : null;

  const sendText = (content: string) => {
    const v = content.trim();
    if (!v || !conv?.canSend) return;
    const clientId = newClientId();
    typing.stop();
    setMessages((prev) => mergeMessages(prev, [optimistic(clientId, { content: v, replyTo: replyOf(replyTo) })]));
    run(clientId, { type: 'text', content: v, replyToId: replyTo?.id ?? null });
    setReplyTo(null);
  };

  const send = () => {
    sendText(text);
    setText('');
  };

  const sendFile = (caption: string) => {
    if (!preview) return;
    const file = preview;
    setPreview(null);
    const clientId = newClientId();
    setMessages((prev) =>
      mergeMessages(prev, [
        optimistic(clientId, {
          kind: file.kind,
          content: caption,
          orderId: conv?.orderId ?? null,
          localUri: file.isImage ? file.uri : undefined,
          replyTo: replyOf(replyTo),
          attachment: { id: 0, mime: file.type, size: file.size ?? 0, width: file.width ?? null, height: file.height ?? null, name: file.name, url: null, hidden: false },
        }),
      ]),
    );
    run(clientId, { type: 'file', file, caption, replyToId: replyTo?.id ?? null });
    setReplyTo(null);
  };

  const sendQr = () => {
    const clientId = newClientId();
    setMessages((prev) => mergeMessages(prev, [optimistic(clientId, { kind: 'PAYMENT_QR', content: '' })]));
    run(clientId, { type: 'qr' });
  };

  /**
   * El vendedor confirma o rechaza el comprobante de pago que mandó el comprador. Pide confirmación
   * (acción con efecto real sobre el pedido), llama al endpoint de pedidos del vendedor y actualiza el
   * pedido de la conversación en el momento, sin recargar la pantalla.
   */
  const updatePaymentStatus = async (status: 'VERIFIED' | 'REJECTED') => {
    if (!conv?.order || verifyingPayment) return;
    const orderId = conv.order.id;
    setVerifyingPayment(true);
    try {
      const updated = await chatApi.updatePaymentStatus(orderId, status);
      setConv((cv: any) => (cv?.order ? { ...cv, order: { ...cv.order, paymentStatus: updated.paymentStatus } } : cv));
    } catch (err) {
      Alert.alert(status === 'VERIFIED' ? c('order.markPaid') : c('order.rejectProof'), getErrorMessage(err));
    } finally {
      setVerifyingPayment(false);
    }
  };

  const confirmVerifyPayment = () => {
    Alert.alert(c('order.markPaid'), c('order.markPaidConfirm'), [
      { text: c('cancel'), style: 'cancel' },
      { text: c('order.markPaid'), onPress: () => updatePaymentStatus('VERIFIED') },
    ]);
  };

  const confirmRejectPayment = () => {
    Alert.alert(c('order.rejectProof'), c('order.rejectProofConfirm'), [
      { text: c('cancel'), style: 'cancel' },
      { text: c('order.rejectProof'), style: 'destructive', onPress: () => updatePaymentStatus('REJECTED') },
    ]);
  };

  /**
   * El vendedor califica al comprador del pedido. Un 409 significa que este pedido ya fue calificado
   * antes (p. ej. en otra sesión): se trata igual que un éxito, mostrando el estado en vez del botón.
   */
  const submitBuyerReview = async (body: { rating: number; comment?: string }) => {
    if (!conv?.order || ratingBuyer) return;
    setRatingBuyer(true);
    try {
      await chatApi.addBuyerReview(conv.order.id, body);
      setBuyerReviewed(true);
      setRateBuyerOpen(false);
    } catch (err) {
      if ((err as any)?.response?.status === 409) {
        setBuyerReviewed(true);
        setRateBuyerOpen(false);
      } else {
        Alert.alert(c('order.rateBuyerTitle'), getErrorMessage(err));
      }
    } finally {
      setRatingBuyer(false);
    }
  };

  const retry = (m: ChatMessage) => {
    const job = m.clientId ? jobs.current.get(m.clientId) : undefined;
    if (job && m.clientId) run(m.clientId, job);
  };

  const pick = async (src: 'gallery' | 'camera' | 'pdf') => {
    const kind = proofMode.current ? 'PAYMENT_PROOF' : undefined;
    proofMode.current = false;
    try {
      if (src === 'pdf') {
        const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf'], copyToCacheDirectory: true, multiple: false });
        const a = r.canceled ? null : r.assets?.[0];
        if (!a) return;
        if ((a.size ?? 0) > MAX_PDF_BYTES) return Alert.alert(c('pdf'), c('fileSizeError'));
        setPreview({ uri: a.uri, name: a.name ?? 'documento.pdf', type: 'application/pdf', size: a.size ?? undefined, isImage: false, kind: kind ?? 'FILE' });
        return;
      }
      // Compresion en el telefono: calidad 0.6 y sin EXIF (el servidor ademas lo quita y valida el tipo real).
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, exif: false, allowsEditing: false };
      let r: ImagePicker.ImagePickerResult;
      if (src === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return Alert.alert(c('camera'), c('cameraDenied'));
        r = await ImagePicker.launchCameraAsync(opts);
      } else {
        r = await ImagePicker.launchImageLibraryAsync(opts);
      }
      const a = r.canceled ? null : r.assets?.[0];
      if (!a) return;
      const type = a.mimeType && ['image/jpeg', 'image/png', 'image/webp'].includes(a.mimeType) ? a.mimeType : 'image/jpeg';
      if ((a.fileSize ?? 0) > MAX_IMAGE_BYTES) return Alert.alert(c('gallery'), c('fileSizeError'));
      const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
      setPreview({ uri: a.uri, name: `foto.${ext}`, type, size: a.fileSize ?? undefined, width: a.width, height: a.height, isImage: true, kind: kind ?? 'IMAGE' });
    } catch (err) {
      Alert.alert(c('attachTitle'), getErrorMessage(err));
    }
  };

  const remove = (m: ChatMessage, scope: 'me' | 'all') => {
    const go = () =>
      chatApi
        .remove(id, m.id, scope)
        .then(() => setMessages((prev) => (scope === 'me' ? prev.filter((x) => x.id !== m.id) : markDeleted(prev, m.id))))
        .catch((err) => Alert.alert(c('deleteForAll'), getErrorMessage(err)));
    if (scope === 'all') Alert.alert(c('deleteForAll'), c('deleteConfirmAll'), [{ text: c('cancel'), style: 'cancel' }, { text: c('deleteForAll'), style: 'destructive', onPress: go }]);
    else go();
  };

  const loadOlder = async () => {
    const oldest = messages.find((m) => m.id > 0);
    if (!oldest || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await chatApi.page(id, oldest.id);
      setMessages((prev) => mergeMessages(prev, data.messages ?? []));
      setHasMore(!!data.hasMore);
    } catch {}
    setLoadingMore(false);
  };

  const other = conv ? (conv.buyer?.id === myId ? conv.seller : conv.buyer) : null;
  const otherId = conv ? (conv.buyerId === myId ? conv.sellerId : conv.buyerId) : null;
  const otherName = other?.storeName ?? `${other?.firstName ?? ''} ${other?.lastName ?? ''}`.trim();
  const subtitle = otherTyping ? c('typing') : presenceLabel(presence, c);

  const toggleMute = async () => {
    setMenuOpen(false);
    try {
      await chatApi.mute(id, !conv.muted);
      setConv({ ...conv, muted: !conv.muted });
    } catch (err) {
      Alert.alert(c('mute'), getErrorMessage(err));
    }
  };

  const toggleBlock = () => {
    setMenuOpen(false);
    if (!otherId) return;
    if (conv.blockedByMe) {
      chatApi.unblock(otherId).then(() => setConv({ ...conv, blockedByMe: false, canSend: true })).catch((e) => Alert.alert(c('unblock'), getErrorMessage(e)));
      return;
    }
    Alert.alert(c('block'), c('blockConfirm', { name: otherName }), [
      { text: c('cancel'), style: 'cancel' },
      { text: c('block'), style: 'destructive', onPress: () => chatApi.block(otherId).then(() => setConv({ ...conv, blockedByMe: true, canSend: false })).catch((e) => Alert.alert(c('block'), getErrorMessage(e))) },
    ]);
  };

  const rows = useMemo(() => withDaySeparators(messages).reverse(), [messages]);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={Platform.OS === 'android' ? 40 : 0}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={c('back')} style={styles.iconBtn}>
          <ArrowLeft size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 4 }}>
          <Text style={styles.headerName} numberOfLines={1} accessibilityRole="header">
            {otherName}
          </Text>
          {subtitle ? (
            <Text style={[styles.headerProduct, otherTyping && { color: colors.primary }]} accessibilityLiveRegion="polite">
              {subtitle}
            </Text>
          ) : (
            conv?.product && (
              <View style={styles.row}>
                <Package size={12} color={colors.textSecondary} />
                <Text style={[styles.headerProduct, { marginLeft: 4 }]} numberOfLines={1}>
                  {conv.product.name}
                </Text>
              </View>
            )
          )}
        </View>
        {conv?.muted && (
          <View accessible accessibilityRole="image" accessibilityLabel={c('muted')}>
            <BellOff size={18} color={colors.textSecondary} />
          </View>
        )}
        <TouchableOpacity onPress={() => setMenuOpen((v) => !v)} accessibilityRole="button" accessibilityLabel={c('more')} style={styles.iconBtn}>
          <MoreVertical size={22} color={colors.text} />
        </TouchableOpacity>
      </View>
      {menuOpen && (
        <View style={styles.menu}>
          <Pressable onPress={toggleMute} accessibilityRole="button" style={styles.menuItem}>
            {conv?.muted ? <Bell size={18} color={colors.text} /> : <BellOff size={18} color={colors.text} />}
            <Text style={styles.menuText}>{conv?.muted ? c('unmute') : c('mute')}</Text>
          </Pressable>
          <Pressable onPress={toggleBlock} accessibilityRole="button" style={styles.menuItem}>
            <Ban size={18} color={colors.text} />
            <Text style={styles.menuText}>{conv?.blockedByMe ? c('unblockUser') : c('block')}</Text>
          </Pressable>
          <Pressable onPress={() => { setMenuOpen(false); setReportOpen(true); }} accessibilityRole="button" style={styles.menuItem}>
            <Flag size={18} color={colors.error} />
            <Text style={styles.menuText}>{c('report')}</Text>
          </Pressable>
        </View>
      )}
      {conv?.order && (
        <OrderCard
          order={conv.order}
          role={conv.role}
          canSend={!!conv.canSend}
          colors={colors}
          onSendQr={sendQr}
          onSendProof={() => {
            proofMode.current = true;
            setAttachOpen(true);
          }}
          onVerifyPayment={confirmVerifyPayment}
          onRejectPayment={confirmRejectPayment}
          verifyingPayment={verifyingPayment}
          onRateBuyer={() => setRateBuyerOpen(true)}
          buyerReviewed={buyerReviewed}
        />
      )}

      <FlatList
        ref={listRef}
        inverted
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={{ padding: 12, gap: 6 }}
        onScroll={(e) => {
          const bottom = e.nativeEvent.contentOffset.y < 120;
          setAtBottom(bottom);
          if (bottom) setIncoming(0);
        }}
        scrollEventThrottle={100}
        onEndReached={() => hasMore && loadOlder()}
        onEndReachedThreshold={0.2}
        ListFooterComponent={
          hasMore ? (
            <Pressable onPress={loadOlder} accessibilityRole="button" style={styles.loadMore}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{loadingMore ? '…' : c('loadMore')}</Text>
            </Pressable>
          ) : null
        }
        ListHeaderComponent={otherTyping ? <Text style={styles.typing}>{c('typing')}</Text> : null}
        renderItem={({ item }) =>
          item.type === 'day' ? (
            <View style={styles.dayWrap}>
              <Text style={styles.day}>{dayLabel(item.date, c)}</Text>
            </View>
          ) : (
            <MessageBubble msg={item.msg} myId={myId} otherName={otherName} colors={colors} onLongPress={setActionsFor} onRetry={retry} onOpenImage={setViewer} />
          )
        }
      />
      {!atBottom && (
        <Pressable
          onPress={() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
            setIncoming(0);
          }}
          accessibilityRole="button"
          accessibilityLabel={c('goToLatest')}
          style={styles.fab}
        >
          <ArrowDown size={20} color={colors.primary} />
          {incoming > 0 && <Text style={styles.fabBadge}>{incoming}</Text>}
        </Pressable>
      )}

      {messages.length === 0 && icebreakers.length > 0 && conv?.canSend && (
        <View style={styles.suggestBox}>
          <Text style={styles.suggestTitle}>{c('startSuggestions')}</Text>
          <View style={styles.suggestRow}>
            {icebreakers.slice(0, 4).map((p) => (
              <TouchableOpacity key={p} style={styles.suggestChip} onPress={() => sendText(p)}>
                <Text style={styles.suggestChipText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      {suggestions?.inactive && messages.length > 0 && conv?.canSend && (
        <View style={styles.suggestBox}>
          <View style={styles.row}>
            <Clock size={12} color={colors.textSecondary} />
            <Text style={[styles.suggestTitle, { marginLeft: 4 }]}>{c('inactiveSuggestions')}</Text>
          </View>
          <View style={styles.suggestRow}>
            {[...(suggestions.followUps ?? []).slice(0, 2), ...(suggestions.noSaleReplies ?? []).slice(0, 2)].map((p: string) => (
              <TouchableOpacity key={p} style={styles.suggestChip} onPress={() => sendText(p)}>
                <Text style={styles.suggestChipText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {replyTo && (
        <View style={styles.replyBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.replyName}>{c('replyingTo', { name: replyTo.senderId === myId ? c('you') : otherName })}</Text>
            <Text style={styles.headerProduct} numberOfLines={1}>
              {previewOf(replyTo, c)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)} accessibilityRole="button" accessibilityLabel={c('cancelReply')} style={styles.iconBtn}>
            <X size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {conv && !conv.canSend ? (
        <View style={styles.inputBar}>
          <Text style={[styles.headerProduct, { flex: 1, textAlign: 'center', paddingVertical: 10 }]}>{conv.blockedByMe ? c('blockedNotice') : c('cannotSend')}</Text>
        </View>
      ) : (
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn} onPress={() => setAttachOpen(true)} accessibilityRole="button" accessibilityLabel={c('attach')}>
            <Paperclip size={20} color={colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={t('mobile.chatThread.inputPlaceholder')}
            accessibilityLabel={t('mobile.chatThread.inputPlaceholder')}
            value={text}
            onChangeText={(v) => {
              setText(v);
              typing.onInput(v);
            }}
            placeholderTextColor={colors.textSecondary}
            maxLength={2000}
            multiline
          />
          <TouchableOpacity style={[styles.sendBtn, !text.trim() && { opacity: 0.5 }]} onPress={send} disabled={!text.trim()} accessibilityRole="button" accessibilityLabel={c('send')}>
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <AttachSheet visible={attachOpen} colors={colors} onClose={() => setAttachOpen(false)} onPick={pick} />
      <PreviewModal file={preview} colors={colors} onCancel={() => setPreview(null)} onSend={sendFile} />
      <ImageViewerModal uri={viewer} onClose={() => setViewer(null)} />
      <RateBuyerModal visible={rateBuyerOpen} colors={colors} busy={ratingBuyer} onClose={() => setRateBuyerOpen(false)} onSend={submitBuyerReview} />
      <MessageActions msg={actionsFor} myId={myId} colors={colors} onClose={() => setActionsFor(null)} onReply={setReplyTo} onDelete={remove} />
      <ReportModal
        visible={reportOpen}
        colors={colors}
        onClose={() => setReportOpen(false)}
        onSend={(body) =>
          chatApi.report(id, body).then(() => {
            Alert.alert(c('report'), c('reportDone'));
            if (body.block) setConv((cv: any) => ({ ...cv, blockedByMe: true, canSend: false }));
          })
        }
      />
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    row: { flexDirection: 'row', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 6, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerName: { fontSize: 15, fontWeight: '700', color: colors.text },
    headerProduct: { fontSize: 12, color: colors.textSecondary },
    menu: { position: 'absolute', top: 56, right: 8, zIndex: 10, elevation: 6, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 4, minWidth: 210 },
    menuItem: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 14 },
    menuText: { marginLeft: 10, fontSize: 14, color: colors.text },
    dayWrap: { alignItems: 'center', marginVertical: 6 },
    day: { fontSize: 11, color: colors.textSecondary, backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
    typing: { fontSize: 12, color: colors.textSecondary, paddingHorizontal: 4, paddingVertical: 2 },
    loadMore: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
    fab: { position: 'absolute', right: 16, bottom: 86, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', elevation: 4 },
    fabBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.error, color: '#fff', fontSize: 11, fontWeight: '800', textAlign: 'center', overflow: 'hidden' },
    replyBar: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, borderLeftWidth: 3, borderLeftColor: colors.primary },
    replyName: { fontSize: 12, fontWeight: '700', color: colors.primary },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
    input: { flex: 1, backgroundColor: colors.background, borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100, color: colors.text },
    attachBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryDark ?? colors.primary, alignItems: 'center', justifyContent: 'center' },
    suggestBox: { paddingHorizontal: 12, paddingBottom: 6, backgroundColor: colors.background },
    suggestTitle: { fontSize: 12, color: colors.textSecondary, fontWeight: '700', marginBottom: 5 },
    suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    suggestChip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
    suggestChipText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  });
