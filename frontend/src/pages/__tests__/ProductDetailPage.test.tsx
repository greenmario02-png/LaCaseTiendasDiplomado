import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductDetailPage from '../ProductDetailPage';
import { api } from '../../services/api';

const apiGet = api.get as unknown as ReturnType<typeof vi.fn>;

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn((url: string) => {
      if (url.includes('/products/') && url.includes('/offers')) {
        return Promise.resolve({ data: { data: { count: 1, offers: [] } } });
      }
      if (url.includes('/related')) return Promise.resolve({ data: { data: [] } });
      if (url.includes('/reviews')) return Promise.resolve({ data: { data: [] } });
      if (url.includes('/products/')) {
        return Promise.resolve({
          data: {
            data: {
              id: 1,
              name: 'AMD Ryzen 7 7800X3D',
              slug: 'amd-ryzen-7-7800x3d',
              price: '450.00',
              originalPrice: '550.00',
              priceUsd: '65.22',
              stock: 10,
              condition: 'NEW',
              viewingNow: 3,
              viewCount: 120,
              category: { slug: 'hardware', name: 'Hardware' },
              seller: { id: 2, storeName: 'Tech Store', isVerified: true, locationCity: 'La Paz', locationState: 'La Paz', rating: 4.5 },
              attributes: [
                { id: 1, attributeDefinition: { name: 'Socket', unit: null }, valueText: 'AM5', valueNumber: null },
              ],
              images: [{ id: 1, url: '/uploads/test.png', isPrimary: true }],
            },
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    }),
    post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
  },
  getErrorMessage: vi.fn((e: unknown) => (e instanceof Error ? e.message : 'Error')),
}));

vi.mock('../../hooks/useMoney', () => ({
  useMoney: () => (n: number) => `${Number(n).toFixed(2)} Bs`,
}));

vi.mock('../../stores/cartStore', () => ({
  useCartStore: () => ({ addItem: vi.fn() }),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({ user: null }),
}));

const params = { id: '1' };
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => params,
    useNavigate: () => vi.fn(),
  };
});

describe('ProductDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el producto con el botón redesign Agregar al carrito', async () => {
    render(
      <MemoryRouter>
        <ProductDetailPage />
      </MemoryRouter>,
    );
    expect((await screen.findAllByText('AMD Ryzen 7 7800X3D')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /agregar al carrito/i })).toBeInTheDocument();
    expect(screen.getByText('Tech Store')).toBeInTheDocument();
  });

  it('muestra Producto no encontrado cuando el producto es null', async () => {
    apiGet.mockImplementation(() => Promise.reject(new Error('404')));
    render(
      <MemoryRouter>
        <ProductDetailPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Producto no encontrado')).toBeInTheDocument();
  });
});
