import { api, tokenDe } from '../support/evidencia';

/**
 * NO es una prueba: deshace lo que dejó 06-datos-capturas (vacía el carrito del comprador, cancela los pedidos
 * abiertos y da de baja los productos de prueba (marcados "(prueba: …)", "(prueba E3)" o "[REVISION]") del vendedor). No registra casos en el reporte.
 */
describe('Limpiar datos de las capturas', () => {
  it('vacía el carrito, cancela pedidos y da de baja los productos de prueba', () => {
    let tokenVendedor = '';
    let tokenComprador = '';
    tokenDe('vendedor').then((t) => (tokenVendedor = t));
    tokenDe('comprador').then((t) => (tokenComprador = t));

    cy.then(() => api('DELETE', '/cart', { token: tokenComprador }));
    cy.then(() =>
      api('GET', '/orders/seller', { token: tokenVendedor }).then((r) => {
        const abiertos = ((r.body.data ?? []) as { id: number; status: string }[]).filter((o) => !['CANCELLED', 'DELIVERED'].includes(o.status));
        abiertos.forEach((o) => api('PUT', `/orders/seller/${o.id}/status`, { token: tokenVendedor, body: { status: 'CANCELLED' } }));
      }),
    );
    cy.then(() =>
      api('GET', '/seller/products', { token: tokenVendedor, qs: { limit: 100 } }).then((r) => {
        const mios = ((r.body.data ?? []) as { id: number; name: string; isActive?: boolean }[]).filter((p) => (p.name.startsWith('[REVISION]') || p.name.includes('(prueba:') || p.name.includes('(prueba E3)')) && p.isActive !== false);
        mios.forEach((p) => api('DELETE', `/seller/products/${p.id}`, { token: tokenVendedor }));
      }),
    );
  });
});
