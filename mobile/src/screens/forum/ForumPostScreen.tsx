import React, { useMemo,  useEffect, useRef, useState  } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useForumStore } from '../../stores/forumStore';
import { useAuthStore } from '../../stores/authStore';
import { ReplyCard } from '../../components/redesign/ReplyCard';
import { KarmaLevelBadge } from '../../components/redesign/KarmaLevelBadge';
import { NeoInput } from '../../components/redesign/NeoInput';
import { NeoButton } from '../../components/redesign/NeoButton';
import { LoadingState, EmptyState } from '../../components/redesign/States';
import {
  getPost,
  createReply,
  votePost,
  voteReply,
  acceptReply,
  reportPost,
} from '../../services/forum.api';
import { tokenStore, getErrorMessage, resolveImageUrl } from '../../services/api';
import { SOCKET_URL } from '../../config/env';
import { useAppTheme } from '../../theme/ThemeContext';
import { MapPin, CheckCircle2, Flag, MessageCircle, ThumbsUp } from 'lucide-react-native';

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export default function ForumPostScreen({ route, navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id: postId } = route.params;
  const { user } = useAuthStore();
  const [post, setPost] = useState<any>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const loadPost = async () => {
    try {
      const data = await getPost(postId);
      setPost(data);
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // Socket en vivo (patrón ChatThreadScreen)
  useEffect(() => {
    let socket: Socket | null = null;
    let disposed = false;

    const connect = async () => {
      const token = await tokenStore.get();
      if (disposed || !token) return null;
      const s = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });

      s.on('connect', () => {
        s.emit('forum:join', postId);
      });

      s.on('forum:reply:new', ({ reply }: any) => {
        setPost((p: any) =>
          p
            ? {
                ...p,
                replies: [...(p.replies ?? []), reply],
                replyCount: (p.replyCount ?? 0) + 1,
              }
            : p,
        );
      });

      s.on('forum:vote', ({ targetType, targetId, newScore }: any) => {
        setPost((p: any) => {
          if (!p) return p;
          if (targetType === 'POST') return { ...p, score: newScore };
          return {
            ...p,
            replies: (p.replies ?? []).map((r: any) =>
              r.id === targetId ? { ...r, score: newScore } : r,
            ),
          };
        });
      });

      s.on('forum:post:resolved', ({ postId: pid, acceptedReplyId }: any) => {
        setPost((p: any) =>
          p
            ? {
                ...p,
                status: 'RESOLVED',
                replies: (p.replies ?? []).map((r: any) =>
                  r.id === acceptedReplyId ? { ...r, isAccepted: true } : r,
                ),
              }
            : p,
        );
      });

      s.on('connect_error', async () => {
        try {
          await fetch('/auth/me');
        } catch {
          /* noop */
        }
        const fresh = await tokenStore.get();
        if (disposed || !fresh) return;
        s.auth = { token: fresh };
        s.connect();
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
      socketRef.current = null;
    };
  }, [postId]);

  const handleVotePost = async (value: 1 | -1) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas una cuenta para votar.');
      return;
    }
    try {
      const res = await votePost(postId, value);
      setPost((p: any) =>
        p ? { ...p, score: res.newScore, userVote: res.userVote } : p,
      );
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    }
  };

  const handleVoteReply = async (replyId: number, value: 1 | -1) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas una cuenta para votar.');
      return;
    }
    try {
      await voteReply(replyId, value);
      await loadPost();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    }
  };

  const handleAccept = async (replyId: number) => {
    try {
      await acceptReply(replyId);
      await loadPost();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    }
  };

  const handleSendReply = async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas una cuenta para responder.');
      return;
    }
    if (body.trim().length < 10) {
      Alert.alert('Muy corta', 'La respuesta debe tener al menos 10 caracteres.');
      return;
    }
    setSending(true);
    try {
      await createReply(postId, { body: body.trim() });
      setBody('');
      await loadPost();
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const handleReport = () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas una cuenta para reportar.');
      return;
    }
    Alert.alert('Reportar', '¿Reportar esta pregunta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reportar como spam',
        onPress: async () => {
          try {
            await reportPost(postId, { reason: 'SPAM' });
            Alert.alert('Reportado', 'Gracias por ayudar a moderar.');
          } catch (e) {
            Alert.alert('Error', getErrorMessage(e));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingState />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.container}>
        <EmptyState message="No se encontró la pregunta" />
      </View>
    );
  }

  const author = post.author ?? {
    forumUsername: 'usuario',
    tag: 'Novato',
    karma: 0,
    city: '',
  };
  const canAccept =
    !!user &&
    post.author?.forumUsername === user.forumProfile?.forumUsername &&
    post.status !== 'RESOLVED';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Volver al feed</Text>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.metaRow}>
            <Text style={styles.subforo}>
              {post.category?.icon} {post.category?.name}
            </Text>
            <View style={styles.metaItemRow}>
              <MapPin size={11} color={colors.warning} />
              <Text style={styles.city}>{post.city}</Text>
            </View>
            {post.status === 'RESOLVED' && (
              <View style={styles.metaItemRow}>
                <CheckCircle2 size={11} color={colors.karmaUp} />
                <Text style={styles.resolved}>Resuelta</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.authorLine}>
            por <Text style={styles.authorName}>{author.forumUsername}</Text>{' '}
            <KarmaLevelBadge level={author.tag} inline /> ·{' '}
            {formatTimeAgo(post.createdAt)} · {post.viewCount ?? 0} vistas
          </Text>
          <Text style={styles.body}>{post.body}</Text>
          {post.images?.map((img: string) => (
            <Image
              key={img}
              source={{ uri: resolveImageUrl(img) }}
              style={styles.postImage}
              resizeMode="cover"
            />
          ))}
          {post.tags?.map((t: string) => (
            <Text key={t} style={styles.tag}>
              #{t}
            </Text>
          ))}

          <View style={styles.voteRow}>
            <Pressable
              onPress={() => handleVotePost(1)}
              style={[styles.positiveBtn, (post.userVote ?? 0) === 1 && styles.positiveBtnActive]}
            >
              <View style={styles.positiveRow}>
                <ThumbsUp size={14} color={(post.userVote ?? 0) === 1 ? '#fff' : colors.forumAccent} />
                <Text
                  style={[
                    styles.positiveText,
                    (post.userVote ?? 0) === 1 && { color: '#fff' },
                  ]}
                >
                  Positivo {Math.round(post.score ?? 0)}
                </Text>
              </View>
            </Pressable>
            <Pressable onPress={handleReport} style={styles.reportBtn}>
              <View style={styles.reportBtnRow}>
                <Flag size={12} color={colors.error} />
                <Text style={styles.reportText}>Reportar</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.repliesHeaderRow}>
          <MessageCircle size={14} color={colors.forumTextSecondary} />
          <Text style={styles.repliesHeader}>
            {post.replyCount ?? 0}{' '}
            {(post.replyCount ?? 0) === 1 ? 'respuesta' : 'respuestas'}
          </Text>
        </View>

        {(post.replies ?? []).map((r: any) => (
          <ReplyCard
            key={String(r.id)}
            reply={{
              id: r.id,
              body: r.body,
              images: r.images ?? [],
              isBotReply: r.isBotReply ?? false,
              isAccepted: r.isAccepted ?? false,
              author: r.author
                ? { forumUsername: r.author.forumUsername, tag: r.author.tag }
                : null,
              positives: r.score ?? 0,
              createdAt: r.createdAt,
            }}
            canAccept={canAccept}
            onAccept={handleAccept}
            onPositive={(replyId) => handleVoteReply(replyId, 1)}
          />
        ))}

        {user ? (
          <View style={styles.replyBox}>
            <NeoInput
              placeholder="Escribe tu respuesta (mín. 10 caracteres)..."
              value={body}
              onChangeText={setBody}
              multiline
              style={styles.input}
            />
            <NeoButton
              title={sending ? 'Enviando...' : 'Publicar respuesta'}
              onPress={handleSendReply}
              disabled={sending}
            />
          </View>
        ) : (
          <Pressable
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginText}>
              Inicia sesión para responder
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.forumBg,
  },
  empty: {
    textAlign: 'center',
    color: colors.forumMuted,
    marginTop: 40,
  },
  back: {
    color: colors.forumAccent,
    fontWeight: '600',
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.forumCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.forumBorder,
    padding: 14,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  subforo: {
    fontSize: 11,
    color: colors.forumAccent,
    fontWeight: '700',
    backgroundColor: 'rgba(255,107,53,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  city: {
    fontSize: 11,
    color: colors.warning,
  },
  metaItemRow: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
    backgroundColor: 'rgba(249,168,37,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  resolved: {
    fontSize: 11,
    color: colors.karmaUp,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.forumText,
    lineHeight: 24,
  },
  authorLine: {
    fontSize: 12,
    color: colors.forumMuted,
  },
  authorName: {
    color: colors.forumTextSecondary,
    fontWeight: '600',
  },
  body: {
    fontSize: 14,
    color: colors.forumTextSecondary,
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: colors.forumBorder,
  },
  tag: {
    fontSize: 12,
    color: colors.forumAccent,
    backgroundColor: 'rgba(255,107,53,0.08)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  positiveBtn: {
    backgroundColor: 'rgba(255,107,53,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.forumAccent,
  },
  positiveBtnActive: {
    backgroundColor: colors.forumAccent,
    borderColor: colors.forumAccent,
  },
  positiveRow: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  positiveText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forumAccent,
  },
  reportBtn: {
    marginLeft: 'auto',
  },
  reportBtnRow: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  reportText: {
    fontSize: 12,
    color: colors.forumMuted,
  },
  repliesHeaderRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  repliesHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forumText,
  },
  replyBox: {
    backgroundColor: colors.forumCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.forumBorder,
    padding: 12,
    gap: 10,
  },
  input: {
    minHeight: 80,
  },
  loginBtn: {
    borderWidth: 1,
    borderColor: colors.forumAccent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  loginText: {
    color: colors.forumAccent,
    fontWeight: '600',
  },
});
