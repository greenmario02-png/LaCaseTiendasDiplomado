/**
 * Calcula el costo de envío en Bs (Bolivianos) basándose en la distancia
 * entre códigos postales del vendedor y del comprador. Si falta el CP,
 * usa un costo base según el país.
 * Simplificación académica: los dos primeros dígitos del CP mapean a una zona.
 */
export function calculateShipping(buyerPostalCode?: string | null, sellerPostalCode?: string | null): number {
  const bpc = buyerPostalCode?.trim();
  const spc = sellerPostalCode?.trim();

  // Sin CP: costo base (envío local estándar en Bolivia)
  if (!bpc || !spc) {
    return 25;
  }

  const buyerPrefix = parseInt(bpc.substring(0, 2), 10);
  const sellerPrefix = parseInt(spc.substring(0, 2), 10);

  if (Number.isNaN(buyerPrefix) || Number.isNaN(sellerPrefix)) {
    return 25;
  }

  const diff = Math.abs(buyerPrefix - sellerPrefix);

  if (diff <= 2) return 15;
  if (diff <= 5) return 25;
  if (diff <= 10) return 40;
  return 60;
}
