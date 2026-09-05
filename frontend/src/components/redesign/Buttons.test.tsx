import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrimaryButton, SecondaryButton, GhostButton } from './Buttons';

describe('PrimaryButton', () => {
  it('renderiza el children y es tipo submit por defecto', () => {
    render(<PrimaryButton>Comprar ahora</PrimaryButton>);
    const btn = screen.getByRole('button', { name: 'Comprar ahora' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('type', 'submit');
  });

  it('llama onClick y se deshabilita con disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<PrimaryButton onClick={onClick}>Aceptar</PrimaryButton>);
    await user.click(screen.getByRole('button', { name: 'Aceptar' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<PrimaryButton onClick={onClick} disabled>Aceptar</PrimaryButton>);
    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeDisabled();
  });
});

describe('SecondaryButton', () => {
  it('renderiza y usa color ámbar de acento', () => {
    render(<SecondaryButton>Ver promos</SecondaryButton>);
    expect(screen.getByRole('button', { name: 'Ver promos' })).toBeInTheDocument();
  });

  it('acepta fullWidth', () => {
    render(<SecondaryButton fullWidth>Full</SecondaryButton>);
    expect(screen.getByRole('button', { name: 'Full' }).className).toContain('MuiButton-fullWidth');
  });
});

describe('GhostButton', () => {
  it('renderiza texto sin fondo', () => {
    render(<GhostButton>Cancelar</GhostButton>);
    const btn = screen.getByRole('button', { name: 'Cancelar' });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('MuiButton-text');
  });
});
