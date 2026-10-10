import { api, observarTexto, tokenDe } from '../support/evidencia';

/**
 * Flujo Must completo, en orden: vendedor publica → (moderación) → catálogo → edita → baja lógica;
 * comprador arma pedido → comprobante QR → vendedor ve el pedido y cambia el estado.
 * Los datos creados llevan el sufijo "(prueba: …)" para identificarlos y se dan de baja/cancelan al final.
 * La moderación usa la cuenta administradora de revisión solo a través de la API (la administración no
 * se defiende como alcance: es el paso interno que habilita la publicación en el catálogo).
 */
describe('Flujo Must: producto → carrito → pedido → QR → estado', () => {
  // Fotos de Lorem Picsum (fuente abierta con miles de imágenes); la semilla fija deja siempre la misma foto.
  const IMAGEN_SINGANI = 'https://picsum.photos/seed/singani-tarija/800/800';
  const IMAGEN_VINO = 'https://picsum.photos/seed/vino-tarija/800/800';
  const nombreA = 'Singani Rujero Doble Destilado 750 ml (prueba: publicar producto)';
  const nombreB = 'Vino Tinto Reserva de Tarija 750 ml (prueba: flujo de compra)';

  let tokenVendedor = '';
  let tokenComprador = '';
  let tokenAdmin = '';
  let categoryId = 0;
  let productoA = 0;
  let productoB = 0;
  let pedidoId = 0;

  const hojas = (nodos: any[]): any[] =>
    nodos.flatMap((n) => (n.children && n.children.length ? hojas(n.children) : [n]));
  const enCatalogo = (nombre: string) =>
    api('GET', '/products', { qs: { search: nombre } }).then((r) => ({ status: r.status, ids: ((r.body.data ?? []) as any[]).map((p) => p.id) }));
  const publicar = (nombre: string, precio: number, stock: number) =>
    api('POST', '/seller/products', {
      token: tokenVendedor,
      body: { name: nombre, categoryId, description: 'Singani de altura de los valles de Tarija. Dato ficticio de la revisión.', condition: 'NEW', price: precio, stock, images: [{ url: nombre.startsWith('Vino') ? IMAGEN_VINO : IMAGEN_SINGANI, isPrimary: true }] },
    });

  before(() => {
    tokenDe('vendedor').then((t) => (tokenVendedor = t));
    tokenDe('comprador').then((t) => (tokenComprador = t));
    tokenDe('admin').then((t) => (tokenAdmin = t));
    api('GET', '/products/categories').then((r) => {
      expect(r.status).to.eq(200);
      const bar = (r.body.data as { slug: string }[]).filter((c) => c.slug === 'bar-y-bebidas') as unknown as { id: number; children?: unknown[] }[];
      categoryId = hojas(bar.length ? bar : r.body.data)[0].id; // categoría de bebidas: coherente con los productos de Tarija
    });
  });

  it('CP-22 · Vendedor publica un producto', () => {
    cy.caso({ id: 'CP-22', requisito: 'Gestión de productos', escenario: 'El vendedor crea un producto válido', metodo: 'POST', ruta: '/seller/products', rol: 'SELLER', esperado: 'HTTP 201 y producto creado' });
    publicar(nombreA, 150, 5).then((r) => {
      expect(r.status).to.eq(201);
      productoA = r.body.data.id;
      expect(productoA).to.be.a('number');
      observarTexto(`HTTP 201; producto id=${productoA} creado`);
    });
  });

  it('CP-23 · Producto con datos inválidos', () => {
    cy.caso({ id: 'CP-23', requisito: 'Validación en servidor', escenario: 'Crear producto con precio negativo y nombre corto', metodo: 'POST', ruta: '/seller/products', rol: 'SELLER', esperado: 'HTTP 400 con details por campo' });
    api('POST', '/seller/products', { token: tokenVendedor, body: { name: 'ab', categoryId, condition: 'NEW', price: -5, stock: 1 } }).then((r) => {
      expect(r.status).to.eq(400);
      expect(r.body.error.code).to.eq('BAD_REQUEST');
    });
  });

  it('CP-24 · Comprador no puede crear productos (403)', () => {
    cy.caso({ id: 'CP-24', requisito: 'Autorización por rol', escenario: 'Comprador con token válido intenta publicar un producto', metodo: 'POST', ruta: '/seller/products', rol: 'CUSTOMER', esperado: 'HTTP 403' });
    api('POST', '/seller/products', { token: tokenComprador, body: { name: nombreA, categoryId, condition: 'NEW', price: 10, stock: 1 } }).then((r) => {
      expect(r.status).to.eq(403);
      expect(r.body.error.code).to.eq('FORBIDDEN');
    });
  });

  it('CP-25 · Un producto nuevo nace sin aprobar y no se lista', () => {
    cy.caso({ id: 'CP-25', requisito: 'Menor privilegio', escenario: 'Buscar en el catálogo el producto recién publicado, aún sin moderar', metodo: 'GET', ruta: '/products?search=Singani Rujero', rol: 'anónimo', esperado: 'HTTP 200 y el producto NO aparece hasta ser aprobado' });
    enCatalogo(nombreA).then(({ status, ids }) => {
      expect(status).to.eq(200);
      expect(ids).not.to.include(productoA);
      observarTexto(`HTTP 200; producto id=${productoA} ausente del catálogo (isApproved=false)`);
    });
  });

  it('Preparación · la moderación aprueba el producto', () => {
    api('PUT', `/admin/products/${productoA}/moderate`, { token: tokenAdmin, body: { approve: true } }).then((r) => {
      expect(r.status).to.eq(200);
    });
  });

  it('CP-28 · El producto aprobado aparece en el catálogo público', () => {
    cy.caso({ id: 'CP-28', requisito: 'Catálogo', escenario: 'Buscar el producto aprobado en el catálogo', metodo: 'GET', ruta: '/products?search=Singani Rujero', rol: 'anónimo', esperado: 'HTTP 200 y el producto en el listado' });
    enCatalogo(nombreA).then(({ status, ids }) => {
      expect(status).to.eq(200);
      expect(ids).to.include(productoA);
      observarTexto(`HTTP 200; producto id=${productoA} presente en el catálogo`);
    });
  });

  it('CP-29 · Vendedor edita su producto', () => {
    cy.caso({ id: 'CP-29', requisito: 'Gestión de productos', escenario: 'El vendedor cambia el precio del producto', metodo: 'PUT', ruta: '/seller/products/:id', rol: 'SELLER', esperado: 'HTTP 200 y precio actualizado a 175' });
    api('PUT', `/seller/products/${productoA}`, { token: tokenVendedor, body: { price: 175 } }).then((r) => {
      expect(r.status).to.eq(200);
      expect(Number(r.body.data.price)).to.eq(175);
      observarTexto('HTTP 200; price=175');
    });
  });

  it('CP-30 · Comprador no puede editar productos ajenos (403)', () => {
    cy.caso({ id: 'CP-30', requisito: 'Autorización por rol', escenario: 'Comprador intenta editar el producto del vendedor', metodo: 'PUT', ruta: '/seller/products/:id', rol: 'CUSTOMER', esperado: 'HTTP 403' });
    api('PUT', `/seller/products/${productoA}`, { token: tokenComprador, body: { price: 1 } }).then((r) => expect(r.status).to.eq(403));
  });

  it('CP-31 · Baja lógica del producto', () => {
    cy.caso({ id: 'CP-31', requisito: 'Gestión de productos', escenario: 'El vendedor da de baja el producto y deja de listarse', metodo: 'DELETE', ruta: '/seller/products/:id', rol: 'SELLER', esperado: 'HTTP 200 y el producto ya no aparece en el catálogo' });
    api('DELETE', `/seller/products/${productoA}`, { token: tokenVendedor }).then((r) => {
      expect(r.status).to.eq(200);
    });
    enCatalogo(nombreA).then(({ ids }) => {
      expect(ids).not.to.include(productoA);
      observarTexto('HTTP 200 (baja); el producto ya no figura en GET /products');
    });
  });

  it('CP-32 · Se publica y aprueba el producto que se va a comprar', () => {
    cy.caso({ id: 'CP-32', requisito: 'Gestión de productos', escenario: 'El vendedor publica un segundo producto (stock 3) y la moderación lo aprueba', metodo: 'POST', ruta: '/seller/products', rol: 'SELLER', esperado: 'HTTP 201 y luego aprobación 200' });
    publicar(nombreB, 99, 3).then((r) => {
      expect(r.status).to.eq(201);
      productoB = r.body.data.id;
    });
    cy.then(() =>
      api('PUT', `/admin/products/${productoB}/moderate`, { token: tokenAdmin, body: { approve: true } }).then((r) => {
        expect(r.status).to.eq(200);
        observarTexto(`HTTP 201 (producto id=${productoB}) y 200 (aprobado)`);
      }),
    );
  });

  it('CP-33 · Comprador agrega al carrito', () => {
    cy.caso({ id: 'CP-33', requisito: 'Carrito', escenario: 'Agregar 2 unidades del producto al carrito', metodo: 'POST', ruta: '/cart/items', rol: 'CUSTOMER', esperado: 'HTTP 201' });
    api('DELETE', '/cart', { token: tokenComprador });
    api('POST', '/cart/items', { token: tokenComprador, body: { productId: productoB, quantity: 2 } }).then((r) => {
      expect(r.status).to.eq(201);
    });
  });

  it('CP-34 · Carrito rechaza cantidad negativa', () => {
    cy.caso({ id: 'CP-34', requisito: 'Carrito', escenario: 'Agregar al carrito con quantity = -5', metodo: 'POST', ruta: '/cart/items', rol: 'CUSTOMER', esperado: 'HTTP 400 (corrección del fallo CP-08 de la Entrega 3)' });
    api('POST', '/cart/items', { token: tokenComprador, body: { productId: productoB, quantity: -5 } }).then((r) => {
      expect(r.status).to.eq(400);
      expect(r.body.error.code).to.eq('BAD_REQUEST');
    });
  });

  it('CP-35 · Carrito rechaza stock insuficiente', () => {
    cy.caso({ id: 'CP-35', requisito: 'Carrito', escenario: 'Agregar más unidades que el stock (stock 3, se piden 50)', metodo: 'POST', ruta: '/cart/items', rol: 'CUSTOMER', esperado: 'HTTP 400' });
    api('POST', '/cart/items', { token: tokenComprador, body: { productId: productoB, quantity: 50 } }).then((r) => {
      expect(r.status).to.eq(400);
    });
  });

  it('CP-36 · Pedido: crear', () => {
    cy.caso({ id: 'CP-36', requisito: 'Pedidos', escenario: 'El comprador crea el pedido con el carrito, retiro en tienda', metodo: 'POST', ruta: '/orders', rol: 'CUSTOMER', esperado: 'HTTP 201, estado PENDING y pago PENDING' });
    api('POST', '/orders', {
      token: tokenComprador,
      body: { fulfillmentType: 'PICKUP', pickupAddress: 'Retiro en tienda: calle Bolívar esquina Sucre, Tarija', notes: 'Pedido ficticio para entrega cerca de la plaza Luis de Fuentes, Tarija' },
    }).then((r) => {
      expect(r.status).to.eq(201);
      const pedido = (r.body.data as any[])[0];
      pedidoId = pedido.id;
      expect(pedido.status).to.eq('PENDING');
      expect(pedido.paymentStatus).to.eq('PENDING');
      observarTexto(`HTTP 201; pedido id=${pedidoId}; status=${pedido.status}; paymentStatus=${pedido.paymentStatus}`);
    });
  });

  it('CP-37 · Pedido con carrito vacío', () => {
    cy.caso({ id: 'CP-37', requisito: 'Pedidos', escenario: 'Crear pedido con el carrito ya vacío', metodo: 'POST', ruta: '/orders', rol: 'CUSTOMER', esperado: 'HTTP 400' });
    api('POST', '/orders', { token: tokenComprador, body: { fulfillmentType: 'PICKUP', pickupAddress: 'Retiro en tienda: calle Ingavi, Tarija' } }).then((r) => {
      expect(r.status).to.eq(400);
    });
  });

  it('CP-38 · Registrar el comprobante de pago QR', () => {
    cy.caso({ id: 'CP-38', requisito: 'Pago QR', escenario: 'El comprador registra la referencia del comprobante QR', metodo: 'POST', ruta: '/orders/:id/payment-proof', rol: 'CUSTOMER', esperado: 'HTTP 200/201 y pago en PROOF_SUBMITTED' });
    api('POST', `/orders/${pedidoId}/payment-proof`, {
      token: tokenComprador,
      body: { proofUrl: `${String(Cypress.config('baseUrl')).replace(/\/$/, '')}/comprobante-revision.png` },
    }).then((r) => {
      expect(r.status).to.be.oneOf([200, 201]);
      observarTexto(`HTTP ${r.status}; paymentStatus=${r.body.data?.paymentStatus ?? 'n/d'}`);
    });
  });

  it('CP-39 · Comprobante con URL no permitida', () => {
    cy.caso({ id: 'CP-39', requisito: 'Validación en servidor', escenario: 'Comprobante con esquema javascript:', metodo: 'POST', ruta: '/orders/:id/payment-proof', rol: 'CUSTOMER', esperado: 'HTTP 400' });
    api('POST', `/orders/${pedidoId}/payment-proof`, { token: tokenComprador, body: { proofUrl: 'javascript:alert(1)' } }).then((r) => {
      expect(r.status).to.eq(400);
    });
  });

  it('CP-40 · El vendedor ve el pedido', () => {
    cy.caso({ id: 'CP-40', requisito: 'Pedidos', escenario: 'El vendedor lista sus pedidos y encuentra el nuevo', metodo: 'GET', ruta: '/orders/seller', rol: 'SELLER', esperado: 'HTTP 200 y el pedido en el listado' });
    api('GET', '/orders/seller', { token: tokenVendedor }).then((r) => {
      expect(r.status).to.eq(200);
      const ids = (r.body.data as any[]).map((o) => o.id);
      expect(ids).to.include(pedidoId);
      observarTexto(`HTTP 200; pedido id=${pedidoId} presente`);
    });
  });

  it('CP-41 · El comprador no puede cambiar el estado (403)', () => {
    cy.caso({ id: 'CP-41', requisito: 'Autorización por rol', escenario: 'Comprador intenta pasar el pedido a CONFIRMED', metodo: 'PUT', ruta: '/orders/seller/:id/status', rol: 'CUSTOMER', esperado: 'HTTP 403' });
    api('PUT', `/orders/seller/${pedidoId}/status`, { token: tokenComprador, body: { status: 'CONFIRMED' } }).then((r) => {
      expect(r.status).to.eq(403);
      expect(r.body.error.code).to.eq('FORBIDDEN');
    });
  });

  it('CP-42 · Estado fuera del dominio', () => {
    cy.caso({ id: 'CP-42', requisito: 'Validación en servidor', escenario: 'Vendedor envía un estado inexistente', metodo: 'PUT', ruta: '/orders/seller/:id/status', rol: 'SELLER', esperado: 'HTTP 400' });
    api('PUT', `/orders/seller/${pedidoId}/status`, { token: tokenVendedor, body: { status: 'ENVIADO_A_MARTE' } }).then((r) => {
      expect(r.status).to.eq(400);
    });
  });

  it('CP-43 · El vendedor cambia el estado del pedido', () => {
    cy.caso({ id: 'CP-43', requisito: 'Pedidos', escenario: 'El vendedor pasa el pedido a CONFIRMED', metodo: 'PUT', ruta: '/orders/seller/:id/status', rol: 'SELLER', esperado: 'HTTP 200 y status CONFIRMED' });
    api('PUT', `/orders/seller/${pedidoId}/status`, { token: tokenVendedor, body: { status: 'CONFIRMED' } }).then((r) => {
      expect(r.status).to.eq(200);
      expect(r.body.data.status).to.eq('CONFIRMED');
      observarTexto(`HTTP 200; status=${r.body.data.status}`);
    });
  });

  it('CP-44 · El comprador ve el estado actualizado', () => {
    cy.caso({ id: 'CP-44', requisito: 'Pedidos', escenario: 'El comprador consulta el detalle de su pedido', metodo: 'GET', ruta: '/orders/buyer/:id', rol: 'CUSTOMER', esperado: 'HTTP 200 y status CONFIRMED' });
    api('GET', `/orders/buyer/${pedidoId}`, { token: tokenComprador }).then((r) => {
      expect(r.status).to.eq(200);
      expect(r.body.data.status).to.eq('CONFIRMED');
      observarTexto(`HTTP 200; status=${r.body.data.status}`);
    });
  });

  after(() => {
    // Limpieza: el pedido se cancela y el producto de compra se da de baja (la revisión no deja ofertas activas).
    const cabecera = { Authorization: `Bearer ${tokenVendedor}` };
    const base = String(Cypress.env('API_URL')).replace(/\/$/, '');
    if (pedidoId) cy.request({ method: 'PUT', url: `${base}/orders/seller/${pedidoId}/status`, headers: cabecera, body: { status: 'CANCELLED' }, failOnStatusCode: false, log: false });
    if (productoB) cy.request({ method: 'DELETE', url: `${base}/seller/products/${productoB}`, headers: cabecera, failOnStatusCode: false, log: false });
  });
});
