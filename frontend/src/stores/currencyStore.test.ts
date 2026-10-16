import { describe, expect, it } from 'vitest';
import { CURRENCY_SYMBOLS, currencySymbol, displayCurrency, formatFromBs, formatMoney, type Currency } from './currencyStore';

// Tasas: cuántos Bs vale 1 unidad de cada moneda (como /api/currencies).
const CUR: Currency[] = [
  { code: 'BOB', name: 'Boliviano', symbol: 'Bs', rate: 1, isDefault: true },
  { code: 'USD', name: 'Dólar', symbol: 'US$', rate: 10, isDefault: false },
  { code: 'EUR', name: 'Euro', symbol: '€', rate: 12.5, isDefault: false },
  { code: 'JPY', name: 'Yen', symbol: '¥', rate: 0.05, isDefault: false },
  { code: 'ARS', name: 'Peso argentino', symbol: 'AR$', rate: 0.01, isDefault: false },
  { code: 'PEN', name: 'Sol', symbol: 'S/', rate: 2.5, isDefault: false },
  { code: 'BRL', name: 'Real', symbol: 'R$', rate: 2, isDefault: false },
];
const num = (s: string) => s.replace(/\s/g, ' ');

describe('formateo de montos por moneda (doc 61)', () => {
  it.each([
    ['BOB', 'Bs'],
    ['USD', 'US$'],
    ['EUR', '€'],
    ['JPY', '¥'],
    ['ARS', 'AR$'],
    ['PEN', 'S/'],
    ['BRL', 'R$'],
  ])('%s muestra su propia denominación (%s), nunca «Bs» si no es BOB', (code, symbol) => {
    const out = formatFromBs(100, CUR, code);
    expect(out.startsWith(`${symbol} `)).toBe(true);
    if (code !== 'BOB') expect(out).not.toMatch(/^Bs /);
  });

  it('convierte desde Bs con la tasa de cada moneda', () => {
    expect(num(formatFromBs(100, CUR, 'USD'))).toMatch(/^US\$ 10[.,]00$/);
    expect(num(formatFromBs(125, CUR, 'EUR'))).toMatch(/^€ 10[.,]00$/);
    expect(num(formatFromBs(100, CUR, 'BRL'))).toMatch(/^R\$ 50[.,]00$/);
  });

  it('JPY, CLP y PYG sin decimales', () => {
    expect(formatFromBs(1, CUR, 'JPY')).toBe('¥ 20');
    expect(formatMoney(1234.6, 'CLP')).toMatch(/^CL\$ 1[.,]?235$/);
    expect(formatMoney(1234.6, 'PYG')).toMatch(/^₲ 1[.,]?235$/);
  });

  it('si la tasa de la moneda elegida aún no se conoce, muestra Bs sin convertir (no un símbolo ajeno)', () => {
    expect(displayCurrency([], 'USD')).toEqual({ code: 'BOB', rate: 1 });
    expect(formatFromBs(100, [], 'USD')).toBe('Bs 100');
    expect(formatFromBs(100, [{ code: 'USD', name: 'x', symbol: 'US$', rate: 0, isDefault: false }], 'USD')).toBe('Bs 100');
  });

  it('acepta montos en texto (Decimal de Prisma) y valores no numéricos sin romper', () => {
    expect(formatFromBs('50.5', CUR, 'BOB')).toMatch(/^Bs 50[.,]5$/);
    expect(formatMoney(Number.NaN, 'USD')).toMatch(/^US\$ 0[.,]00$/);
  });

  it('la tabla de símbolos cubre las monedas del backend y respeta el símbolo de la API', () => {
    // Las mismas monedas que ofrece la calculadora de divisas del destino.
    expect(Object.keys(CURRENCY_SYMBOLS).sort()).toEqual(['ARS', 'BOB', 'BRL', 'CLP', 'CNY', 'COP', 'EUR', 'JPY', 'PEN', 'PYG', 'USD', 'USDT', 'UYU']);
    expect(currencySymbol('USD', [{ code: 'USD', name: 'x', symbol: 'USD$', rate: 10, isDefault: false }])).toBe('USD$');
    expect(currencySymbol('XYZ')).toBe('XYZ');
  });
});
