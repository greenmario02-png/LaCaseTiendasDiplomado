import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrderConfirmationPage from '../OrderConfirmationPage';

vi.mock('../../services/api', () => ({
  api: {
    post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
  },
  getErrorMessage: (e: unknown) => (e as Error).message,
}));

vi.mock('../../hooks/useMoney', () => ({
  useMoney: () => (n: number) => `${Number(n).toFixed(2)} Bs`,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ state: null }),
  };
});

describe('OrderConfirmationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra confirmación aunque no haya órdenes en el estado', async () => {
    render(
      <MemoryRouter>
        <OrderConfirmationPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('¡Compra confirmada!')).toBeInTheDocument();
  });
});
