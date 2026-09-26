import React, { useMemo,  useCallback  } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {
  Bell,
  MessageCircle,
  ShoppingCart,
  Gavel,
  Flame,
  BadgeCheck,
  RotateCcw,
  Store,
  CheckCheck,
  ArrowRight,
  PackageCheck,
  ShieldAlert,
  MessageSquareText,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNotificationsStore, AppNotification } from '../stores/notificationsStore';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { useAppTheme } from '../theme/ThemeContext';

type Tone = 'primary' | 'success' | 'warning' | 'error' | 'info';

const TYPE_META: Record<string, { Icon: React.ComponentType<any>; tone: Tone }> = {
  NEW_MESSAGE: { Icon: MessageCircle, tone: 'info' },
  NEW_ORDER: { Icon: ShoppingCart, tone: 'success' },
  ORDER_STATUS: { Icon: PackageCheck, tone: 'primary' },
  PAYMENT_PROOF: { Icon: BadgeCheck, tone: 'warning' },
  PAYMENT_VERIFIED: { Icon: BadgeCheck, tone: 'success' },
  AUCTION_ENDED: { Icon: Gavel, tone: 'info' },
  AUCTION_WON: { Icon: Gavel, tone: 'primary' },
  AUCTION_SOLD: { Icon: Gavel, tone: 'success' },
  OUTBID: { Icon: Gavel, tone: 'warning' },
  FORUM_ANSWER: { Icon: MessageSquareText, tone: 'info' },
  FORUM_BEST: { Icon: Flame, tone: 'warning' },
  FORUM_RANK_UP: { Icon: Flame, tone: 'error' },
  FORUM_REPORT: { Icon: ShieldAlert, tone: 'error' },
  RETURN_REQUEST: { Icon: RotateCcw, tone: 'warning' },
  RETURN_STATUS: { Icon: RotateCcw, tone: 'info' },
  SELLER_APPROVED: { Icon: Store, tone: 'success' },
  SYSTEM: { Icon: Bell, tone: 'info' },
};

function metaFor(type: string) {
  return TYPE_META[type] ?? { Icon: Bell, tone: 'primary' as Tone };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} d`;
}

function NotificationRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const { colors, raised, pressed } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { Icon, tone } = metaFor(item.type);
  const tint = colors[tone];
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.row, item.isRead ? { ...pressed } : { ...raised }]}>
        <View style={styles.rowLeft}>
          <View style={[styles.iconBox, raised]}>
            <Icon size={18} color={tint} />
          </View>
          {!item.isRead && <View style={styles.dot} />}
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, item.isRead && styles.rowTitleRead]} numberOfLines={1}>
            {item.title}
          </Text>
          {!!item.message && (
            <Text style={styles.rowMessage} numberOfLines={2}>
              {item.message}
            </Text>
          )}
          <Text style={styles.rowTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        <ArrowRight size={16} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { items, unread, loading, load, refreshUnread, markRead, markAllRead, connect } = useNotificationsStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
      refreshUnread();
      connect();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openItem = (item: AppNotification) => {
    if (!item.isRead) markRead(item.id);
    if (item.refType === 'chat' && item.refId) {
      navigation.navigate('ChatThread', { id: item.refId, conversationId: item.refId });
    } else if (item.refType === 'order' && item.refId) {
      navigation.navigate('Orders');
    }
  };

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Bell size={22} color={colors.primary} />
        <View style={styles.headerText}>
          <Text style={styles.title}>Notificaciones</Text>
          <Text style={styles.subtitle}>
            {unread > 0 ? `${unread} sin leer` : 'Estás al día'}
          </Text>
        </View>
        {unread > 0 && (
          <TouchableOpacity style={styles.readAllBtn} onPress={markAllRead}>
            <CheckCheck size={16} color={colors.primary} />
            <Text style={styles.readAllText}>Leer todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <LoadingState />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState message="Sin notificaciones. Cuando recibas mensajes, pedidos o respuestas del foro, aparecerán acá." />}
          renderItem={({ item }) => <NotificationRow item={item} onPress={() => openItem(item)} />}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    headerText: { flex: 1 },
    title: { fontSize: 22, fontWeight: '900', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    readAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20 },
    readAllText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    list: { padding: 16, paddingBottom: 48, gap: 14 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 18,
      padding: 14,
      backgroundColor: colors.surface,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center' },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    dot: {
      position: 'absolute',
      right: -3,
      top: -3,
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: colors.error,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    rowBody: { flex: 1 },
    rowTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
    rowTitleRead: { fontWeight: '600', color: colors.textSecondary },
    rowMessage: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
    rowTime: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
  });
