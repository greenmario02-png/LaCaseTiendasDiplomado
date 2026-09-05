import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheckoutPage from '../CheckoutPage';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn((url: string) =>
      Promise.resolve({
        data: {
          data:
            url === '/account/addresses'
              ? []
              : { itemCount: 0 },
        },
      }),
    ),
    post: vi.fn(() => Promise.resolve({ data: { data: [] } })),
  },
  getErrorMessage: (e: unknown) => (e as Error).message,
}));

vi.mock('../../hooks/useMoney', () => ({
  useMoney: () => (n: number) => `${Number(n).toFixed(2)} Bs`,
}));

vi.mock('../../stores/cartStore', () => ({
  useCartStore: (sel?: (s: unknown) => unknown) =>
    sel ? sel({ cart: null, fetchCart: vi.fn() }) : { cart: null, fetchCart: vi.fn() },
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (sel?: (s: unknown) => unknown) =>
    sel ? sel({ user: null }) : { user: null },
}));

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra EmptyState cuando el carrito está vacío', async () => {
    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Tu carrito está vacío')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explorar productos' })).toBeInTheDocument();
  });
});
