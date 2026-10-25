import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

jest.mock('@react-navigation/native', () => {
  const R = require('react');
  return { useFocusEffect: (cb: () => void) => R.useEffect(cb, [cb]) };
});
const mockGet = jest.fn<(...a: any[]) => Promise<any>>();
const mockPost = jest.fn<(...a: any[]) => Promise<any>>();
jest.mock('../services/api', () => ({
  api: { get: (...a: any[]) => mockGet(...a), post: (...a: any[]) => mockPost(...a), put: jest.fn(), delete: jest.fn(), patch: jest.fn() },
  getErrorMessage: (e: any) => e?.message ?? 'err',
  onAuthExpired: () => undefined,
  tokenStore: { get: async () => null, set: async () => undefined, clear: async () => undefined },
  refreshTokenStore: { get: async () => null, set: async () => undefined, clear: async () => undefined },
  resolveImageUrl: (u: string) => u,
}));
import '../i18n';
import i18n from 'i18next';
import AddressesScreen from './AddressesScreen';
import { canonicalDepartment } from '../services/boliviaDepartments';
import { formatShippingAddress } from '../services/address';

const NINE = ['Beni', 'Chuquisaca', 'Cochabamba', 'La Paz', 'Oruro', 'Pando', 'Potosí', 'Santa Cruz', 'Tarija'];
const nav = { goBack: jest.fn() };

let alertSpy: any;
beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  i18n.changeLanguage('es');
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  mockGet.mockImplementation(async (url: string) => {
    if (url === '/account/addresses') return { data: { data: [] } };
    throw new Error('url inesperada ' + url);
  });
  mockPost.mockResolvedValue({ data: { data: { id: 1 } } });
});

async function openForm() {
  const ui = await render(<AddressesScreen navigation={nav} />);
  await fireEvent.press(await ui.findByText('+ Agregar dirección'));
  return ui;
}

describe('AddressesScreen — direcciones con formato de Bolivia', () => {
  it('muestra los 9 departamentos para elegir con un toque', async () => {
    const ui = await openForm();
    expect(ui.getByText('Departamento')).toBeTruthy();
    for (const d of NINE) expect(ui.getByTestId(`department-picker-${d}`)).toBeTruthy();
    await fireEvent.press(ui.getByTestId('department-picker-Potosí'));
    expect(ui.getByTestId('department-picker-Potosí').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('guarda sin código postal (lo envía como null) y con el departamento elegido', async () => {
    const ui = await openForm();
    expect(ui.getByPlaceholderText('Código postal (opcional)')).toBeTruthy();
    await fireEvent.changeText(ui.getByPlaceholderText('Calle'), 'Calle Sucre');
    await fireEvent.changeText(ui.getByPlaceholderText('Número'), '10');
    await fireEvent.changeText(ui.getByPlaceholderText('Ciudad'), 'Tarija');
    await fireEvent.press(ui.getByTestId('department-picker-Tarija'));
    await fireEvent.press(ui.getByText('Guardar dirección'));
    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost).toHaveBeenCalledWith('/account/addresses', expect.objectContaining({ street: 'Calle Sucre', city: 'Tarija', state: 'Tarija', postalCode: null }));
  });

  it('sin departamento no envía nada y lo explica', async () => {
    const ui = await openForm();
    await fireEvent.changeText(ui.getByPlaceholderText('Calle'), 'Calle Sucre');
    await fireEvent.changeText(ui.getByPlaceholderText('Ciudad'), 'Tarija');
    await fireEvent.press(ui.getByText('Guardar dirección'));
    expect(await ui.findByText('Elige uno de los 9 departamentos de Bolivia')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('una dirección sin CP se lista sin «CP» ni «null»', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url === '/account/addresses') return { data: { data: [{ id: 4, street: 'Calle Sucre', number: '10', city: 'Tarija', state: 'Tarija', postalCode: null, isDefault: true }] } };
      throw new Error('url inesperada ' + url);
    });
    const ui = await render(<AddressesScreen navigation={nav} />);
    expect(await ui.findByText('Tarija, Tarija')).toBeTruthy();
    expect(ui.queryByText(/CP/)).toBeNull();
  });
});

describe('helpers de dirección (móvil)', () => {
  it('canonicalDepartment usa el mismo catálogo de 9', () => {
    expect(canonicalDepartment('potosi')).toBe('Potosí');
    expect(canonicalDepartment('Dpto. Santa Cruz')).toBe('Santa Cruz');
    expect(canonicalDepartment('CABA')).toBeNull();
  });

  it('formatShippingAddress no muestra «undefined» ni partes vacías', () => {
    expect(formatShippingAddress({ street: 'Calle Sucre', number: '10', city: 'Tarija', state: 'Tarija' })).toBe('Calle Sucre 10, Tarija, Tarija');
    expect(formatShippingAddress({ street: 'Av. Bolívar', number: null, floor: 'Piso 2', city: 'Sucre', state: 'Chuquisaca' })).toBe('Av. Bolívar, Piso 2, Sucre, Chuquisaca');
  });
});
