import { capturaDe, cuentas, observarTexto } from '../support/evidencia';

/**
 * Comprobaciones de interfaz con captura del runner (sirven para anexos; las capturas de la
 * monografía con la barra de direcciones visible se toman aparte en Edge/Chrome de escritorio).
 */
const entorno = () => (/localhost|127\.0\.0\.1/.test(String(Cypress.config('baseUrl'))) ? 'local' : 'produccion');
const fecha = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date());
const foto = (id: string, nombre: string) => {
  const archivo = `${id}-${nombre}-${entorno()}-${fecha()}`;
  capturaDe(`capturas-ui/${archivo}.png`);
  cy.screenshot(archivo, { capture: 'viewport', overwrite: true });
};

function iniciarSesionPorFormulario(email: string, password: string) {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email, { log: false });
  cy.get('input[type="password"]').type(password, { log: false });
  cy.get('button[type="submit"]').click();
}

describe('Interfaz web', () => {
  it('UI-01 · Catálogo público con datos de la API', () => {
    cy.caso({ id: 'UI-01', requisito: 'Catálogo', escenario: 'Abrir el catálogo sin sesión', metodo: 'GET', ruta: '/productos', rol: 'anónimo', esperado: 'La página muestra el total de productos devueltos por la API' });
    cy.intercept('GET', '**/products*').as('productos');
    cy.visit('/productos');
    cy.wait('@productos').its('response.statusCode').should('eq', 200);
    cy.contains(/\d+ productos de todas las tiendas/i, { timeout: 30000 }).should('be.visible');
    cy.then(() => observarTexto('Catálogo renderizado con el total de productos; GET /products → 200'));
    foto('UI-01', 'catalogo');
  });

  it('UI-02 · Login válido (vendedor)', () => {
    cy.caso({ id: 'UI-02', requisito: 'Autenticación', escenario: 'Login por formulario con la cuenta de revisión del vendedor', metodo: 'POST', ruta: '/auth/login', rol: 'SELLER', esperado: 'Redirige fuera de /login y habilita el panel /seller' });
    const { email, password } = cuentas.vendedor();
    iniciarSesionPorFormulario(email, password);
    cy.location('pathname', { timeout: 30000 }).should('not.eq', '/login');
    cy.visit('/seller');
    cy.location('pathname').should('match', /^\/seller/);
    cy.then(() => observarTexto('Login correcto; /seller accesible para SELLER'));
    foto('UI-02', 'login-valido-panel-vendedor');
  });

  it('UI-03 · Login inválido muestra el error', () => {
    cy.caso({ id: 'UI-03', requisito: 'Autenticación', escenario: 'Login con contraseña incorrecta', metodo: 'POST', ruta: '/auth/login', rol: 'anónimo', esperado: 'Se queda en /login y muestra el mensaje de la API (401)' });
    cy.intercept('POST', '**/auth/login').as('login');
    cy.visit('/login');
    cy.get('input[type="email"]').type(cuentas.vendedor().email, { log: false });
    cy.get('input[type="password"]').type('contraseña-incorrecta-123', { log: false });
    cy.get('button[type="submit"]').click();
    cy.wait('@login').its('response.statusCode').should('eq', 401);
    cy.location('pathname').should('eq', '/login');
    cy.contains(/credenciales inv/i).should('be.visible');
    cy.then(() => observarTexto('HTTP 401; permanece en /login y se muestra "Credenciales inválidas"'));
    foto('UI-03', 'login-invalido-401');
  });

});
