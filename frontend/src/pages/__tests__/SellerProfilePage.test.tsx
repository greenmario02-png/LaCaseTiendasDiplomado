import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SellerProfilePage from '../SellerProfilePage';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn((url: string) => {
      if (url.endsWith('/products')) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url.includes('/overview')) {
        return Promise.resolve({ data: { data: { reviews: [], summary: { avg: 0, total: 0 }, storeStats: {}, topTags: [] } } });
      }
      if (url.includes('/privileged-status')) {
        return Promise.resolve({ data: { data: null } });
      }
      if (url.includes('/privileged-new-products')) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url.includes('/sellers/')) {
        return Promise.resolve({
          data: {
            data: {
              id: 2,
              storeName: 'Tech Store',
              storeDescription: 'Tienda de tecnología',
              storeCategory: 'Tecnología',
              isVerified: true,
              rating: 4.5,
              reviewCount: 12,
              locationCity: 'La Paz',
              locationState: 'La Paz',
              latitude: null,
              longitude: null,
              recentBuyers: [],
            },
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    }),
    post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
  },
  getErrorMessage: (e: unknown) => (e as Error).message ?? 'Error',
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (sel?: (s: unknown) => unknown) => (sel ? sel({ user: null }) : { user: null }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '2' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../components/ui/MiniMap', () => ({ default: () => null }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

describe('SellerProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza la tienda y el estado vacío de productos', async () => {
    render(
      <MemoryRouter>
        <SellerProfilePage />
      </MemoryRouter>,
    );
    expect((await screen.findAllByText('Tech Store')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Esta tienda aún no publica productos.')).toBeInTheDocument();
  });
});
