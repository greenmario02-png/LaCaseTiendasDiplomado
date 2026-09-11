import { describe, it, expect, jest } from '@jest/globals';
import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { NeoInput } from './NeoInput';
import { PriceDisplay, fmtBs } from './PriceDisplay';

describe('NeoInput', () => {
  it('muestra label y placeholder, y dispara onChangeText', async () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = await render(
      <NeoInput label="Email" placeholder="tucorreo@mail.com" onChangeText={onChangeText} />,
    );
    fireEvent.changeText(getByPlaceholderText('tucorreo@mail.com'), 'hola@mail.com');
    expect(onChangeText).toHaveBeenCalledWith('hola@mail.com');
  });

  it('no dispara onChangeText si no se provee', async () => {
    const { getByPlaceholderText } = await render(<NeoInput placeholder="Solo lectura" />);
    fireEvent.changeText(getByPlaceholderText('Solo lectura'), 'x');
  });
});

describe('PriceDisplay / fmtBs', () => {
  it('formatea Bs con miles y decimales (es-ES)', () => {
    expect(fmtBs(4035.04)).toBe('4.035,04');
    expect(fmtBs(251)).toBe('251');
    expect(fmtBs(1234567.5)).toBe('1.234.567,50');
  });

  it('muestra precio y precio tachado cuando hay salePrice', async () => {
    const { getByText } = await render(<PriceDisplay price={200} salePrice={150} currency="Bs" />);
    expect(getByText(/Bs 200/)).toBeTruthy();
    expect(getByText(/Bs 150/)).toBeTruthy();
  });
});
