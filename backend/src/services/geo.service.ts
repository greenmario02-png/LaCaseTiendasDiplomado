import { prisma } from '../config/database';

export const DEFAULT_NEAR_RADIUS_KM = 50;

export interface Coords {
  lat: number;
  lng: number;
}

/** Distancia haversine en km entre dos coordenadas. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Lee `lat`/`lng` (y `radiusKm`) de un querystring; null si faltan o son inválidos. */
export function parseCoords(query: { lat?: unknown; lng?: unknown; radiusKm?: unknown }): (Coords & { radiusKm: number }) | null {
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  if (query.lat == null || query.lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const r = Number(query.radiusKm);
  const radiusKm = Number.isFinite(r) && r > 0 ? Math.min(r, 500) : DEFAULT_NEAR_RADIUS_KM;
  return { lat, lng, radiusKm };
}

/** Filtra los ítems con coordenadas dentro del radio y los ordena por cercanía. */
export function nearestFirst<T extends { latitude?: number | null; longitude?: number | null }>(
  items: T[],
  origin: Coords,
  radiusKm: number,
): Array<T & { distanceKm: number }> {
  const out: Array<T & { distanceKm: number }> = [];
  for (const it of items) {
    if (it.latitude == null || it.longitude == null) continue;
    const d = haversineKm(origin.lat, origin.lng, it.latitude, it.longitude);
    if (d <= radiusKm) out.push({ ...it, distanceKm: Math.round(d * 10) / 10 });
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Ciudad del catálogo más cercana a las coords (dentro de su radio o la más cercana). */
export async function nearestCity(lat: number, lng: number) {
  const cities = await prisma.forumCity.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  let best: { city: (typeof cities)[number]; dist: number } | null = null;
  for (const c of cities) {
    const dist = haversineKm(lat, lng, c.latitude, c.longitude);
    if (!best || dist < best.dist) best = { city: c, dist };
  }
  if (!best) return null;
  return { city: best.city, distanceKm: Math.round(best.dist * 100) / 100, within: best.dist <= best.city.radiusKm };
}

const norm = (s?: string | null) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** Coordenadas del catálogo de ciudades por nombre normalizado (respaldo cuando falta lat/lng). */
export async function cityCoordsMap(): Promise<Map<string, Coords>> {
  const cities = await prisma.forumCity.findMany({ where: { isActive: true }, select: { name: true, latitude: true, longitude: true } });
  return new Map(cities.map((c) => [norm(c.name), { lat: c.latitude, lng: c.longitude }]));
}

/** Completa latitude/longitude de un ítem con las de su ciudad cuando no las tiene. */
export function withCityFallback<T extends { latitude?: number | null; longitude?: number | null }>(
  item: T,
  city: string | null | undefined,
  map: Map<string, Coords>,
): T & { latitude: number | null; longitude: number | null } {
  if (item.latitude != null && item.longitude != null) return item as T & { latitude: number; longitude: number };
  const c = map.get(norm(city));
  return { ...item, latitude: c?.lat ?? null, longitude: c?.lng ?? null };
}
