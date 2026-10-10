import { api, tokenDe } from '../support/evidencia';

/**
 * NO es una prueba: deja en producción datos ficticios visibles para tomar las capturas de la monografía
 * (un pedido CONFIRMADO con comprobante QR registrado y un producto en el carrito del comprador).
 * No registra casos en el reporte. Se ejecuta solo a propósito (scripts\produccion.ps1 -Capturas) y se
 * deshace con 07-limpiar-capturas.cy.ts (-Limpiar).
 */
describe('Preparar datos para capturas', () => {
  let tokenVendedor = '';
  let tokenComprador = '';
  let tokenAdmin = '';
  let categoryId = 0;

  const hojas = (nodos: { id: number; children?: unknown[] }[]): { id: number }[] =>
    nodos.flatMap((n) => (n.children && n.children.length ? hojas(n.children as { id: number; children?: unknown[] }[]) : [n]));

  const crearAprobado = (nombre: string, precio: number) =>
    api('POST', '/seller/products', {
      token: tokenVendedor,
      body: { name: nombre, categoryId, description: 'Producto ficticio de Tarija para las capturas de la revisión.', condition: 'NEW', price: precio, stock: 5, images: [{ url: `https://picsum.photos/seed/${nombre.startsWith('Vino') ? 'vino-tarija' : 'singani-tarija'}/800/800`, isPrimary: true }] },
    }).then((r) => {
      expect(r.status).to.eq(201);
      const id = r.body.data.id as number;
      return api('PUT', `/admin/products/${id}/moderate`, { token: tokenAdmin, body: { approve: true } }).then((m) => {
        expect(m.status).to.eq(200);
        return id;
      });
    });

  it('deja un pedido confirmado con comprobante QR y un producto en el carrito', () => {
    tokenDe('vendedor').then((t) => (tokenVendedor = t));
    tokenDe('comprador').then((t) => (tokenComprador = t));
    tokenDe('admin').then((t) => (tokenAdmin = t));
    api('GET', '/products/categories').then((r) => {
      const bar = (r.body.data as { slug: string }[]).filter((c) => c.slug === 'bar-y-bebidas') as unknown as { id: number; children?: unknown[] }[];
      categoryId = hojas(bar.length ? bar : r.body.data)[0].id; // categoría de bebidas: coherente con los productos de Tarija
    });

    cy.then(() => {
      let pedidoId = 0;
      crearAprobado('Singani Rujero Doble Destilado 750 ml (prueba: pedido de ejemplo)', 120)
        .then((productoPedido) => api('DELETE', '/cart', { token: tokenComprador }).then(() => productoPedido))
        .then((productoPedido) => api('POST', '/cart/items', { token: tokenComprador, body: { productId: productoPedido, quantity: 1 } }))
        .then((r) => expect(r.status).to.eq(201))
        .then(() =>
          api('POST', '/orders', {
            token: tokenComprador,
            body: { fulfillmentType: 'PICKUP', pickupAddress: 'Retiro en tienda: calle Bolívar esquina Sucre, Tarija', notes: 'Pedido ficticio para entrega cerca de la plaza Luis de Fuentes, Tarija' },
          }),
        )
        .then((r) => {
          expect(r.status).to.eq(201);
          pedidoId = (r.body.data as { id: number }[])[0].id;
          return api('POST', `/orders/${pedidoId}/payment-proof`, {
            token: tokenComprador,
            body: { proofUrl: `${String(Cypress.config('baseUrl')).replace(/\/$/, '')}/comprobante-revision.png` },
          });
        })
        .then((r) => expect(r.status).to.be.oneOf([200, 201]))
        .then(() => api('PUT', `/orders/seller/${pedidoId}/status`, { token: tokenVendedor, body: { status: 'CONFIRMED' } }))
        .then((r) => {
          expect(r.status).to.eq(200);
          cy.log(`Pedido para captura: id=${pedidoId}`);
        })
        .then(() => crearAprobado('Vino Tinto Reserva de Tarija 750 ml (prueba: producto en el carrito)', 85))
        .then((productoCarrito) => api('POST', '/cart/items', { token: tokenComprador, body: { productId: productoCarrito, quantity: 1 } }))
        .then((r) => expect(r.status).to.eq(201));
    });
  });
});
