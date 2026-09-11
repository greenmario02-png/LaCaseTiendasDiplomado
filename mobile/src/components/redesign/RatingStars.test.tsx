import { describe, it, expect, jest } from '@jest/globals';
import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { RatingStars } from './RatingStars';
import { CountdownTimer } from './CountdownTimer';

describe('RatingStars', () => {
  it('muestra la calificación', async () => {
    const { getByText } = await render(<RatingStars rating={4.5} count={12} />);
    expect(getByText(/4\.5/)).toBeTruthy();
    expect(getByText(/12/)).toBeTruthy();
  });
});

describe('CountdownTimer', () => {
  it('muestra el tiempo restante formateado', async () => {
    jest.useFakeTimers();
    const target = Date.now() + 86400000 + 3600000 + 60000 + 5000; // 1d 1h 1m 5s
    const { getByText } = await render(<CountdownTimer target={target} />);
    expect(getByText(/01:01:01:05/)).toBeTruthy();
    jest.useRealTimers();
  });
});
