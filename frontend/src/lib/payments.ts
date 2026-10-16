import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { api } from '../services/api';
import { SAFETY_TIPS_ES } from './paymentSafety';

/**
 * Acceso al pago: datos de pago de la tienda, contador de pedidos por pagar, apertura del chat del pedido y subida
 * del QR de cobro. Textos en el espacio `pagos` (solo español: los demás idiomas caen a español por fallbackLng).
 */
export const PAY_NS = 'pagos';

const es = {
  menu: {
    quick: 'Accesos rápidos',
    orders: 'Mis pedidos',
    payPending: 'Pagar pedidos pendientes',
    payPendingCount: '{{count}} por pagar',
    messages: 'Mensajes',
  },
  safety: {
    title: 'Antes de pagar',
    another: 'Ver otra recomendación',
    tips: SAFETY_TIPS_ES,
  },
  info: {
    title: 'Datos de pago',
    subtitle: 'Paga solo a estos datos de la tienda.',
    qrAlt: 'QR de pago de {{store}}',
    holder: 'Titular',
    bank: 'Banco',
    account: 'Número de cuenta',
    phoneQr: 'Teléfono del QR',
    copy: 'Copiar',
    copyLabel: 'Copiar {{field}}',
    copied: 'Copiado',
    masked: 'Verás el número completo cuando tengas productos de esta tienda en tu carrito o un pedido con ella.',
    loginToSee: 'Inicia sesión para ver los datos de pago.',
    none: 'Esta tienda todavía no tiene datos de pago. Coordina el pago por el chat del pedido.',
    method: { QR: 'QR', BANK: 'Transferencia bancaria', BNB: 'Cuenta BNB' },
  },
  cart: {
    selectAll: 'Seleccionar todo',
    selectStore: 'Seleccionar todos los productos de {{store}}',
    selectItem: 'Seleccionar {{name}} para pagar',
    selectedSummary: '{{count}} de {{total}} productos seleccionados',
    goPay: 'Ir a pagar ({{count}})',
    noneSelected: 'Selecciona al menos un producto para pagar.',
    keepHint: 'Lo que no selecciones se queda en tu carrito.',
    stale: 'Tu carrito cambió. Revisa la selección e inténtalo de nuevo.',
    paying: 'Vas a pagar {{count}} producto(s) de tu carrito.',
    backToCart: 'Volver al carrito',
  },
  checkout: {
    payAndChat: 'Confirmar y abrir el chat de pago',
    chatOpening: 'Abriendo el chat con la tienda...',
    chatFallback: 'Tu pedido se creó. Abre el chat desde el detalle del pedido para pagar.',
  },
  order: {
    payInChat: 'Pagar por el chat',
    payHint: 'En el chat la tienda te envía su QR y tú subes el comprobante.',
  },
  qr: {
    title: 'QR de cobro',
    help: 'Sube la imagen de tu QR (JPG, PNG o WebP, máx. 2 MB). No se aceptan enlaces. Los compradores lo verán en los datos de pago de tu tienda.',
    upload: 'Subir imagen',
    change: 'Cambiar imagen',
    remove: 'Quitar',
    previewAlt: 'Vista previa del QR de cobro',
    uploading: 'Subiendo...',
    tooBig: 'La imagen pesa más de 2 MB.',
    badType: 'Usa una imagen JPG, PNG o WebP.',
    saveHint: 'Guarda la configuración para publicar el QR nuevo.',
    inSettings: 'El QR de cobro se sube en «Configuración de la tienda».',
    goToSettings: 'Ir a Configuración',
  },
  image: {
    upload: 'Subir imagen',
    change: 'Cambiar',
    remove: 'Quitar',
    uploading: 'Subiendo...',
    noLinks: 'Sube un archivo de imagen: no se aceptan enlaces.',
  },
};

i18n.addResourceBundle('es', PAY_NS, es, true, true);

export function usePayT() {
  const { t } = useTranslation(PAY_NS);
  return t as unknown as (k: string, o?: Record<string, unknown>) => string;
}

// ── Datos de pago de una tienda ─────────────────────────────────────────────
export interface StorePaymentInfo {
  storeId: number;
  storeName: string | null;
  available: boolean;
  approved: boolean;
  full: boolean;
  qrUrl: string | null;
  method: 'QR' | 'BANK' | 'BNB' | null;
  bankName: string | null;
  accountHolder: string | null;
  accountNumber: string | null;
  phoneQr: string | null;
}

export async function fetchStorePaymentInfo(storeId: number): Promise<StorePaymentInfo> {
  const { data } = await api.get(`/stores/${storeId}/payment-info`);
  return data.data as StorePaymentInfo;
}

export function useStorePaymentInfo(storeId: number | null | undefined, refreshKey: unknown = 0) {
  const [state, setState] = useState<{ data: StorePaymentInfo | null; loading: boolean; error: boolean }>({ data: null, loading: !!storeId, error: false });
  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    fetchStorePaymentInfo(storeId)
      .then((d) => alive && setState({ data: d, loading: false, error: false }))
      .catch(() => alive && setState({ data: null, loading: false, error: true }));
    return () => {
      alive = false;
    };
  }, [storeId, refreshKey]);
  return state;
}

// ── Pedidos por pagar ───────────────────────────────────────────────────────
export async function fetchPendingPaymentCount(): Promise<number> {
  const { data } = await api.get('/orders/buyer/pending-payment-count');
  return Number(data?.data?.count ?? 0);
}

/** Contador para el menú; se refresca al montar, al volver a la pestaña y cada 2 minutos. */
export function usePendingPaymentCount(enabled: boolean) {
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => {
    if (!enabled) return;
    fetchPendingPaymentCount().then(setCount).catch(() => undefined);
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    refresh();
    const id = window.setInterval(refresh, 120_000);
    const onVis = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, refresh]);
  return enabled ? count : 0;
}

// ── Chat del pedido ─────────────────────────────────────────────────────────
/**
 * Abre (o crea) la conversación vinculada al pedido y devuelve su id. Contrato del módulo de chat:
 * `POST /api/chat/order/:orderId/open` -> `{ data: { id, ... } }` (solo comprador o tienda del pedido).
 * Respaldo mientras ese endpoint no exista en un servidor viejo (404): la conversación comprador-tienda de siempre.
 */
export async function openOrderChat(orderId: number, sellerId?: number | null): Promise<number> {
  try {
    const { data } = await api.post(`/chat/order/${orderId}/open`);
    const conv = data?.data?.conversation ?? data?.data;
    const id = Number(conv?.id);
    if (Number.isInteger(id) && id > 0) return id;
    throw new Error('Respuesta sin conversación');
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404 && sellerId) {
      const { data } = await api.post('/chat', { sellerId });
      const id = Number(data?.data?.id);
      if (Number.isInteger(id) && id > 0) return id;
    }
    throw err;
  }
}

// ── Imágenes por archivo (nunca URL) ───────────────────────────────────────
export const QR_MAX_BYTES = 2 * 1024 * 1024;
export const QR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Validación previa en el cliente (el servidor vuelve a validar por firma real). Devuelve la clave del error o null. */
export function checkQrFile(file: { size: number; type: string }): 'tooBig' | 'badType' | null {
  if (!QR_TYPES.includes(file.type)) return 'badType';
  if (file.size > QR_MAX_BYTES) return 'tooBig';
  return null;
}

/** Sube la imagen del QR de cobro y devuelve la ruta interna (luego se guarda con PUT /seller/profile). */
export async function uploadPaymentQr(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('image', file);
  const { data } = await api.post('/payout-account/qr-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return String(data.data.url);
}

/** Sube una imagen de la tienda (logo, portada o foto) y devuelve la ruta interna. */
export async function uploadStoreImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('image', file);
  const { data } = await api.post('/seller/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return String(data.data.url);
}

/** Código de error del servidor (p. ej. CART_SELECTION_STALE) y su estado HTTP. */
export function apiErrorInfo(err: unknown): { status?: number; code?: string } {
  const r = (err as { response?: { status?: number; data?: { error?: { code?: string } } } })?.response;
  return { status: r?.status, code: r?.data?.error?.code };
}
