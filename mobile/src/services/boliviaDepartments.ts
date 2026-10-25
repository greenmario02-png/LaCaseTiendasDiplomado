/**
 * Los 9 departamentos de Bolivia (división administrativa de primer nivel). Misma lista cerrada que valida
 * el servidor (`backend/src/data/boliviaDepartments.ts`) y la web: toda dirección guarda uno de estos en `state`.
 */
export const BOLIVIA_DEPARTMENTS = ['Beni', 'Chuquisaca', 'Cochabamba', 'La Paz', 'Oruro', 'Pando', 'Potosí', 'Santa Cruz', 'Tarija'] as const;
export type BoliviaDepartment = (typeof BOLIVIA_DEPARTMENTS)[number];

const normText = (s: string | null | undefined) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const BY_KEY = new Map<string, BoliviaDepartment>(BOLIVIA_DEPARTMENTS.map((d) => [normText(d), d]));

/**
 * Nombre oficial del departamento ("Potosí", "La Paz"...) si el texto es uno de los 9 (sin importar
 * mayúsculas, tildes ni el prefijo «Departamento de» / «Dpto.»); si no, `null`. Misma regla que el servidor.
 */
export function canonicalDepartment(input: string | null | undefined): BoliviaDepartment | null {
  const key = normText(input).replace(/^(departamento|depto|dpto)( de(l)?)? /, '');
  return BY_KEY.get(key) ?? null;
}
