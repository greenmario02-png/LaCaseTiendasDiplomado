import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoreTable } from './StoreTable';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Nombre' },
];

describe('StoreTable', () => {
  const rows = [
    { id: 1, name: 'Ryzen' },
    { id: 2, name: 'RTX' },
  ];

  it('renderiza columnas y filas', () => {
    render(<StoreTable columns={columns} rows={rows} />);
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Ryzen')).toBeInTheDocument();
    expect(screen.getByText('RTX')).toBeInTheDocument();
  });

  it('llama onRowClick con la fila al hacer click', () => {
    const onRowClick = vi.fn();
    render(<StoreTable columns={columns} rows={rows} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('Ryzen'));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('muestra EmptyState si no hay filas', () => {
    render(<StoreTable columns={columns} rows={[]} emptyMessage="Sin datos" />);
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
  });
});
