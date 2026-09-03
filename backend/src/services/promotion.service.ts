import { prisma } from '../config/database';

export interface EffectivePrice {
  unitPrice: number;
  originalPrice: number;
  discountAmount: number;
  promotionId?: number;
  promotionTitle?: string;
}

const PROMO_SELECT = {
  id: true,
  title: true,
  discountType: true,
  discountValue: true,
  minQuantity: true,
  minSpend: true,
  maxSpend: true,
  spentAmount: true,
  endDate: true,
  isActive: true,
  products: { select: { productId: true } },
} as const;

async function listApplicablePromotions(sellerId: number): Promise<Array<{
  id: number;
  title: string;
  discountType: string;
  discountValue: number;
  minQuantity: number | null;
  minSpend: number | null;
  maxSpend: number | null;
  spentAmount: number;
  productIds: number[];
}>> {
  const now = new Date();
  const promos = await prisma.promotion.findMany({
    where: {
      sellerId,
      isActive: true,
      endDate: { gt: now },
    },
    select: PROMO_SELECT,
  });
  return promos.map((p) => ({
    id: p.id,
    title: p.title,
    discountType: p.discountType,
    discountValue: Number(p.discountValue),
    minQuantity: p.minQuantity,
    minSpend: p.minSpend ? Number(p.minSpend) : null,
    maxSpend: p.maxSpend ? Number(p.maxSpend) : null,
    spentAmount: p.spentAmount ? Number(p.spentAmount) : 0,
    productIds: p.products.map((pp) => pp.productId),
  }));
}

export function applyPromotionToPrice(basePrice: number, promo: { discountType: string; discountValue: number }): number {
  const p = Number(basePrice);
  if (promo.discountType === 'PERCENTAGE') {
    return Math.round(p * (1 - promo.discountValue / 100) * 100) / 100;
  }
  return Math.max(0, Math.round((p - promo.discountValue) * 100) / 100);
}

export async function getEffectivePrices(
  sellerId: number,
  sellerItems: Array<{ productId: number; quantity: number; product: { price: unknown } }>,
): Promise<Map<number, EffectivePrice>> {
  const promos = await listApplicablePromotions(sellerId);
  const result = new Map<number, EffectivePrice>();

  for (const item of sellerItems) {
    const base = Number(item.product.price);
    result.set(item.productId, {
      unitPrice: base,
      originalPrice: base,
      discountAmount: 0,
    });
  }

  for (const promo of promos) {
    if (promo.maxSpend !== null && promo.spentAmount >= promo.maxSpend) continue;
    if (promo.minSpend !== null) {
      const subtotal = sellerItems.reduce(
        (acc, i) => acc + Number(i.product.price) * i.quantity,
        0,
      );
      if (subtotal < promo.minSpend) continue;
    }
    for (const item of sellerItems) {
      if (!promo.productIds.includes(item.productId)) continue;
      if (promo.minQuantity !== null && item.quantity < promo.minQuantity) continue;

      const current = result.get(item.productId)!;
      const discounted = applyPromotionToPrice(current.originalPrice, promo);
      if (discounted < current.unitPrice) {
        result.set(item.productId, {
          unitPrice: discounted,
          originalPrice: current.originalPrice,
          discountAmount: Math.round((current.originalPrice - discounted) * 100) / 100,
          promotionId: promo.id,
          promotionTitle: promo.title,
        });
      }
    }
  }

  return result;
}
