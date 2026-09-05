import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from './ProductCard';
import { EmptyState, LoadingState, ErrorState } from './States';
import { KarmaLevelBadge } from './KarmaLevelBadge';

describe('ProductCard', () => {
  const product = {
    id: 1,
    name: 'Ryzen 9 7950X3D',
    price: 13545.04,
    stock: 20,
    storeName: 'Gislason - Kreiger',
    rating: 4.5,
    image: null,
  };

  it('muestra nombre, precio Bs, tienda y botón agregar', async () => {
    const onAdd = vi.fn();
    render(<ProductCard product={product} onAddToCart={onAdd} />);
    expect(screen.getByText('Ryzen 9 7950X3D')).toBeInTheDocument();
    expect(screen.getByText('Bs 13.545,04')).toBeInTheDocument();
    expect(screen.getByText(/Gislason - Kreiger/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /agregar/i }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('muestra "Sin stock" y deshabilita el botón con stock 0', () => {
    render(<ProductCard product={{ ...product, stock: 0 }} onAddToCart={vi.fn()} />);
    expect(screen.getAllByText('Sin stock').length).toBeGreaterThanOrEqual(1);
    const add = screen.getByRole('button', { name: /^Sin stock$/ });
    expect(add).toBeDisabled();
  });
});

describe('States', () => {
  it('EmptyState muestra mensaje e icono', () => {
    render(<EmptyState message="No hay productos todavía" />);
    expect(screen.getByText('No hay productos todavía')).toBeInTheDocument();
  });

  it('LoadingState usa role progressbar', () => {
    render(<LoadingState />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('ErrorState muestra error y botón Reintentar', async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Algo salió mal" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('KarmaLevelBadge', () => {
  it('muestra la insignia del nivel como pill', () => {
    render(<KarmaLevelBadge level="Activo" />);
    const el = screen.getByText('Activo');
    expect(el).toBeInTheDocument();
  });
});
