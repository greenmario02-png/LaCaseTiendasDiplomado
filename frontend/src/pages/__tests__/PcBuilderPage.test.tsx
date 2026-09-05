import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PcBuilderPage from '../PcBuilderPage';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ data: { data: [] } })),
    post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
  },
  getErrorMessage: (e: unknown) => (e as Error)?.message ?? 'Error',
}));

vi.mock('../../hooks/useMoney', () => ({
  useMoney: () => (n: number) => `${Number(n).toFixed(2)} Bs`,
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (sel?: (s: unknown) => unknown) =>
    sel ? sel({ user: null }) : { user: null },
}));

vi.mock('../../stores/cartStore', () => ({
  useCartStore: (sel?: (s: unknown) => unknown) =>
    sel ? sel({ addItem: vi.fn() }) : { addItem: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

describe('PcBuilderPage', () => {
  it('renderiza el título y los botones de acción', async () => {
    render(
      <MemoryRouter>
        <PcBuilderPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Arma tu PC')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar build/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agregar todo al carrito/i })).toBeInTheDocument();
  });

  it('muestra los slots de componentes requeridos', async () => {
    render(
      <MemoryRouter>
        <PcBuilderPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Procesador')).toBeInTheDocument();
    expect(screen.getByText('Placa de Video')).toBeInTheDocument();
  });
});
