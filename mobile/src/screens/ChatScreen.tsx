import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MessageCircle, Package, Search, Settings, BellOff, Image as ImageIcon, Receipt } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { NeoButton } from '../components/redesign/NeoButton';
import { LoadingState, EmptyState } from '../components/redesign/States';
import { useAppTheme } from '../theme/ThemeContext';
import { resolveImageUrl } from '../services/api';
import { acquireChatSocket, chatApi, filterConversations, releaseChatSocket, statusOf, type ChatMessage } from '../services/chat';
import { SettingsModal, Ticks, listTime, previewOf, useChatText } from '../components/chat/ChatParts';

/** Lista de conversaciones (chat mejorado): ultimo mensaje, hora, miniatura, no leidos, silenciadas, busqueda y ajustes. */
export default function ChatScreen({ navigation }: any) {
  const { t } = useTranslation();
  const c = useChatText();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const user = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      setConversations(await chatApi.list());
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Tiempo real: un mensaje o un cambio de estado recarga la lista (agrupado para no pedirla de mas).
  useEffect(() => {
    let disposed = false;
    let s: Awaited<ReturnType<typeof acquireChatSocket>> = null;
    const reload = () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(load, 400);
    };
    (async () => {
      s = await acquireChatSocket();
      if (disposed) {
        if (s) releaseChatSocket();
        return;
      }
      s?.on('chat:message', reload);
      s?.on('chat:status', reload);
      s?.on('chat:deleted', reload);
    })();
    return () => {
      disposed = true;
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      if (s) {
        s.off('chat:message', reload);
        s.off('chat:status', reload);
        s.off('chat:deleted', reload);
        releaseChatSocket();
      }
    };
  }, [load]);

  const otherOf = (item: any) => (item.buyer?.id === user?.id ? item.seller : item.buyer);
  const nameOf = (item: any) => {
    const o = otherOf(item);
    return o?.storeName ?? `${o?.firstName ?? ''} ${o?.lastName ?? ''}`.trim();
  };
  const lastOf = (item: any) => item.lastMessage ?? item.messages?.[0] ?? null;
  const list = filterConversations(conversations, query, (x) => [nameOf(x), x.product?.name ?? '', lastOf(x)?.content ?? '', x.order ? `#${x.order.id}` : '']);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MessageCircle size={20} color={colors.primary} />
          <Text style={styles.title} accessibilityRole="header">
            {t('mobile.chat.title')}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setSettingsOpen(true)} accessibilityRole="button" accessibilityLabel={c('settings')} style={styles.iconBtn}>
          <Settings size={20} color={colors.text} />
        </TouchableOpacity>
        <NeoButton title={t('mobile.chat.consultButton')} variant="ghost" onPress={() => navigation.navigate('Products')} style={styles.newBtn} />
      </View>
      <View style={styles.searchBox}>
        <Search size={16} color={colors.textSecondary} />
        <TextInput value={query} onChangeText={setQuery} placeholder={c('search')} placeholderTextColor={colors.textSecondary} accessibilityLabel={c('searchLabel')} style={styles.searchInput} />
      </View>

      {list.length === 0 ? (
        <View style={styles.center}>
          <EmptyState message={query.trim() ? c('noResults') : t('mobile.chat.noConversations')} />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 90 }}
          renderItem={({ item }) => {
            const other = otherOf(item);
            const name = nameOf(item);
            const unread = item.unreadCount ?? item.messages?.filter((m: any) => m.senderId !== user?.id && !m.readAt).length ?? 0;
            const last = lastOf(item);
            const st = last ? statusOf({ ...last, conversationId: item.id } as ChatMessage, user?.id) : null;
            const thumb = item.product?.images?.[0]?.url;
            return (
              <TouchableOpacity
                style={styles.conv}
                onPress={() => navigation.navigate('ChatThread', { id: item.id })}
                accessibilityRole="button"
                accessibilityLabel={`${name}${unread ? `, ${c('unreadCount', { count: unread })}` : ''}`}
              >
                {other?.storeLogo || other?.profileImage ? (
                  <Image source={{ uri: resolveImageUrl(other.storeLogo ?? other.profileImage) }} style={styles.avatar} accessibilityIgnoresInvertColors />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(name || '?')[0].toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.convBody}>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.convName, unread > 0 && { fontWeight: '800' }]} numberOfLines={1}>
                      {name}
                    </Text>
                    <View style={styles.row}>
                      {item.muted && (
                        <View accessible accessibilityRole="image" accessibilityLabel={c('muted')}>
                          <BellOff size={13} color={colors.textSecondary} />
                        </View>
                      )}
                      <Text style={[styles.time, unread > 0 && { color: colors.primary, fontWeight: '700' }]}>{listTime(last?.createdAt ?? item.updatedAt, c)}</Text>
                    </View>
                  </View>
                  {(item.order || item.product) && (
                    <View style={styles.convProductRow}>
                      {item.order ? <Receipt size={11} color={colors.textSecondary} /> : <Package size={11} color={colors.textSecondary} />}
                      <Text style={styles.convProduct} numberOfLines={1}>
                        {item.order ? c('order.title', { id: item.order.id }) : item.product.name}
                      </Text>
                    </View>
                  )}
                  <View style={styles.row}>
                    {st && <Ticks status={st} color={colors.textSecondary} readColor={colors.primary} />}
                    {last?.hasImage && <ImageIcon size={13} color={colors.textSecondary} />}
                    <Text style={[styles.convLast, unread > 0 && { color: colors.text, fontWeight: '600' }, last?.deleted && { fontStyle: 'italic' }]} numberOfLines={1}>
                      {last ? previewOf(last, c) : t('mobile.chat.noMessages')}
                    </Text>
                  </View>
                </View>
                {thumb ? <Image source={{ uri: resolveImageUrl(thumb) }} style={styles.thumb} accessibilityIgnoresInvertColors /> : null}
                {unread > 0 && (
                  <View style={styles.badge} importantForAccessibility="no-hide-descendants">
                    <Text style={styles.badgeText}>{unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
      <SettingsModal visible={settingsOpen} colors={colors} onClose={() => setSettingsOpen(false)} load={chatApi.settings} save={chatApi.saveSettings} blocks={chatApi.blocks} unblock={chatApi.unblock} />
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    title: { fontSize: 20, fontWeight: '800', color: colors.text },
    iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    newBtn: { paddingHorizontal: 12 },
    searchBox: { flexDirection: 'row', alignItems: 'center', margin: 12, marginBottom: 0, paddingHorizontal: 12, backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, minHeight: 44 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: colors.text, paddingVertical: 8 },
    conv: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 10, minHeight: 64 },
    convBody: { flex: 1, minWidth: 0 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
    convName: { fontSize: 14, fontWeight: '700', color: colors.text, flexShrink: 1 },
    time: { fontSize: 11, color: colors.textSecondary },
    convProductRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
    convProduct: { fontSize: 11, color: colors.textSecondary },
    convLast: { fontSize: 12, color: colors.textSecondary, marginTop: 3, flex: 1 },
    thumb: { width: 40, height: 40, borderRadius: 8 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryDark ?? colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    badge: { backgroundColor: colors.primaryDark ?? colors.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  });
