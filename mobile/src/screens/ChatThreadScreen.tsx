import React, { useMemo,  useEffect, useState, useRef  } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { api, getErrorMessage, tokenStore } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { SOCKET_URL } from '../config/env';
import { LoadingState } from '../components/redesign/States';
import { useAppTheme } from '../theme/ThemeContext';

export default function ChatThreadScreen({ route, navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = route.params;
  const user = useAuthStore((s) => s.user);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList>(null);

  const load = async () => {
    try {
      const { data } = await api.get(`/chat/${id}`);
      setConversation(data.data);
      setMessages(data.data.messages ?? []);
    } catch {}
    setLoading(false);
  };

  // Bolivianismos: sugerencias para iniciar la conversación (si no hay mensajes)
  // y respuestas pre-programadas por inactividad (si no respondieron).
  useEffect(() => {
    api
      .get('/chat/icebreakers')
      .then((r) => setIcebreakers(r.data.data?.icebreakers ?? []))
      .catch(() => {});
    api
      .get(`/chat/${id}/suggestions?inactivityMinutes=10`)
      .then((r) => setSuggestions(r.data.data ?? null))
      .catch(() => {});
  }, [id]);

  const sendPhrase = async (phrase: string) => {
    if (sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/chat/${id}/messages`, { content: phrase });
      setMessages((prev) => (prev.some((m) => m.id === data.data.id) ? prev : [...prev, data.data]));
      setSuggestions(null);
    } catch {
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    let socket: Socket | null = null;
    let disposed = false;
    const connect = async (): Promise<Socket | null> => {
      const token = await tokenStore.get();
      if (disposed || !token) return null;
      const s = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
      s.on('connect', () => s!.emit('joinChat', { conversationId: Number(id) }));
      s.on('chat:message', (payload: any) => {
        if (payload.conversationId === Number(id) || payload.message?.conversationId === Number(id)) {
          const msg = payload.message ?? payload;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
      });
      // Si el access token expiró, pedir uno fresco al backend y reconectar.
      s.on('connect_error', async () => {
        try {
          await api.get('/auth/me');
          const fresh = await tokenStore.get();
          if (disposed || !fresh) return;
          s.auth = { token: fresh };
          s.connect();
        } catch {
          // sin sesión válida: el interceptor ya forzó el deslogueo
        }
      });
      return s;
    };
    (async () => {
      socket = await connect();
      socketRef.current = socket;
    })();
    return () => {
      disposed = true;
      socket?.disconnect();
    };
  }, [id]);

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/chat/${id}/messages`, { content });
      setMessages((prev) => (prev.some((m) => m.id === data.data.id) ? prev : [...prev, data.data]));
      setText('');
    } catch (err) {
      console.log(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  const other =
    conversation?.buyer?.id === user?.id ? conversation?.seller : conversation?.buyer;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'android' ? 40 : 0}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>â†</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerName}>{other?.storeName ?? `${other?.firstName} ${other?.lastName}`}</Text>
          {conversation?.product && <Text style={styles.headerProduct} numberOfLines={1}>ðŸ“¦ {conversation.product.name}</Text>}
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item, idx) => String(item.id ?? idx)}
        contentContainerStyle={{ padding: 12, gap: 6 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.senderId === user?.id || item.sender?.id === user?.id;
          return (
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextOther]}>{item.content}</Text>
              <Text style={styles.bubbleTime}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {mine && (item.readAt ? ' âœ“âœ“' : ' âœ“')}
              </Text>
            </View>
          );
        }}
      />

      {messages.length === 0 && icebreakers.length > 0 && (
        <View style={styles.suggestBox}>
          <Text style={styles.suggestTitle}>💬 Sugerencias para empezar ({suggestions?.region ?? ''}):</Text>
          <View style={styles.suggestRow}>
            {icebreakers.slice(0, 4).map((p) => (
              <TouchableOpacity key={p} style={styles.suggestChip} onPress={() => sendPhrase(p)} disabled={sending}>
                <Text style={styles.suggestChipText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      {suggestions?.inactive && messages.length > 0 && (
        <View style={styles.suggestBox}>
          <Text style={styles.suggestTitle}>⏰ Sin respuesta todavía — sugerencias ({suggestions.region}):</Text>
          <View style={styles.suggestRow}>
            {(suggestions.followUps ?? []).slice(0, 2).map((p: string) => (
              <TouchableOpacity key={p} style={styles.suggestChip} onPress={() => sendPhrase(p)} disabled={sending}>
                <Text style={styles.suggestChipText}>{p}</Text>
              </TouchableOpacity>
            ))}
            {(suggestions.noSaleReplies ?? []).slice(0, 2).map((p: string) => (
              <TouchableOpacity key={p} style={styles.suggestChip} onPress={() => sendPhrase(p)} disabled={sending}>
                <Text style={styles.suggestChipText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="EscribÃ­ un mensaje..."
          value={text}
          onChangeText={setText}
          placeholderTextColor="#999"
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={sending || !text.trim()}>
          <Text style={styles.sendText}>âž¤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { fontSize: 22, color: colors.primary, fontWeight: '800' },
  headerName: { fontSize: 15, fontWeight: '700', color: colors.text },
  headerProduct: { fontSize: 12, color: colors.textSecondary },
  bubble: { maxWidth: '80%', borderRadius: 14, padding: 10, marginVertical: 2 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: 14, lineHeight: 19 },
  bubbleTextMine: { color: '#fff' },
  bubbleTextOther: { color: colors.text },
  bubbleTime: { fontSize: 10, color: '#bbb', marginTop: 3, alignSelf: 'flex-end' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
  input: { flex: 1, backgroundColor: colors.background, borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontSize: 18 },
  suggestBox: { paddingHorizontal: 12, paddingBottom: 6, backgroundColor: colors.background },
  suggestTitle: { fontSize: 12, color: colors.textSecondary, fontWeight: '700', marginBottom: 5 },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggestChip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 5 },
  suggestChipText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
});

