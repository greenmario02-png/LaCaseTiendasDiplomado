import { beforeEach, describe, expect, it } from 'vitest';
import { summarizeSelection, useCartSelection } from './cartSelectionStore';
import type { CartData } from './cartStore';

const item = (id: number, sellerId: number, unit: number, qty: number) => ({
  id,
  quantity: qty,
  unitPrice: String(unit),
  lineTotal: unit * qty,
  product: { id: id * 10, name: `P${id}`, price: String(unit), stock: 9, seller: { id: sellerId, storeName: `T${sellerId}`, rating: 5, locationCity: 'Tarija' }, images: [] },
});
const cart: CartData = {
  cartId: 1,
  items: [item(1, 7, 40, 2), item(2, 7, 10, 1), item(3, 9, 70, 1)],
  groupedBySeller: [
    { seller: { id: 7, storeName: 'T7', rating: 5, locationCity: 'Tarija' }, items: [item(1, 7, 40, 2), item(2, 7, 10, 1)], subtotal: 90 },
    { seller: { id: 9, storeName: 'T9', rating: 5, locationCity: 'Tarija' }, items: [item(3, 9, 70, 1)], subtotal: 70 },
  ],
  subtotal: 160,
  itemCount: 4,
};

describe('selección del carrito (doc 61)', () => {
  beforeEach(() => {
    localStorage.clear();
    useCartSelection.setState({ excluded: [] });
  });

  it('por defecto todo está seleccionado', () => {
    const s = summarizeSelection(cart, []);
    expect(s).toMatchObject({ count: 3, units: 4, subtotal: 160, allSelected: true, ids: [1, 2, 3] });
  });

  it('el resumen calcula solo lo seleccionado y agrupa por tienda', () => {
    const s = summarizeSelection(cart, [1]);
    expect(s.subtotal).toBe(80);
    expect(s.ids).toEqual([2, 3]);
    expect(s.groups.map((g) => [g.seller.id, g.subtotal])).toEqual([[7, 10], [9, 70]]);
    expect(s.allSelected).toBe(false);
  });

  it('una tienda sin nada seleccionado desaparece del resumen', () => {
    const s = summarizeSelection(cart, [3]);
    expect(s.groups.map((g) => g.seller.id)).toEqual([7]);
  });

  it('persiste lo no seleccionado y lo restaura', () => {
    useCartSelection.getState().toggle(2);
    expect(useCartSelection.getState().excluded).toEqual([2]);
    expect(JSON.parse(localStorage.getItem('cartExcluded')!)).toEqual([2]);
    useCartSelection.getState().toggle(2);
    expect(useCartSelection.getState().excluded).toEqual([]);
  });

  it('seleccionar/deseleccionar por tienda y podar ids que ya no están', () => {
    useCartSelection.getState().setSelected([1, 2], false);
    expect(summarizeSelection(cart, useCartSelection.getState().excluded).ids).toEqual([3]);
    useCartSelection.getState().prune([2, 3]);
    expect(useCartSelection.getState().excluded).toEqual([2]);
  });

  it('carrito vacío o nulo', () => {
    expect(summarizeSelection(null, [])).toMatchObject({ count: 0, subtotal: 0, allSelected: false });
  });
});
