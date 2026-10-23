import { CATALOG_REPORT_OPTIONS, catalogReportPayload } from './productActions';

describe('productActions: denuncias del catálogo', () => {
  const product = { id: '15', seller: { id: 7 } };

  it('ofrece denunciar vendedor, tienda y producto', () => {
    expect(CATALOG_REPORT_OPTIONS).toEqual(['REPORT_SELLER', 'REPORT_STORE', 'REPORT_PRODUCT']);
  });

  it('el producto se denuncia por su id; vendedor y tienda por el id del vendedor', () => {
    expect(catalogReportPayload('REPORT_PRODUCT', product)).toEqual({ targetType: 'PRODUCT', targetId: 15, reason: 'PRODUCTO_INADECUADO' });
    expect(catalogReportPayload('REPORT_SELLER', product)).toEqual({ targetType: 'SELLER', targetId: 7, reason: 'VENDEDOR_SOSPECHOSO' });
    expect(catalogReportPayload('REPORT_STORE', product)).toEqual({ targetType: 'STORE', targetId: 7, reason: 'TIENDA_SOSPECHOSA' });
  });
});
