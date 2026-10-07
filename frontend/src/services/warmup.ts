import axios from 'axios';
import { create } from 'zustand';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/** Segundos de espera antes de avisar a la persona que el servidor está despertando. */
const AVISO_TRAS_MS = 3500;

interface ServidorState {
  despertando: boolean;
}

export const useServidorStore = create<ServidorState>(() => ({ despertando: false }));

let iniciado = false;

/**
 * La API gratuita se duerme tras un rato sin tráfico y la primera petición tarda hasta ~1 minuto.
 * Al abrir la web se consulta la ruta de salud de inmediato (en paralelo a lo demás) para despertarla
 * y, si tarda, se muestra el aviso «Conectando con el servidor…» en vez de una pantalla vacía.
 */
export function iniciarCalentamiento(): void {
  if (iniciado) return;
  iniciado = true;
  const aviso = window.setTimeout(() => useServidorStore.setState({ despertando: true }), AVISO_TRAS_MS);
  const terminar = () => {
    window.clearTimeout(aviso);
    useServidorStore.setState({ despertando: false });
  };
  axios
    .get(`${API_URL}/salud`, { timeout: 90_000 })
    .catch(() => undefined)
    .finally(terminar);
}

/** Estados con los que Render responde mientras arranca (la petición no llegó a la aplicación). */
const ESTADOS_ARRANQUE = new Set([502, 503, 504]);
const REINTENTOS_MAX = 3;
const ESPERA_BASE_MS = 3000;

/** ¿El error es de arranque en frío (sin respuesta o 502/503/504) en una lectura que se puede repetir? */
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
  return new Promise((resolver) => window.setTimeout(resolver, ESPERA_BASE_MS * intento));
}
