import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReportCatalogButton from './ReportCatalogButton';

vi.mock('../../services/api', () => ({
  getErrorMessage: (e: unknown) => (e as Error).message,
  api: { post: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
const authState: { user: unknown } = { user: { id: 5, role: 'CUSTOMER' } };
vi.mock('../../stores/authStore', () => ({
  useAuthStore: (sel?: (s: unknown) => unknown) => (sel ? sel(authState) : authState),
}));

import { api } from '../../services/api';
const post = api.post as ReturnType<typeof vi.fn>;

const renderBtn = () =>
  render(
    <MemoryRouter initialEntries={['/producto/40/p']}>
      <Routes>
        <Route path="/producto/40/p" element={<ReportCatalogButton productId={40} sellerId={7} />} />
        <Route path="/login" element={<div>pantalla de login</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  authState.user = { id: 5, role: 'CUSTOMER' };
});

describe('ReportCatalogButton', () => {
  it('denunciar el producto (opción por defecto) con detalle', async () => {
    post.mockResolvedValue({ data: { data: { id: 1 } } });
    const u = userEvent.setup();
    renderBtn();
    await u.click(screen.getByRole('button', { name: 'Denunciar' }));
    const dialog = await screen.findByRole('dialog', { name: '¿Qué quieres denunciar?' });
    await u.type(within(dialog).getByLabelText(/Cuéntanos/), 'Fotos falsas');
    await u.click(within(dialog).getByRole('button', { name: 'Enviar denuncia' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/catalog-reports', { targetType: 'PRODUCT', targetId: 40, reason: 'PRODUCTO_INADECUADO', detail: 'Fotos falsas' }));
  });

  it('denunciar la tienda usa el id del vendedor', async () => {
    post.mockResolvedValue({ data: { data: { id: 2 } } });
    const u = userEvent.setup();
    renderBtn();
    await u.click(screen.getByRole('button', { name: 'Denunciar' }));
    const dialog = await screen.findByRole('dialog');
    await u.click(within(dialog).getByLabelText('Denunciar tienda'));
    await u.click(within(dialog).getByRole('button', { name: 'Enviar denuncia' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/catalog-reports', { targetType: 'STORE', targetId: 7, reason: 'TIENDA_SOSPECHOSA', detail: undefined }));
  });

  it('sin sesión lleva a iniciarla y no envía nada', async () => {
    authState.user = null;
    const u = userEvent.setup();
    renderBtn();
    await u.click(screen.getByRole('button', { name: 'Denunciar' }));
    expect(await screen.findByText('pantalla de login')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
});
