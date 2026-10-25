/** Dirección de envío tal como la devuelve el servidor (`state` = departamento; `postalCode` opcional en Bolivia). */
export interface ShippingAddressLike {
  street?: string | null;
  number?: string | null;
  floor?: string | null;
  city?: string | null;
  state?: string | null;
}

/** «Calle Sucre 10, Piso 2, Tarija, Tarija»: solo las partes que existen (nunca «undefined» ni «null»). */
export function formatShippingAddress(a: ShippingAddressLike): string {
  const line1 = [a.street, a.number].map((s) => (s ?? '').trim()).filter(Boolean).join(' ');
  return [line1, a.floor, a.city, a.state].map((s) => (s ?? '').trim()).filter(Boolean).join(', ');
}
