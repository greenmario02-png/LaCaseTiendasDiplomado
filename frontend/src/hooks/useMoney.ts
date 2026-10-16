import { useCurrencyStore, displayCurrency, currencySymbol, formatFromBs } from '../stores/currencyStore';

/**
 * ÚNICO punto de formateo de montos en la web (doc 61): recibe montos guardados en Bs y los muestra convertidos y con la
 * denominación de la moneda elegida (Bs, US$, €, ...). No usar `Bs ${...}` ni toFixed sueltos para mostrar precios.
 */
export function useMoney() {
  const currencies = useCurrencyStore((s) => s.currencies);
  const selected = useCurrencyStore((s) => s.selected);
  return (amount: string | number | null | undefined) => formatFromBs(amount ?? 0, currencies, selected);
}

/** Moneda efectiva y su denominación (para etiquetas como «Precio (US$)»). */
export function useCurrencyLabel() {
  const currencies = useCurrencyStore((s) => s.currencies);
  const selected = useCurrencyStore((s) => s.selected);
  const { code } = displayCurrency(currencies, selected);
  return { code, symbol: currencySymbol(code, currencies) };
}
