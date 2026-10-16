import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { api } from './api';

/**
 * ÚNICO punto de formateo de montos en la app. Los montos se guardan en Bs y se muestran convertidos y con la
 * denominación de la moneda elegida (Bs, US$, €, ...). No usar `${n} Bs` ni toFixed sueltos para mostrar precios.
 * Misma lógica que la web (stores/currencyStore.ts). Si la tasa de la moneda elegida no se conoce, se muestra en Bs.
 */
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number;
  isDefault?: boolean;
}

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
};
const ZERO_DECIMALS = new Set(['JPY', 'CLP', 'PYG', 'COP']);

export function currencySymbol(code: string, currencies: Currency[] = []): string {
  return currencies.find((c) => c.code === code)?.symbol || CURRENCY_SYMBOLS[code] || code;
}

/** Miles con punto y decimales con coma (es-BO), sin depender de Intl (Hermes en Android no siempre lo trae completo). */
export function groupNumber(n: number, digits: number, minDigits = digits): string {
  const neg = n < 0 ? '-' : '';
  const fixed = Math.abs(n).toFixed(digits);
  let [int, dec = ''] = fixed.split('.');
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  dec = dec.replace(/0+$/, '');
  if (dec.length < minDigits) dec = dec.padEnd(minDigits, '0');
  return dec ? `${neg}${int},${dec}` : `${neg}${int}`;
}

export function formatMoney(amount: number, currency: string, currencies: Currency[] = []): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const symbol = currencySymbol(currency, currencies);
  // Bs: sin decimales si el monto es entero; si no, siempre dos (Bs 80, Bs 1.234,50).
  if (currency === 'BOB') return `${symbol} ${groupNumber(n, Math.round(n * 100) % 100 === 0 ? 0 : 2)}`;
  const d = ZERO_DECIMALS.has(currency) ? 0 : 2;
  return `${symbol} ${groupNumber(n, d)}`;
}

/** Moneda efectiva: la elegida si se conoce su tasa; si no, Bs (nunca un símbolo ajeno sobre un monto sin convertir). */
export function displayCurrency(currencies: Currency[], selected: string): { code: string; rate: number } {
  if (selected === 'BOB') return { code: 'BOB', rate: 1 };
  const c = currencies.find((x) => x.code === selected);
  return c && Number.isFinite(c.rate) && c.rate > 0 ? { code: c.code, rate: c.rate } : { code: 'BOB', rate: 1 };
}

export function formatFromBs(amountBs: number | string | null | undefined, currencies: Currency[], selected: string): string {
  const { code, rate } = displayCurrency(currencies, selected);
  const n = Number(amountBs ?? 0);
  return formatMoney(code === 'BOB' ? n : n / rate, code, currencies);
}

// ── Estado (moneda elegida, persistida) ─────────────────────────────────────
const KEY = 'currency';

interface CurrencyState {
  currencies: Currency[];
  selected: string;
  loaded: boolean;
  listLoaded: boolean;
  init: () => Promise<void>;
  loadCurrencies: () => Promise<void>;
  setSelected: (code: string) => void;
}

/**
 * La lista de monedas (con su cotización) se pide solo cuando hace falta: si la elegida no es Bs o al abrir el selector.
 * Así las pantallas que solo muestran precios en Bs no hacen una petición extra.
 */
export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  currencies: [],
  selected: 'BOB',
  loaded: false,
  listLoaded: false,
  init: async () => {
    if (get().loaded) return;
    set({ loaded: true });
    try {
      const saved = await AsyncStorage.getItem(KEY);
      if (saved && /^[A-Z]{3,4}$/.test(saved)) set({ selected: saved });
    } catch {
      /* sin almacenamiento: Bs */
    }
    if (get().selected !== 'BOB') await get().loadCurrencies();
  },
  loadCurrencies: async () => {
    if (get().listLoaded) return;
    set({ listLoaded: true });
    try {
      const { data } = await api.get('/currencies');
      const list = (data?.data?.currencies ?? []) as Currency[];
      set({ currencies: list.filter((c) => c && typeof c.code === 'string' && Number(c.rate) > 0).map((c) => ({ ...c, rate: Number(c.rate) })) });
    } catch {
      set({ listLoaded: false, currencies: get().currencies.length ? get().currencies : [{ code: 'BOB', name: 'Boliviano', symbol: 'Bs', rate: 1, isDefault: true }] });
    }
  },
  setSelected: (code) => {
    set({ selected: code });
    AsyncStorage.setItem(KEY, code).catch(() => undefined);
    if (code !== 'BOB') get().loadCurrencies();
  },
}));

/** Formateador de montos guardados en Bs en la moneda elegida. */
export function useMoney() {
  const currencies = useCurrencyStore((s) => s.currencies);
  const selected = useCurrencyStore((s) => s.selected);
  const init = useCurrencyStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
  return (amount: number | string | null | undefined) => formatFromBs(amount, currencies, selected);
}
