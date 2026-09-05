import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CountdownTimer } from './CountdownTimer';
import { SuccessToast, ConfirmDialog } from './Feedback';

describe('CountdownTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('muestra el tiempo en formato dd:hh:mm:ss', () => {
    render(<CountdownTimer target={Date.now() + 3 * 86400000 + 2 * 3600000 + 5 * 60000 + 10 * 1000} />);
    expect(screen.getByText(/03:02:05:10/)).toBeInTheDocument();
  });

  it('llama onEnd al llegar a cero', () => {
    const onEnd = vi.fn();
    render(<CountdownTimer target={Date.now() + 1000} onEnd={onEnd} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onEnd).toHaveBeenCalled();
  });
});

describe('SuccessToast', () => {
  it('muestra el mensaje de éxito y llama onClose', () => {
    const onClose = vi.fn();
    render(<SuccessToast open message="Pedido confirmado" onClose={onClose} />);
    expect(screen.getByText('Pedido confirmado')).toBeInTheDocument();
  });
});

describe('ConfirmDialog', () => {
  it('muestra título, mensaje y botones confirmar/cancelar', () => {
    render(
      <ConfirmDialog open title="¿Eliminar?" message="Esta acción no se puede deshacer" onConfirm={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByText('¿Eliminar?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });
});
