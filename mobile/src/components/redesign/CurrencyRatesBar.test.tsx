import { describe, it, expect } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { CurrencyRatesBar } from './CurrencyRatesBar';

describe('CurrencyRatesBar', () => {
  it('muestra las cotizaciones formateadas en Bs', async () => {
    const { getByText } = await render(
      <CurrencyRatesBar rates={{ usd: 6.96, eur: 8.03, jpy: 0.05, usdt: 6.95 }} />,
    );
    expect(getByText('USD 6,96 Bs')).toBeTruthy();
    expect(getByText('EUR 8,03 Bs')).toBeTruthy();
    expect(getByText('USDT 6,95 Bs')).toBeTruthy();
  });

  it('omite las tasas no provistas y muestra el enlace Calculadora', async () => {
    const { queryByText, getByText } = await render(<CurrencyRatesBar rates={{ usd: 6.96 }} />);
    expect(getByText('USD 6,96 Bs')).toBeTruthy();
    expect(queryByText(/EUR/)).toBeNull();
    expect(getByText('Calculadora')).toBeTruthy();
  });
});
