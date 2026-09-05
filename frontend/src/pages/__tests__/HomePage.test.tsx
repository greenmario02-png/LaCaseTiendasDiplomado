import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../HomePage';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn((url: string) => {
      let data: unknown = { recommendations: [], reason: '' };
      if (url === '/banners') data = [];
      else if (url === '/products/categories') data = [];
      else if (url === '/products/featured') data = [];
      else if (url === '/promotions') data = [];
      else if (url === '/tracking/feed')
        data = { nearYou: [], categoryCarousels: [], forYou: [], trending: [], userCity: '' };
      else if (url === '/orders/recent-sales') data = [];
      return Promise.resolve({ data: { data } });
    }),
  },
  resolveImageUrl: (u: string) => u,
}));

vi.mock('../../services/socket', () => ({
  getSocket: () => ({ on: () => {}, off: () => {} }),
}));

vi.mock('../../hooks/useMoney', () => ({
  useMoney: () => (n: number | string) => `${Number(n).toFixed(2)} Bs`,
}));

vi.mock('../../data/categoryIcons', () => ({
  getCategoryIcon: () => null,
}));

// Swiper no es compatible con jsdom simple: mockear el módulo
vi.mock('swiper/react', () => ({
  Swiper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SwiperSlide: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el hero con los botones redesign (Explorar productos / Subastas / Abrí tu tienda)', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    // Esperar a que termine el loading (Promise.all del useEffect)
    expect(await screen.findByText('Todas las tiendas, un solo lugar')).toBeInTheDocument();
    expect(screen.getByText('Explorar productos')).toBeInTheDocument();
    expect(screen.getByText('Subastas')).toBeInTheDocument();
    expect(screen.getByText('Abrí tu tienda')).toBeInTheDocument();
  });

  it('muestra el EmptyState cuando no hay destacados', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('No hay productos destacados aún')).toBeInTheDocument();
  });
});
