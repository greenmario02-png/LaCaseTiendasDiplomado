import { z } from 'zod';

export const CATALOG_REPORT_TARGETS = ['SELLER', 'STORE', 'PRODUCT'] as const;
export const CATALOG_REPORT_REASONS = ['VENDEDOR_SOSPECHOSO', 'TIENDA_SOSPECHOSA', 'PRODUCTO_INADECUADO', 'OTRO'] as const;

/** Denuncia desde la ficha del producto (vendedor, tienda o producto inadecuado). */
export const createCatalogReportSchema = z.object({
  body: z
    .object({
      targetType: z.enum(CATALOG_REPORT_TARGETS),
      targetId: z.number().int().positive(),
      reason: z.enum(CATALOG_REPORT_REASONS),
      detail: z.string().trim().max(300).optional(),
    })
    .strict(),
});
