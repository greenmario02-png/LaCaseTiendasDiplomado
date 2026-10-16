import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

/** App: moneda, selección del carrito, accesos al pago, datos de pago, QR por archivo y chat al pagar. */

jest.mock('@react-navigation/native', () => {
  const R = require('react');
  return { useFocusEffect: (cb: () => void) => R.useEffect(cb, [cb]), useRoute: () => ({ params: { id: 501 } }) };
});
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn(), launchCameraAsync: jest.fn(), requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })) }));
const mockGet = jest.fn<(...a: any[]) => Promise<any>>();
const mockPost = jest.fn<(...a: any[]) => Promise<any>>();
const mockPut = jest.fn<(...a: any[]) => Promise<any>>(async () => ({ data: {} }));
jest.mock('../services/api', () => ({
  api: Object.assign((...a: any[]) => mockPost(...a), { get: (...a: any[]) => mockGet(...a), post: (...a: any[]) => mockPost(...a), put: (...a: any[]) => mockPut(...a), delete: jest.fn(async () => ({ data: {} })), patch: jest.fn() }),
  getErrorMessage: (e: any) => e?.message ?? 'err',
  onAuthExpired: () => undefined,
  tokenStore: { get: async () => null, set: async () => undefined, clear: async () => undefined },
  refreshTokenStore: { get: async () => null, set: async () => undefined, clear: async () => undefined },
  resolveImageUrl: (u: string) => u,
}));
import '../i18n';
import i18n from 'i18next';
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '../stores/authStore';
import { formatFromBs, useCurrencyStore } from '../services/money';
import { summarizeSelection, useCartSelection } from '../services/payments';
import { pickSafetyTip, SAFETY_TIP_IDS } from '../services/paymentSafety';
import { AccountQuickActions, CurrencyPicker } from '../components/payments/AccountQuickActions';
import { PaymentSafetyTip, QrImageField, StorePaymentCard } from '../components/payments/PaymentBits';
import CartScreen from './CartScreen';
import OrdersScreen from './OrdersScreen';

const CURR = [
  { code: 'BOB', name: 'Boliviano', symbol: 'Bs', rate: 1 },
  { code: 'USD', name: 'Dólar', symbol: 'US$', rate: 10 },
  { code: 'EUR', name: 'Euro', symbol: '€', rate: 12.5 },
];
const CART = {
  subtotal: 150,
  items: [
    { id: 11, quantity: 2, unitPrice: '40', lineTotal: 80, product: { id: 1, name: 'Arroz', price: '40', images: [], seller: { id: 7, storeName: 'Tienda Siete' } } },
    { id: 12, quantity: 1, unitPrice: '70', lineTotal: 70, product: { id: 2, name: 'Azúcar', price: '70', images: [], seller: { id: 9, storeName: 'Tienda Nueve' } } },
  ],
};
const PAYINFO = { storeId: 7, storeName: 'Tienda Siete', available: true, approved: true, full: true, qrUrl: '/uploads/payment-qr/q7-a.png', method: 'BANK', bankName: 'BNB', accountHolder: 'Luis Mamani Cruz', accountNumber: '4455667788', phoneQr: null };

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  i18n.changeLanguage('es');
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  (useAuthStore as any).setState({ user: { id: 5, role: 'CUSTOMER', firstName: 'Ana' } });
  useCurrencyStore.setState({ currencies: CURR, selected: 'BOB', loaded: true });
  useCartSelection.setState({ excluded: [], loaded: true });
  mockGet.mockImplementation(async (url: string) => {
    if (url === '/cart') return { data: { data: CART } };
    if (url === '/orders/buyer/pending-payment-count') return { data: { data: { count: 4 } } };
    if (url === '/orders/buyer') return { data: { data: [] } };
    if (url.startsWith('/stores/')) return { data: { data: PAYINFO } };
    throw new Error(`sin mock ${url}`);
  });
});

describe('Moneda (app)', () => {
  it.each([['BOB', /^Bs 100$/], ['USD', /^US\$ 10,00$/], ['EUR', /^€ 8,00$/]])('%s muestra su denominación', (code, re) => {
    expect(formatFromBs(100, CURR, code)).toMatch(re);
  });
  it('sin tasa conocida cae a Bs; miles con punto; Bs con dos decimales si no es entero', () => {
    expect(formatFromBs(1234567, [], 'USD')).toBe('Bs 1.234.567');
    expect(formatFromBs(1234.5, CURR, 'BOB')).toBe('Bs 1.234,50');
  });
  it('el carrito muestra el total en US$ al elegir dólares en el selector', async () => {
    const s = await render(<CurrencyPicker />);
    await fireEvent.press(s.getByTestId('currency-USD'));
    expect(useCurrencyStore.getState().selected).toBe('USD');
    const c = await render(<CartScreen navigation={{ navigate: jest.fn() }} />);
    expect(await c.findByText('US$ 15,00')).toBeTruthy();
  });
});

describe('Selección del carrito (app)', () => {
  it('resumen puro solo de lo seleccionado, agrupado por tienda', () => {
    const s = summarizeSelection(CART.items, [12]);
    expect(s).toMatchObject({ ids: [11], count: 1, subtotal: 80, allSelected: false });
    expect(s.stores).toEqual([{ storeId: 7, storeName: 'Tienda Siete', subtotal: 80, ids: [11] }]);
  });

  it('casillas por producto/tienda/todo; «Ir a pagar» lleva al checkout solo con lo marcado', async () => {
    const nav = { navigate: jest.fn() };
    const s = await render(<CartScreen navigation={nav} />);
    await s.findByText('Arroz');
    await fireEvent.press(s.getByTestId('select-item-12'));
    expect(useCartSelection.getState().excluded).toEqual([12]);
    expect(s.getByTestId('cart-selected-total').props.children).toBe('Bs 80');
    expect(s.getByText('Ir a pagar (1)')).toBeTruthy();
    await fireEvent.press(s.getByTestId('select-store-7'));
    expect(s.getByText('Ir a pagar (0)')).toBeTruthy();
    await fireEvent.press(s.getByTestId('go-pay'));
    expect(nav.navigate).not.toHaveBeenCalled(); // deshabilitado sin selección
    await fireEvent.press(s.getByTestId('select-all'));
    await fireEvent.press(s.getByTestId('go-pay'));
    expect(nav.navigate).toHaveBeenCalledWith('Checkout');
    // casillas de 44 x 44
    expect(s.getByTestId('select-item-11').props.style).toMatchObject({ width: 44, height: 44 });
  });
});

describe('Accesos directos al pago en el perfil', () => {
  it('muestra el contador de pendientes y navega a pedidos filtrados y a mensajes', async () => {
    const nav = { navigate: jest.fn() };
    const s = await render(<AccountQuickActions navigation={nav} />);
    expect(await s.findByText('4')).toBeTruthy();
    expect(s.getByLabelText('Pagar pedidos pendientes: 4 por pagar')).toBeTruthy();
    await fireEvent.press(s.getByTestId('quick-pay'));
    expect(nav.navigate).toHaveBeenCalledWith('Orders', { pendingPayment: true });
    await fireEvent.press(s.getByTestId('quick-messages'));
    expect(nav.navigate).toHaveBeenCalledWith('Chat');
    await fireEvent.press(s.getByTestId('quick-orders'));
    expect(nav.navigate).toHaveBeenCalledWith('Orders');
  });

  it('la lista de pedidos pide solo los pendientes de pago', async () => {
    await render(<OrdersScreen navigation={{ navigate: jest.fn() }} route={{ params: { pendingPayment: true } }} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/orders/buyer', { params: { limit: 100, payment: 'pending' } }));
  });
});

describe('Datos de pago y aviso de seguridad (app)', () => {
  it('tarjeta con QR, titular, banco y cuenta con botón copiar', async () => {
    const s = await render(<StorePaymentCard storeId={7} info={PAYINFO as never} />);
    expect(s.getByText('4455667788')).toBeTruthy();
    expect(s.getByLabelText('QR de pago de Tienda Siete')).toBeTruthy();
    await fireEvent.press(s.getByLabelText('Copiar Número de cuenta'));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('4455667788');
  });

  it('enmascarado: sin botón copiar', async () => {
    const s = await render(<StorePaymentCard storeId={7} info={{ ...PAYINFO, full: false, accountNumber: '••••••7788' } as never} />);
    expect(s.queryByLabelText('Copiar Número de cuenta')).toBeNull();
    expect(s.getByText(/Verás el número completo/)).toBeTruthy();
  });

  it('aviso aleatorio: > Bs 50 prioriza la tienda física; la función es la misma que en la web', async () => {
    const s = await render(<PaymentSafetyTip amountBs={200} rng={() => 0} />);
    expect(s.getByText(/verifica la existencia física de la tienda antes de pagar/)).toBeTruthy();
    expect(SAFETY_TIP_IDS.length).toBeGreaterThanOrEqual(10);
    expect(pickSafetyTip(10, () => 0)).toBe('qrName');
  });
});

describe('QR de cobro por archivo (sin URL)', () => {
  it('galería -> vista previa -> sube; se puede quitar; no hay campo de texto', async () => {
    const onChange = jest.fn();
    const upload = jest.fn(async () => '/uploads/payment-qr/q5-b.png');
    const pick = jest.fn(async () => ({ uri: 'file:///qr.png', mimeType: 'image/png', fileSize: 1000 }));
    const s = await render(<QrImageField value={null} onChange={onChange} upload={upload} pick={pick} />);
    expect(JSON.stringify(s.toJSON())).not.toContain('"TextInput"');
    await fireEvent.press(s.getByTestId('qr-gallery'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('/uploads/payment-qr/q5-b.png'));
    expect(upload).toHaveBeenCalledWith('file:///qr.png', 'image/png');
    expect(s.getByTestId('qr-preview')).toBeTruthy();
    await fireEvent.press(s.getByTestId('qr-camera'));
    expect(pick).toHaveBeenLastCalledWith('camera');
    await fireEvent.press(s.getByTestId('qr-remove'));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('rechaza imágenes de más de 2 MB antes de subir', async () => {
    const upload = jest.fn(async () => 'x');
    const pick = jest.fn(async () => ({ uri: 'file:///big.jpg', mimeType: 'image/jpeg', fileSize: 3 * 1024 * 1024 }));
    const s = await render(<QrImageField value={null} onChange={jest.fn()} upload={upload} pick={pick} />);
    await fireEvent.press(s.getByTestId('qr-gallery'));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(upload).not.toHaveBeenCalled();
  });
});

describe('Checkout (app): solo lo seleccionado y chat al pagar', () => {
  it('envía cartItemIds y navega al chat del pedido', async () => {
    const CheckoutScreen = require('./CheckoutScreen').default;
    useCartSelection.setState({ excluded: [12], loaded: true });
    mockGet.mockImplementation(async (url: string) => {
      if (url === '/cart') return { data: { data: CART } };
      if (url === '/account/addresses') return { data: { data: [] } };
      if (url.startsWith('/stores/')) return { data: { data: PAYINFO } };
      throw Object.assign(new Error('404'), { response: { status: 404 } });
    });
    mockPost.mockImplementation(async (url: string) => {
      if (url === '/orders') return { data: { data: [{ id: 501, sellerId: 7 }] } };
      if (url === '/chat/order/501/open') return { data: { data: { id: 77 } } };
      return { data: { data: {} } };
    });
    const nav = { navigate: jest.fn() };
    const s = await render(<CheckoutScreen navigation={nav} />);
    expect(await s.findByText('Datos de pago · Tienda Siete')).toBeTruthy();
    expect(s.queryByText('Datos de pago · Tienda Nueve')).toBeNull();
    expect(s.queryByText('Azúcar')).toBeNull();
    expect(s.getAllByTestId('payment-safety-tip').length).toBeGreaterThan(0);
    // retiro en tienda con dirección
    const pickup = s.queryByLabelText(/Retiro en tienda/i) ?? s.queryByText(/Retiro en tienda/i);
    if (pickup) await fireEvent.press(pickup);
    const addr = s.queryByPlaceholderText(i18n.t('mobile.checkout.pickupPlaceholder'));
    if (addr) await fireEvent.changeText(addr, 'En la tienda');
    await fireEvent.press(s.getByTestId('checkout-confirm'));
    await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith('ChatThread', { id: 77, orderId: 501 }));
    const body = mockPost.mock.calls.find((c) => c[0] === '/orders')![1] as any;
    expect(body.cartItemIds).toEqual([11]);
  });
});

describe('Checkout (app): selección vencida', () => {
  it('409 CART_SELECTION_STALE avisa y recarga el carrito', async () => {
    const CheckoutScreen = require('./CheckoutScreen').default;
    mockGet.mockImplementation(async (url: string) => {
      if (url === '/cart') return { data: { data: CART } };
      if (url === '/account/addresses') return { data: { data: [{ id: 3, street: 'Calle 1', city: 'La Paz', isDefault: true }] } };
      if (url.startsWith('/stores/')) return { data: { data: PAYINFO } };
      throw Object.assign(new Error('404'), { response: { status: 404 } });
    });
    mockPost.mockImplementation(async (url: string) => {
      if (url === '/orders') throw Object.assign(new Error('409'), { response: { status: 409, data: { error: { code: 'CART_SELECTION_STALE', message: 'x' } } } });
      return { data: { data: {} } };
    });
    const nav = { navigate: jest.fn() };
    const s = await render(<CheckoutScreen navigation={nav} />);
    await s.findByText('Datos de pago · Tienda Siete');
    const cartCalls = () => mockGet.mock.calls.filter((c) => c[0] === '/cart').length;
    const before = cartCalls();
    await fireEvent.press(s.getByTestId('checkout-confirm'));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith(expect.any(String), expect.stringMatching(/Tu carrito cambió/)));
    await waitFor(() => expect(cartCalls()).toBeGreaterThan(before));
    expect(nav.navigate).not.toHaveBeenCalledWith('ChatThread', expect.anything());
  });
});

describe('Editar tienda (app): QR de cobro por archivo', () => {
  it('sube la imagen y la guarda con PUT /seller/profile; no hay campo de URL', async () => {
    const EditStoreScreen = require('./EditStoreScreen').default;
    (useAuthStore as any).setState({ user: { id: 5, role: 'SELLER', firstName: 'Ana', storeName: 'Tienda Cinco', paymentQrUrl: null }, refreshUser: jest.fn(async () => undefined) });
    const ImagePicker = require('expo-image-picker');
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///qr.png', mimeType: 'image/png', fileSize: 1000 }] });
    mockPost.mockImplementation(async (url: string) => {
      if (url === '/payout-account/qr-image') return { data: { data: { url: '/uploads/payment-qr/q5-c.png' } } };
      return { data: { data: {} } };
    });
    const nav = { navigate: jest.fn(), goBack: jest.fn() };
    const s = await render(<EditStoreScreen navigation={nav} />);
    await fireEvent.press(s.getByTestId('qr-gallery'));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/payout-account/qr-image', expect.anything(), expect.anything()));
    await fireEvent.press(s.getByText(i18n.t('mobile.common.saveChanges')));
    await waitFor(() => expect(mockPut).toHaveBeenCalledWith('/seller/profile', expect.objectContaining({ paymentQrUrl: '/uploads/payment-qr/q5-c.png' })));
    await fireEvent.press(s.getByTestId('qr-remove'));
    await fireEvent.press(s.getByText(i18n.t('mobile.common.saveChanges')));
    await waitFor(() => expect(mockPut).toHaveBeenLastCalledWith('/seller/profile', expect.objectContaining({ paymentQrUrl: null })));
  });
});
