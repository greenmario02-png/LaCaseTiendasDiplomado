import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  mergeMessages,
  applyStatus,
  statusOf,
  markDeleted,
  withDaySeparators,
  canDeleteForAll,
  newClientId,
  filterConversations,
  createTypingEmitter,
  targetSize,
  formatBytes,
  type ChatMessage,
} from './chatModel';

const msg = (id: number, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  conversationId: 1,
  senderId: 7,
  kind: 'TEXT',
  content: `m${id}`,
  createdAt: new Date(Date.UTC(2026, 9, 15, 12, id)).toISOString(),
  ...extra,
});

describe('chatModel · mensajes ordenados e idempotentes', () => {
  it('no duplica por id y ordena por id; los pendientes van al final', () => {
    const pending = msg(-1, { clientId: 'cabc12345', localStatus: 'pending', createdAt: new Date(Date.UTC(2026, 9, 15, 13)).toISOString() });
    const out = mergeMessages([msg(3), pending, msg(1)], [msg(2), msg(3)]);
    expect(out.map((m) => m.id)).toEqual([1, 2, 3, -1]);
  });

  it('la respuesta del servidor reemplaza al pendiente con el mismo clientId', () => {
    const pending = msg(-5, { clientId: 'cabc12345', localStatus: 'pending' });
    const out = mergeMessages([msg(1), pending], [msg(9, { clientId: 'cabc12345' })]);
    expect(out.map((m) => m.id)).toEqual([1, 9]);
    expect(out[1].localStatus).toBeUndefined();
  });

  it('un mensaje repetido por socket y por HTTP queda una sola vez', () => {
    const a = mergeMessages([], [msg(4)]);
    const b = mergeMessages(a, [msg(4)]);
    expect(b).toHaveLength(1);
  });
});

describe('chatModel · estados ✓ / ✓✓ / leído', () => {
  it('pendiente, fallido, enviado, entregado y leído', () => {
    expect(statusOf(msg(-1, { localStatus: 'pending' }), 7)).toBe('pending');
    expect(statusOf(msg(-1, { localStatus: 'failed' }), 7)).toBe('failed');
    expect(statusOf(msg(1), 7)).toBe('sent');
    expect(statusOf(msg(1, { deliveredAt: 'x' }), 7)).toBe('delivered');
    expect(statusOf(msg(1, { deliveredAt: 'x', readAt: 'y' }), 7)).toBe('read');
    expect(statusOf(msg(1), 8)).toBeNull();
  });

  it('applyStatus marca hasta upToId solo los mensajes propios', () => {
    const list = [msg(1), msg(2), msg(3, { senderId: 8 }), msg(4)];
    const out = applyStatus(list, { status: 'read', upToId: 3, at: '2026-10-15T12:00:00Z' }, 7);
    expect(out.map((m) => !!m.readAt)).toEqual([true, true, false, false]);
    expect(out[0].deliveredAt).toBe('2026-10-15T12:00:00Z');
  });

  it('markDeleted deja la marca y quita contenido y adjunto', () => {
    const out = markDeleted([msg(1, { attachment: { id: 1, mime: 'image/jpeg', size: 1, width: 1, height: 1, name: null, url: '/x', hidden: false } })], 1);
    expect(out[0]).toMatchObject({ deleted: true, content: '', attachment: null });
  });
});

describe('chatModel · separadores de fecha', () => {
  it('inserta un separador por día', () => {
    const d1 = msg(1, { createdAt: '2026-10-14T15:00:00Z' });
    const d2 = msg(2, { createdAt: '2026-10-15T15:00:00Z' });
    const d3 = msg(3, { createdAt: '2026-10-15T16:00:00Z' });
    const rows = withDaySeparators([d1, d2, d3]);
    expect(rows.map((r) => r.type)).toEqual(['day', 'msg', 'day', 'msg', 'msg']);
  });
});

describe('chatModel · reglas de interfaz', () => {
  it('eliminar para todos: propio, dentro de la ventana y de un tipo permitido', () => {
    const now = Date.UTC(2026, 9, 15, 12, 30);
    const base = { createdAt: new Date(now - 10 * 60_000).toISOString() };
    expect(canDeleteForAll(msg(1, base), 7, now)).toBe(true);
    expect(canDeleteForAll(msg(1, base), 8, now)).toBe(false);
    expect(canDeleteForAll(msg(1, { ...base, kind: 'PAYMENT_PROOF' }), 7, now)).toBe(false);
    expect(canDeleteForAll(msg(1, { ...base, kind: 'SYSTEM' }), 7, now)).toBe(false);
    expect(canDeleteForAll(msg(1, { createdAt: new Date(now - 2 * 3600_000).toISOString() }), 7, now)).toBe(false);
    expect(canDeleteForAll(msg(-1, { ...base, localStatus: 'pending' }), 7, now)).toBe(false);
  });

  it('clientId válido para el servidor', () => {
    const a = newClientId();
    expect(a).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    expect(newClientId()).not.toBe(a);
  });

  it('búsqueda en la lista sin distinguir mayúsculas ni tildes', () => {
    const list = [{ id: 1, name: 'Tienda Ñandú', product: 'Laptop', last: 'hola' }, { id: 2, name: 'Pedro', product: null, last: 'Envío mañana' }];
    const nameOf = (c: (typeof list)[number]) => [c.name, c.product ?? '', c.last];
    expect(filterConversations(list, 'nandu', nameOf).map((c) => c.id)).toEqual([1]);
    expect(filterConversations(list, 'ENVIO', nameOf).map((c) => c.id)).toEqual([2]);
    expect(filterConversations(list, '  ', nameOf)).toHaveLength(2);
  });

  it('redimensionado proporcional al lado máximo', () => {
    expect(targetSize(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(targetSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(targetSize(1000, 5000, 1600)).toEqual({ width: 320, height: 1600 });
  });

  it('tamaños legibles', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});

describe('chatModel · "escribiendo…" con límite', () => {
  afterEach(() => vi.useRealTimers());

  it('avisa como máximo cada intervalo y deja de escribir tras inactividad', () => {
    vi.useFakeTimers();
    const send = vi.fn();
    const typing = createTypingEmitter(send, { interval: 2500, idle: 3000 });
    typing.onInput('h');
    typing.onInput('ho');
    typing.onInput('hol');
    expect(send.mock.calls).toEqual([[true]]);
    vi.advanceTimersByTime(2600);
    typing.onInput('hola');
    expect(send.mock.calls).toEqual([[true], [true]]);
    vi.advanceTimersByTime(3100);
    expect(send.mock.calls[send.mock.calls.length - 1]).toEqual([false]);
    typing.onInput('x');
    typing.stop();
    expect(send.mock.calls[send.mock.calls.length - 1]).toEqual([false]);
  });

  it('borrar el texto cuenta como dejar de escribir', () => {
    const send = vi.fn();
    const typing = createTypingEmitter(send);
    typing.onInput('a');
    typing.onInput('');
    expect(send.mock.calls).toEqual([[true], [false]]);
    typing.stop();
  });
});
