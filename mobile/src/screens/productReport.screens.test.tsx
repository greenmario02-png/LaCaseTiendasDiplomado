import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

/** App: menú "..." de la ficha de producto para denunciar vendedor, tienda o producto. */

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn(), launchCameraAsync: jest.fn(), requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })) }));
const mockGet = jest.fn<(...a: any[]) => Promise<any>>();
const mockPost = jest.fn<(...a: any[]) => Promise<any>>();
jest.mock('../services/api', () => ({
  api: Object.assign((...a: any[]) => mockPost(...a), { get: (...a: any[]) => mockGet(...a), post: (...a: any[]) => mockPost(...a), put: jest.fn(), delete: jest.fn(), patch: jest.fn() }),
  getErrorMessage: (e: any) => e?.message ?? 'err',
  onAuthExpired: () => undefined,
  tokenStore: { get: async () => null, set: async () => undefined, clear: async () => undefined },
  refreshTokenStore: { get: async () => null, set: async () => undefined, clear: async () => undefined },
  resolveImageUrl: (u: string) => u,
}));
import '../i18n';
import i18n from 'i18next';
import { useAuthStore } from '../stores/authStore';
import ProductDetailScreen from './ProductDetailScreen';

const PRODUCT = { id: 15, name: 'Laptop', price: '100', stock: 3, images: [], seller: { id: 7, storeName: 'Tienda Siete' } };

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  i18n.changeLanguage('es');
  mockGet.mockImplementation(async (url: string) => {
    if (url === '/products/15') return { data: { data: PRODUCT } };
    if (url === '/products/15/reviews') return { data: { data: [] } };
    return { data: { data: {} } };
  });
  mockPost.mockImplementation(async () => ({ data: { data: {} } }));
});

/** Pulsa el botón indicado (por texto) del último Alert.alert mostrado. */
function pressAlertButton(spy: ReturnType<typeof jest.spyOn>, text: string) {
  const buttons = (spy.mock.calls.at(-1)?.[2] ?? []) as Array<{ text: string; onPress?: () => unknown }>;
  return buttons.find((b) => b.text === text)?.onPress?.();
}

describe('Ficha de producto (app): denuncias', () => {
  it('denunciar la tienda envía el id del vendedor tras confirmar', async () => {
    (useAuthStore as any).setState({ user: { id: 5, role: 'CUSTOMER', firstName: 'Ana' } });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const s = await render(<ProductDetailScreen route={{ params: { id: 15 } }} navigation={{ navigate: jest.fn() }} />);
    await fireEvent.press(await s.findByTestId('more-options-button'));
    expect(s.getByText('Denunciar vendedor')).toBeTruthy();
    expect(s.getByText('Producto inadecuado')).toBeTruthy();
    await fireEvent.press(s.getByTestId('report-REPORT_STORE'));
    expect(alert).toHaveBeenLastCalledWith('Denunciar tienda', expect.any(String), expect.any(Array));
    expect(mockPost).not.toHaveBeenCalledWith('/catalog-reports', expect.anything());
    await pressAlertButton(alert, 'Enviar');
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/catalog-reports', { targetType: 'STORE', targetId: 7, reason: 'TIENDA_SOSPECHOSA' }));
    await waitFor(() => expect(alert).toHaveBeenLastCalledWith('Denuncia enviada', expect.any(String)));
  });

  it('sin sesión pide iniciarla y no envía nada', async () => {
    (useAuthStore as any).setState({ user: null });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const nav = { navigate: jest.fn() };
    const s = await render(<ProductDetailScreen route={{ params: { id: 15 } }} navigation={nav} />);
    await fireEvent.press(await s.findByTestId('more-options-button'));
    await fireEvent.press(s.getByTestId('report-REPORT_PRODUCT'));
    expect(alert.mock.calls.at(-1)?.[1]).toBe(i18n.t('mobile.catalogReport.loginRequired'));
    expect(mockPost).not.toHaveBeenCalledWith('/catalog-reports', expect.anything());
  });
});
