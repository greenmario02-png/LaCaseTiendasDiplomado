import { describe, it, expect, jest } from '@jest/globals';
import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { EmptyState, LoadingState, ErrorState } from './States';

describe('States', () => {
  it('EmptyState muestra mensaje', async () => {
    const { getByText } = await render(<EmptyState message="No hay productos" />);
    expect(getByText('No hay productos')).toBeTruthy();
  });

  it('LoadingState muestra testID loading', async () => {
    const { getByTestId } = await render(<LoadingState />);
    expect(getByTestId('loading')).toBeTruthy();
  });

  it('ErrorState muestra mensaje y Reintentar dispara onRetry', async () => {
    const onRetry = jest.fn();
    const { getByText } = await render(<ErrorState message="Error de red" onRetry={onRetry} />);
    fireEvent.press(getByText('Reintentar'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
