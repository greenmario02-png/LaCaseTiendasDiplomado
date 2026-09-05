import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccountPage from '../account/AccountPage';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn((url: string) => {
      if (url === '/account/orders') return Promise.resolve({ data: { data: [] } });
      if (url === '/coins/balance') return Promise.resolve({ data: { data: { balance: 10, transactions: [] } } });
      if (url === '/coins/invite') return Promise.resolve({ data: { data: {} } });
      return Promise.resolve({ data: { data: {} } });
    }),
    post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    put: vi.fn(() => Promise.resolve({ data: { data: {} } })),
  },
  getErrorMessage: (e: unknown) => (e as Error).message,
}));

vi.mock('../../hooks/useMoney', () => ({
  useMoney: () => (n: number) => `${Number(n).toFixed(2)} Bs`,
}));

vi.mock('../../stores/authStore', () => {
  const stableUser = {
    user: { firstName: 'Test', lastName: 'User', email: 't@mail.com', gamerCoins: 10, role: 'CUSTOMER' as const },
    setUser: vi.fn(),
  };
  return {
    useAuthStore: (sel?: (s: unknown) => unknown) =>
      sel ? sel(stableUser) : { user: stableUser.user },
  };
});

describe('AccountPage', () => {
  it('muestra CoinChip con saldo de monedas y el heading de cuenta', async () => {
    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/🪙/)).toBeInTheDocument();
    expect(screen.getAllByText(/10 monedas/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Mi cuenta')).toBeInTheDocument();
  });
});
