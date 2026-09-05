import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from './FilterBar';

const options = [
  { key: 'RECIENTE', label: '🕐 Reciente' },
  { key: 'POPULAR', label: '🔥 Popular' },
  { key: 'SIN_RESPUESTA', label: '❓ Sin respuesta' },
  { key: 'MI_CIUDAD', label: '📍 Mi ciudad' },
];

describe('FilterBar', () => {
  it('renderiza las opciones y marca la activa', () => {
    render(<FilterBar options={options} active="RECIENTE" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /🕐 Reciente/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /🔥 Popular/ })).toBeInTheDocument();
  });

  it('llama onChange con la key al hacer click', () => {
    const onChange = vi.fn();
    render(<FilterBar options={options} active="RECIENTE" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /🔥 Popular/ }));
    expect(onChange).toHaveBeenCalledWith('POPULAR');
  });
});
