import { create } from 'zustand';
import type { CartData, CartItem, SellerGroup } from './cartStore';

/**
 * Qué productos del carrito se van a pagar (doc 61). Se guarda lo NO seleccionado: así un producto recién agregado entra
 * seleccionado por defecto. Persistido en localStorage (sobrevive a recargar y a ir/volver del checkout).
 */
const KEY = 'cartExcluded';

function load(): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((n) => Number.isInteger(n) && n > 0).slice(0, 500) : [];
  } catch {
    return [];
  }
}
function save(ids: number[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* almacenamiento no disponible: la selección vive solo en memoria */
  }
}

interface SelectionState {
  excluded: number[];
  setSelected: (ids: number[], selected: boolean) => void;
  toggle: (id: number) => void;
  /** Quita de la lista ids que ya no están en el carrito (comprados o eliminados). */
  prune: (cartItemIds: number[]) => void;
}

export const useCartSelection = create<SelectionState>((set, get) => ({
  excluded: load(),
  setSelected: (ids, selected) => {
    const ex = new Set(get().excluded);
    for (const id of ids) {
      if (selected) ex.delete(id);
      else ex.add(id);
    }
    const next = [...ex];
    save(next);
    set({ excluded: next });
  },
  toggle: (id) => {
    const isEx = get().excluded.includes(id);
    get().setSelected([id], isEx);
  },
  prune: (cartItemIds) => {
    const valid = new Set(cartItemIds);
    const next = get().excluded.filter((id) => valid.has(id));
    if (next.length !== get().excluded.length) {
      save(next);
      set({ excluded: next });
    }
  },
}));

export interface SelectionSummary {
  items: CartItem[];
  ids: number[];
  count: number;
  units: number;
  subtotal: number;
  total: number;
  groups: SellerGroup[];
  allSelected: boolean;
}

/** Resumen solo de lo seleccionado (función pura). */
export function summarizeSelection(cart: CartData | null | undefined, excluded: number[]): SelectionSummary {
  const ex = new Set(excluded);
  const all = cart?.items ?? cart?.groupedBySeller?.flatMap((g) => g.items) ?? [];
  const items = all.filter((i) => !ex.has(i.id));
  const subtotal = round2(items.reduce((a, i) => a + lineTotal(i), 0));
  const groups = (cart?.groupedBySeller ?? [])
    .map((g) => {
      const its = g.items.filter((i) => !ex.has(i.id));
      return { ...g, items: its, subtotal: round2(its.reduce((a, i) => a + lineTotal(i), 0)) };
    })
    .filter((g) => g.items.length > 0);
  return {
    items,
    ids: items.map((i) => i.id),
    count: items.length,
    units: items.reduce((a, i) => a + i.quantity, 0),
    subtotal,
    total: all.length,
    groups,
    allSelected: all.length > 0 && items.length === all.length,
  };
}

function lineTotal(i: CartItem) {
  const lt = Number(i.lineTotal);
  return Number.isFinite(lt) ? lt : Number(i.unitPrice) * i.quantity;
}
const round2 = (n: number) => Math.round(n * 100) / 100;
