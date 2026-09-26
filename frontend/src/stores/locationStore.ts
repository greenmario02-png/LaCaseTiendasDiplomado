import { create } from 'zustand';
import { resolveGeo } from '../services/forum.api';

export interface Coords {
  lat: number;
  lng: number;
}

type Status = 'idle' | 'asking' | 'granted' | 'denied' | 'unavailable';

interface LocationState {
  coords: Coords | null;
  city: string | null;
  status: Status;
  /** Pide la ubicación al navegador y resuelve la ciudad más cercana. Devuelve true si la obtuvo. */
  request: () => Promise<boolean>;
  /** Fija una ubicación conocida (p. ej. la que el usuario ya confirmó en el foro). */
  set: (coords: Coords, city?: string | null) => void;
  clear: () => void;
}

const KEY = 'lacase_geo';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function load(): { coords: Coords | null; city: string | null } {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (raw && Number.isFinite(raw.lat) && Number.isFinite(raw.lng) && Date.now() - (raw.at ?? 0) < MAX_AGE_MS) {
      return { coords: { lat: raw.lat, lng: raw.lng }, city: raw.city ?? null };
    }
  } catch {
    /* almacenamiento no disponible */
  }
  return { coords: null, city: null };
}

function save(coords: Coords | null, city: string | null) {
  try {
    if (coords) localStorage.setItem(KEY, JSON.stringify({ ...coords, city, at: Date.now() }));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignorar */
  }
}

const initial = load();

export const useLocationStore = create<LocationState>((set) => ({
  coords: initial.coords,
  city: initial.city,
  status: initial.coords ? 'granted' : 'idle',

  request: () =>
    new Promise<boolean>((resolve) => {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        set({ status: 'unavailable' });
        resolve(false);
        return;
      }
      set({ status: 'asking' });
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          let city: string | null = null;
          try {
            city = (await resolveGeo(coords.lat, coords.lng)).city ?? null;
          } catch {
            /* la ciudad es un extra: sin ella igual sirve la distancia */
          }
          save(coords, city);
          set({ coords, city, status: 'granted' });
          resolve(true);
        },
        (err) => {
          set({ status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable' });
          resolve(false);
        },
        { timeout: 10000, maximumAge: 10 * 60 * 1000 },
      );
    }),

  set: (coords, city = null) => {
    save(coords, city);
    set({ coords, city, status: 'granted' });
  },

  clear: () => {
    save(null, null);
    set({ coords: null, city: null, status: 'idle' });
  },
}));
