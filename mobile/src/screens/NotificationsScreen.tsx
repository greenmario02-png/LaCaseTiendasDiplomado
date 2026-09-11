import React, { useMemo,  useCallback, useEffect  } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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
import { VisionBackground, GlassCard, GradientIconBox } from '../components/vision';
import { vision } from '../theme/vision';
import { useAppTheme } from '../theme/ThemeContext';

const TYPE_META: Record<string, { icon: React.ReactNode; gradient: readonly [string, string] }> = {
  NEW_MESSAGE: { icon: <MessageCircle size={18} color="#fff" />, gradient: vision.gradCyan },
  NEW_ORDER: { icon: <ShoppingCart size={18} color="#fff" />, gradient: vision.gradGreen },
  ORDER_STATUS: { icon: <PackageCheck size={18} color="#fff" />, gradient: vision.gradPrimary },
  PAYMENT_PROOF: { icon: <BadgeCheck size={18} color="#fff" />, gradient: vision.gradOrange },
  PAYMENT_VERIFIED: { icon: <BadgeCheck size={18} color="#fff" />, gradient: vision.gradGreen },
  AUCTION_ENDED: { icon: <Gavel size={18} color="#fff" />, gradient: vision.gradViolet },
  AUCTION_WON: { icon: <Gavel size={18} color="#fff" />, gradient: vision.gradPrimary },
  AUCTION_SOLD: { icon: <Gavel size={18} color="#fff" />, gradient: vision.gradGreen },
  OUTBID: { icon: <Gavel size={18} color="#fff" />, gradient: vision.gradOrange },
  FORUM_ANSWER: { icon: <MessageSquareText size={18} color="#fff" />, gradient: vision.gradViolet },
  FORUM_BEST: { icon: <Flame size={18} color="#fff" />, gradient: vision.gradOrange },
  FORUM_RANK_UP: { icon: <Flame size={18} color="#fff" />, gradient: vision.gradPink },
  FORUM_REPORT: { icon: <ShieldAlert size={18} color="#fff" />, gradient: vision.gradPink },
  RETURN_REQUEST: { icon: <RotateCcw size={18} color="#fff" />, gradient: vision.gradOrange },
  RETURN_STATUS: { icon: <RotateCcw size={18} color="#fff" />, gradient: vision.gradCyan },
  SELLER_APPROVED: { icon: <Store size={18} color="#fff" />, gradient: vision.gradGreen },
  SYSTEM: { icon: <Bell size={18} color="#fff" />, gradient: vision.gradViolet },
};

function iconFor(type: string): { icon: React.ReactNode; gradient: readonly [string, string] } {
  return TYPE_META[type] ?? { icon: <Bell size={18} color="#fff" />, gradient: vision.gradPrimary };
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
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const meta = iconFor(item.type);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <GlassCard style={[styles.row, !item.isRead && styles.rowUnread]}>
        <View style={styles.rowLeft}>
          <GradientIconBox gradient={meta.gradient} size={38} radius={11}>
            {meta.icon}
          </GradientIconBox>
          {!item.isRead && <View style={styles.dot} />}
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {!!item.message && (
            <Text style={styles.rowMessage} numberOfLines={2}>
              {item.message}
            </Text>
          )}
          <Text style={styles.rowTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        <ArrowRight size={16} color={vision.textMuted} />
      </GlassCard>
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
      <VisionBackground />
      <View style={styles.header}>
        <GradientIconBox gradient={vision.gradPrimary} size={40} radius={12}>
          <Bell size={20} color="#fff" />
        </GradientIconBox>
        <View style={styles.headerText}>
          <Text style={styles.title}>Notificaciones</Text>
          <Text style={styles.subtitle}>
            {unread > 0 ? `${unread} sin leer` : 'Estás al día'}
          </Text>
        </View>
        {unread > 0 && (
          <TouchableOpacity style={styles.readAllBtn} onPress={markAllRead}>
            <CheckCheck size={16} color={vision.textSecondary} />
            <Text style={styles.readAllText}>Leer todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Bell size={40} color={vision.textMuted} />
              <Text style={styles.emptyTitle}>Sin notificaciones</Text>
              <Text style={styles.emptyText}>Cuando recibas mensajes, pedidos o respuestas del foro, aparecerán acá.</Text>
            </View>
          }
          renderItem={({ item }) => <NotificationRow item={item} onPress={() => openItem(item)} />}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1 },
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
  title: { fontSize: 22, fontWeight: '900', color: vision.text },
  subtitle: { fontSize: 13, color: vision.textSecondary, marginTop: 2 },
  readAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: vision.textMuted },
  readAllText: { fontSize: 12, fontWeight: '700', color: vision.textSecondary },
  list: { padding: 16, paddingBottom: 48, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
  },
  rowUnread: {
    borderColor: vision.gradPrimary[1],
    borderWidth: 1,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  dot: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: '#1d2150',
  },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '800', color: vision.text },
  rowMessage: { fontSize: 12.5, color: vision.textSecondary, marginTop: 2, lineHeight: 17 },
  rowTime: { fontSize: 11, color: vision.textMuted, marginTop: 3 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: vision.text },
  emptyText: { fontSize: 13, color: vision.textSecondary, textAlign: 'center', paddingHorizontal: 30, lineHeight: 19 },
});
