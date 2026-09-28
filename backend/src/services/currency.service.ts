import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * Moneda base del sistema: Bs (Boliviano). Todos los precios se guardan en Bs.
 * USD se calcula con la tasa almacenada, actualizable desde APIs oficiales.
 */
export const BASE_CURRENCY = 'BOB';

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  /** Cuántas unidades de base hacen 1 de esta moneda (BOB = 1) */
  rate: number;
  isDefault: boolean;
}

const CURRENCY_META: Record<string, { name: string; symbol: string }> = {
  BOB: { name: 'Boliviano', symbol: 'Bs' },
  USD: { name: 'Dólar estadounidense', symbol: 'US$' },
  EUR: { name: 'Euro', symbol: '€' },
  JPY: { name: 'Yen japonés', symbol: '¥' },
  ARS: { name: 'Peso argentino', symbol: 'AR$' },
  PEN: { name: 'Sol peruano', symbol: 'S/' },
  CLP: { name: 'Peso chileno', symbol: 'CL$' },
  UYU: { name: 'Peso uruguayo', symbol: '$U' },
  BRL: { name: 'Real brasileño', symbol: 'R$' },
  CNY: { name: 'Yuan chino', symbol: '¥C' },
  PYG: { name: 'Guaraní paraguayo', symbol: '₲' },
  COP: { name: 'Peso colombiano', symbol: 'CO$' },
};

// Tasas por defecto: cuántas Bs equivalen a 1 unidad de cada moneda (ago 2026, referencia).
// Se actualizan en vivo vía fuentes oficiales cuando hay red.
const DEFAULT_RATES: Record<string, number> = {
  BOB: 1,
  USD: 6.96,
  EUR: 7.55,
  JPY: 0.048,
  ARS: 0.0077, // ~1 USD ≈ 1.500 ARS
  PEN: 3.13, // ~1 USD ≈ 3,70 PEN
  CLP: 0.0122, // ~1 USD ≈ 950 CLP
  UYU: 0.282, // ~1 USD ≈ 41 UYU
  BRL: 2.1, // ~1 USD ≈ 5,50 BRL
  CNY: 0.98, // ~1 USD ≈ 7,10 CNY
  PYG: 0.00093, // ~1 USD ≈ 7.500 PYG
  COP: 0.0017, // ~1 USD ≈ 4.100 COP
  USDT: 6.96,
};

function getKey(code: string): string {
  return `currency.rate.${code}`;
}

export async function getSettings() {
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function getRates(): Promise<Record<string, number>> {
  const settings = await getSettings();
  const rates: Record<string, number> = { BOB: 1 };
  for (const code of Object.keys(CURRENCY_META)) {
    const raw = settings[getKey(code)];
    rates[code] = raw ? Number(raw) : DEFAULT_RATES[code] ?? 1;
  }
  return rates;
}

export async function getDefaultCurrency(): Promise<string> {
  const settings = await getSettings();
  return settings['currency.default'] || 'BOB';
}

export async function getCurrencies(): Promise<CurrencyInfo[]> {
  const [rates, defaultCurrency] = await Promise.all([getRates(), getDefaultCurrency()]);
  return Object.keys(CURRENCY_META).map((code) => ({
    code,
    name: CURRENCY_META[code].name,
    symbol: CURRENCY_META[code].symbol,
    rate: rates[code],
    isDefault: code === defaultCurrency,
  }));
}

/**
 * Scrapea el tipo de cambio oficial (Bs por US$) desde el sitio del Banco Central de Bolivia.
 * La página pública https://www.bcb.gob.bo/ muestra "Tipo de cambio oficial — Bolivianos por
 * dólar estadounidense" seguido del valor (ej. "11,58"). El BCB no expone una API JSON pública,
 * así que se extrae el número con regex del HTML oficial.
 * @returns tasa USD→BOB, o null si no se pudo obtener.
 */
async function fetchBcbUsdRate(): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch('https://www.bcb.gob.bo/', { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    const html = await res.text();
    // Busca el bloque "Tipo de cambio oficial ... Bolivianos por dólar estadounidense ... <número>"
    const match = html.match(
      /Tipo de cambio oficial[\s\S]{0,1200}?Bolivianos por d[oó]lar estadounidense[\s\S]{0,800}?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
    );
    if (!match?.[1]) return null;

    // "11,58" → 11.58 (el BCB usa coma decimal; admite también punto como separador de miles)
    const raw = match[1].replace(/\./g, '').replace(',', '.');
    const usd = Number(raw);
    return Number.isFinite(usd) && usd > 0 ? usd : null;
  } catch {
    return null;
  }
}

const SOURCE_KEY = 'currency.source';
const P2P_URL = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';

async function saveSetting(key: string, value: string) {
  await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export function median(values: number[]): number {
  const v = [...values].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Descarta outliers (>15% respecto de la mediana) y devuelve la mediana del resto. */
export function robustMedian(values: number[]): number {
  const m0 = median(values);
  const kept = values.filter((x) => Math.abs(x - m0) / m0 <= 0.15);
  return median(kept.length ? kept : values);
}

async function fetchP2pPrices(tradeType: 'BUY' | 'SELL'): Promise<number[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(P2P_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; LaCaseBot/1.0)' },
      body: JSON.stringify({
        fiat: 'BOB', page: 1, rows: 10, tradeType, asset: 'USDT', countries: [],
        proMerchantAds: false, publisherType: null, payTypes: [], classifies: ['mass', 'profession'],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as {
      data?: Array<{ adv?: { price?: string; tradableQuantity?: string; maxSingleTransAmount?: string } }>;
    };
    const prices: number[] = [];
    for (const row of json.data ?? []) {
      const adv = row.adv;
      const price = Number(adv?.price);
      if (!Number.isFinite(price) || price <= 0) continue;
      // Ignora anuncios con liquidez insignificante
      if (adv?.tradableQuantity !== undefined && Number(adv.tradableQuantity) < 10) continue;
      if (adv?.maxSingleTransAmount !== undefined && Number(adv.maxSingleTransAmount) < 100) continue;
      prices.push(price);
    }
    return prices;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Cotización USDT/BOB (≈ USD/BOB) desde Binance P2P: promedio de la mediana de compra y la
 * mediana de venta. Requiere ≥3 anuncios válidos por lado; si no, devuelve null.
 */
export async function fetchBinanceUsdRate(): Promise<number | null> {
  try {
    const [buy, sell] = await Promise.all([fetchP2pPrices('BUY'), fetchP2pPrices('SELL')]);
    if (buy.length < 3 || sell.length < 3) return null;
    const rate = (robustMedian(buy) + robustMedian(sell)) / 2;
    return Number.isFinite(rate) && rate > 0 ? Math.round(rate * 10000) / 10000 : null;
  } catch (err) {
    logger.warn('[Currency] Binance P2P falló:', (err as Error).message);
    return null;
  }
}

/**
 * Obtiene la tasa USD/BOB. Fuente PRIMARIA: Binance P2P. Respaldo: BCB y APIs públicas.
 * Las demás monedas se derivan por tasas cruzadas (er-api) ancladas a esa tasa.
 */
export async function refreshRates(): Promise<Record<string, number>> {
  const sources = [
    'https://open.er-api.com/v6/latest/USD',
    'https://api.exchangerate-api.com/v4/latest/USD',
  ];

  // Se piden Binance y BCB en paralelo: Binance sigue siendo la fuente primaria (más sensible al
  // mercado paralelo), pero comparamos contra el BCB para detectar si se desvió demasiado en vez
  // de solo usarlo cuando Binance falla. No agrega una fuente nueva: ya estaba en el código, solo
  // se aprovecha también como verificación cuando Binance sí responde.
  const [binanceRate, bcbRate] = await Promise.all([fetchBinanceUsdRate(), fetchBcbUsdRate()]);

  let usdToBob: number | null = binanceRate;
  let source = 'Binance P2P';
  let lastError: string | null = usdToBob === null ? 'Binance no disponible' : null;

  if (usdToBob !== null && bcbRate !== null) {
    const diffPct = Math.abs(usdToBob - bcbRate) / bcbRate;
    if (diffPct > 0.08) {
      logger.warn(`[Currency] Binance (${usdToBob}) se desvía ${(diffPct * 100).toFixed(1)}% del BCB (${bcbRate}); se mantiene Binance como referencia del mercado paralelo.`);
    }
  }

  if (usdToBob === null) {
    usdToBob = bcbRate;
    source = 'Banco Central de Bolivia (BCB)';
    if (usdToBob === null) lastError = 'Binance y BCB no disponibles';
  }

  for (const url of sources) {
    if (usdToBob !== null) break;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { rates?: Record<string, number> };
      if (data.rates?.BOB) {
        usdToBob = Number(data.rates.BOB);
        source = 'API pública (er-api.com)';
        break;
      }
      throw new Error('La API no devolvió tasa BOB');
    } catch (err) {
      lastError = (err as Error).message;
    }
  }

  if (usdToBob === null) {
    throw new Error(`No se pudo obtener la tasa USD/BOB (${lastError}). Usa la tasa manual.`);
  }

  // Tasas objetivo contra USD (er-api o exchangerate-api): 1 USD = N unidades
  const targetCodes = ['EUR', 'JPY', 'ARS', 'PEN', 'CLP', 'UYU', 'BRL', 'CNY', 'PYG', 'COP'] as const;
  let usdRates: Record<string, number> = {};
  for (const url of sources) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { rates?: Record<string, number> };
      if (data.rates?.EUR) {
        usdRates = data.rates;
        break;
      }
      throw new Error('La API no devolvió tasas');
    } catch (err) {
      logger.warn('[Currency] Fuente de tasas falló:', (err as Error).message);
    }
  }

  const now = new Date().toISOString();
  await saveSetting(getKey('USD'), String(usdToBob));
  await saveSetting(getKey('USDT'), String(usdToBob));
  for (const code of targetCodes) {
    const perUsd = usdRates[code];
    // tasa Bs por unidad = (Bs por USD) / (unidades por USD)
    const bs = perUsd && perUsd > 0 ? usdToBob / perUsd : DEFAULT_RATES[code] ?? usdToBob;
    await saveSetting(getKey(code), String(bs));
  }
  await saveSetting('currency.ratesUpdatedAt', now);
  await saveSetting(SOURCE_KEY, source);
  const rates = await getRates();
  rates.USD = usdToBob;
  return rates;
}

/** Intervalo aleatorio (ms) entre min y max minutos. */
export function nextRefreshDelayMs(minMin: number, maxMin: number, rand: () => number = Math.random): number {
  const lo = Math.min(minMin, maxMin);
  const hi = Math.max(minMin, maxMin);
  return Math.round((lo + rand() * (hi - lo)) * 60_000);
}

let refreshTimer: NodeJS.Timeout | null = null;

/**
 * Refresco automático encadenado con setTimeout a intervalo aleatorio (pensado para hosting
 * gratuito que se duerme tras ~15 min de inactividad). No se inicia en NODE_ENV=test.
 */
export function startCurrencyRefreshScheduler(): void {
  if (env.NODE_ENV === 'test' || refreshTimer) return;
  const schedule = () => {
    const delay = nextRefreshDelayMs(env.CURRENCY_REFRESH_MIN_MINUTES, env.CURRENCY_REFRESH_MAX_MINUTES);
    refreshTimer = setTimeout(async () => {
      try {
        await refreshRates();
      } catch (e) {
        logger.warn(`[Currency] refresco automático: ${(e as Error).message}`);
      }
      schedule();
    }, delay);
    refreshTimer.unref();
  };
  refreshRates().catch((e) => logger.warn(`[Currency] refresco inicial: ${(e as Error).message}`));
  schedule();
}

export async function setManualRate(usdToBob: number): Promise<Record<string, number>> {
  if (!Number.isFinite(usdToBob) || usdToBob <= 0) throw new Error('Tasa inválida');
  const now = new Date().toISOString();
  await prisma.setting.upsert({ where: { key: getKey('USD') }, create: { key: getKey('USD'), value: String(usdToBob) }, update: { value: String(usdToBob) } });
  await prisma.setting.upsert({ where: { key: 'currency.ratesUpdatedAt' }, create: { key: 'currency.ratesUpdatedAt', value: now }, update: { value: now } });
  await saveSetting(SOURCE_KEY, 'Manual');
  return getRates();
}

export async function setDefaultCurrency(code: string): Promise<void> {
  if (!CURRENCY_META[code]) throw new Error('Moneda no soportada');
  await prisma.setting.upsert({ where: { key: 'currency.default' }, create: { key: 'currency.default', value: code }, update: { value: code } });
}

export async function getRatesSource(): Promise<string | null> {
  const settings = await getSettings();
  return settings[SOURCE_KEY] ?? null;
}

export async function getRatesUpdatedAt(): Promise<string | null> {
  const settings = await getSettings();
  return settings['currency.ratesUpdatedAt'] ?? null;
}

export function convert(amountBs: number, to: string, rates: Record<string, number>): number {
  if (to === 'BOB' || !rates[to]) return amountBs;
  return amountBs / rates[to];
}

export function formatPrice(amount: number, currency: string, rates: Record<string, number>): string {
  const converted = convert(amount, currency, rates);
  if (currency === 'USD') {
    return `US$ ${converted.toFixed(2)}`;
  }
  return `Bs ${converted.toLocaleString('es-BO', { maximumFractionDigits: 2 })}`;
}

/* ============================================================
 * Cotizaciones en vivo (8.9): USD/EUR/JPY (fuentes oficiales)
 * + USDT (Binance), con caché en memoria TTL 5 min.
 * ============================================================ */

export interface LiveRates {
  base: string;
  rates: { usd: number; eur: number; jpy: number; ars: number; pen: number; clp: number; uyu: number; brl: number; cny: number; pyg: number; cop: number; usdt: number };
  source: { usd: string; eur: string; jpy: string; ars: string; pen: string; clp: string; uyu: string; brl: string; cny: string; pyg: string; cop: string; usdt: string };
  updatedAt: string;
}

const RATES_TTL_MS = 5 * 60 * 1000; // 5 minutos
let ratesCache: { data: LiveRates; at: number } | null = null;

async function fetchJson(url: string, timeoutMs = 2500): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Tasa USDT→USD desde Binance (par USDC/USDT ≈ 1 → USDT ≈ USD). Fallback 1. */
async function fetchUsdtUsd(): Promise<number> {
  try {
    const data = (await fetchJson('https://api.binance.com/api/v3/ticker/price?symbol=USDCUSDT')) as {
      price?: string;
    };
    const price = Number(data?.price);
    if (Number.isFinite(price) && price > 0) return 1 / price;
  } catch {
    /* sin red: fallback 1 */
  }
  return 1;
}

/**
 * Devuelve las cotizaciones en Bs con caché de 5 min.
 * - USD: tasa guardada en settings (actualizable manualmente o por refreshRates).
 * - EUR/JPY: Banco Central Europeo vía frankfurter.app (desde USD).
 * - USDT: Binance (USDT ≈ USD), sobre la tasa USD guardada.
 */
let ratesInFlight: Promise<LiveRates> | null = null;

// Stale-while-revalidate: si hay caché (aunque vencida) responde al instante y refresca en
// segundo plano; las llamadas simultáneas comparten una sola consulta a las APIs externas.
export async function getLiveRates(): Promise<LiveRates> {
  if (ratesCache) {
    if (Date.now() - ratesCache.at >= RATES_TTL_MS && !ratesInFlight) {
      ratesInFlight = computeLiveRates().finally(() => {
        ratesInFlight = null;
      });
      ratesInFlight.catch(() => undefined);
    }
    return ratesCache.data;
  }
  if (!ratesInFlight) {
    ratesInFlight = computeLiveRates().finally(() => {
      ratesInFlight = null;
    });
  }
  return ratesInFlight;
}

async function computeLiveRates(): Promise<LiveRates> {
  // Refresco perezoso (stale-while-revalidate): si la tasa guardada está vencida y no es manual, se renueva
  if (env.NODE_ENV !== 'test') {
    const [updatedAt, src] = await Promise.all([getRatesUpdatedAt(), getRatesSource()]);
    const age = updatedAt ? Date.now() - new Date(updatedAt).getTime() : Infinity;
    if (src !== 'Manual' && age >= RATES_TTL_MS) {
      await refreshRates().catch((e) => logger.warn(`[Currency] refresco perezoso: ${(e as Error).message}`));
    }
  }
  const [storedRates, usdtUsd, storedSource, settingsMap] = await Promise.all([getRates(), fetchUsdtUsd(), getRatesSource(), getSettings()]);
  const usd = storedRates.USD ?? DEFAULT_RATES.USD ?? 6.96;

  // Cotizaciones contra USD desde API pública (er-api.com, cubre EUR/JPY/ARS/CLP/BRL/UYU/PEN).
  // Para Bs: la tasa que devuelve es "1 USD = N monedas" → Bs por moneda = usd / N.
  let eur: number | null = null;
  let jpy: number | null = null;
  let ars: number | null = null;
  let pen: number | null = null;
  let clp: number | null = null;
  let uyu: number | null = null;
  let brl: number | null = null;
  let cny: number | null = null;
  let pyg: number | null = null;
  let cop: number | null = null;
  try {
    const data = (await fetchJson('https://open.er-api.com/v6/latest/USD')) as {
      rates?: { EUR?: number; JPY?: number; ARS?: number; CLP?: number; BRL?: number; UYU?: number; PEN?: number; CNY?: number; PYG?: number; COP?: number };
    };
    const r = data.rates;
    if (r) {
      if (r.EUR) eur = usd / Number(r.EUR);
      if (r.JPY) jpy = usd / Number(r.JPY);
      if (r.ARS) ars = usd / Number(r.ARS);
      if (r.PEN) pen = usd / Number(r.PEN);
      if (r.CLP) clp = usd / Number(r.CLP);
      if (r.UYU) uyu = usd / Number(r.UYU);
      if (r.BRL) brl = usd / Number(r.BRL);
      if (r.CNY) cny = usd / Number(r.CNY);
      if (r.PYG) pyg = usd / Number(r.PYG);
      if (r.COP) cop = usd / Number(r.COP);
    }
  } catch {
    /* sin red: usar defaults */
  }

  const rates = {
    usd,
    eur: eur ?? DEFAULT_RATES.EUR ?? usd,
    jpy: jpy ?? DEFAULT_RATES.JPY ?? usd / 140,
    ars: ars ?? DEFAULT_RATES.ARS ?? usd / 1500,
    pen: pen ?? DEFAULT_RATES.PEN ?? usd / 3.7,
    clp: clp ?? DEFAULT_RATES.CLP ?? usd / 950,
    uyu: uyu ?? DEFAULT_RATES.UYU ?? usd / 41,
    brl: brl ?? DEFAULT_RATES.BRL ?? usd / 5.5,
    cny: cny ?? DEFAULT_RATES.CNY ?? usd / 7.1,
    pyg: pyg ?? DEFAULT_RATES.PYG ?? usd / 7500,
    cop: cop ?? DEFAULT_RATES.COP ?? usd / 4100,
    usdt: Number(settingsMap[getKey('USDT')]) > 0 ? Number(settingsMap[getKey('USDT')]) : usd * usdtUsd,
  };

  const result: LiveRates = {
    base: 'BOB',
    rates,
    source: {
      usd: storedSource ?? 'Banco Central de Bolivia (BCB)',
      eur: 'API pública (er-api.com)',
      jpy: 'API pública (er-api.com)',
      ars: 'API pública (er-api.com)',
      pen: 'API pública (er-api.com)',
      clp: 'API pública (er-api.com)',
      uyu: 'API pública (er-api.com)',
      brl: 'API pública (er-api.com)',
      cny: 'API pública (er-api.com)',
      pyg: 'API pública (er-api.com)',
      cop: 'API pública (er-api.com)',
      usdt: storedSource === 'Binance P2P' ? 'Binance P2P' : 'Binance',
    },
    updatedAt: new Date().toISOString(),
  };

  ratesCache = { data: result, at: Date.now() };
  return result;
}
