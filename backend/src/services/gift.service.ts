import { prisma } from '../config/database';

/**
 * Evalúa las promociones de regalo activas de una tienda contra los items del carrito
 * y devuelve los regalos que corresponden (productId + label) para agregar a la orden.
 *
 * Tipos de disparador:
 * - UNITS:   al comprar `triggerQuantity` unidades del `triggerProduct`
 * - AMOUNT:  al superar `triggerAmount` en el subtotal de la tienda
 * - PRODUCT: al comprar el `triggerProduct`
 */
export async function evaluateGiftPromotions(
  sellerId: number,
  sellerItems: { productId: number; quantity: number; product: { id: number; price: any } }[],
  subtotal: number
): Promise<{ productId: number; label: string }[]> {
  const promotions = await prisma.giftPromotion.findMany({
    where: { sellerId, isActive: true },
    include: { items: { include: { product: { select: { id: true, name: true } } } } },
  });

  const gifts: { productId: number; label: string }[] = [];
  if (promotions.length === 0) return gifts;

  for (const promo of promotions) {
    let triggered = false;
    let triggerText = '';

    if (promo.triggerType === 'UNITS' && promo.triggerProductId && promo.triggerQuantity) {
      const line = sellerItems.find((i) => i.productId === promo.triggerProductId);
      if (line && line.quantity >= promo.triggerQuantity) {
        triggered = true;
        triggerText = `por ${promo.triggerQuantity} un. de ${line.product.id}`;
      }
    } else if (promo.triggerType === 'AMOUNT' && promo.triggerAmount) {
      if (subtotal >= Number(promo.triggerAmount)) {
        triggered = true;
        triggerText = `por compras desde ${Number(promo.triggerAmount)} Bs`;
      }
    } else if (promo.triggerType === 'PRODUCT' && promo.triggerProductId) {
      const line = sellerItems.find((i) => i.productId === promo.triggerProductId);
      if (line) {
        triggered = true;
        triggerText = `por comprar un producto`;
      }
    }

    if (triggered) {
      // Elegir el regalo: si allowChoice, el frontend eligió; acá tomamos el primero
      // (el comprador podrá elegir el regalo en el checkout con la lista de items).
      const giftItems = promo.items;
      if (giftItems.length > 0) {
        // Agregar TODOS los productos de regalo con precio 0 si hay choice, o el primero
        const chosen = giftItems[0];
        gifts.push({
          productId: chosen.productId,
          label: `🎁 Regalo: ${chosen.product.name}`,
        });
      }
    }
  }

  return gifts;
}
