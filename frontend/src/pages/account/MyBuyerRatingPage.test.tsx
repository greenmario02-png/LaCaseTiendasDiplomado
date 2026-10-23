import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyBuyerRatingPage from './MyBuyerRatingPage';

const m = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../services/api', async (orig) => {
  const actual = await orig<typeof import('../../services/api')>();
  return { ...actual, api: { get: m.get } };
});

const mockUser = vi.hoisted(() => ({ current: null as null | { id: number; email: string; role: string } }));
vi.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: (s: { user: typeof mockUser.current }) => unknown) => selector({ user: mockUser.current }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <MyBuyerRatingPage />
    </MemoryRouter>,
  );
}

describe('MyBuyerRatingPage ("Cómo me ven como comprador")', () => {
  beforeEach(() => {
    m.get.mockReset();
    mockUser.current = { id: 10, email: 'buyer@mail.com', role: 'CUSTOMER' };
  });

  it('pide iniciar sesion si no hay usuario', () => {
    mockUser.current = null;
    renderPage();
    expect(screen.getByText('Inicia sesión para ver tu calificación como comprador.')).toBeInTheDocument();
  });

  it('consulta GET /users/:id/buyer-reviews con el id del usuario logueado', async () => {
    m.get.mockResolvedValue({ data: { data: { reviews: [], avgRating: 0, totalReviews: 0 } } });
    renderPage();
    await screen.findByText('Todavía ningún vendedor te calificó.');
    expect(m.get).toHaveBeenCalledWith('/users/10/buyer-reviews');
  });

  it('muestra el promedio, el total y cada reseña con la tienda y el comentario', async () => {
    m.get.mockResolvedValue({
      data: {
        data: {
          avgRating: 4.5,
          totalReviews: 2,
          reviews: [
            {
              id: 1,
              orderId: 55,
              rating: 5,
              comment: 'Pago puntual y buena comunicación',
              createdAt: new Date('2026-01-10').toISOString(),
              seller: { id: 3, storeName: 'Tienda Mateo', storeLogo: null },
            },
          ],
        },
      },
    });
    renderPage();
    expect(await screen.findByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('2 calificaciones')).toBeInTheDocument();
    expect(screen.getByText('Tienda Mateo')).toBeInTheDocument();
    expect(screen.getByText('Pago puntual y buena comunicación')).toBeInTheDocument();
    expect(screen.getByText('#55')).toBeInTheDocument();
  });

  it('muestra un estado de error con reintentar si la carga falla', async () => {
    m.get.mockRejectedValue({ isAxiosError: true, response: undefined });
    renderPage();
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
