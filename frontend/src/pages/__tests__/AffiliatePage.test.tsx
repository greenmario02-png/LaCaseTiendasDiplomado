import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AffiliatePage from '../AffiliatePage';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn((url: string) =>
      Promise.resolve({
        data: {
          data:
            url === '/affiliates/me'
              ? { referralCode: 'ABC123', commissionPct: 5, balance: 100, referralCount: 0, paidOrderCount: 0 }
              : [],
        },
      })
    ),
  },
  getErrorMessage: (e: unknown) => (e as Error)?.message ?? 'Error',
}));

describe('AffiliatePage', () => {
  it('renderiza el código de referido y el estado vacío de referidos', async () => {
    render(
      <MemoryRouter>
        <AffiliatePage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Programa de afiliados')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ABC123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copiar/i })).toBeInTheDocument();
    expect(screen.getByText(/Aún no tenés referidos/)).toBeInTheDocument();
  });
});
