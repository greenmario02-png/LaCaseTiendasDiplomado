import { useCurrencyStore, convertPrice, formatMoney, getRate } from '../stores/currencyStore';

/** Hook que devuelve una función para formatear montos (guardados en Bs) en la moneda seleccionada */
export function useMoney() {
  const currencies = useCurrencyStore((s) => s.currencies);
  const selected = useCurrencyStore((s) => s.selected);
  const rate = getRate(currencies, selected);

  return (amount: string | number) => {
    const converted = convertPrice(Number(amount), selected, rate);
    return formatMoney(converted, selected);
  };
}
