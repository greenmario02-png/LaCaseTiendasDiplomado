import axios from 'axios';
import { create } from 'zustand';
import { API_URL } from '../config/env';

/** Milisegundos de espera antes de avisar que el servidor está despertando. */
const AVISO_TRAS_MS = 3500;

interface ServidorState {
  despertando: boolean;
}

export const useServidorStore = create<ServidorState>(() => ({ despertando: false }));

let iniciado = false;

/**
 * La API gratuita se duerme tras un rato sin tráfico y la primera petición tarda hasta ~1 minuto.
 * Al abrir la app se consulta la ruta de salud de inmediato para despertarla; si tarda se muestra
 * «Conectando con el servidor…» en vez de una pantalla en blanco.
 */
export function iniciarCalentamiento(): void {
  if (iniciado) return;
  iniciado = true;
  const aviso = setTimeout(() => useServidorStore.setState({ despertando: true }), AVISO_TRAS_MS);
  axios
    .get(`${API_URL}/salud`, { timeout: 90_000 })
    .catch(() => undefined)
    .finally(() => {
      clearTimeout(aviso);
      useServidorStore.setState({ despertando: false });
    });
}

const ESTADOS_ARRANQUE = new Set([502, 503, 504]);
const REINTENTOS_MAX = 3;
const ESPERA_BASE_MS = 3000;

/** ¿Error de arranque en frío (sin respuesta, tiempo agotado o 502/503/504) en una lectura repetible? */
export function esReintentable(error: {
  config?: { method?: string; __intentos?: number };
  response?: { status: number };
}): boolean {
  const config = error.config;
  if (!config || config.method?.toLowerCase() !== 'get') return false;
  if ((config.__intentos ?? 0) >= REINTENTOS_MAX) return false;
  return !error.response || ESTADOS_ARRANQUE.has(error.response.status);
}

export function esperaDeReintento(intento: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ESPERA_BASE_MS * intento));
}
