import { create } from 'zustand';
import { api } from '../services/api';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number;
  isDefault: boolean;
}

interface CurrencyState {
  currencies: Currency[];
  selected: string;
  loading: boolean;
  init: () => Promise<void>;
  setSelected: (code: string) => void;
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  currencies: [],
  selected: localStorage.getItem('currency') || 'BOB',
  loading: false,

  init: async () => {
    if (get().currencies.length > 0) return;
    set({ loading: true });
    try {
      const { data } = await api.get('/currencies');
      const currencies = data.data.currencies as Currency[];
      const defaultCode = data.data.base;
      set({ currencies });
      // Si el usuario no eligió, usar la moneda por defecto del sistema
      if (!localStorage.getItem('currency')) {
        set({ selected: defaultCode || 'BOB' });
      }
    } catch {
      // Si falla, dejar BOB por defecto
      set({ currencies: [{ code: 'BOB', name: 'Boliviano', symbol: 'Bs', rate: 1, isDefault: true }] });
    } finally {
      set({ loading: false });
    }
  },

  setSelected: (code) => {
    localStorage.setItem('currency', code);
    set({ selected: code });
  },
}));

export function getRate(currencies: Currency[], code: string): number {
  return currencies.find((c) => c.code === code)?.rate ?? 1;
}

/** Convierte un precio guardado en Bs a la moneda seleccionada */
export function convertPrice(amountBs: number, currency: string, rate: number): number {
  if (currency === 'BOB') return amountBs;
  return amountBs / rate;
}

/**
 * Denominación de cada moneda (las mismas que ofrece la calculadora de divisas). Si la API trae otro símbolo, manda la API.
 * Antes solo USD tenía denominación propia y el resto (EUR, ARS, ...) se mostraba como «Bs» aunque el monto ya estaba convertido.
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  BOB: 'Bs',
  USD: 'US$',
  EUR: '€',
  JPY: '¥',
  ARS: 'AR$',
  PEN: 'S/',
  CLP: 'CL$',
  UYU: '$U',
  BRL: 'R$',
  CNY: '¥C',
  PYG: '₲',
  COP: 'CO$',
  USDT: 'USDT',
};
/** Monedas sin decimales en el uso diario. */
const ZERO_DECIMALS = new Set(['JPY', 'CLP', 'PYG']);
const LOCALE = 'es-BO';

export function currencySymbol(code: string, currencies: Currency[] = []): string {
  return currencies.find((c) => c.code === code)?.symbol || CURRENCY_SYMBOLS[code] || code;
}

export function formatMoney(amount: number, currency: string, currencies: Currency[] = []): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const symbol = currencySymbol(currency, currencies);
  if (currency === 'BOB') return `${symbol} ${n.toLocaleString(LOCALE, { maximumFractionDigits: 2 })}`;
  const digits = ZERO_DECIMALS.has(currency) ? 0 : 2;
  return `${symbol} ${n.toLocaleString(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/**
 * Moneda en la que se puede mostrar: la elegida si ya conocemos su tasa; si no (catálogo de monedas aún sin cargar o moneda
 * retirada), Bs. Así nunca se muestra «US$ 100» para un precio de Bs 100 sin convertir.
 */
export function displayCurrency(currencies: Currency[], selected: string): { code: string; rate: number } {
  if (selected === 'BOB') return { code: 'BOB', rate: 1 };
  const c = currencies.find((x) => x.code === selected);
  return c && Number.isFinite(c.rate) && c.rate > 0 ? { code: c.code, rate: c.rate } : { code: 'BOB', rate: 1 };
}

/** Formatea un monto guardado en Bs en la moneda elegida (función pura: base de useMoney/MoneyText/PriceDisplay). */
export function formatFromBs(amountBs: number | string, currencies: Currency[], selected: string): string {
  const { code, rate } = displayCurrency(currencies, selected);
  return formatMoney(convertPrice(Number(amountBs), code, rate), code, currencies);
}
