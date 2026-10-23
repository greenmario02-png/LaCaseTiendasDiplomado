/**
 * Opciones de denuncia del menú "..." de la ficha de producto (vendedor, tienda o producto inadecuado).
 * Módulo puro (sin React Native) para probarlo con Jest sin montar la pantalla.
 */
export type CatalogReportOption = 'REPORT_SELLER' | 'REPORT_STORE' | 'REPORT_PRODUCT';

export const CATALOG_REPORT_OPTIONS: CatalogReportOption[] = ['REPORT_SELLER', 'REPORT_STORE', 'REPORT_PRODUCT'];

export const CATALOG_REPORT_TARGET: Record<CatalogReportOption, { targetType: 'SELLER' | 'STORE' | 'PRODUCT'; reason: string }> = {
  REPORT_SELLER: { targetType: 'SELLER', reason: 'VENDEDOR_SOSPECHOSO' },
  REPORT_STORE: { targetType: 'STORE', reason: 'TIENDA_SOSPECHOSA' },
  REPORT_PRODUCT: { targetType: 'PRODUCT', reason: 'PRODUCTO_INADECUADO' },
};

/** Cuerpo de POST /catalog-reports: el producto o, para vendedor/tienda, el id del vendedor. */
export function catalogReportPayload(option: CatalogReportOption, product: { id: number | string; seller: { id: number | string } }) {
  const { targetType, reason } = CATALOG_REPORT_TARGET[option];
  const targetId = option === 'REPORT_PRODUCT' ? Number(product.id) : Number(product.seller.id);
  return { targetType, targetId, reason };
}
