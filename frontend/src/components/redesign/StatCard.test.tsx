import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('renderiza título y valor', () => {
    render(<StatCard title="Preguntas" value={42} />);
    expect(screen.getByText('Preguntas')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('muestra tendencia positiva en verde y negativa en rojo', () => {
    render(<StatCard title="Ventas" value={100} trend={12} />);
    expect(screen.getByText('Ventas')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('+12')).toBeInTheDocument();
  });

  it('acepta valor string y no renderiza tendencia si no viene', () => {
    render(<StatCard title="Pendientes" value="3" />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
