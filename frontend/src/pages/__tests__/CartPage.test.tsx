import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CartPage from '../CartPage';

vi.mock('../../stores/cartStore', () => ({
  useCartStore: () => ({
    cart: { itemCount: 2, subtotal: 1500, groupedBySeller: [{ seller: { id: 2, storeName: 'Tech Store', locationCity: 'La Paz' }, items: [{ id: 10, product: { id: 317, name: 'AMD Ryzen 7 7800X3D', images: [{ url: '/uploads/test.png' }] }, unitPrice: '450.00', quantity: 2, lineTotal: 900 }] }] },
    loading: false,
    fetchCart: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
  }),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (sel?: (s: { user: unknown }) => unknown) => (sel ? sel({ user: null }) : { user: null }),
}));

vi.mock('../../hooks/useMoney', () => ({
  useMoney: () => (n: number) => `${Number(n).toFixed(2)} Bs`,
}));

describe('CartPage', () => {
  it('renderiza ítems del carrito con tienda y precio redesign', async () => {
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Carrito (2 ítems)')).toBeInTheDocument();
    expect(screen.getByText('Tech Store')).toBeInTheDocument();
    expect(screen.getByText('AMD Ryzen 7 7800X3D')).toBeInTheDocument();
    // PriceDisplay redesign con formato Bs es-ES
    expect(screen.getByText('Bs 450,00')).toBeInTheDocument();
  });

  it('muestra alerta de iniciar sesión cuando no hay usuario', async () => {
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('link', { name: /Iniciá sesión/ })).toBeInTheDocument();
  });
});
