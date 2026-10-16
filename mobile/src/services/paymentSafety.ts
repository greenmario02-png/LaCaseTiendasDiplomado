/** Copia de frontend/src/lib/paymentSafety.ts (mantener iguales).
 *
 * Recomendación de seguridad antes de pagar (doc 61). Reemplaza el aviso fijo por una elegida al azar entre >= 10.
 * Función PURA: el azar se inyecta (`rng`, por defecto Math.random) para poder probarla de forma determinista.
 * El monto se pasa SIEMPRE en Bs (moneda base guardada), sin importar la moneda que el usuario eligió para ver precios.
 */
export const BIG_PAYMENT_BS = 50;
/** Con montos mayores a BIG_PAYMENT_BS, probabilidad de mostrar «verifica la tienda física»; el resto alterna con las demás. */
export const PHYSICAL_STORE_WEIGHT = 0.6;

export type SafetyTipId =
  | 'qrName'
  | 'physicalStore'
  | 'stayOnPlatform'
  | 'urgency'
  | 'tooGoodDiscount'
  | 'keepReceipt'
  | 'noOtp'
  | 'confirmInChat'
  | 'thirdPartyAccount'
  | 'exactAmount'
  | 'noAdvanceOutside'
  | 'checkReviews';

/** Textos en español (idioma base). Los demás idiomas caen a estos si no tienen traducción. */
export const SAFETY_TIPS_ES: Record<SafetyTipId, string> = {
  qrName:
    'Antes de pagar verifica que el nombre que aparece al escanear el QR coincida con los datos del vendedor y el número de cuenta del vendedor, para evitar estafas.',
  physicalStore: 'Es un monto mayor a Bs 50: verifica la existencia física de la tienda antes de pagar.',
  stayOnPlatform: 'No pagues fuera de la plataforma: usa solo los datos de pago que ves aquí y el chat del pedido.',
  urgency: 'Desconfía de la urgencia: nadie legítimo te exige pagar «en los próximos minutos».',
  tooGoodDiscount: 'Desconfía de descuentos exagerados o precios demasiado bajos para ser reales.',
  keepReceipt: 'Guarda tu comprobante de pago y súbelo en el chat del pedido.',
  noOtp: 'Nunca compartas códigos de verificación (OTP), PIN ni contraseñas: LaCase y las tiendas nunca te los piden.',
  confirmInChat: 'Si tienes dudas, confirma los datos de pago con la tienda por el chat del pedido antes de transferir.',
  thirdPartyAccount: 'Cuidado si la cuenta está a nombre de un tercero distinto al dueño de la tienda: no pagues y avísanos.',
  exactAmount: 'Paga el monto exacto del pedido; desconfía si te piden un monto distinto o «una comisión extra».',
  noAdvanceOutside: 'No envíes adelantos por WhatsApp u otros medios fuera del pedido.',
  checkReviews: 'Revisa las calificaciones y el tiempo de la tienda en LaCase antes de un pago grande.',
};

export const SAFETY_TIP_IDS = Object.keys(SAFETY_TIPS_ES) as SafetyTipId[];

/**
 * Elige la recomendación a mostrar.
 *  - Monto > Bs 50: con probabilidad PHYSICAL_STORE_WEIGHT «verifica la existencia física»; si no, cualquiera de las otras.
 *  - Monto <= Bs 50 (o desconocido): cualquiera menos la de la tienda física (no aplica a montos chicos).
 * `exclude` evita repetir la última mostrada cuando hay alternativas.
 */
export function pickSafetyTip(amountBs: number | null | undefined, rng: () => number = Math.random, exclude?: SafetyTipId | null): SafetyTipId {
  const big = typeof amountBs === 'number' && Number.isFinite(amountBs) && amountBs > BIG_PAYMENT_BS;
  const r = clamp01(rng());
  if (big && r < PHYSICAL_STORE_WEIGHT && exclude !== 'physicalStore') return 'physicalStore';
  let pool = SAFETY_TIP_IDS.filter((id) => id !== 'physicalStore');
  if (exclude && pool.length > 1) pool = pool.filter((id) => id !== exclude);
  // Reescala el resto del intervalo para no sesgar la elección entre las demás.
  const r2 = big && exclude !== 'physicalStore' ? (r - PHYSICAL_STORE_WEIGHT) / (1 - PHYSICAL_STORE_WEIGHT) : r;
  return pool[Math.min(pool.length - 1, Math.floor(clamp01(r2) * pool.length))];
}

function clamp01(n: number) {
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 0.999999) : 0;
}
