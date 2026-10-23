import { getIcebreakers, getNoSaleReplies, getFollowUps, BOLIVIANISMOS } from '../src/data/bolivianismos';

describe('bolivianismos: variante comprador vs vendedor', () => {
  it('getIcebreakers: isBuyer=true vs isBuyer=false devuelven sets distintos', () => {
    const buyer = getIcebreakers('La Paz', true);
    const seller = getIcebreakers('La Paz', false);
    expect(buyer).not.toEqual(seller);
    // Coherencia: el set de comprador sigue sonando a "quiero comprar" (p.ej. "disponible" en pregunta).
    expect(buyer.some((p) => /\?$/.test(p))).toBe(true);
    // El set de vendedor confirma disponibilidad en vez de preguntar por precio/rebaja.
    expect(seller.some((p) => /disponible/i.test(p))).toBe(true);
  });

  it('getIcebreakers: default (sin isBuyer) mantiene el comportamiento anterior de comprador', () => {
    expect(getIcebreakers('La Paz')).toEqual(getIcebreakers('La Paz', true));
  });

  it('getNoSaleReplies: isBuyer=true vs isBuyer=false devuelven sets distintos y coherentes', () => {
    const buyer = getNoSaleReplies('Santa Cruz', true);
    const seller = getNoSaleReplies('Santa Cruz', false);
    expect(buyer).not.toEqual(seller);
    // El set de vendedor declina amablemente (no stock), no habla de "dar una vuelta" como comprador.
    expect(seller.some((p) => /stock|vendió|no hay/i.test(p))).toBe(true);
    expect(buyer.some((p) => /vuelta|llevo|pensando/i.test(p))).toBe(true);
  });

  it('getFollowUps: isBuyer=true vs isBuyer=false devuelven sets distintos y coherentes', () => {
    const buyer = getFollowUps('Cochabamba', true);
    const seller = getFollowUps('Cochabamba', false);
    expect(buyer).not.toEqual(seller);
    // El set de vendedor confirma envío/pago, no pregunta por precio como el comprador.
    expect(seller.some((p) => /pagar|envío|pedido/i.test(p))).toBe(true);
  });

  it('cada región define las 3 variantes de vendedor con contenido no vacío', () => {
    for (const region of BOLIVIANISMOS) {
      expect(region.sellerIcebreakers.length).toBeGreaterThan(0);
      expect(region.sellerNoSaleReplies.length).toBeGreaterThan(0);
      expect(region.sellerFollowUps.length).toBeGreaterThan(0);
    }
  });

  it('getIcebreakers recorta a 4 frases como máximo, también para vendedor', () => {
    expect(getIcebreakers('Tarija', false).length).toBeLessThanOrEqual(4);
  });
});
