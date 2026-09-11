import { describe, it, expect } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import { CoinChip } from './CoinChip';
import { KarmaLevelBadge } from './KarmaLevelBadge';

describe('CoinChip', () => {
  it('muestra el saldo con moneda', async () => {
    const { getByText } = await render(<CoinChip amount={251} />);
    expect(getByText(/251/)).toBeTruthy();
  });
});

describe('KarmaLevelBadge', () => {
  it('muestra el nivel', async () => {
    const { getByText } = await render(<KarmaLevelBadge level="Colaborador" />);
    expect(getByText('Colaborador')).toBeTruthy();
  });
});
