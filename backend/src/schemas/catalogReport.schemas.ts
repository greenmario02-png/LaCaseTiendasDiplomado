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

// ── Cola de revisión (ADMIN o moderador asignado, permiso catalog.reports.moderate) ──────────────

export const CATALOG_REPORT_STATUS = ['OPEN', 'REVIEWED', 'DISCARDED'] as const;

/** GET /api/admin/catalog-reports: paginado; filtra por estado (OPEN por defecto), tipo y motivo. */
export const adminListCatalogReportsSchema = z.object({
  query: z.object({
    status: z.enum(CATALOG_REPORT_STATUS).optional(),
    targetType: z.enum(CATALOG_REPORT_TARGETS).optional(),
    reason: z.enum(CATALOG_REPORT_REASONS).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

/** PUT /api/admin/catalog-reports/:id: marca la denuncia como revisada o descartada, con nota opcional. */
export const adminUpdateCatalogReportSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z
    .object({
      status: z.enum(['REVIEWED', 'DISCARDED']),
      note: z.string().trim().max(300).optional(),
    })
    .strict(),
});
