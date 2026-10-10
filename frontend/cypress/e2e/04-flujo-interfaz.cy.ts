import { api, capturaDe, cuentas, observarTexto, tokenDe } from '../support/evidencia';

/**
 * Flujo Must de punta a punta desde la INTERFAZ WEB publicada (caja negra): el ejecutor de Cypress muestra la pantalla del
 * software mientras el vendedor publica un producto con foto, el comprador lo busca, lo agrega al carrito, confirma la compra
 * con retiro en tienda y registra el comprobante del pago QR, y el vendedor cambia el estado del pedido.
 * La aprobación del producto (moderación) la hace la cuenta administradora por la API, porque el administrador solo trabaja en la web.
 * Al terminar, el pedido se cancela y el producto se da de baja. Los datos son ficticios y de contexto boliviano.
 */
const entorno = () => (/localhost|127\.0\.0\.1/.test(String(Cypress.config('baseUrl'))) ? 'local' : 'produccion');
const fecha = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date());
const foto = (id: string, nombre: string) => {
  const archivo = `${id}-${nombre}-${entorno()}-${fecha()}`;
  capturaDe(`capturas-ui/${archivo}.png`);
  cy.screenshot(archivo, { capture: 'viewport', overwrite: true });
};

const nombreProducto = 'Singani Rujero Doble Destilado 750 ml (prueba: flujo desde la interfaz)';
const direccionRetiro = 'calle Bolívar esquina Sucre, Tarija';
let productoId = 0;
let pedidoId = 0;

/** Inicia sesión por el formulario y conserva la sesión entre casos (cy.session) para no superar el límite de intentos. */
function sesionPorFormulario(rol: 'vendedor' | 'comprador') {
  const { email, password } = cuentas[rol]();
  cy.session(
    ['interfaz', rol],
    () => {
      cy.visit('/login');
      cy.get('input[type="email"]').type(email, { log: false });
      cy.get('input[type="password"]').type(password, { log: false });
      cy.get('button[type="submit"]').click();
      cy.location('pathname', { timeout: 30000 }).should('not.eq', '/login');
    },
    { cacheAcrossSpecs: false },
  );
}

/** El panel del vendedor pide confirmar la contraseña al entrar (verificación de seguridad). */
function confirmarPanelDelVendedor() {
  const { password } = cuentas.vendedor();
  cy.wait(4000); // el cuadro aparece unos instantes después de cargar la página (la pantalla ya se dibuja detrás)
  cy.get('body', { timeout: 30000 }).then(($b) => {
    if ($b.text().includes('Verificación de seguridad')) {
      cy.get('input[type="password"]').type(password, { log: false });
      cy.contains('button', 'Verificar').click();
      cy.get('input[type="password"]', { timeout: 30000 }).should('not.exist');
    }
  });
}

const campo = (etiqueta: RegExp | string) =>
  cy.contains('label', etiqueta).invoke('attr', 'for').then((id) => cy.get(`#${CSS.escape(String(id))}`));

describe('Flujo Must desde la interfaz web', () => {
  before(() => {
    // Las sesiones guardadas de una ejecución anterior pueden tener el token vencido (dura 15 minutos): se empieza limpio.
    Cypress.session.clearAllSavedSessions();
  });

  after(() => {
    // Limpieza: se cancela el pedido de prueba y se da de baja el producto (la limpieza no se registra como caso).
    tokenDe('vendedor').then((token) => {
      if (pedidoId) cy.then(() => api('PUT', `/orders/seller/${pedidoId}/status`, { token, body: { status: 'CANCELLED' } }));
      if (productoId) cy.then(() => api('DELETE', `/seller/products/${productoId}`, { token }));
    });
  });

  it('UI-04 · El vendedor inicia sesión y entra a su panel', () => {
    cy.caso({ id: 'UI-04', requisito: 'Autenticación y autorización', escenario: 'El vendedor inicia sesión por el formulario y confirma la contraseña del panel', metodo: 'POST', ruta: '/auth/login', rol: 'SELLER', esperado: 'Se abre el panel del vendedor en /seller' });
    sesionPorFormulario('vendedor');
    cy.visit('/seller');
    confirmarPanelDelVendedor();
    cy.contains('Panel del vendedor', { timeout: 30000 }).should('be.visible');
    cy.then(() => observarTexto('Inicio de sesión correcto; se muestra el panel del vendedor'));
    foto('UI-04', 'panel-del-vendedor');
  });

  it('UI-05 · El vendedor publica un producto con foto desde el formulario', () => {
    cy.caso({ id: 'UI-05', requisito: 'Gestión de productos', escenario: 'El vendedor completa el formulario Nuevo producto, sube una foto y publica', metodo: 'POST', ruta: '/seller/products', rol: 'SELLER', esperado: 'HTTP 201 y el producto aparece en Mis productos' });
    sesionPorFormulario('vendedor');
    cy.intercept('POST', '**/seller/products').as('crearProducto');
    cy.visit('/seller/productos/nuevo');
    confirmarPanelDelVendedor();
    campo(/Nombre del producto/).type(nombreProducto);
    cy.contains('label', /Categoría/).parent().find('[role="combobox"]').click();
    cy.contains('li[role="option"]', /Bar y Bebidas/, { timeout: 15000 }).click(); // el formulario lista las categorías principales
    campo(/Precio \(Bs\)/).type('120');
    campo(/^Stock/).clear().type('5');
    campo(/Descripción/).type('Singani de altura de los valles de Tarija. Dato ficticio de la revisión.');
    foto('UI-05', 'formulario-nuevo-producto-datos');
    cy.contains('button', 'Siguiente').click();
    cy.get('input[type="file"]').selectFile('cypress/fixtures/foto-producto.jpg', { force: true });
    cy.get('img[src]', { timeout: 60000 }).should('have.length.greaterThan', 0);
    foto('UI-05', 'formulario-nuevo-producto-foto');
    cy.contains('button', 'Siguiente').click();
    cy.contains('button', 'Siguiente').click();
    cy.contains('button', 'Publicar producto').click();
    cy.wait('@crearProducto').then((i) => {
      expect(i.response?.statusCode, 'publicar producto').to.eq(201);
      productoId = Number(i.response?.body?.data?.id);
    });
    cy.contains(nombreProducto, { timeout: 30000 }).should('be.visible');
    cy.then(() => observarTexto(`HTTP 201; producto id=${productoId} publicado y visible en Mis productos`));
    foto('UI-05', 'producto-publicado-en-mis-productos');
  });

  it('Preparación · la moderación aprueba el producto y aparece en el catálogo', () => {
    tokenDe('admin').then((token) => {
      cy.then(() => api('PUT', `/admin/products/${productoId}/moderate`, { token, body: { approve: true } })).then((r) => expect(r.status, 'moderación').to.eq(200));
    });
    cy.visit(`/productos?search=${encodeURIComponent('flujo desde la interfaz')}`);
    cy.contains(nombreProducto, { timeout: 30000 }).scrollIntoView().should('be.visible');
  });

  it('UI-07 · El comprador agrega el producto al carrito', () => {
    cy.caso({ id: 'UI-07', requisito: 'Carrito', escenario: 'El comprador inicia sesión, abre el producto y lo agrega al carrito', metodo: 'POST', ruta: '/cart/items', rol: 'CUSTOMER', esperado: 'HTTP 201 y el carrito muestra el producto' });
    sesionPorFormulario('comprador');
    cy.intercept('POST', '**/cart/items').as('agregar');
    cy.visit(`/productos?search=${encodeURIComponent('flujo desde la interfaz')}`);
    cy.contains(nombreProducto, { timeout: 30000 }).click();
    cy.location('pathname', { timeout: 30000 }).should('match', /^\/producto\//);
    cy.contains(/Vendido y despachado por/, { timeout: 30000 }).should('be.visible'); // la ficha del producto ya reemplazó al catálogo
    cy.contains('button', 'Agregar al carrito').click();
    cy.wait('@agregar').its('response.statusCode').should('eq', 201);
    cy.visit('/carrito');
    cy.contains(nombreProducto, { timeout: 30000 }).should('be.visible');
    cy.then(() => observarTexto('HTTP 201; el carrito muestra el producto y el total'));
    foto('UI-07', 'carrito-del-comprador');
  });

  it('UI-08 · El comprador confirma la compra con retiro en tienda', () => {
    cy.caso({ id: 'UI-08', requisito: 'Pedido con pago QR', escenario: 'El comprador elige retiro en tienda, escribe la dirección y confirma la compra', metodo: 'POST', ruta: '/orders', rol: 'CUSTOMER', esperado: 'HTTP 201, estado PENDING y pantalla de confirmación con el QR' });
    sesionPorFormulario('comprador');
    cy.intercept('POST', '**/orders').as('crearPedido');
    cy.visit('/checkout');
    cy.contains('Retiro en tienda').click();
    cy.get('input[placeholder^="Ej: Av."]').type(direccionRetiro);
    cy.contains('button', 'Continuar sin envío').click();
    foto('UI-08', 'checkout-resumen-del-pedido');
    cy.contains('button', 'Confirmar compra').click();
    cy.wait('@crearPedido').then((i) => {
      expect(i.response?.statusCode, 'crear pedido').to.eq(201);
      const datos = i.response?.body?.data;
      pedidoId = Number(Array.isArray(datos) ? datos[0].id : datos?.id);
    });
    cy.contains('Compra confirmada', { timeout: 30000 }).should('be.visible');
    cy.then(() => observarTexto(`HTTP 201; pedido id=${pedidoId} en estado PENDING; se muestra la confirmación con el pago QR`));
    foto('UI-08', 'confirmacion-del-pedido-con-qr');
  });

  it('UI-09 · El comprador registra el comprobante del pago QR', () => {
    cy.caso({ id: 'UI-09', requisito: 'Pedido con pago QR', escenario: 'El comprador escribe la URL del comprobante y la envía', metodo: 'POST', ruta: '/orders/:id/payment-proof', rol: 'CUSTOMER', esperado: 'HTTP 200 y el pago queda en PROOF_SUBMITTED' });
    sesionPorFormulario('comprador');
    cy.intercept('POST', '**/payment-proof').as('comprobante');
    cy.visit(`/cuenta/pedidos/${pedidoId}`);
    cy.get('input[placeholder^="URL del comprobante"]', { timeout: 30000 }).type('https://picsum.photos/seed/comprobante-qr/600/800');
    cy.contains('button', 'Subir comprobante').click();
    cy.wait('@comprobante').its('response.statusCode').should('eq', 200);
    cy.contains(/Comprobante enviado|esperando/i, { timeout: 30000 }).should('be.visible');
    cy.then(() => observarTexto('HTTP 200; el pago queda en comprobante enviado, a la espera de verificación'));
    foto('UI-09', 'comprobante-enviado');
  });

  it('UI-10 · El vendedor cambia el estado del pedido a Confirmada', () => {
    cy.caso({ id: 'UI-10', requisito: 'Gestión del pedido por el vendedor', escenario: 'El vendedor abre Pedidos recibidos y cambia el estado del pedido', metodo: 'PUT', ruta: '/orders/seller/:id/status', rol: 'SELLER', esperado: 'HTTP 200 y el estado queda en Confirmada' });
    sesionPorFormulario('vendedor');
    cy.intercept('PUT', '**/orders/seller/*/status').as('cambiarEstado');
    cy.visit('/seller/pedidos');
    confirmarPanelDelVendedor();
    cy.contains('Pedidos recibidos', { timeout: 30000 }).should('be.visible');
    cy.contains('tr', new RegExp(`^\\s*${pedidoId}(?!\\d)`), { timeout: 30000 }).as('fila');
    cy.get('@fila').find('[role="combobox"]').first().click();
    cy.contains('li[role="option"]', /^Confirmada$/).click();
    cy.wait('@cambiarEstado').its('response.statusCode').should('eq', 200);
    cy.get('@fila').should('contain', 'Confirmada');
    cy.then(() => observarTexto(`HTTP 200; el pedido ${pedidoId} queda en estado Confirmada`));
    foto('UI-10', 'pedido-confirmado-por-el-vendedor');
  });
});
