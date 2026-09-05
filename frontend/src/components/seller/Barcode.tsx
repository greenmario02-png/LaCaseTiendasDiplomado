import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
}

/** Renderiza un SKU como código de barras CODE128 dentro de un <svg>. */
export default function Barcode({ value, width = 2, height = 50 }: BarcodeProps) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue: false,
          margin: 0,
        });
      } catch {
        // SKU con caracteres no soportados: la etiqueta igual muestra el texto
      }
    }
  }, [value, width, height]);

  return <svg ref={ref} />;
}
