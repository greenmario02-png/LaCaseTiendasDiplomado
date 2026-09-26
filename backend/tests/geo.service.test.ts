import { haversineKm, nearestFirst, parseCoords, withCityFallback } from '../src/services/geo.service';

describe('geo.service', () => {
  it('haversineKm: La Paz ↔ El Alto ≈ 3-5 km y simétrica', () => {
    const d = haversineKm(-16.4897, -68.1193, -16.5047, -68.1633);
    expect(d).toBeGreaterThan(3);
    expect(d).toBeLessThan(6);
    expect(haversineKm(-16.5047, -68.1633, -16.4897, -68.1193)).toBeCloseTo(d, 6);
  });

  it('parseCoords valida rango y aplica radio por defecto', () => {
    expect(parseCoords({ lat: '-16.5', lng: '-68.15' })).toEqual({ lat: -16.5, lng: -68.15, radiusKm: 50 });
    expect(parseCoords({ lat: '-16.5', lng: '-68.15', radiusKm: '10' })?.radiusKm).toBe(10);
    expect(parseCoords({ lat: '999', lng: '0' })).toBeNull();
    expect(parseCoords({ lat: 'abc', lng: '0' })).toBeNull();
    expect(parseCoords({})).toBeNull();
  });

  it('nearestFirst filtra por radio, ignora ítems sin coordenadas y ordena por cercanía', () => {
    const origin = { lat: -16.5, lng: -68.15 };
    const items = [
      { id: 'lejos', latitude: -17.78, longitude: -63.18 },
      { id: 'sin-coords', latitude: null, longitude: null },
      { id: 'el-alto', latitude: -16.5047, longitude: -68.1633 },
      { id: 'la-paz', latitude: -16.4897, longitude: -68.1193 },
    ];
    const out = nearestFirst(items, origin, 50);
    expect(out.map((i) => i.id)).toEqual(['el-alto', 'la-paz']);
    expect(out[0].distanceKm).toBeLessThan(out[1].distanceKm);
  });

  it('withCityFallback usa las coordenadas de la ciudad solo si faltan las propias', () => {
    const mapa = new Map([['la paz', { lat: -16.4897, lng: -68.1193 }]]);
    expect(withCityFallback({ latitude: null, longitude: null }, 'La Paz', mapa)).toMatchObject({ latitude: -16.4897, longitude: -68.1193 });
    expect(withCityFallback({ latitude: 1, longitude: 2 }, 'La Paz', mapa)).toMatchObject({ latitude: 1, longitude: 2 });
    expect(withCityFallback({}, 'Ciudad Inexistente', mapa)).toMatchObject({ latitude: null, longitude: null });
  });
});
