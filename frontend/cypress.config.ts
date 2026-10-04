import { defineConfig } from 'cypress';
import fs from 'fs';
import path from 'path';

/**
 * Pruebas de producción (capa independiente de Vitest/Jest/Supertest).
 *
 * Variables (todas por entorno, nunca en el repositorio):
 *   CYPRESS_BASE_URL, CYPRESS_API_URL,
 *   CYPRESS_REVIEW_SELLER_EMAIL / _PASSWORD, CYPRESS_REVIEW_BUYER_EMAIL / _PASSWORD
 *
 * Cada caso se registra con id, escenario, esperado, obtenido, estado, URL y fecha, y al terminar la
 * corrida se escriben evidencia/produccion/cypress-AAAA-MM-DD.json y .html. No se registran
 * tokens ni contraseñas.
 */
const EVIDENCIA_DIR = path.resolve(process.cwd(), '..', 'evidencia', 'produccion');
const casos: Record<string, unknown>[] = [];
const tokens: Record<string, string> = {}; // solo en memoria

const fechaLaPaz = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date());
const horaLaPaz = () =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).replace(':', '');
const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

function escribirReportes(baseUrl: string, apiUrl: string) {
  fs.mkdirSync(EVIDENCIA_DIR, { recursive: true });
  const fecha = fechaLaPaz();
  const sufijo = `${fecha}-${horaLaPaz()}`; // cada ejecución conserva su propio reporte (los fallos previos son evidencia)
  const aprobados = casos.filter((c) => c.estado === 'Aprobado').length;
  const noAplica = casos.filter((c) => c.estado === 'No aplica en este entorno').length;
  const resumen = {
    proyecto: 'LaCase Multitiendas',
    fecha,
    frontend: baseUrl,
    api: apiUrl,
    total: casos.length,
    aprobados,
    noAplica,
    fallidos: casos.length - aprobados - noAplica,
    casos,
  };
  fs.writeFileSync(path.join(EVIDENCIA_DIR, `cypress-${sufijo}.json`), JSON.stringify(resumen, null, 2), 'utf8');

  const filas = casos
    .map(
      (c) => `<tr class="${c.estado === 'Aprobado' ? 'ok' : 'fail'}"><td>${esc(c.id)}</td><td>${esc(c.escenario)}</td>` +
        `<td>${esc(c.metodo)} ${esc(c.ruta)}</td><td>${esc(c.rol)}</td><td>${esc(c.esperado)}</td><td>${esc(c.obtenido)}</td>` +
        `<td>${esc(c.estado)}</td><td>${esc(c.observadoEn)}</td><td>${esc(c.fecha)}</td></tr>`,
    )
    .join('\n');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Reporte Cypress ${fecha}</title>
<style>body{font-family:system-ui,sans-serif;margin:24px}table{border-collapse:collapse;width:100%;font-size:13px}
th,td{border:1px solid #999;padding:6px;text-align:left;vertical-align:top}th{background:#eee}tr.ok td:nth-child(7){color:#0a6b2b;font-weight:600}
tr.fail td:nth-child(7){color:#b00020;font-weight:600}</style></head><body>
<h1>Reporte de pruebas — LaCase Multitiendas</h1>
<p>Fecha (America/La_Paz): ${esc(fecha)} · Frontend: ${esc(baseUrl)} · API: ${esc(apiUrl)}</p>
<p>Total: ${casos.length} · Aprobados: ${aprobados} · Fallidos: ${casos.length - aprobados - noAplica} · No aplican en este entorno: ${noAplica}</p>
<table><thead><tr><th>ID</th><th>Escenario</th><th>Método y ruta</th><th>Rol</th><th>Esperado</th><th>Obtenido</th><th>Estado</th><th>Observado en</th><th>Fecha</th></tr></thead>
<tbody>${filas}</tbody></table></body></html>`;
  fs.writeFileSync(path.join(EVIDENCIA_DIR, `cypress-${sufijo}.html`), html, 'utf8');
}

export default defineConfig({
  video: false,
  screenshotsFolder: path.join(EVIDENCIA_DIR, 'capturas-ui'),
  e2e: {
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    defaultCommandTimeout: 15000,
    requestTimeout: 60000, // Render (plan gratuito) puede tardar en despertar
    responseTimeout: 60000,
    setupNodeEvents(on, config) {
      on('task', {
        registrar(caso: Record<string, unknown>) {
          casos.push(caso);
          return null;
        },
        tokenGet(rol: string) {
          return tokens[rol] ?? null;
        },
        tokenSet({ rol, token }: { rol: string; token: string }) {
          tokens[rol] = token;
          return null;
        },
      });
      on('after:run', () => {
        if (casos.length) escribirReportes(String(config.baseUrl ?? ''), String(config.env.API_URL ?? ''));
      });
      return config;
    },
  },
});
