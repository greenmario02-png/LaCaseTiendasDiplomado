import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageBubble from './MessageBubble';
import { unifiedLight } from '../../theme/unifiedTokens';
import type { ChatMessage } from '../../lib/chat/chatModel';

const base = (extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 10,
  conversationId: 1,
  senderId: 7,
  kind: 'TEXT',
  content: 'Hola',
  createdAt: new Date().toISOString(),
  ...extra,
});

const renderBubble = (msg: ChatMessage, props: Partial<React.ComponentProps<typeof MessageBubble>> = {}) =>
  render(<MessageBubble msg={msg} myId={7} otherName="Tienda Sol" tokens={unifiedLight} readColor="#A7F3D0" {...props} />);

describe('MessageBubble (chat mejorado)', () => {
  it('estados con iconos accesibles, sin emoji: enviado, entregado, leído, pendiente y fallido', () => {
    const cases: Array<[Partial<ChatMessage>, string]> = [
      [{}, 'Enviado'],
      [{ deliveredAt: 'x' }, 'Entregado'],
      [{ deliveredAt: 'x', readAt: 'y' }, 'Leído'],
      [{ id: -1, clientId: 'cabcdefgh', localStatus: 'pending' }, 'Enviando'],
      [{ id: -1, clientId: 'cabcdefgh', localStatus: 'failed' }, 'No enviado'],
    ];
    for (const [extra, label] of cases) {
      const { unmount, container } = renderBubble(base(extra));
      expect(screen.getByRole('img', { name: label })).toBeInTheDocument();
      expect(container.textContent).not.toMatch(/✓/);
      unmount();
    }
  });

  it('los mensajes del otro no muestran checks', () => {
    renderBubble(base({ senderId: 8 }));
    expect(screen.queryByRole('img', { name: /Enviado|Entregado|Leído/ })).toBeNull();
  });

  it('el texto con HTML se muestra como texto (sin inyectar elementos)', () => {
    const { container } = renderBubble(base({ content: '<img src=x onerror=alert(1)>' }));
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(container.querySelector('img[src="x"]')).toBeNull();
  });

  it('foto con subtítulo: abre el visor al tocarla', async () => {
    const onOpenImage = vi.fn();
    renderBubble(base({ kind: 'IMAGE', content: 'mira', attachment: { id: 3, mime: 'image/jpeg', size: 1000, width: 800, height: 600, name: null, url: '/api/chat/files/3?u=7&e=1&s=abc', hidden: false } }), { onOpenImage });
    await userEvent.click(screen.getByRole('button', { name: 'Ver imagen' }));
    expect(onOpenImage).toHaveBeenCalledWith('/api/chat/files/3?u=7&e=1&s=abc', 'mira');
  });

  it('imagen aún sin URL (subiendo): muestra la etiqueta, sin visor ni filtro +18', () => {
    const { container } = renderBubble(base({ senderId: 8, kind: 'IMAGE', content: '', attachment: { id: 3, mime: 'image/jpeg', size: 1, width: 1, height: 1, name: null, url: null, hidden: false } }));
    expect(screen.getByText('Foto')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver imagen' })).toBeNull();
    expect(container.textContent).not.toMatch(/mayores de 18/);
  });

  it('QR de pago de la tienda y comprobante del pedido', () => {
    const { unmount } = renderBubble(base({ senderId: 8, kind: 'PAYMENT_QR', content: 'QR de pago', meta: { qrUrl: 'https://cdn.example/qr.png' } }));
    expect(screen.getByText('QR de pago de la tienda')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'QR de pago de la tienda' })).toHaveAttribute('src', 'https://cdn.example/qr.png');
    unmount();
    renderBubble(base({ kind: 'PAYMENT_PROOF', content: '', orderId: 55, attachment: { id: 4, mime: 'application/pdf', size: 2048, width: null, height: null, name: 'pago.pdf', url: '/api/chat/files/4?u=7&e=1&s=abc', hidden: false } }));
    expect(screen.getByText('Comprobante del pedido #55')).toBeInTheDocument();
    expect(screen.getByText('pago.pdf').closest('a')).toHaveAttribute('href', '/api/chat/files/4?u=7&e=1&s=abc');
  });

  it('mensaje eliminado y aviso del sistema', () => {
    const { unmount } = renderBubble(base({ deleted: true, content: '' }));
    expect(screen.getByText('Mensaje eliminado')).toBeInTheDocument();
    unmount();
    renderBubble(base({ kind: 'SYSTEM', content: 'Pedido #9', meta: { event: 'ORDER_LINKED', orderId: 9 } }));
    expect(screen.getByText(/Conversación del pedido #9/)).toBeInTheDocument();
  });

  it('acciones: responder, eliminar para mí y para todos (solo propio y reciente)', async () => {
    const onReply = vi.fn();
    const onDelete = vi.fn();
    const { unmount } = renderBubble(base(), { onReply, onDelete });
    await userEvent.click(screen.getByRole('button', { name: 'Opciones del mensaje' }));
    const menu = screen.getByRole('menu');
    expect(within(menu).getByText('Eliminar para todos')).toBeInTheDocument();
    await userEvent.click(within(menu).getByText('Responder'));
    expect(onReply).toHaveBeenCalled();
    unmount();

    renderBubble(base({ senderId: 8 }), { onReply, onDelete });
    await userEvent.click(screen.getByRole('button', { name: 'Opciones del mensaje' }));
    expect(screen.queryByText('Eliminar para todos')).toBeNull();
    await userEvent.click(screen.getByText('Eliminar para mí'));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 10 }), 'me');
  });

  it('reintentar un envío fallido', async () => {
    const onRetry = vi.fn();
    renderBubble(base({ id: -1, clientId: 'cabcdefgh', localStatus: 'failed' }), { onRetry });
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
