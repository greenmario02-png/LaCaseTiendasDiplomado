import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReturnsPage from '../ReturnsPage';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ data: { data: [] } })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
  },
  getErrorMessage: (e: unknown) => (e as Error)?.message ?? 'Error',
  resolveImageUrl: (u: string) => u,
}));

describe('ReturnsPage', () => {
  it('renderiza el título y el estado vacío de devoluciones', async () => {
    render(
      <MemoryRouter>
        <ReturnsPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Mis devoluciones')).toBeInTheDocument();
    expect(screen.getByText(/No tenés solicitudes de devolución/)).toBeInTheDocument();
  });
});
