import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriceDisplay } from './PriceDisplay';
import { CoinChip } from './CoinChip';

describe('PriceDisplay', () => {
  it('formatea el precio en Bs con formato es-ES', () => {
    render(<PriceDisplay price={13545.04} />);
    expect(screen.getByText('Bs 13.545,04')).toBeInTheDocument();
  });

  it('muestra salePrice tachado en esmeralda cuando existe', () => {
    const { container } = render(<PriceDisplay price={4035.04} salePrice={3500} />);
    expect(screen.getByText('Bs 3.500,00')).toBeInTheDocument();
    expect(screen.getByText('Bs 4.035,04')).toBeInTheDocument();
    expect(container.querySelector('s')).toBeInTheDocument();
  });

  it('acepta priceUsd opcional', () => {
    render(<PriceDisplay price={100} priceUsd={14.37} />);
    expect(screen.getByText('Bs 100,00')).toBeInTheDocument();
    expect(screen.getByText(/US\$ 14,37/)).toBeInTheDocument();
  });
});

describe('CoinChip', () => {
  it('muestra las monedas con el chip ámbar', () => {
    render(<CoinChip coins={251} />);
    expect(screen.getByText('🪙 251')).toBeInTheDocument();
    const chip = screen.getByText('🪙 251').closest('span');
    expect(chip).toBeInTheDocument();
  });

  it('acepta label personalizado', () => {
    render(<CoinChip coins={10} label="monedas" />);
    expect(screen.getByText('🪙 10 monedas')).toBeInTheDocument();
  });
});
