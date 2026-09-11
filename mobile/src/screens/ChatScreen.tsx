import React, { useMemo,  useState  } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MessageCircle, Package } from 'lucide-react-native';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { NeoButton } from '../components/redesign/NeoButton';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { useAppTheme } from '../theme/ThemeContext';

export default function ChatScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const user = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/chat');
      setConversations(data.data ?? []);
    } catch {}
    setLoading(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  const newChat = () => {
    navigation.navigate('ProductDetail', { id: null });
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MessageCircle size={20} color={colors.primary} />
          <Text style={styles.title}>Mensajes</Text>
        </View>
        <NeoButton title="Consultar" variant="ghost" onPress={() => navigation.navigate('Products')} style={styles.newBtn} />
      </View>

      {conversations.length === 0 ? (
        <View style={styles.center}>
          <EmptyState message="No tenés conversaciones" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 90 }}
          renderItem={({ item }) => {
            const other =
              item.buyer?.id === user?.id ? item.seller : item.buyer;
            const unread = item.messages?.filter((m: any) => m.senderId !== user?.id && !m.readAt).length ?? 0;
            const last = item.messages?.[item.messages.length - 1];
            return (
              <TouchableOpacity
                style={styles.conv}
                onPress={() => navigation.navigate('ChatThread', { id: item.id })}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{other?.firstName?.[0] ?? other?.storeName?.[0] ?? '?'}</Text>
                </View>
                <View style={styles.convBody}>
                  <Text style={styles.convName}>{other?.storeName ?? `${other?.firstName} ${other?.lastName}`}</Text>
                  {item.product && (
                    <View style={styles.convProductRow}>
                      <Package size={11} color={colors.textSecondary} />
                      <Text style={styles.convProduct}>{item.product.name}</Text>
                    </View>
                  )}
                  <Text style={styles.convLast} numberOfLines={1}>
                    {last?.content ?? 'Sin mensajes'}
                  </Text>
                </View>
                {unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  newBtn: { paddingHorizontal: 12 },
  conv: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  convBody: { flex: 1 },
  convName: { fontSize: 14, fontWeight: '700', color: colors.text },
  convProductRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  convProduct: { fontSize: 11, color: colors.textSecondary },
  convLast: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  badge: { backgroundColor: colors.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
