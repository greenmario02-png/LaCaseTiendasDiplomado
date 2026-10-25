import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AddressesPage from './AddressesPage';
import { canonicalDepartment } from '../../lib/boliviaDepartments';
import { formatAddressLine } from '../../lib/address';
import i18n from '../../i18n';

const m = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('../../services/api', async (orig) => {
  const actual = await orig<typeof import('../../services/api')>();
  return { ...actual, api: { get: m.get, post: m.post, put: m.put, delete: m.del } };
});
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const NINE = ['Beni', 'Chuquisaca', 'Cochabamba', 'La Paz', 'Oruro', 'Pando', 'Potosí', 'Santa Cruz', 'Tarija'];

function renderPage() {
  return render(
    <MemoryRouter>
      <AddressesPage />
    </MemoryRouter>,
  );
}

async function openNewDialog() {
  const user = userEvent.setup();
  renderPage();
  await user.click(await screen.findByRole('button', { name: /Nueva dirección/ }));
  const dialog = await screen.findByRole('dialog');
  return { user, dialog };
}

beforeEach(() => {
  i18n.changeLanguage('es');
  m.get.mockReset().mockResolvedValue({ data: { data: [] } });
  m.post.mockReset().mockResolvedValue({ data: { data: { id: 1 } } });
  m.put.mockReset().mockResolvedValue({ data: { data: { id: 1 } } });
  m.del.mockReset();
});

describe('AddressesPage — direcciones con formato de Bolivia', () => {
  it('el campo se llama Departamento y ofrece los 9 departamentos de Bolivia', async () => {
    const { user, dialog } = await openNewDialog();
    const dep = within(dialog).getByRole('combobox', { name: 'Departamento' });
    await user.click(dep);
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(NINE);
  });

  it('el código postal es opcional: guarda sin CP y lo envía como null', async () => {
    const { user, dialog } = await openNewDialog();
    await user.type(within(dialog).getByLabelText('Calle'), 'Calle Sucre');
    await user.type(within(dialog).getByLabelText('Número'), '10');
    await user.type(within(dialog).getByLabelText('Ciudad'), 'Tarija');
    const dep = within(dialog).getByRole('combobox', { name: 'Departamento' });
    await user.click(dep);
    await user.click(await screen.findByRole('option', { name: 'Tarija' }));
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(m.post).toHaveBeenCalledTimes(1));
    expect(m.post).toHaveBeenCalledWith('/account/addresses', expect.objectContaining({ street: 'Calle Sucre', city: 'Tarija', state: 'Tarija', postalCode: null }));
  });

  it('no envía nada si no se eligió un departamento de los 9 y lo explica en el campo', async () => {
    const { user, dialog } = await openNewDialog();
    await user.type(within(dialog).getByLabelText('Calle'), 'Av. Libertador');
    await user.type(within(dialog).getByLabelText('Ciudad'), 'Buenos Aires');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByText('Elige uno de los 9 departamentos de Bolivia')).toBeInTheDocument();
    expect(m.post).not.toHaveBeenCalled();
  });

  it('una dirección sin CP se lista sin «CP» vacío ni «null»', async () => {
    m.get.mockResolvedValue({ data: { data: [{ id: 4, street: 'Calle Sucre', number: '10', floor: null, city: 'Tarija', state: 'Tarija', postalCode: null, isDefault: true }] } });
    renderPage();
    const line = await screen.findByText(/^Tarija, Tarija/);
    expect(line.textContent).not.toMatch(/CP|null|undefined/);
  });
});

describe('helpers de dirección', () => {
  it('canonicalDepartment devuelve el nombre oficial o null', () => {
    expect(canonicalDepartment('potosi')).toBe('Potosí');
    expect(canonicalDepartment('Departamento de La Paz')).toBe('La Paz');
    expect(canonicalDepartment('CABA')).toBeNull();
    expect(canonicalDepartment('')).toBeNull();
  });

  it('formatAddressLine omite el CP cuando no hay', () => {
    expect(formatAddressLine({ street: 'Calle Sucre', number: '10', city: 'Tarija', state: 'Tarija', postalCode: null })).toBe('Calle Sucre 10 — Tarija, Tarija');
    expect(formatAddressLine({ street: 'Calle Sucre', number: '10', city: 'Tarija', state: 'Tarija', postalCode: '0001' })).toBe('Calle Sucre 10 — Tarija, Tarija (CP 0001)');
  });
});
