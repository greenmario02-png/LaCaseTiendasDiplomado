import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductsPage from '../ProductsPage';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn((url: string) => {
      if (url.startsWith('/products/categories')) return Promise.resolve({ data: { data: [] } });
      if (url.startsWith('/brands')) return Promise.resolve({ data: { data: [] } });
      if (url.startsWith('/delivery-types')) return Promise.resolve({ data: { data: [] } });
      if (url.startsWith('/sellers/search')) return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [], meta: { hasMore: false, nextCursor: null, total: 0 } } });
    }),
  },
}));

vi.mock('../../hooks/useMoney', () => ({
  useMoney: () => (n: number) => `${Number(n).toFixed(2)} Bs`,
}));

vi.mock('../../stores/currencyStore', () => ({
  useCurrencyStore: () => ({ selected: 'Bs' }),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({ user: null }),
}));

vi.mock('../../data/geo', () => ({
  getDivisions: () => [],
  COUNTRIES: [{ code: 'BO', name: 'Bolivia', divisions: [] }],
}));

describe('ProductsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza buscador y heading', async () => {
    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Todos los productos')).toBeInTheDocument();
    expect(screen.getByText('0 productos de todas las tiendas')).toBeInTheDocument();
  });

  it('muestra EmptyState del rediseño sin resultados', async () => {
    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('No se encontraron productos con esos filtros')).toBeInTheDocument();
  });
});
