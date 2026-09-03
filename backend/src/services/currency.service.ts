import { prisma } from '../config/database';
import { logger } from '../utils/logger';

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

/**
 * Obtiene la tasa USD/BOB. Fuente PRIMARIA: Banco Central de Bolivia (bcb.gob.bo).
 * Si el BCB no responde, cae a APIs públicas de tasas; si todo falla, conserva la manual.
 */
export async function refreshRates(): Promise<Record<string, number>> {
  const sources = [
    'https://open.er-api.com/v6/latest/USD',
    'https://api.exchangerate-api.com/v4/latest/USD',
  ];

  let usdToBob: number | null = await fetchBcbUsdRate();
  let lastError: string | null = usdToBob === null ? 'BCB no disponible' : null;

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
        break;
      }
      throw new Error('La API no devolvió tasa BOB');
    } catch (err) {
      lastError = (err as Error).message;
    }
  }

  if (usdToBob === null) {
    throw new Error(`No se pudo obtener la tasa USD/BOB (${lastError}). Usá la tasa manual.`);
  }

  // Tasas objetivo contra USD (er-api o exchangerate-api): 1 USD = N unidades
  const targetCodes = ['EUR', 'JPY', 'ARS', 'PEN', 'CLP', 'UYU', 'BRL'] as const;
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
  // Persistir TODAS las tasas en Bs en settings (para que el selector de moneda convierta)
  const stored: Record<string, number> = { USD: usdToBob };
  await prisma.setting.upsert({ where: { key: getKey('USD') }, create: { key: getKey('USD'), value: String(usdToBob) }, update: { value: String(usdToBob) } });
  for (const code of targetCodes) {
    const perUsd = usdRates[code];
    // tasa Bs por unidad = (Bs por USD) / (unidades por USD)
    const bs = perUsd && perUsd > 0 ? usdToBob / perUsd : DEFAULT_RATES[code] ?? usdToBob;
    stored[code] = bs;
    await prisma.setting.upsert({
      where: { key: getKey(code) },
      create: { key: getKey(code), value: String(bs) },
      update: { value: String(bs) },
    });
  }
  await prisma.setting.upsert({ where: { key: 'currency.ratesUpdatedAt' }, create: { key: 'currency.ratesUpdatedAt', value: now }, update: { value: now } });
  const rates = await getRates();
  rates.USD = usdToBob;
  return rates;
}

export async function setManualRate(usdToBob: number): Promise<Record<string, number>> {
  if (!Number.isFinite(usdToBob) || usdToBob <= 0) throw new Error('Tasa inválida');
  const now = new Date().toISOString();
  await prisma.setting.upsert({ where: { key: getKey('USD') }, create: { key: getKey('USD'), value: String(usdToBob) }, update: { value: String(usdToBob) } });
  await prisma.setting.upsert({ where: { key: 'currency.ratesUpdatedAt' }, create: { key: 'currency.ratesUpdatedAt', value: now }, update: { value: now } });
  return getRates();
}

export async function setDefaultCurrency(code: string): Promise<void> {
  if (!CURRENCY_META[code]) throw new Error('Moneda no soportada');
  await prisma.setting.upsert({ where: { key: 'currency.default' }, create: { key: 'currency.default', value: code }, update: { value: code } });
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
  rates: { usd: number; eur: number; jpy: number; ars: number; pen: number; clp: number; uyu: number; brl: number; usdt: number };
  source: { usd: string; eur: string; jpy: string; ars: string; pen: string; clp: string; uyu: string; brl: string; usdt: string };
  updatedAt: string;
}

const RATES_TTL_MS = 5 * 60 * 1000; // 5 minutos
let ratesCache: { data: LiveRates; at: number } | null = null;

async function fetchJson(url: string, timeoutMs = 6000): Promise<unknown> {
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
export async function getLiveRates(): Promise<LiveRates> {
  if (ratesCache && Date.now() - ratesCache.at < RATES_TTL_MS) {
    return ratesCache.data;
  }

  const [storedRates, usdtUsd] = await Promise.all([getRates(), fetchUsdtUsd()]);
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
  try {
    const data = (await fetchJson('https://open.er-api.com/v6/latest/USD')) as {
      rates?: { EUR?: number; JPY?: number; ARS?: number; CLP?: number; BRL?: number; UYU?: number; PEN?: number };
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
    usdt: usd * usdtUsd,
  };

  const result: LiveRates = {
    base: 'BOB',
    rates,
    source: {
      usd: 'Banco Central de Bolivia (BCB)',
      eur: 'API pública (er-api.com)',
      jpy: 'API pública (er-api.com)',
      ars: 'API pública (er-api.com)',
      pen: 'API pública (er-api.com)',
      clp: 'API pública (er-api.com)',
      uyu: 'API pública (er-api.com)',
      brl: 'API pública (er-api.com)',
      usdt: 'Binance',
    },
    updatedAt: new Date().toISOString(),
  };

  ratesCache = { data: result, at: Date.now() };
  return result;
}
