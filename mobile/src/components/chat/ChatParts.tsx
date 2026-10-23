import React, { memo, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Reply,
  Trash2,
  Ban,
  FileText,
  QrCode,
  Receipt,
  RotateCw,
  X,
  Image as ImageIcon,
  Camera,
  ChevronDown,
  ChevronUp,
  Upload,
  Star,
} from 'lucide-react-native';
import '../../i18n/chat';
import { canDeleteForAll, fileUrl, formatBytes, relativeDay, statusOf, type ChatMessage, type MsgStatus, type OrderSummary } from '../../services/chat';
import { resolveImageUrl } from '../../services/api';
import type { AppColors } from '../../theme/ThemeContext';
import { useMoney } from '../../services/money';

/** Chat mejorado en la app: piezas visuales con el mismo estilo de burbujas de antes. Sin emojis: iconos de lucide. */

export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function useChatText() {
  const { t } = useTranslation();
  return (key: string, vars?: Record<string, unknown>) => t(`chatx.${key}`, vars as any) as string;
}

export function dayLabel(iso: string, c: (k: string) => string): string {
  const rel = relativeDay(iso);
  if (rel) return c(rel);
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
}

export function listTime(iso: string, c: (k: string) => string): string {
  const rel = relativeDay(iso);
  if (rel === 'today') return timeOf(iso);
  if (rel === 'yesterday') return c('yesterday');
  return new Date(iso).toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

export function systemText(meta: ChatMessage['meta'], fallback: string, c: (k: string, v?: Record<string, unknown>) => string) {
  if (!meta?.event) return fallback;
  const status = meta.status ? c(`order.status.${meta.status}`) : '';
  const txt = c(`system.${meta.event}`, { id: meta.orderId ?? '', status, defaultValue: '' });
  return txt || fallback;
}

export function previewOf(m: { kind?: string; content?: string; deleted?: boolean; meta?: ChatMessage['meta'] }, c: (k: string, v?: Record<string, unknown>) => string): string {
  if (m.deleted) return c('deleted');
  const kind = m.kind ?? 'TEXT';
  if (kind === 'TEXT') return m.content ?? '';
  if (kind === 'SYSTEM') return systemText(m.meta, m.content ?? '', c);
  const caption = (m.content ?? '').trim();
  const label = c(`kind.${kind}`);
  return caption && (kind === 'IMAGE' || kind === 'FILE') ? `${label}: ${caption}` : label;
}

export function presenceLabel(p: { visible: boolean; online: boolean; lastSeenAt: string | null } | null, c: (k: string, v?: Record<string, unknown>) => string): string | null {
  if (!p?.visible) return null;
  if (p.online) return c('online');
  if (!p.lastSeenAt) return null;
  const rel = relativeDay(p.lastSeenAt);
  if (rel === 'today') return c('lastSeenToday', { time: timeOf(p.lastSeenAt) });
  if (rel === 'yesterday') return c('lastSeenYesterday', { time: timeOf(p.lastSeenAt) });
  return c('lastSeenDate', { date: new Date(p.lastSeenAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' }) });
}

export function Ticks({ status, color, readColor }: { status: MsgStatus; color: string; readColor: string }) {
  const c = useChatText();
  const label = c(`status.${status}`);
  const size = 14;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} testID={`ticks-${status}`} style={{ marginLeft: 3 }}>
      {status === 'pending' && <Clock size={size} color={color} />}
      {status === 'failed' && <AlertCircle size={size} color="#FCA5A5" />}
      {status === 'sent' && <Check size={size} color={color} />}
      {status === 'delivered' && <CheckCheck size={size} color={color} />}
      {status === 'read' && <CheckCheck size={size} color={readColor} />}
    </View>
  );
}

interface BubbleProps {
  msg: ChatMessage;
  myId: number | undefined;
  otherName: string;
  colors: AppColors;
  onLongPress?: (m: ChatMessage) => void;
  onRetry?: (m: ChatMessage) => void;
  onOpenImage?: (uri: string) => void;
}

function BubbleBase({ msg: m, myId, otherName, colors, onLongPress, onRetry, onOpenImage }: BubbleProps) {
  const c = useChatText();
  const s = stylesFor(colors);
  const mine = m.senderId === myId;

  if (m.kind === 'SYSTEM') {
    return (
      <View style={s.systemWrap}>
        <Text style={s.systemText}>
          {systemText(m.meta, m.content, c)} · {timeOf(m.createdAt)}
        </Text>
      </View>
    );
  }

  const status = statusOf(m, myId);
  const fg = mine ? '#fff' : colors.text;
  const att = m.attachment;
  const isImage = !!att && att.mime.startsWith('image/');
  const imgUri = m.localUri ?? fileUrl(att?.url);
  const qrUri = m.kind === 'PAYMENT_QR' && m.meta?.qrUrl ? resolveImageUrl(m.meta.qrUrl) : undefined;
  const ratio = att?.width && att?.height ? att.width / att.height : 4 / 3;

  return (
    <Pressable
      onLongPress={m.id > 0 && onLongPress ? () => onLongPress(m) : undefined}
      delayLongPress={350}
      accessibilityHint={m.id > 0 && onLongPress ? c('messageActions') : undefined}
      style={[s.bubble, mine ? s.bubbleMine : s.bubbleOther, m.localStatus === 'pending' && { opacity: 0.85 }]}
    >
      {m.replyTo && !m.deleted && (
        <View style={[s.quote, { borderLeftColor: mine ? '#fff' : colors.primary }]}>
          <Text style={[s.quoteName, { color: fg }]}>{m.replyTo.senderId === myId ? c('you') : otherName}</Text>
          <Text style={[s.quoteText, { color: fg }]} numberOfLines={1}>
            {m.replyTo.deleted ? c('deleted') : m.replyTo.preview || c(`kind.${m.replyTo.kind}`)}
          </Text>
        </View>
      )}
      {m.deleted ? (
        <View style={s.row}>
          <Ban size={14} color={fg} />
          <Text style={[s.text, { color: fg, fontStyle: 'italic', marginLeft: 4 }]}>{c('deleted')}</Text>
        </View>
      ) : (
        <>
          {m.kind === 'PAYMENT_PROOF' && (
            <View style={[s.row, { marginBottom: 4 }]}>
              <Receipt size={14} color={fg} />
              <Text style={[s.label, { color: fg }]}>{m.orderId ? c('proofFor', { id: m.orderId }) : c('kind.PAYMENT_PROOF')}</Text>
            </View>
          )}
          {m.kind === 'PAYMENT_QR' && (
            <View style={{ marginBottom: 4 }}>
              <View style={[s.row, { marginBottom: 6 }]}>
                <QrCode size={14} color={fg} />
                <Text style={[s.label, { color: fg }]}>{c('qrTitle')}</Text>
              </View>
              {qrUri && (
                <Pressable onPress={() => onOpenImage?.(qrUri)} accessibilityRole="imagebutton" accessibilityLabel={c('qrTitle')} style={s.qrBox}>
                  <Image source={{ uri: qrUri }} style={{ width: 180, height: 180 }} resizeMode="contain" />
                </Pressable>
              )}
              <Text style={[s.hint, { color: fg }]}>{c('qrHint')}</Text>
            </View>
          )}
          {isImage && imgUri && (
            <Pressable onPress={() => onOpenImage?.(imgUri)} accessibilityRole="imagebutton" accessibilityLabel={m.content || c('openImage')} style={{ marginBottom: m.content ? 6 : 0 }}>
              <Image source={{ uri: imgUri }} style={[s.image, { aspectRatio: ratio }]} resizeMode="cover" />
            </Pressable>
          )}
          {att && !isImage && (
            <Pressable
              onPress={() => {
                const u = fileUrl(att.url);
                if (u) Linking.openURL(u).catch(() => undefined);
              }}
              accessibilityRole="link"
              accessibilityLabel={`${att.name ?? c('kind.FILE')}, ${c('download')}`}
              style={s.fileBox}
            >
              <FileText size={22} color={fg} />
              <View style={{ marginLeft: 8, flexShrink: 1 }}>
                <Text style={[s.fileName, { color: fg }]} numberOfLines={1}>
                  {att.name ?? c('kind.FILE')}
                </Text>
                <Text style={[s.hint, { color: fg }]}>PDF · {formatBytes(att.size)}</Text>
              </View>
            </Pressable>
          )}
          {m.kind !== 'PAYMENT_QR' && !!m.content && <Text style={[s.text, { color: fg }]}>{m.content}</Text>}
        </>
      )}
      <View style={s.meta}>
        <Text style={[s.time, { color: mine ? 'rgba(255,255,255,0.85)' : colors.textSecondary }]}>{timeOf(m.createdAt)}</Text>
        {status && <Ticks status={status} color="rgba(255,255,255,0.9)" readColor="#A7F3D0" />}
      </View>
      {m.localStatus === 'failed' && onRetry && (
        <Pressable onPress={() => onRetry(m)} accessibilityRole="button" accessibilityLabel={c('retry')} style={s.retry}>
          <RotateCw size={14} color="#fff" />
          <Text style={s.retryText}>{c('retry')}</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

export const MessageBubble = memo(BubbleBase);

/** Menu de acciones de un mensaje (pulsacion larga). */
export function MessageActions({ msg, myId, colors, onClose, onReply, onDelete }: { msg: ChatMessage | null; myId?: number; colors: AppColors; onClose: () => void; onReply: (m: ChatMessage) => void; onDelete: (m: ChatMessage, scope: 'me' | 'all') => void }) {
  const c = useChatText();
  const s = stylesFor(colors);
  if (!msg) return null;
  const item = (icon: React.ReactNode, label: string, fn: () => void) => (
    <Pressable key={label} onPress={() => { onClose(); fn(); }} accessibilityRole="button" style={s.sheetItem}>
      {icon}
      <Text style={s.sheetText}>{label}</Text>
    </Pressable>
  );
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel={c('close')}>
        <View style={s.sheet} accessibilityViewIsModal>
          <Text style={s.sheetTitle}>{c('messageActions')}</Text>
          {!msg.deleted && item(<Reply size={18} color={colors.primary} />, c('replyTo'), () => onReply(msg))}
          {item(<Trash2 size={18} color={colors.text} />, c('deleteForMe'), () => onDelete(msg, 'me'))}
          {canDeleteForAll(msg, myId) && item(<Trash2 size={18} color={colors.error} />, c('deleteForAll'), () => onDelete(msg, 'all'))}
        </View>
      </Pressable>
    </Modal>
  );
}

/** Tarjeta fija del pedido arriba del chat. */
export function OrderCard({
  order,
  role,
  canSend,
  colors,
  onSendQr,
  onSendProof,
  onVerifyPayment,
  onRejectPayment,
  verifyingPayment,
  onRateBuyer,
  buyerReviewed,
}: {
  order: OrderSummary;
  role: 'BUYER' | 'SELLER';
  canSend: boolean;
  colors: AppColors;
  onSendQr: () => void;
  onSendProof: () => void;
  /** Vendedor confirma que recibió el pago tras revisar el comprobante. Solo tiene efecto con paymentStatus PROOF_SUBMITTED. */
  onVerifyPayment?: () => void;
  /** Vendedor rechaza el comprobante (p. ej. monto o datos incorrectos). */
  onRejectPayment?: () => void;
  verifyingPayment?: boolean;
  /** Vendedor abre el modal para calificar al comprador. Solo tiene efecto con order DELIVERED + paymentStatus VERIFIED. */
  onRateBuyer?: () => void;
  /** true si esta orden ya fue calificada por el vendedor (lo sabe la pantalla tras el POST exitoso o un 409). */
  buyerReviewed?: boolean;
}) {
  const c = useChatText();
  const s = stylesFor(colors);
  const [open, setOpen] = useState(false);
  const money = useMoney(); // monto del pedido en la moneda elegida, con su denominación
  const first = order.items.slice(0, 2).map((i) => `${i.quantity}× ${i.name}`).join(', ');
  const rest = order.items.length - 2;
  // El vendedor solo actúa sobre un comprobante recién enviado; ya verificado, se muestra como estado.
  const showVerifyActions = role === 'SELLER' && order.paymentStatus === 'PROOF_SUBMITTED' && !!(onVerifyPayment || onRejectPayment);
  const showConfirmedBadge = role === 'SELLER' && order.paymentStatus === 'VERIFIED';
  // El vendedor califica al comprador una vez entregado el pedido y verificado el pago (el backend valida también la ventana de días).
  const showRateBuyer = role === 'SELLER' && order.status === 'DELIVERED' && order.paymentStatus === 'VERIFIED' && !!onRateBuyer;
  return (
    <View style={s.orderCard} accessibilityLabel={c('order.title', { id: order.id })}>
      <View style={s.row}>
        <Receipt size={18} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={s.orderTitle} numberOfLines={1}>
            {c('order.title', { id: order.id })} · {money(order.total)}
          </Text>
          <Text style={s.orderItems} numberOfLines={1}>
            {first}
            {rest > 0 ? ` ${c('order.more', { count: rest })}` : ''}
          </Text>
        </View>
        <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={open ? c('order.collapse') : c('order.expand')} style={s.iconBtn}>
          {open ? <ChevronUp size={20} color={colors.text} /> : <ChevronDown size={20} color={colors.text} />}
        </Pressable>
      </View>
      <View style={[s.row, { flexWrap: 'wrap', marginTop: 4 }]}>
        <Text style={s.chip}>{c(`order.status.${order.status}`)}</Text>
        <Text style={s.chip}>{c(`order.payment.${order.paymentStatus}`)}</Text>
        <View style={{ flex: 1 }} />
        {showVerifyActions ? (
          <View style={[s.row, { gap: 8 }]}>
            <Pressable
              onPress={onRejectPayment}
              disabled={verifyingPayment || !onRejectPayment}
              accessibilityRole="button"
              accessibilityState={{ disabled: verifyingPayment || !onRejectPayment }}
              accessibilityLabel={c('order.rejectProof')}
              style={[s.ctaSmall, { backgroundColor: colors.error }, (verifyingPayment || !onRejectPayment) && { opacity: 0.5 }]}
            >
              <X size={16} color="#fff" />
              <Text style={s.ctaText}>{c('order.rejectProof')}</Text>
            </Pressable>
            <Pressable
              onPress={onVerifyPayment}
              disabled={verifyingPayment || !onVerifyPayment}
              accessibilityRole="button"
              accessibilityState={{ disabled: verifyingPayment || !onVerifyPayment }}
              accessibilityLabel={c('order.markPaid')}
              style={[s.ctaSmall, { backgroundColor: colors.primaryDark }, (verifyingPayment || !onVerifyPayment) && { opacity: 0.5 }]}
            >
              <Check size={16} color="#fff" />
              <Text style={s.ctaText}>{c('order.markPaid')}</Text>
            </Pressable>
          </View>
        ) : showConfirmedBadge ? (
          <View style={[s.row, s.confirmedBadge]} accessibilityRole="text" accessibilityLabel={c('order.paymentConfirmed')}>
            <Check size={14} color={colors.primary} />
            <Text style={s.confirmedText}>{c('order.paymentConfirmed')}</Text>
          </View>
        ) : role === 'SELLER' ? (
          <Pressable onPress={onSendQr} disabled={!canSend} accessibilityRole="button" accessibilityState={{ disabled: !canSend }} style={[s.cta, !canSend && { opacity: 0.5 }]}>
            <QrCode size={16} color="#fff" />
            <Text style={s.ctaText}>{c('order.sendQr')}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onSendProof} disabled={!canSend} accessibilityRole="button" accessibilityState={{ disabled: !canSend }} style={[s.cta, !canSend && { opacity: 0.5 }]}>
            <Upload size={16} color="#fff" />
            <Text style={s.ctaText}>{c('order.sendProof')}</Text>
          </Pressable>
        )}
      </View>
      {showRateBuyer && (
        <View style={[s.row, { marginTop: 6 }]}>
          {buyerReviewed ? (
            <View style={[s.row, s.confirmedBadge]} accessibilityRole="text" accessibilityLabel={c('order.buyerReviewed')}>
              <Check size={14} color={colors.primary} />
              <Text style={s.confirmedText}>{c('order.buyerReviewed')}</Text>
            </View>
          ) : (
            <Pressable onPress={onRateBuyer} accessibilityRole="button" accessibilityLabel={c('order.rateBuyer')} style={[s.cta, { backgroundColor: colors.primaryDark }]}>
              <Star size={16} color="#fff" />
              <Text style={s.ctaText}>{c('order.rateBuyer')}</Text>
            </Pressable>
          )}
        </View>
      )}
      {open &&
        order.items.map((it, i) => (
          <View key={`${it.productId ?? 'x'}-${i}`} style={[s.row, { marginTop: 6 }]}>
            {it.image ? <Image source={{ uri: resolveImageUrl(it.image) }} style={s.thumb} /> : <View style={[s.thumb, { backgroundColor: colors.border }]} />}
            <Text style={[s.orderItems, { flex: 1, marginLeft: 8 }]}>
              {it.quantity}× {it.name}
            </Text>
            <Text style={s.orderItems}>{money(it.unitPrice * it.quantity)}</Text>
          </View>
        ))}
    </View>
  );
}

/** Hoja para elegir el origen del adjunto. */
export function AttachSheet({ visible, colors, onClose, onPick }: { visible: boolean; colors: AppColors; onClose: () => void; onPick: (src: 'gallery' | 'camera' | 'pdf') => void }) {
  const c = useChatText();
  const s = stylesFor(colors);
  const item = (src: 'gallery' | 'camera' | 'pdf', icon: React.ReactNode, label: string) => (
    <Pressable key={src} onPress={() => { onClose(); onPick(src); }} accessibilityRole="button" style={s.sheetItem}>
      {icon}
      <Text style={s.sheetText}>{label}</Text>
    </Pressable>
  );
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <View style={s.sheet} accessibilityViewIsModal>
          <Text style={s.sheetTitle}>{c('attachTitle')}</Text>
          {item('gallery', <ImageIcon size={20} color={colors.primary} />, c('gallery'))}
          {item('camera', <Camera size={20} color={colors.primary} />, c('camera'))}
          {item('pdf', <FileText size={20} color={colors.primary} />, c('pdf'))}
        </View>
      </Pressable>
    </Modal>
  );
}

/** Vista previa antes de enviar, con texto opcional. */
export function PreviewModal({ file, colors, onCancel, onSend }: { file: { uri: string; name: string; isImage: boolean; size?: number; kind: string } | null; colors: AppColors; onCancel: () => void; onSend: (caption: string) => void }) {
  const c = useChatText();
  const s = stylesFor(colors);
  const [caption, setCaption] = useState('');
  useEffect(() => setCaption(''), [file?.uri]);
  return (
    <Modal visible={!!file} animationType="slide" onRequestClose={onCancel}>
      <View style={[s.previewWrap, { backgroundColor: colors.background }]}>
        <Text style={s.previewTitle} accessibilityRole="header">
          {file?.kind === 'PAYMENT_PROOF' ? c('previewProofTitle') : c('previewTitle')}
        </Text>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {file?.isImage ? (
            <Image source={{ uri: file.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityIgnoresInvertColors />
          ) : (
            <View style={s.fileBoxPreview}>
              <FileText size={28} color={colors.primary} />
              <View style={{ marginLeft: 10, flexShrink: 1 }}>
                <Text style={[s.fileName, { color: colors.text }]} numberOfLines={2}>
                  {file?.name}
                </Text>
                {!!file?.size && <Text style={[s.hint, { color: colors.textSecondary }]}>{formatBytes(file.size)}</Text>}
              </View>
            </View>
          )}
        </View>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder={c('caption')}
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={c('caption')}
          maxLength={1000}
          style={s.captionInput}
        />
        <View style={[s.row, { gap: 10, marginTop: 10 }]}>
          <Pressable onPress={onCancel} accessibilityRole="button" style={[s.btn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{c('cancel')}</Text>
          </Pressable>
          <Pressable onPress={() => onSend(caption.trim())} accessibilityRole="button" style={[s.btn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{c('send')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function ImageViewerModal({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  const c = useChatText();
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center' }}>
        {uri && <Image source={{ uri }} style={{ width: '100%', height: '85%' }} resizeMode="contain" accessibilityLabel={c('imageViewer')} />}
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={c('close')} style={{ position: 'absolute', top: 40, right: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <X size={24} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

/** Ajustes: ocultar ultima vez y lista de bloqueados. */
export function SettingsModal({ visible, colors, onClose, load, save, blocks, unblock }: {
  visible: boolean;
  colors: AppColors;
  onClose: () => void;
  load: () => Promise<{ hideLastSeen: boolean }>;
  save: (v: boolean) => Promise<unknown>;
  blocks: () => Promise<Array<{ userId: number; user: { firstName: string; lastName: string; storeName: string | null } | null }>>;
  unblock: (userId: number) => Promise<unknown>;
}) {
  const c = useChatText();
  const s = stylesFor(colors);
  const [hide, setHide] = useState(false);
  const [list, setList] = useState<Awaited<ReturnType<typeof blocks>>>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    Promise.all([load().then((r) => setHide(r.hideLastSeen)), blocks().then(setList)]).catch(() => undefined).finally(() => setLoading(false));
  }, [visible, load, blocks]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => undefined} accessibilityViewIsModal>
          <Text style={s.sheetTitle} accessibilityRole="header">{c('settingsTitle')}</Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : null}
          <View style={[s.row, { minHeight: 48 }]}>
            <Text style={[s.sheetText, { flex: 1, marginLeft: 0 }]}>{c('hideLastSeen')}</Text>
            <Switch
              value={hide}
              accessibilityLabel={c('hideLastSeen')}
              onValueChange={(v) => {
                setHide(v);
                save(v).catch(() => setHide(!v));
              }}
            />
          </View>
          <Text style={s.hintSecondary}>{c('hideLastSeenHelp')}</Text>
          <Text style={[s.sheetTitle, { marginTop: 12 }]}>{c('blockedTitle')}</Text>
          <ScrollView style={{ maxHeight: 220 }}>
            {list.length === 0 ? (
              <Text style={s.hintSecondary}>{c('noBlocked')}</Text>
            ) : (
              list.map((b) => (
                <View key={b.userId} style={[s.row, { minHeight: 48 }]}>
                  <Text style={[s.sheetText, { flex: 1, marginLeft: 0 }]}>{b.user?.storeName || `${b.user?.firstName ?? ''} ${b.user?.lastName ?? ''}`.trim() || `#${b.userId}`}</Text>
                  <Pressable onPress={() => unblock(b.userId).then(() => setList((x) => x.filter((y) => y.userId !== b.userId))).catch(() => undefined)} accessibilityRole="button" style={s.linkBtn}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>{c('unblock')}</Text>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
          <Pressable onPress={onClose} accessibilityRole="button" style={[s.btn, { backgroundColor: colors.primary, marginTop: 12 }]}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{c('close')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const REASONS = ['SPAM', 'FRAUD', 'ABUSE', 'INAPPROPRIATE', 'OTHER'] as const;

export function ReportModal({ visible, colors, onClose, onSend }: { visible: boolean; colors: AppColors; onClose: () => void; onSend: (body: { reason: string; details?: string; block: boolean }) => Promise<unknown> }) {
  const c = useChatText();
  const s = stylesFor(colors);
  const [reason, setReason] = useState<string>('SPAM');
  const [details, setDetails] = useState('');
  const [block, setBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => undefined} accessibilityViewIsModal>
          <Text style={s.sheetTitle} accessibilityRole="header">{c('reportTitle')}</Text>
          {REASONS.map((r) => (
            <Pressable key={r} onPress={() => setReason(r)} accessibilityRole="radio" accessibilityState={{ checked: reason === r }} style={[s.sheetItem, reason === r && { backgroundColor: colors.background }]}>
              <View style={[s.radio, { borderColor: colors.primary }]}>{reason === r && <View style={[s.radioDot, { backgroundColor: colors.primary }]} />}</View>
              <Text style={s.sheetText}>{c(`reason.${r}`)}</Text>
            </Pressable>
          ))}
          <TextInput value={details} onChangeText={setDetails} placeholder={c('reportDetails')} accessibilityLabel={c('reportDetails')} placeholderTextColor={colors.textSecondary} maxLength={500} multiline style={[s.captionInput, { marginTop: 8 }]} />
          <View style={[s.row, { minHeight: 48 }]}>
            <Text style={[s.sheetText, { flex: 1, marginLeft: 0 }]}>{c('reportAlsoBlock')}</Text>
            <Switch value={block} onValueChange={setBlock} accessibilityLabel={c('reportAlsoBlock')} />
          </View>
          <View style={[s.row, { gap: 10, marginTop: 8 }]}>
            <Pressable onPress={onClose} accessibilityRole="button" style={[s.btn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{c('cancel')}</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => {
                setBusy(true);
                onSend({ reason, details: details.trim() || undefined, block })
                  .then(() => {
                    setDetails('');
                    onClose();
                  })
                  .catch(() => undefined)
                  .finally(() => setBusy(false));
              }}
              accessibilityRole="button"
              style={[s.btn, { backgroundColor: colors.error }]}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{c('reportSend')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Estrellas 1..5 accesibles: cada una es un botón de 44 px con etiqueta «N de 5» y estado seleccionado;
 * el estado no depende solo del color (estrella rellena o vacía).
 */
function StarPicker({ value, onChange, color, offColor, label, optionLabel }: { value: number; onChange: (n: number) => void; color: string; offColor: string; label: string; optionLabel: (n: number) => string }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value;
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            accessibilityRole="radio"
            accessibilityLabel={optionLabel(n)}
            accessibilityState={{ selected: value === n }}
            style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Star size={28} color={on ? color : offColor} fill={on ? color : 'transparent'} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Modal para que el vendedor califique al comprador (1-5 estrellas + comentario opcional) tras una entrega verificada. */
export function RateBuyerModal({
  visible,
  colors,
  busy,
  onClose,
  onSend,
}: {
  visible: boolean;
  colors: AppColors;
  busy?: boolean;
  onClose: () => void;
  onSend: (body: { rating: number; comment?: string }) => void;
}) {
  const c = useChatText();
  const s = stylesFor(colors);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  useEffect(() => {
    if (visible) {
      setRating(0);
      setComment('');
    }
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => undefined} accessibilityViewIsModal>
          <Text style={s.sheetTitle} accessibilityRole="header">
            {c('order.rateBuyerTitle')}
          </Text>
          <StarPicker value={rating} onChange={setRating} color={colors.warning} offColor={colors.textSecondary} label={c('order.rateBuyerStars')} optionLabel={(n) => c('order.rateBuyerStarsOption', { n })} />
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={c('order.rateBuyerComment')}
            accessibilityLabel={c('order.rateBuyerComment')}
            placeholderTextColor={colors.textSecondary}
            maxLength={500}
            multiline
            style={[s.captionInput, { marginTop: 10 }]}
          />
          <View style={[s.row, { gap: 10, marginTop: 12 }]}>
            <Pressable onPress={onClose} accessibilityRole="button" style={[s.btn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{c('cancel')}</Text>
            </Pressable>
            <Pressable
              disabled={busy || rating < 1}
              onPress={() => onSend({ rating, comment: comment.trim() || undefined })}
              accessibilityRole="button"
              accessibilityLabel={c('order.rateBuyerSend')}
              accessibilityState={{ disabled: busy || rating < 1 }}
              style={[s.btn, { backgroundColor: colors.primaryDark }, (busy || rating < 1) && { opacity: 0.5 }]}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{c('order.rateBuyerSend')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Estilos cacheados por paleta (claro/oscuro): no se recrean en cada burbuja. */
const styleCache = new WeakMap<AppColors, ReturnType<typeof makeStyles>>();
function stylesFor(colors: AppColors) {
  let st = styleCache.get(colors);
  if (!st) {
    st = makeStyles(colors);
    styleCache.set(colors, st);
  }
  return st;
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center' },
    bubble: { maxWidth: '80%', borderRadius: 14, padding: 10, marginVertical: 2 },
    bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.primaryDark },
    bubbleOther: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    text: { fontSize: 14, lineHeight: 19 },
    label: { fontSize: 12, fontWeight: '700', marginLeft: 4 },
    hint: { fontSize: 11, marginTop: 4, opacity: 0.9 },
    hintSecondary: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    meta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 3 },
    time: { fontSize: 10 },
    quote: { borderLeftWidth: 3, paddingLeft: 6, marginBottom: 6 },
    quoteName: { fontSize: 11, fontWeight: '700' },
    quoteText: { fontSize: 12, opacity: 0.9 },
    image: { width: 220, maxWidth: '100%', borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.08)' },
    qrBox: { backgroundColor: '#fff', borderRadius: 10, padding: 8, alignSelf: 'flex-start' },
    fileBox: { flexDirection: 'row', alignItems: 'center', padding: 8, minHeight: 44, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.08)', marginBottom: 4 },
    fileBoxPreview: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    fileName: { fontSize: 13, fontWeight: '700' },
    retry: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 6, minHeight: 36, paddingHorizontal: 10, borderRadius: 18, borderWidth: 1, borderColor: '#fff' },
    retryText: { color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 4 },
    systemWrap: { alignItems: 'center', marginVertical: 6 },
    systemText: { fontSize: 12, color: colors.text, backgroundColor: colors.border, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, textAlign: 'center', maxWidth: '85%' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: 28 },
    sheetTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 8 },
    sheetItem: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 6, borderRadius: 10 },
    sheetText: { fontSize: 15, color: colors.text, marginLeft: 12 },
    orderCard: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 12, paddingVertical: 8 },
    orderTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
    orderItems: { fontSize: 12, color: colors.textSecondary },
    chip: { fontSize: 11, color: colors.text, backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, overflow: 'hidden' },
    cta: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryDark, borderRadius: 22, paddingHorizontal: 12, minHeight: 44 },
    ctaSmall: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, minHeight: 44 },
    ctaText: { color: '#fff', fontWeight: '700', fontSize: 13, marginLeft: 6 },
    confirmedBadge: { backgroundColor: colors.background, borderRadius: 18, paddingHorizontal: 10, minHeight: 36, borderWidth: 1, borderColor: colors.primary },
    confirmedText: { color: colors.primary, fontWeight: '700', fontSize: 12, marginLeft: 5 },
    iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    thumb: { width: 34, height: 34, borderRadius: 6 },
    previewWrap: { flex: 1, padding: 16, paddingTop: 48 },
    previewTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12 },
    captionInput: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text, minHeight: 44 },
    btn: { flex: 1, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    linkBtn: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    radioDot: { width: 10, height: 10, borderRadius: 5 },
  });
