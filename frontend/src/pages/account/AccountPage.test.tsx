import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccountPage from './AccountPage';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  resolveImageUrl: (u?: string | null) => u ?? '',
  api: {
    get: vi.fn((url: string) => {
      if (url === '/account/orders') return Promise.resolve({ data: { data: [] } });
      if (url === '/coins/balance') {
        return Promise.resolve({
          data: {
            data: {
              balance: 10,
              purchaseEnabled: false,
              transactions: [{ id: 1, amount: 10, type: 'EARN_INVITE', note: 'Invitaste a un amigo', createdAt: '2026-01-01T00:00:00Z' }],
            },
          },
        });
      }
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
  const stable = {
    user: { firstName: 'Test', lastName: 'User', email: 't@mail.com', gamerCoins: 10, role: 'CUSTOMER' as const },
    setUser: vi.fn(),
  };
  return { useAuthStore: (sel?: (s: unknown) => unknown) => (sel ? sel(stable) : { user: stable.user }) };
});

describe('AccountPage: compra de monedas bloqueada', () => {
  it('muestra "Próximamente" deshabilitado, sin diálogo ni POST; saldo e historial visibles', async () => {
    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>,
    );
    const buttons = await screen.findAllByRole('button', { name: /Próximamente/ });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    buttons.forEach((b) => {
      expect(b).toBeDisabled();
      fireEvent.click(b);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByLabelText(/Cantidad de monedas/)).toBeNull();
    expect((api.post as any).mock.calls.some((c: any[]) => c[0] === '/coins/buy')).toBe(false);
    expect(await screen.findByText('Invitaste a un amigo')).toBeInTheDocument();
    expect(screen.getAllByText(/10/).length).toBeGreaterThanOrEqual(1);
  });
});
