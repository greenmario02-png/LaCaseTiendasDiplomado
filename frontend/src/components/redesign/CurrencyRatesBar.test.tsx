import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CurrencyRatesBar } from './CurrencyRatesBar';

const rates = {
  usd: 6.96,
  eur: 8.03,
  jpy: 0.05,
  usdt: 6.95,
};

describe('CurrencyRatesBar', () => {
  it('muestra las 4 cotizaciones en Bs', () => {
    render(
      <MemoryRouter>
        <CurrencyRatesBar rates={rates} />
      </MemoryRouter>
    );
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('EUR')).toBeInTheDocument();
    expect(screen.getByText('JPY')).toBeInTheDocument();
    expect(screen.getByText('USDT')).toBeInTheDocument();
    expect(screen.getByText('6,96 Bs')).toBeInTheDocument();
    expect(screen.getByText('8,03 Bs')).toBeInTheDocument();
  });

  it('muestra link a la calculadora', () => {
    render(
      <MemoryRouter>
        <CurrencyRatesBar rates={rates} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Calculadora/)).toBeInTheDocument();
  });
});
