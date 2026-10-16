import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ChatPage from './ChatPage';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';

const socketHandlers: Record<string, (p: unknown) => void> = {};
const fakeSocket = {
  on: vi.fn((ev: string, fn: (p: unknown) => void) => {
    socketHandlers[ev] = fn;
  }),
  off: vi.fn(),
  emit: vi.fn(),
};

vi.mock('../services/socket', () => ({
  connectSocket: () => fakeSocket,
  disconnectSocket: vi.fn(),
  getSocket: () => fakeSocket,
  sendTyping: vi.fn(),
}));


const now = new Date().toISOString();
const conversations = [
  {
    id: 1, buyerId: 7, sellerId: 20, updatedAt: now, unreadCount: 2, muted: false,
    seller: { id: 20, storeName: 'Tienda Sol' }, buyer: { id: 7, firstName: 'Ana', lastName: 'Paz' },
    product: { id: 3, name: 'Laptop Lenovo', images: [] },
    lastMessage: { id: 5, kind: 'IMAGE', content: '', senderId: 20, createdAt: now, hasImage: true },
  },
  {
    id: 2, buyerId: 7, sellerId: 21, updatedAt: now, unreadCount: 0, muted: true,
    seller: { id: 21, storeName: 'Ferretería Ñandú' }, buyer: { id: 7, firstName: 'Ana', lastName: 'Paz' },
    lastMessage: { id: 6, kind: 'TEXT', content: 'Gracias', senderId: 7, createdAt: now, readAt: now, deliveredAt: now },
  },
  {
    id: 3, buyerId: 30, sellerId: 7, orderId: 77, updatedAt: now, unreadCount: 0, muted: false,
    seller: { id: 7, storeName: 'Mi tienda' }, buyer: { id: 30, firstName: 'Luis', lastName: 'Rojas' },
    lastMessage: { id: 7, kind: 'SYSTEM', content: 'Pedido #77', senderId: 7, createdAt: now },
    order: { id: 77, status: 'PENDING', paymentStatus: 'PENDING', total: 150 },
  },
];

const orderPage = {
  id: 3, buyerId: 30, sellerId: 7, orderId: 77, role: 'SELLER', updatedAt: now,
  seller: { id: 7, storeName: 'Mi tienda' }, buyer: { id: 30, firstName: 'Luis', lastName: 'Rojas' },
  hasMore: false, muted: false, blockedByMe: false, canSend: true, 
  order: { id: 77, status: 'PENDING', paymentStatus: 'PENDING', paymentMethod: 'QR', total: 150, subtotal: 150, shippingCost: null, createdAt: now, items: [{ productId: 3, name: 'Laptop Lenovo', quantity: 1, unitPrice: 150, image: null }] },
  messages: [{ id: 7, conversationId: 3, senderId: 7, kind: 'SYSTEM', content: 'Pedido #77', createdAt: now, meta: { event: 'ORDER_LINKED', orderId: 77 } }],
};

vi.mock('../services/api', () => ({
  resolveImageUrl: (u?: string | null) => u ?? '',
  getErrorMessage: (e: unknown) => (e as Error).message,
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    delete: vi.fn(() => Promise.resolve({ data: { data: {} } })),
  },
}));

const mocked = api as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/mensajes" element={<ChatPage />} />
        <Route path="/mensajes/:id" element={<ChatPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.setItem('accessToken', 'tok');
  useAuthStore.setState({ user: { id: 7, email: 'a@a.com', firstName: 'Ana', lastName: 'Paz', role: 'SELLER' } as never });
  mocked.get.mockImplementation((url: string) => {
    if (url === '/chat') return Promise.resolve({ data: { data: conversations } });
    if (url === '/chat/icebreakers') return Promise.resolve({ data: { data: { icebreakers: [] } } });
    if (url === '/chat/3') return Promise.resolve({ data: { data: orderPage } });
    if (url.endsWith('/suggestions?inactivityMinutes=10')) return Promise.resolve({ data: { data: null } });
    return Promise.resolve({ data: { data: {} } });
  });
  mocked.post.mockImplementation((url: string, body: { content?: string; clientId?: string }) => {
    if (url === '/chat/3/messages') return Promise.resolve({ data: { data: { id: 99, conversationId: 3, senderId: 7, kind: 'TEXT', content: body.content, clientId: body.clientId, createdAt: new Date().toISOString(), deliveredAt: null, readAt: null } } });
    if (url === '/chat/3/payment-qr') return Promise.resolve({ data: { data: { id: 100, conversationId: 3, senderId: 7, kind: 'PAYMENT_QR', content: 'QR de pago', clientId: (body as { clientId: string }).clientId, createdAt: new Date().toISOString(), meta: { qrUrl: '/uploads/qr.png' } } } });
    return Promise.resolve({ data: { data: {} } });
  });
});

describe('ChatPage (chat mejorado)', () => {
  it('lista con último mensaje, no leídos, silenciadas y búsqueda sin tildes', async () => {
    renderAt('/mensajes');
    const sol = await screen.findByRole('button', { name: /Tienda Sol, 2 sin leer/ });
    expect(within(sol).getByText('Foto')).toBeInTheDocument();
    const nandu = screen.getByRole('button', { name: 'Ferretería Ñandú' });
    expect(within(nandu).getByLabelText('Silenciada')).toBeInTheDocument();
    expect(within(nandu).getByRole('img', { name: 'Leído' })).toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: 'Buscar conversación' }), 'nandu');
    expect(screen.queryByRole('button', { name: /Tienda Sol/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ferretería Ñandú' })).toBeInTheDocument();
  });

  it('conversación de un pedido: tarjeta fija con monto y atajo "Enviar mi QR" para la tienda', async () => {
    renderAt('/mensajes/3');
    expect(await screen.findByRole('region', { name: 'Pedido #77' })).toBeInTheDocument();
    expect(screen.getByText(/Pedido #77 · Bs 150/)).toBeInTheDocument();
    expect(screen.getByText(/Conversación del pedido #77/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar mi QR' }));
    await waitFor(() => expect(mocked.post).toHaveBeenCalledWith('/chat/3/payment-qr', expect.objectContaining({ clientId: expect.stringMatching(/^[A-Za-z0-9_-]{8,64}$/) })));
    expect(await screen.findByText('QR de pago de la tienda')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar comprobante' })).toBeNull();
  });

  it('envío optimista con clientId; el eco del socket no duplica el mensaje', async () => {
    renderAt('/mensajes/3');
    await screen.findByRole('region', { name: 'Pedido #77' });
    const box = screen.getByRole('textbox', { name: 'Escribe un mensaje...' });
    await userEvent.type(box, 'Hola Luis{Enter}');
    expect(screen.getByText('Hola Luis')).toBeInTheDocument();
    await waitFor(() => expect(mocked.post).toHaveBeenCalledWith('/chat/3/messages', expect.objectContaining({ content: 'Hola Luis' })));
    const sent = mocked.post.mock.calls.find((c) => c[0] === '/chat/3/messages')![1] as { clientId: string };
    socketHandlers['chat:message']?.({ conversationId: 3, message: { id: 99, conversationId: 3, senderId: 7, kind: 'TEXT', content: 'Hola Luis', clientId: sent.clientId, createdAt: new Date().toISOString() } });
    await waitFor(() => expect(screen.getAllByText('Hola Luis')).toHaveLength(1));
  });
});
