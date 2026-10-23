import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminCatalogReports from './AdminCatalogReports';

vi.mock('../../services/api', () => ({
  getErrorMessage: (e: unknown) => (e as Error).message,
  api: { get: vi.fn(), put: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { api } from '../../services/api';

const get = api.get as ReturnType<typeof vi.fn>;
const put = api.put as ReturnType<typeof vi.fn>;

const openReport = {
  id: 11,
  targetType: 'SELLER',
  targetId: 5,
  reason: 'VENDEDOR_SOSPECHOSO',
  detail: 'Pide pagos fuera de la app',
  status: 'OPEN',
  createdAt: '2026-10-20T10:00:00Z',
  reviewedAt: null,
  adminNote: null,
  reporter: { id: 2, name: 'Juan Perez', email: 'juan@mail.bo' },
  reviewer: null,
  target: { type: 'SELLER', id: 5, name: 'Tienda Mateo', sellerId: 5 },
};
const reviewedReport = {
  ...openReport,
  id: 12,
  status: 'REVIEWED',
  adminNote: 'Se contactó al vendedor.',
  reviewedAt: '2026-10-21T10:00:00Z',
  reviewer: { id: 1, name: 'Admin Principal', email: 'admin@lacase.bo' },
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

const renderPage = () => render(<MemoryRouter><AdminCatalogReports /></MemoryRouter>);

describe('AdminCatalogReports (/admin/denuncias y /moderacion/denuncias)', () => {
  it('por defecto pide las denuncias pendientes (OPEN) y las lista', async () => {
    get.mockResolvedValue({ data: { data: [openReport], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } } });
    renderPage();
    await screen.findByTestId('catalog-report-11');
    expect(get).toHaveBeenCalledWith('/admin/catalog-reports', { params: { page: 1, limit: 20, status: 'OPEN', targetType: undefined, reason: undefined } });
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Tienda Mateo')).toBeInTheDocument();
    expect(screen.getByText('Vendedor sospechoso')).toBeInTheDocument();
    expect(screen.getByText('Pide pagos fuera de la app')).toBeInTheDocument();
  });

  it('muestra vacío cuando no hay denuncias', async () => {
    get.mockResolvedValue({ data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } } });
    renderPage();
    expect(await screen.findByText('No hay denuncias para este filtro.')).toBeInTheDocument();
  });

  it('cambiar el filtro de tipo manda targetType al servidor', async () => {
    get.mockResolvedValue({ data: { data: [openReport], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } } });
    const u = userEvent.setup();
    renderPage();
    await screen.findByTestId('catalog-report-11');
    await u.click(screen.getByLabelText('Tipo'));
    await u.click(await screen.findByRole('option', { name: 'Tienda' }));
    await waitFor(() => expect(get).toHaveBeenLastCalledWith('/admin/catalog-reports', { params: { page: 1, limit: 20, status: 'OPEN', targetType: 'STORE', reason: undefined } }));
  });

  it('marcar revisada: abre el dialogo, nota opcional, envia status REVIEWED', async () => {
    get.mockResolvedValue({ data: { data: [openReport], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } } });
    put.mockResolvedValue({ data: { data: reviewedReport } });
    const u = userEvent.setup();
    renderPage();
    const row = await screen.findByTestId('catalog-report-11');
    await u.click(within(row).getByRole('button', { name: 'Marcar revisada' }));
    const dialog = await screen.findByRole('dialog', { name: 'Marcar como revisada' });
    await u.click(within(dialog).getByRole('button', { name: 'Marcar revisada' }));
    await waitFor(() => expect(put).toHaveBeenCalledWith('/admin/catalog-reports/11', { status: 'REVIEWED', note: undefined }));
  });

  it('descartar: la nota escrita viaja en el body', async () => {
    get.mockResolvedValue({ data: { data: [openReport], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } } });
    put.mockResolvedValue({ data: { data: { ...openReport, status: 'DISCARDED' } } });
    const u = userEvent.setup();
    renderPage();
    const row = await screen.findByTestId('catalog-report-11');
    await u.click(within(row).getByRole('button', { name: 'Descartar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Descartar denuncia' });
    await u.type(within(dialog).getByLabelText(/Nota/), 'Sin evidencia suficiente');
    await u.click(within(dialog).getByRole('button', { name: 'Descartar' }));
    await waitFor(() => expect(put).toHaveBeenCalledWith('/admin/catalog-reports/11', { status: 'DISCARDED', note: 'Sin evidencia suficiente' }));
  });

  it('una denuncia ya revisada no muestra botones de acción, solo quién la revisó', async () => {
    get.mockResolvedValue({ data: { data: [reviewedReport], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } } });
    renderPage();
    const row = await screen.findByTestId('catalog-report-12');
    expect(within(row).queryByRole('button', { name: 'Marcar revisada' })).toBeNull();
    expect(within(row).queryByRole('button', { name: 'Descartar' })).toBeNull();
    expect(row).toHaveTextContent('Admin Principal');
    expect(row).toHaveTextContent('Se contactó al vendedor.');
  });

  it('un error del servidor se muestra como alerta', async () => {
    get.mockRejectedValue(new Error('Error de red'));
    renderPage();
    expect(await screen.findByText('Error de red')).toBeInTheDocument();
  });

  it('el objetivo enlaza a la tienda o a la ficha del producto', async () => {
    const productReport = { ...openReport, id: 13, targetType: 'PRODUCT', targetId: 40, reason: 'PRODUCTO_INADECUADO', target: { type: 'PRODUCT', id: 40, name: 'Laptop X', sellerId: 5 } };
    get.mockResolvedValue({ data: { data: [openReport, productReport], meta: { page: 1, limit: 20, total: 2, totalPages: 1 } } });
    renderPage();
    await screen.findByTestId('catalog-report-13');
    expect(screen.getByRole('link', { name: 'Tienda Mateo' })).toHaveAttribute('href', '/vendedor/5');
    expect(screen.getByRole('link', { name: 'Laptop X' })).toHaveAttribute('href', '/producto/40/p');
  });
});
