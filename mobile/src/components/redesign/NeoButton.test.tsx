import { describe, it, expect, jest } from '@jest/globals';
import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { NeoButton } from './NeoButton';

describe('NeoButton', () => {
  it('muestra el título y dispara onPress', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<NeoButton title="Ingresar" onPress={onPress} />);
    fireEvent.press(getByText('Ingresar'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no dispara onPress cuando está deshabilitado', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<NeoButton title="Guardar" onPress={onPress} disabled />);
    fireEvent.press(getByText('Guardar'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('aplica variantes primary, secondary y ghost con testID', async () => {
    const { getByTestId } = await render(
      <>
        <NeoButton title="A" onPress={() => {}} variant="primary" testID="btn-a" />
        <NeoButton title="B" onPress={() => {}} variant="secondary" testID="btn-b" />
        <NeoButton title="C" onPress={() => {}} variant="ghost" testID="btn-c" />
      </>,
    );
    expect(getByTestId('btn-a')).toBeTruthy();
    expect(getByTestId('btn-b')).toBeTruthy();
    expect(getByTestId('btn-c')).toBeTruthy();
  });
});
