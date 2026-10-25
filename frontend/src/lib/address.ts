export interface AddressLike {
  street: string;
  number?: string | null;
  floor?: string | null;
  city: string;
  /** Departamento de Bolivia (la columna se llama `state`). */
  state: string;
  /** Opcional: en Bolivia no se usa código postal. */
  postalCode?: string | null;
}

/** Una línea legible de la dirección; sin código postal no muestra «CP» vacío ni «null». */
export function formatAddressLine(a: AddressLike): string {
  const floorPart = a.floor ? `, ${a.floor}` : '';
  const base = `${a.street} ${a.number ?? ''}${floorPart} — ${a.city}, ${a.state}`;
  return a.postalCode?.trim() ? `${base} (CP ${a.postalCode})` : base;
}
