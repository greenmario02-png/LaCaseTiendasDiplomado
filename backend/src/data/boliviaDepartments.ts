/**
 * Los 9 departamentos de Bolivia (división administrativa de primer nivel). Lista cerrada: toda
 * dirección en este proyecto usa uno de estos (ver `address.schemas.ts`). En Bolivia no existe
 * código postal real, por eso `Address.postalCode` es opcional (ver `schema.prisma`).
 */
export const BOLIVIA_DEPARTMENTS = ['Beni', 'Chuquisaca', 'Cochabamba', 'La Paz', 'Oruro', 'Pando', 'Potosí', 'Santa Cruz', 'Tarija'] as const;
export type BoliviaDepartment = (typeof BOLIVIA_DEPARTMENTS)[number];

/** Normaliza para comparar: minúsculas, sin tildes, puntuación convertida en espacio, espacios colapsados. */
export function normText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const BY_KEY = new Map<string, BoliviaDepartment>(BOLIVIA_DEPARTMENTS.map((d) => [normText(d), d]));

/**
 * Devuelve el nombre oficial del departamento ("Potosí", "La Paz"...) si el texto es uno de los 9,
 * sin importar mayúsculas, tildes, espacios ni el prefijo «Departamento de» / «Dpto.»; si no lo es, `null`.
 */
export function canonicalDepartment(input: unknown): BoliviaDepartment | null {
  if (typeof input !== 'string') return null;
  const key = normText(input).replace(/^(departamento|depto|dpto)( de(l)?)? /, '');
  return BY_KEY.get(key) ?? null;
}
