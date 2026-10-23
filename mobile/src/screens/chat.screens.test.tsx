import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) }));
jest.mock('@react-navigation/native', () => {
  const R = require('react');
  return { useFocusEffect: (cb: () => void) => R.useEffect(cb, [cb]) };
});
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn(), launchCameraAsync: jest.fn(), requestCameraPermissionsAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

const mockHandlers: Record<string, (p: any) => void> = {};
const mockSocket = {
  connected: true,
  on: jest.fn((ev: string, fn: (p: any) => void) => {
    mockHandlers[ev] = fn;
  }),
  off: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
};
jest.mock('socket.io-client', () => ({ io: () => mockSocket }));

const mockGet = jest.fn<(...a: any[]) => Promise<any>>();
const mockPost = jest.fn<(...a: any[]) => Promise<any>>();
const mockPut = jest.fn<(...a: any[]) => Promise<any>>();
jest.mock('../services/api', () => ({
  api: { get: (...a: any[]) => mockGet(...a), post: (...a: any[]) => mockPost(...a), put: (...a: any[]) => mockPut(...a), delete: jest.fn(async () => ({ data: { data: {} } })) },
  getErrorMessage: (e: any) => e?.message ?? 'err',
  onAuthExpired: () => undefined,
  tokenStore: { get: async () => 'tok', set: async () => undefined, clear: async () => undefined },
  refreshTokenStore: { get: async () => null, set: async () => undefined, clear: async () => undefined },
  resolveImageUrl: (u: string) => u,
}));

import '../i18n';
import i18n from 'i18next';
import ChatScreen from './ChatScreen';
import ChatThreadScreen from './ChatThreadScreen';
import { useAuthStore } from '../stores/authStore';
import { __resetChatSocket } from '../services/chat';

const now = new Date().toISOString();
const LIST = [
  { id: 1, buyerId: 7, sellerId: 20, updatedAt: now, unreadCount: 3, muted: true, buyer: { id: 7, firstName: 'Ana', lastName: 'Paz' }, seller: { id: 20, storeName: 'Tienda Sol' }, product: { id: 3, name: 'Laptop', images: [] }, lastMessage: { id: 9, kind: 'IMAGE', content: '', senderId: 20, createdAt: now, hasImage: true } },
  { id: 2, buyerId: 7, sellerId: 21, updatedAt: now, unreadCount: 0, buyer: { id: 7, firstName: 'Ana', lastName: 'Paz' }, seller: { id: 21, storeName: 'Ferretería Ñandú' }, lastMessage: { id: 10, kind: 'TEXT', content: 'Gracias', senderId: 7, createdAt: now, readAt: now } },
];
const PAGE = {
  id: 3, buyerId: 7, sellerId: 20, orderId: 77, role: 'BUYER', canSend: true, blockedByMe: false, muted: false, hasMore: false,
  buyer: { id: 7, firstName: 'Ana', lastName: 'Paz' }, seller: { id: 20, storeName: 'Tienda Sol' },
  order: { id: 77, status: 'PENDING', paymentStatus: 'PENDING', total: 150, items: [{ productId: 3, name: 'Laptop', quantity: 1, unitPrice: 150, image: null }] },
  messages: [
    { id: 5, conversationId: 3, senderId: 20, kind: 'PAYMENT_QR', content: 'QR de pago', createdAt: now, meta: { qrUrl: '/uploads/qr.png' } },
    { id: 6, conversationId: 3, senderId: 7, kind: 'TEXT', content: 'Listo, pago ahora', createdAt: now, deliveredAt: now, readAt: now },
  ],
};
// Misma conversación #3, pero vista del vendedor (id 20) con un comprobante recién enviado por el comprador.
const PAGE_SELLER_PROOF = {
  ...PAGE,
  role: 'SELLER',
  order: { ...PAGE.order, paymentStatus: 'PROOF_SUBMITTED' },
};

beforeEach(() => {
  __resetChatSocket();
  mockGet.mockReset();
  mockPost.mockReset();
  mockPut.mockReset();
  void i18n.changeLanguage('es');
  useAuthStore.setState({ user: { id: 7, email: 'a@a.com', firstName: 'Ana', lastName: 'Paz', role: 'CUSTOMER' } as any });
  mockGet.mockImplementation(async (url: string) => {
    if (url === '/chat') return { data: { data: LIST } };
    if (url === '/chat/3') return { data: { data: PAGE } };
    return { data: { data: null } };
  });
  mockPost.mockImplementation(async (url: string, body: any) => {
    if (url === '/chat/3/messages') return { data: { data: { id: 50, conversationId: 3, senderId: 7, kind: 'TEXT', content: body.content, clientId: body.clientId, createdAt: new Date().toISOString() } } };
    return { data: { data: {} } };
  });
  mockPut.mockImplementation(async () => ({ data: { data: {} } }));
});

describe('Chat (móvil) — lista', () => {
  it('muestra no leídos, silenciada, último mensaje con tipo y filtra sin tildes', async () => {
    const { findByLabelText, getByLabelText, queryByLabelText, getByText } = await render(<ChatScreen navigation={{ navigate: jest.fn() }} />);
    expect(await findByLabelText('Tienda Sol, 3 sin leer')).toBeTruthy();
    expect(getByText('Foto')).toBeTruthy();
    expect(getByLabelText('Silenciada')).toBeTruthy();
    expect(getByLabelText('Leído')).toBeTruthy();
    fireEvent.changeText(getByLabelText('Buscar conversación'), 'nandu');
    await waitFor(() => expect(queryByLabelText('Tienda Sol, 3 sin leer')).toBeNull());
    expect(getByLabelText('Ferretería Ñandú')).toBeTruthy();
  });
});

describe('Chat (móvil) — conversación', () => {
  it('tarjeta del pedido con "Enviar comprobante" para el comprador, QR de la tienda y checks con iconos', async () => {
    const { findByText, getByText, getByLabelText, queryByText } = await render(<ChatThreadScreen route={{ params: { id: 3 } }} navigation={{ goBack: jest.fn() }} />);
    expect(await findByText(/Pedido #77 · Bs 150/)).toBeTruthy();
    expect(getByText('Enviar comprobante')).toBeTruthy();
    expect(queryByText('Enviar mi QR')).toBeNull();
    expect(getByText('QR de pago de la tienda')).toBeTruthy();
    expect(getByLabelText('Leído')).toBeTruthy();
  });

  it('envío optimista con clientId; el eco del socket no duplica', async () => {
    const { findByText, getByLabelText, getAllByText, findByDisplayValue } = await render(<ChatThreadScreen route={{ params: { id: 3 } }} navigation={{ goBack: jest.fn() }} />);
    await findByText(/Pedido #77/);
    fireEvent.changeText(getByLabelText('Escribe un mensaje...'), 'Hola tienda');
    await findByDisplayValue('Hola tienda');
    fireEvent.press(getByLabelText('Enviar'));
    await waitFor(() => expect(mockPost.mock.calls.map((x) => x[0])).toContain('/chat/3/messages'));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/chat/3/messages', expect.objectContaining({ content: 'Hola tienda', clientId: expect.stringMatching(/^[A-Za-z0-9_-]{8,64}$/) })));
    const clientId = (mockPost.mock.calls.find((c) => c[0] === '/chat/3/messages')![1] as any).clientId;
    mockHandlers['chat:message']?.({ conversationId: 3, message: { id: 50, conversationId: 3, senderId: 7, kind: 'TEXT', content: 'Hola tienda', clientId, createdAt: new Date().toISOString() } });
    await waitFor(() => expect(getAllByText('Hola tienda')).toHaveLength(1));
  });

  it('el comprador nunca ve los botones de verificación de pago, ni aunque el comprobante ya esté enviado', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url === '/chat/3') return { data: { data: { ...PAGE, order: { ...PAGE.order, paymentStatus: 'PROOF_SUBMITTED' } } } };
      return { data: { data: null } };
    });
    const { findByText, queryByText } = await render(<ChatThreadScreen route={{ params: { id: 3 } }} navigation={{ goBack: jest.fn() }} />);
    await findByText(/Pedido #77/);
    expect(queryByText('Marcar como pagado')).toBeNull();
    expect(queryByText('Rechazar comprobante')).toBeNull();
  });

  it('el vendedor ve "Marcar como pagado"/"Rechazar comprobante" solo cuando el comprobante está enviado (PROOF_SUBMITTED)', async () => {
    // Vista del vendedor (id 20) con paymentStatus PENDING todavía: no hay nada que verificar.
    useAuthStore.setState({ user: { id: 20, email: 'v@a.com', firstName: 'Mateo', lastName: '', role: 'SELLER' } as any });
    mockGet.mockImplementation(async (url: string) => {
      if (url === '/chat/3') return { data: { data: { ...PAGE, role: 'SELLER' } } };
      return { data: { data: null } };
    });
    const { findByText, queryByText, getByText } = await render(<ChatThreadScreen route={{ params: { id: 3 } }} navigation={{ goBack: jest.fn() }} />);
    await findByText(/Pedido #77/);
    expect(queryByText('Marcar como pagado')).toBeNull();
    expect(getByText('Enviar mi QR')).toBeTruthy();
  });

  it('el vendedor marca el pago como confirmado: pide confirmación, llama al PUT ya existente del backend y actualiza el estado sin recargar', async () => {
    useAuthStore.setState({ user: { id: 20, email: 'v@a.com', firstName: 'Mateo', lastName: '', role: 'SELLER' } as any });
    mockGet.mockImplementation(async (url: string) => {
      if (url === '/chat/3') return { data: { data: PAGE_SELLER_PROOF } };
      return { data: { data: null } };
    });
    mockPut.mockImplementation(async () => ({ data: { data: { id: 77, status: 'CONFIRMED', paymentStatus: 'VERIFIED' } } }));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => { void buttons?.[1]?.onPress?.(); });

    const { findByText, getByText, queryByText, getByLabelText } = await render(<ChatThreadScreen route={{ params: { id: 3 } }} navigation={{ goBack: jest.fn() }} />);
    await findByText(/Pedido #77/);
    expect(getByText('Marcar como pagado')).toBeTruthy();
    expect(getByText('Rechazar comprobante')).toBeTruthy();

    fireEvent.press(getByLabelText('Marcar como pagado'));

    expect(alert).toHaveBeenCalledWith('Marcar como pagado', expect.any(String), expect.any(Array));
    await waitFor(() => expect(mockPut).toHaveBeenCalledWith('/orders/seller/77/payment-status', { paymentStatus: 'VERIFIED' }));
    await waitFor(() => expect(queryByText('Marcar como pagado')).toBeNull());
    expect(getByText('Pago confirmado')).toBeTruthy();
    alert.mockRestore();
  });

  it('el vendedor rechaza el comprobante: llama al PUT con REJECTED tras confirmar', async () => {
    useAuthStore.setState({ user: { id: 20, email: 'v@a.com', firstName: 'Mateo', lastName: '', role: 'SELLER' } as any });
    mockGet.mockImplementation(async (url: string) => {
      if (url === '/chat/3') return { data: { data: PAGE_SELLER_PROOF } };
      return { data: { data: null } };
    });
    mockPut.mockImplementation(async () => ({ data: { data: { id: 77, status: 'PENDING', paymentStatus: 'REJECTED' } } }));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => { void buttons?.[1]?.onPress?.(); });

    const { findByText, getByLabelText, queryByText } = await render(<ChatThreadScreen route={{ params: { id: 3 } }} navigation={{ goBack: jest.fn() }} />);
    await findByText(/Pedido #77/);

    fireEvent.press(getByLabelText('Rechazar comprobante'));

    await waitFor(() => expect(mockPut).toHaveBeenCalledWith('/orders/seller/77/payment-status', { paymentStatus: 'REJECTED' }));
    await waitFor(() => expect(queryByText('Rechazar comprobante')).toBeNull());
    alert.mockRestore();
  });
});
