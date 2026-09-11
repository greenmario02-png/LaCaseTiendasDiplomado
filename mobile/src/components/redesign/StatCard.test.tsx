import { describe, it, expect, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('renderiza título y valor', async () => {
    const { getByText } = await render(<StatCard title="Preguntas" value={9} />);
    expect(getByText('Preguntas')).toBeTruthy();
    expect(getByText('9')).toBeTruthy();
  });

  it('renderiza tendencia positiva con +', async () => {
    const { getByText } = await render(<StatCard title="Ventas" value={250} trend={12} />);
    expect(getByText('+12')).toBeTruthy();
  });

  it('renderiza tendencia negativa con color error', async () => {
    const { getByText } = await render(<StatCard title="Stock" value={3} trend={-5} />);
    expect(getByText('-5')).toBeTruthy();
  });

  it('acepta valor string', async () => {
    const { getByText } = await render(<StatCard title="Reportes" value="3 pendientes" />);
    expect(getByText('3 pendientes')).toBeTruthy();
  });

  it('no renderiza tendencia si no viene', async () => {
    const { queryByText } = await render(<StatCard title="Preguntas" value={9} />);
    expect(queryByText(/^\+/)).toBeNull();
    expect(queryByText(/^-/)).toBeNull();
  });
});
