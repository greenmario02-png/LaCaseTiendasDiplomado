import { api, cuentas, decodificarJwt, login, observarTexto, tokenDe } from '../support/evidencia';

describe('Seguridad y contrato de errores (API)', () => {
  let tokenVendedor = '';
  let tokenComprador = '';

  before(() => {
    tokenDe('vendedor').then((t) => (tokenVendedor = t));
    tokenDe('comprador').then((t) => (tokenComprador = t));
  });

  it('CP-10 · Salud de la API', () => {
    cy.caso({ id: 'CP-10', requisito: 'RNF disponibilidad', escenario: 'Consulta de salud pública', metodo: 'GET', ruta: '/salud', rol: 'anónimo', esperado: 'HTTP 200' });
    api('GET', '/salud').then((r) => expect(r.status).to.eq(200));
  });

  it('CP-11 · Login válido (vendedor) con token que vence', () => {
    cy.caso({ id: 'CP-11', requisito: 'Autenticación', escenario: 'Login válido de la cuenta de revisión del vendedor', metodo: 'POST', ruta: '/auth/login', rol: 'SELLER', esperado: 'HTTP 200 y accessToken con vencimiento (exp - iat = 900 s)' });
    const { email, password } = cuentas.vendedor();
    login(email, password).then((r) => {
      expect(r.status).to.eq(200);
      const jwt = decodificarJwt(r.body.data.accessToken);
      expect(jwt.exp - jwt.iat).to.eq(900);
      expect(r.body.data.user.role).to.eq('SELLER');
      expect(r.body.data.user).not.to.have.property('passwordHash');
      observarTexto(`HTTP 200; token vence en ${jwt.exp - jwt.iat} s; role=${r.body.data.user.role}`);
    });
  });

  it('CP-12 · Login inválido', () => {
    cy.caso({ id: 'CP-12', requisito: 'Autenticación', escenario: 'Contraseña incorrecta', metodo: 'POST', ruta: '/auth/login', rol: 'anónimo', esperado: 'HTTP 401, mensaje genérico (no revela si el correo existe)' });
    login(cuentas.vendedor().email, 'contraseña-incorrecta-123').then((r) => {
      expect(r.status).to.eq(401);
      expect(r.body.error.code).to.eq('UNAUTHORIZED');
    });
  });

  it('CP-13 · Ruta protegida sin token', () => {
    cy.caso({ id: 'CP-13', requisito: 'Autenticación', escenario: 'Ruta de vendedor sin cabecera Authorization', metodo: 'GET', ruta: '/seller/products', rol: 'anónimo', esperado: 'HTTP 401' });
    api('GET', '/seller/products').then((r) => {
      expect(r.status).to.eq(401);
      expect(r.body.error.code).to.eq('UNAUTHORIZED');
    });
  });

  it('CP-14 · Token inválido', () => {
    cy.caso({ id: 'CP-14', requisito: 'Autenticación', escenario: 'Token manipulado en ruta protegida', metodo: 'GET', ruta: '/seller/products', rol: 'anónimo', esperado: 'HTTP 401' });
    api('GET', '/seller/products', { token: 'token.invalido.firma' }).then((r) => expect(r.status).to.eq(401));
  });

  it('CP-15 · 403: comprador en ruta de vendedor', () => {
    cy.caso({ id: 'CP-15', requisito: 'Autorización por rol', escenario: 'Comprador con token válido intenta listar productos del vendedor', metodo: 'GET', ruta: '/seller/products', rol: 'CUSTOMER', esperado: 'HTTP 403 con formato de error único' });
    api('GET', '/seller/products', { token: tokenComprador }).then((r) => {
      expect(r.status).to.eq(403);
      expect(r.body.error.code).to.eq('FORBIDDEN');
    });
  });

  it('CP-18 · Registro con datos inválidos', () => {
    cy.caso({ id: 'CP-18', requisito: 'Validación en servidor', escenario: 'Registro con correo mal formado y contraseña corta', metodo: 'POST', ruta: '/auth/register', rol: 'anónimo', esperado: 'HTTP 400 con details por campo' });
    api('POST', '/auth/register', { body: { email: 'no-es-un-correo', password: '123', firstName: 'X', lastName: 'Y' } }).then((r) => {
      expect(r.status).to.eq(400);
      expect(r.body.error.code).to.eq('BAD_REQUEST');
      expect(r.body.error.details).to.be.an('array').and.have.length.greaterThan(0);
    });
  });

  it('CP-19 · Registro con correo duplicado', () => {
    cy.caso({ id: 'CP-19', requisito: 'Autenticación', escenario: 'Registrar de nuevo el correo del comprador de revisión', metodo: 'POST', ruta: '/auth/register', rol: 'anónimo', esperado: 'HTTP 409 CONFLICT' });
    api('POST', '/auth/register', {
      body: { email: cuentas.comprador().email, password: 'clave-de-prueba-123', firstName: 'Dup', lastName: 'Licado' },
    }).then((r) => {
      expect(r.status).to.eq(409);
      expect(r.body.error.code).to.eq('CONFLICT');
    });
  });

  it('CP-20 · Recurso inexistente', () => {
    cy.caso({ id: 'CP-20', requisito: 'Catálogo', escenario: 'Consultar un producto que no existe', metodo: 'GET', ruta: '/products/999999999', rol: 'anónimo', esperado: 'HTTP 404' });
    api('GET', '/products/999999999').then((r) => expect(r.status).to.eq(404));
  });

  it('CP-21 · Comprador puede iniciar sesión desde la app móvil', () => {
    cy.caso({ id: 'CP-21', requisito: 'Administración solo web', escenario: 'Login con cabecera X-Client-App: mobile de una cuenta no administradora (el 403 para ADMIN lo cubre la suite Jest admin-web-only)', metodo: 'POST', ruta: '/auth/login', rol: 'CUSTOMER', esperado: 'HTTP 200' });
    const { email, password } = cuentas.comprador();
    api('POST', '/auth/login', { body: { email, password }, headers: { 'X-Client-App': 'mobile' } }).then((r) => expect(r.status).to.eq(200));
  });
});
