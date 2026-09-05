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

export function formatMoney(amount: number, currency: string): string {
  if (currency === 'USD') {
    return `US$ ${amount.toFixed(2)}`;
  }
  return `Bs ${amount.toLocaleString('es-BO', { maximumFractionDigits: 2 })}`;
}
