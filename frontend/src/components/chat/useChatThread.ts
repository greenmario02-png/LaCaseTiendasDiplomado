import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { connectSocket, disconnectSocket, getSocket, sendTyping } from '../../services/socket';
import { chatApi, type ConversationPage, type Presence } from '../../services/chat.api';
import { getErrorMessage } from '../../services/api';
import { applyStatus, createTypingEmitter, markDeleted, mergeMessages, newClientId, type ChatMessage } from '../../lib/chat/chatModel';
import type { PendingFile } from './ChatComposer';

type Retry = { type: 'text'; content: string; replyToId: number | null } | { type: 'file'; file: PendingFile; caption: string; replyToId: number | null } | { type: 'qr' };

interface Options {
  activeId: number | null;
  myId: number | undefined;
  /** Se llama cuando cambia algo que afecta a la lista (nuevo mensaje, leidos). */
  onListChange: () => void;
}

/**
 * Chat mejorado (doc 62): estado de una conversacion abierta. Envio optimista con reintento, fusion idempotente
 * (id + clientId), paginacion hacia atras, estados por socket, "escribiendo…" con limite, presencia y reconexion.
 */
export function useChatThread({ activeId, myId, onListChange }: Options) {
  const [conv, setConv] = useState<Omit<ConversationPage, 'messages'> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [incoming, setIncoming] = useState(0);
  const activeRef = useRef<number | null>(activeId);
  const retries = useRef(new Map<string, Retry>());
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listChange = useRef(onListChange);
  useLayoutEffect(() => {
    listChange.current = onListChange;
    activeRef.current = activeId;
  });

  // Un emisor de "escribiendo" por conversacion (con limite de frecuencia); al cambiar se detiene el anterior.
  const typing = useMemo(() => createTypingEmitter((v) => activeId && sendTyping(activeId, v)), [activeId]);

  // Cambio de conversacion: se limpia el estado durante el render (patron recomendado por React, sin efecto en cascada).
  const [shownId, setShownId] = useState(activeId);
  if (shownId !== activeId) {
    setShownId(activeId);
    setConv(null);
    setMessages([]);
    setHasMore(false);
    setPresence(null);
    setOtherTyping(false);
    setIncoming(0);
  }

  const scheduleRead = useCallback(() => {
    if (readTimer.current) clearTimeout(readTimer.current);
    readTimer.current = setTimeout(() => {
      const id = activeRef.current;
      if (id && document.visibilityState === 'visible') chatApi.read(id).then(() => listChange.current()).catch(() => {});
    }, 400);
  }, []);

  const loadFirst = useCallback(async (id: number) => {
    try {
      const page = await chatApi.page(id);
      if (activeRef.current !== id) return;
      const { messages: msgs, ...rest } = page;
      setConv(rest);
      setMessages((prev) => mergeMessages(prev.filter((m) => m.conversationId === id), msgs));
      setHasMore(page.hasMore);
      listChange.current();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }, []);

  const join = useCallback((id: number) => {
    const s = getSocket();
    s.emit('chat:join', { conversationId: id }, (p: Presence) => {
      if (activeRef.current === id) setPresence(p);
    });
  }, []);

  // Cambio de conversacion: cargar la primera pagina y entrar a la sala
  useEffect(() => {
    if (!activeId) return;
    activeRef.current = activeId;
    // La carga es asincrona: el estado se actualiza al llegar la respuesta, no dentro del efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFirst(activeId);
    join(activeId);
    return () => {
      typing.stop();
      getSocket().emit('chat:leave', { conversationId: activeId });
    };
  }, [activeId, loadFirst, join, typing]);

  // Socket (una sola suscripcion; usa refs para la conversacion activa)
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const s = connectSocket(token);
    const onMessage = (p: { conversationId: number; message: ChatMessage }) => {
      if (p.conversationId === activeRef.current) {
        setMessages((prev) => mergeMessages(prev, [p.message]));
        if (p.message.senderId !== myId) {
          setOtherTyping(false);
          setIncoming((n) => n + 1);
          scheduleRead();
        }
      }
      listChange.current();
    };
    const onStatus = (p: { conversationId: number; status: 'delivered' | 'read'; upToId: number; at: string }) => {
      if (p.conversationId === activeRef.current) setMessages((prev) => applyStatus(prev, p, myId));
      listChange.current();
    };
    const onDeleted = (p: { conversationId: number; messageId: number }) => {
      if (p.conversationId === activeRef.current) setMessages((prev) => markDeleted(prev, p.messageId));
      listChange.current();
    };
    const onTyping = (p: { conversationId: number; userId: number; isTyping: boolean }) => {
      if (p.conversationId !== activeRef.current || p.userId === myId) return;
      setOtherTyping(p.isTyping);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      // Si se pierde el "dejo de escribir", se apaga solo.
      if (p.isTyping) typingTimer.current = setTimeout(() => setOtherTyping(false), 6000);
    };
    const onPresence = (p: { conversationId: number; userId: number; online: boolean; lastSeenAt: string | null }) => {
      if (p.conversationId === activeRef.current && p.userId !== myId) setPresence({ visible: true, online: p.online, lastSeenAt: p.lastSeenAt });
    };
    // Reconexion: volver a la sala y traer lo que llego mientras tanto.
    const onConnect = () => {
      const id = activeRef.current;
      if (id) {
        join(id);
        loadFirst(id);
      }
      listChange.current();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && activeRef.current) scheduleRead();
    };
    s.on('chat:message', onMessage);
    s.on('chat:status', onStatus);
    s.on('chat:deleted', onDeleted);
    s.on('chat:typing', onTyping);
    s.on('chat:presence', onPresence);
    s.on('connect', onConnect);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      s.off('chat:message', onMessage);
      s.off('chat:status', onStatus);
      s.off('chat:deleted', onDeleted);
      s.off('chat:typing', onTyping);
      s.off('chat:presence', onPresence);
      s.off('connect', onConnect);
      document.removeEventListener('visibilitychange', onVisible);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (readTimer.current) clearTimeout(readTimer.current);
      disconnectSocket();
    };
  }, [myId, join, loadFirst, scheduleRead]);

  const optimistic = (clientId: string, base: Partial<ChatMessage>): ChatMessage => ({
    id: -Date.now(),
    conversationId: activeRef.current ?? 0,
    senderId: myId ?? 0,
    kind: 'TEXT',
    content: '',
    createdAt: new Date().toISOString(),
    clientId,
    localStatus: 'pending',
    ...base,
  });

  const fail = (clientId: string, e: unknown) => {
    setMessages((prev) => prev.map((m) => (m.clientId === clientId && m.id < 0 ? { ...m, localStatus: 'failed' } : m)));
    toast.error(getErrorMessage(e));
  };

  const run = useCallback(async (clientId: string, job: Retry) => {
    const id = activeRef.current;
    if (!id) return;
    retries.current.set(clientId, job);
    setMessages((prev) => prev.map((m) => (m.clientId === clientId && m.id < 0 ? { ...m, localStatus: 'pending' } : m)));
    try {
      const saved =
        job.type === 'text'
          ? await chatApi.sendText(id, { content: job.content, clientId, replyToId: job.replyToId })
          : job.type === 'file'
            ? await chatApi.sendFile(id, job.file.file, job.file.name, { clientId, caption: job.caption, replyToId: job.replyToId, kind: job.file.kind, orderId: job.file.kind === 'PAYMENT_PROOF' ? conv?.orderId ?? undefined : undefined })
            : await chatApi.sendQr(id, clientId);
      retries.current.delete(clientId);
      setMessages((prev) => mergeMessages(prev, [saved]));
      if (job.type === 'file' && job.file.previewUrl) setTimeout(() => URL.revokeObjectURL(job.file.previewUrl!), 30_000);
      listChange.current();
    } catch (e) {
      fail(clientId, e);
    }
  }, [conv?.orderId]);

  const replyOf = (m: ChatMessage | null): ChatMessage['replyTo'] => (m ? { id: m.id, senderId: m.senderId, kind: m.kind, preview: m.content, deleted: !!m.deleted, hasImage: !!m.attachment?.mime.startsWith('image/') } : null);

  const sendText = (content: string, replyTo: ChatMessage | null) => {
    const clientId = newClientId();
    typing.stop();
    setMessages((prev) => mergeMessages(prev, [optimistic(clientId, { content, replyTo: replyOf(replyTo) })]));
    run(clientId, { type: 'text', content, replyToId: replyTo?.id ?? null });
  };

  const sendFile = (file: PendingFile, caption: string, replyTo: ChatMessage | null) => {
    const clientId = newClientId();
    const kind = file.kind === 'PAYMENT_PROOF' ? 'PAYMENT_PROOF' : file.isImage ? 'IMAGE' : 'FILE';
    setMessages((prev) =>
      mergeMessages(prev, [
        optimistic(clientId, {
          kind,
          content: caption,
          orderId: conv?.orderId ?? null,
          localUrl: file.previewUrl,
          replyTo: replyOf(replyTo),
          attachment: { id: 0, mime: file.type, size: file.file.size, width: file.width ?? null, height: file.height ?? null, name: file.name, url: null, hidden: false },
        }),
      ]),
    );
    run(clientId, { type: 'file', file, caption, replyToId: replyTo?.id ?? null });
  };

  const sendQr = () => {
    const clientId = newClientId();
    setMessages((prev) => mergeMessages(prev, [optimistic(clientId, { kind: 'PAYMENT_QR', content: '' })]));
    run(clientId, { type: 'qr' });
  };

  const retry = (m: ChatMessage) => {
    const job = m.clientId ? retries.current.get(m.clientId) : undefined;
    if (job && m.clientId) run(m.clientId, job);
  };

  const remove = async (m: ChatMessage, scope: 'me' | 'all') => {
    const id = activeRef.current;
    if (!id) return;
    try {
      await chatApi.remove(id, m.id, scope);
      setMessages((prev) => (scope === 'me' ? prev.filter((x) => x.id !== m.id) : markDeleted(prev, m.id)));
      listChange.current();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const loadOlder = async () => {
    const id = activeRef.current;
    const oldest = messages.find((m) => m.id > 0);
    if (!id || !oldest || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await chatApi.page(id, oldest.id);
      if (activeRef.current !== id) return;
      setMessages((prev) => mergeMessages(prev, page.messages));
      setHasMore(page.hasMore);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  };

  return {
    conv,
    setConv,
    messages,
    hasMore,
    loadingMore,
    presence,
    otherTyping,
    incoming,
    resetIncoming: () => setIncoming(0),
    onTyping: (text: string) => typing.onInput(text),
    sendText,
    sendFile,
    sendQr,
    retry,
    remove,
    loadOlder,
  };
}
