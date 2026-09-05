import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuctionWatchlistPage from '../AuctionWatchlistPage';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn((url: string) =>
      Promise.resolve({
        data: {
          data:
            url === '/auctions/active' || url === '/auctions/watchlist' || url === '/auctions/my-won'
              ? []
              : [],
        },
      })
    ),
    post: vi.fn(() => Promise.resolve({ data: {} })),
  },
  getErrorMessage: (e: unknown) => (e as Error)?.message ?? 'Error',
}));

vi.mock('../../hooks/useMoney', () => ({
  useMoney: () => (n: number) => `${Number(n).toFixed(2)} Bs`,
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

describe('AuctionWatchlistPage', () => {
  it('renderiza el título y el estado vacío del tab Activas', async () => {
    render(
      <MemoryRouter>
        <AuctionWatchlistPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Mis subastas')).toBeInTheDocument();
    expect(
      await screen.findByText(/No estás pujando en ninguna subasta activa/)
    ).toBeInTheDocument();
  });

  it('muestra los tabs Activas/Seguidas/Ganadas', async () => {
    render(
      <MemoryRouter>
        <AuctionWatchlistPage />
      </MemoryRouter>
    );
    expect(await screen.findByText(/Activas \(0\)/)).toBeInTheDocument();
    expect(screen.getByText(/Seguidas \(0\)/)).toBeInTheDocument();
    expect(screen.getByText(/Ganadas \(0\)/)).toBeInTheDocument();
  });
});
