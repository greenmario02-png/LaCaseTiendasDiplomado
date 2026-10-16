import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import i18n from 'i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { api } from './api';
import { SAFETY_TIPS_ES } from './paymentSafety';

/**
 * Acceso al pago en la app: datos de pago de la tienda, pedidos por pagar, chat del pedido, selección del carrito
 * y subida del QR de cobro. Textos en `pagos.*` (solo español; los demás idiomas caen a español por fallbackLng).
 * Misma lógica que la web (lib/payments.ts y stores/cartSelectionStore.ts).
 */
const es = {
  pagos: {
    menu: { title: 'Pagos y pedidos', orders: 'Mis pedidos', payPending: 'Pagar pedidos pendientes', payPendingA11y: 'Pagar pedidos pendientes: {{count}} por pagar', messages: 'Mensajes', currency: 'Moneda' },
    safety: { title: 'Antes de pagar', another: 'Ver otra recomendación', tips: SAFETY_TIPS_ES },
    info: {
      title: 'Datos de pago',
      subtitle: 'Paga solo a estos datos de la tienda.',
      qrA11y: 'QR de pago de {{store}}',
      holder: 'Titular',
      bank: 'Banco',
      account: 'Número de cuenta',
      phoneQr: 'Teléfono del QR',
      copyA11y: 'Copiar {{field}}',
      copied: 'Copiado',
      masked: 'Verás el número completo cuando tengas productos de esta tienda en tu carrito o un pedido con ella.',
      loginToSee: 'Inicia sesión para ver los datos de pago.',
      none: 'Esta tienda todavía no tiene datos de pago aprobados. Coordina el pago por el chat del pedido.',
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
      paying: 'Vas a pagar {{count}} producto(s) de tu carrito.',
      stale: 'Tu carrito cambió mientras pagabas. Revisa lo seleccionado y vuelve a intentarlo.',
    },
    checkout: { payAndChat: 'Confirmar y abrir el chat de pago', chatFallback: 'Tu pedido se creó. Abre el chat desde el detalle del pedido para pagar.' },
    order: { payInChat: 'Pagar por el chat', payHint: 'En el chat la tienda te envía su QR y tú subes el comprobante.' },
    qr: {
      title: 'QR de cobro',
      help: 'Sube la imagen de tu QR (JPG, PNG o WebP, máx. 2 MB). No se aceptan enlaces. Se guarda al guardar los cambios de la tienda.',
      gallery: 'Elegir de la galería',
      camera: 'Tomar foto',
      change: 'Cambiar imagen',
      remove: 'Quitar',
      previewA11y: 'Vista previa del QR de cobro',
      uploading: 'Subiendo...',
      inStoreSettings: 'El QR de cobro que ven tus compradores se sube en «Editar tienda».',
      goToStore: 'Ir a Editar tienda',
    },
  },
};
i18n.addResourceBundle('es', 'translation', es, true, false);

// ── Datos de pago ───────────────────────────────────────────────────────────
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

export function useStorePaymentInfo(storeId: number | null | undefined) {
  const [state, setState] = useState<{ data: StorePaymentInfo | null; loading: boolean }>({ data: null, loading: !!storeId });
  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    api
      .get(`/stores/${storeId}/payment-info`)
      .then((r) => alive && setState({ data: r.data.data as StorePaymentInfo, loading: false }))
      .catch(() => alive && setState({ data: null, loading: false }));
    return () => {
      alive = false;
    };
  }, [storeId]);
  return state;
}

// ── Pedidos por pagar ───────────────────────────────────────────────────────
export function usePendingPaymentCount(enabled: boolean) {
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => {
    if (!enabled) return;
    api
      .get('/orders/buyer/pending-payment-count')
      .then((r) => setCount(Number(r.data?.data?.count ?? 0)))
      .catch(() => undefined);
  }, [enabled]);
  useEffect(() => {
    if (enabled) refresh();
    else setCount(0);
  }, [enabled, refresh]);
  return { count, refresh };
}

// ── Chat del pedido ─────────────────────────────────────────────────────────
/**
 * Abre (o crea) la conversación del pedido. Contrato del módulo de chat: `POST /api/chat/order/:orderId/open`
 * -> `{ data: { id, ... } }`. Respaldo con servidores sin ese endpoint (404): la conversación comprador-tienda de siempre.
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

// ── Selección del carrito (persistida) ──────────────────────────────────────
const SEL_KEY = 'cartExcluded';
interface SelectionState {
  excluded: number[];
  loaded: boolean;
  load: () => Promise<void>;
  setSelected: (ids: number[], selected: boolean) => void;
  toggle: (id: number) => void;
  prune: (ids: number[]) => void;
}
const persist = (ids: number[]) => AsyncStorage.setItem(SEL_KEY, JSON.stringify(ids)).catch(() => undefined);

export const useCartSelection = create<SelectionState>((set, get) => ({
  excluded: [],
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const raw = JSON.parse((await AsyncStorage.getItem(SEL_KEY)) ?? '[]');
      set({ excluded: Array.isArray(raw) ? raw.filter((n) => Number.isInteger(n) && n > 0).slice(0, 500) : [], loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  setSelected: (ids, selected) => {
    const ex = new Set(get().excluded);
    for (const id of ids) (selected ? ex.delete(id) : ex.add(id));
    const next = [...ex];
    persist(next);
    set({ excluded: next });
  },
  toggle: (id) => get().setSelected([id], get().excluded.includes(id)),
  prune: (ids) => {
    const valid = new Set(ids);
    const next = get().excluded.filter((id) => valid.has(id));
    if (next.length !== get().excluded.length) {
      persist(next);
      set({ excluded: next });
    }
  },
}));

export interface CartLine {
  id: number;
  quantity: number;
  price?: number | string;
  unitPrice?: number | string;
  lineTotal?: number | string;
  product?: { price?: number | string; seller?: { id?: number; storeName?: string | null } | null } | null;
}

const lineTotal = (i: CartLine) => {
  const lt = Number(i.lineTotal);
  if (Number.isFinite(lt) && i.lineTotal != null) return lt;
  return Number(i.unitPrice ?? i.price ?? i.product?.price ?? 0) * i.quantity;
};

/** Resumen solo de lo seleccionado (pura). */
export function summarizeSelection(items: CartLine[], excluded: number[]) {
  const ex = new Set(excluded);
  const sel = items.filter((i) => !ex.has(i.id));
  const subtotal = Math.round(sel.reduce((a, i) => a + lineTotal(i), 0) * 100) / 100;
  const stores = new Map<number, { storeId: number; storeName: string; subtotal: number; ids: number[] }>();
  for (const i of sel) {
    const sid = Number(i.product?.seller?.id ?? 0);
    const g = stores.get(sid) ?? { storeId: sid, storeName: i.product?.seller?.storeName ?? '', subtotal: 0, ids: [] };
    g.subtotal = Math.round((g.subtotal + lineTotal(i)) * 100) / 100;
    g.ids.push(i.id);
    stores.set(sid, g);
  }
  return { ids: sel.map((i) => i.id), count: sel.length, total: items.length, subtotal, stores: [...stores.values()], allSelected: items.length > 0 && sel.length === items.length };
}

// ── QR de cobro (archivo, nunca URL) ───────────────────────────────────────
export const QR_MAX_BYTES = 2 * 1024 * 1024;

/** Sube la imagen elegida (galería/cámara) al endpoint del QR de cobro; devuelve la ruta interna. */
export async function uploadPaymentQr(uri: string, mime?: string | null): Promise<string> {
  const form = new FormData();
  const ext = (uri.split('?')[0].split('.').pop() ?? 'jpg').toLowerCase();
  const type = mime && ['image/jpeg', 'image/png', 'image/webp'].includes(mime) ? mime : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const name = `qr.${type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'}`;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('image', blob, name);
  } else {
    form.append('image', { uri, name, type } as unknown as Blob);
  }
  const { data } = await api.post('/payout-account/qr-image', form, { headers: { 'Content-Type': 'multipart/form-data' }, transformRequest: (b) => b, timeout: 60000 });
  return String(data.data.url);
}

/** El servidor responde 409 CART_SELECTION_STALE si lo seleccionado ya no está en el carrito. */
export function isCartSelectionStale(err: unknown): boolean {
  const r = (err as { response?: { status?: number; data?: { error?: { code?: string } } } })?.response;
  return r?.status === 409 && r?.data?.error?.code === 'CART_SELECTION_STALE';
}
