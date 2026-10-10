/// <reference types="cypress" />

export interface Caso {
  id: string;
  requisito: string;
  escenario: string;
  metodo: string;
  ruta: string;
  rol: string;
  esperado: string;
}

type Registro = Caso & { obtenido?: string; codigo?: number; captura?: string };

// Cypress empaqueta por separado el soporte y cada spec: una variable de módulo NO se compartiría entre
// ellos (los casos aprobados quedaban sin "obtenido"). El estado vive en globalThis, común a ambos.
const g = globalThis as unknown as { __casoActual?: Registro | null };
const getActual = (): Registro | null => g.__casoActual ?? null;
const setActual = (v: Registro | null) => {
  g.__casoActual = v;
};

export const apiUrl = () => String(Cypress.env('API_URL')).replace(/\/$/, '');

export function iniciarCaso(c: Caso) {
  setActual({ ...c });
}

/** Guarda lo observado (solo código y error.code; nunca tokens ni contraseñas). */
export function observar(status: number, body?: any, extra = '') {
  const actual = getActual();
  if (!actual) return;
  const code = body?.error?.code;
  actual.codigo = status;
  actual.obtenido = `HTTP ${status}${code ? `; error.code=${code}` : ''}${extra ? `; ${extra}` : ''}`;
}

export function observarTexto(texto: string) {
  const actual = getActual();
  if (actual) actual.obtenido = texto;
}

export function capturaDe(nombre: string) {
  const actual = getActual();
  if (actual) actual.captura = nombre;
}

export function cerrarCaso(estado: 'Aprobado' | 'Fallido' | 'No aplica en este entorno', error?: string, titulo = '') {
  let actual = getActual();
  if (!actual) {
    // Un test que falla antes de registrar su caso NUNCA debe desaparecer del reporte.
    if (estado !== 'Fallido') return;
    const id = titulo.split(' · ')[0] || titulo;
    actual = { id, requisito: 'sin registrar', escenario: titulo, metodo: '-', ruta: '-', rol: '-', esperado: 'no llegó a registrarse (falló antes)' };
  }
  const base = String(Cypress.config('baseUrl') ?? '');
  const registro = {
    ...actual,
    obtenido: (actual.obtenido ?? '') + (estado === 'Fallido' && error ? `${actual.obtenido ? ' · ' : ''}Falla: ${error.slice(0, 200)}` : ''),
    estado,
    url: base,
    observadoEn: /localhost|127\.0\.0\.1/.test(base) ? 'entorno local' : 'producción',
    fecha: new Date().toISOString(),
  };
  setActual(null);
  cy.task('registrar', registro, { log: false });
}

/** Petición a la API sin imprimir cuerpo/credenciales en el log y sin fallar por códigos 4xx. */
export function api(
  method: string,
  ruta: string,
  opts: { token?: string; body?: Cypress.RequestBody; qs?: Record<string, unknown>; headers?: Record<string, string> } = {},
) {
  return cy
    .request({
      method,
      url: `${apiUrl()}${ruta}`,
      body: opts.body,
      qs: opts.qs,
      headers: { ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}), ...(opts.headers ?? {}) },
      failOnStatusCode: false,
      log: false,
    })
    .then((res) => {
      observar(res.status, res.body);
      // Línea visible en el ejecutor de Cypress: método, URL y código HTTP (nunca cabeceras, tokens ni cuerpos).
      Cypress.log({ name: 'api', displayName: method, message: `${apiUrl()}${ruta} → HTTP ${res.status}`, consoleProps: () => ({ metodo: method, ruta, estado: res.status }) });
      return res;
    });
}

const ESPERA_LIMITE_MS = 62000;

/** Login contra la API. Si el limitador (10 intentos/min) responde 429, espera y reintenta una vez. */
export function login(email: string, password: string) {
  return api('POST', '/auth/login', { body: { email, password } }).then((res) => {
    if (res.status !== 429) return cy.wrap(res, { log: false });
    cy.log('Limitador de login activo: se espera 62 s y se reintenta');
    cy.wait(ESPERA_LIMITE_MS, { log: false });
    return api('POST', '/auth/login', { body: { email, password } });
  });
}

export type RolRevision = 'vendedor' | 'comprador' | 'admin';

/**
 * Token de la cuenta de revisión. Se guarda solo en la memoria del proceso de Cypress (task) para
 * no repetir el login en cada archivo y no activar el limitador; nunca se escribe en disco ni en el reporte.
 */
export function tokenDe(rol: RolRevision) {
  return cy.task('tokenGet', rol, { log: false }).then((guardado) => {
    // El token dura 15 minutos: si el guardado vence en menos de 60 s (por ejemplo, en una repetición del ejecutor gráfico), se vuelve a iniciar sesión.
    const vigente = guardado && decodificarJwt(String(guardado)).exp * 1000 - Date.now() > 60000;
    if (vigente) return cy.wrap(String(guardado), { log: false });
    const { email, password } = cuentas[rol]();
    return login(email, password).then((r) => {
      expect(r.status, `login de la cuenta de revisión (${rol})`).to.eq(200);
      const token = String(r.body.data.accessToken);
      cy.task('tokenSet', { rol, token }, { log: false });
      return cy.wrap(token, { log: false });
    });
  });
}

export function decodificarJwt(token: string): { exp: number; iat: number; role?: string } {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(payload));
}

export const cuentas = {
  vendedor: () => ({ email: String(Cypress.env('REVIEW_SELLER_EMAIL')), password: String(Cypress.env('REVIEW_SELLER_PASSWORD')) }),
  admin: () => ({ email: String(Cypress.env('REVIEW_ADMIN_EMAIL')), password: String(Cypress.env('REVIEW_ADMIN_PASSWORD')) }),
  comprador: () => ({ email: String(Cypress.env('REVIEW_BUYER_EMAIL')), password: String(Cypress.env('REVIEW_BUYER_PASSWORD')) }),
};
