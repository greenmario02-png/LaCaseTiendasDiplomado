import { describe, it, expect, jest, afterEach } from '@jest/globals';

jest.mock('./api', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  tokenStore: { get: async () => null },
}));

import {
  applyStatus,
  canDeleteForAll,
  createTypingEmitter,
  fileUrl,
  filterConversations,
  markDeleted,
  mergeMessages,
  newClientId,
  statusOf,
  withDaySeparators,
  type ChatMessage,
} from './chat';

const msg = (id: number, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  conversationId: 1,
  senderId: 7,
  kind: 'TEXT',
  content: `m${id}`,
  createdAt: new Date(Date.UTC(2026, 9, 15, 12, Math.abs(id))).toISOString(),
  ...extra,
});

describe('chat (móvil) · lógica', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('fusión idempotente: id del servidor y reemplazo del pendiente por clientId', () => {
    const out = mergeMessages([msg(2), msg(-1, { clientId: 'mabcdefgh1', localStatus: 'pending' })], [msg(1), msg(2), msg(5, { clientId: 'mabcdefgh1' })]);
    expect(out.map((m) => m.id)).toEqual([1, 2, 5]);
  });

  it('checks: pendiente, fallido, enviado, entregado, leído; nada para mensajes ajenos ni SYSTEM', () => {
    expect(statusOf(msg(-1, { localStatus: 'pending' }), 7)).toBe('pending');
    expect(statusOf(msg(-1, { localStatus: 'failed' }), 7)).toBe('failed');
    expect(statusOf(msg(1), 7)).toBe('sent');
    expect(statusOf(msg(1, { deliveredAt: 'x' }), 7)).toBe('delivered');
    expect(statusOf(msg(1, { readAt: 'x' }), 7)).toBe('read');
    expect(statusOf(msg(1), 8)).toBeNull();
    expect(statusOf(msg(1, { kind: 'SYSTEM' }), 7)).toBeNull();
  });

  it('estado por socket hasta upToId y borrado para todos', () => {
    const out = applyStatus([msg(1), msg(2), msg(3)], { status: 'delivered', upToId: 2, at: 't' }, 7);
    expect(out.map((m) => m.deliveredAt ?? null)).toEqual(['t', 't', null]);
    expect(markDeleted(out, 2)[1]).toMatchObject({ deleted: true, content: '' });
  });

  it('eliminar para todos solo propio, reciente y no comprobante', () => {
    const now = Date.now();
    const recent = { createdAt: new Date(now - 60_000).toISOString() };
    expect(canDeleteForAll(msg(1, recent), 7, now)).toBe(true);
    expect(canDeleteForAll(msg(1, { ...recent, kind: 'PAYMENT_PROOF' }), 7, now)).toBe(false);
    expect(canDeleteForAll(msg(1, recent), 8, now)).toBe(false);
    expect(canDeleteForAll(msg(1, { createdAt: new Date(now - 3 * 3600_000).toISOString() }), 7, now)).toBe(false);
  });

  it('separadores de fecha y búsqueda sin tildes', () => {
    const rows = withDaySeparators([msg(1, { createdAt: '2026-10-14T15:00:00Z' }), msg(2, { createdAt: '2026-10-15T15:00:00Z' })]);
    expect(rows.map((r) => r.type)).toEqual(['day', 'msg', 'day', 'msg']);
    expect(filterConversations([{ n: 'Doña Ñusta' }, { n: 'Pedro' }], 'nusta', (x) => [x.n])).toHaveLength(1);
  });

  it('clientId aceptado por el servidor', () => {
    expect(newClientId()).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  });

  it('URL de adjunto: solo rutas firmadas del API', () => {
    expect(fileUrl('/api/chat/files/3?u=1&e=2&s=abc')).toMatch(/\/api\/chat\/files\/3\?u=1&e=2&s=abc$/);
    expect(fileUrl('https://evil.example/x.png')).toBeUndefined();
    expect(fileUrl(null)).toBeUndefined();
  });

  it('"escribiendo" con límite y parada por inactividad', () => {
    jest.useFakeTimers();
    const send = jest.fn();
    const e = createTypingEmitter(send, { interval: 2500, idle: 3000 });
    e.onInput('a');
    e.onInput('ab');
    expect(send).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(3100);
    expect(send).toHaveBeenLastCalledWith(false);
  });
});
