import { api, observarTexto } from '../support/evidencia';

/**
 * Prueba de caja negra del requisito no funcional de rendimiento (RNF): la lista del catálogo público debe responder
 * en menos de 2 segundos sobre la URL publicada. Se hace un primer pedido para despertar el servicio (el plan gratuito
 * de Render lo suspende tras un rato sin tráfico) y después se miden cinco pedidos en caliente.
 */
describe('Rendimiento del catálogo (RNF)', () => {
  it('CP-09 · El listado de productos responde en menos de 2 s', () => {
    cy.caso({
      id: 'CP-09',
      requisito: 'Rendimiento (RNF)',
      escenario: 'Cinco mediciones en caliente del listado público de 20 productos',
      metodo: 'GET',
      ruta: '/products?limit=20',
      rol: 'anónimo',
      esperado: 'HTTP 200 y promedio menor a 2 s',
    });
    api('GET', '/products', { qs: { limit: 20 } }); // pedido de calentamiento: no se mide
    const tiempos: number[] = [];
    const medir = (n: number): void => {
      const inicio = performance.now();
      api('GET', '/products', { qs: { limit: 20 } }).then((r) => {
        expect(r.status).to.eq(200);
        tiempos.push((performance.now() - inicio) / 1000);
        if (n < 5) medir(n + 1);
      });
    };
    medir(1);
    cy.then(() => {
      const promedio = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
      observarTexto(`HTTP 200; ${tiempos.map((t) => t.toFixed(2) + ' s').join(', ')} (promedio ${promedio.toFixed(2)} s)`);
      expect(promedio, 'tiempo promedio en segundos').to.be.lessThan(2);
    });
  });
});
