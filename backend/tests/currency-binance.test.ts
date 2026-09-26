import * as svc from '../src/services/currency.service';

jest.mock('../src/config/database', () => {
  const store: Record<string, string> = {};
  return {
    prisma: {
      setting: {
        findMany: jest.fn(async () => Object.entries(store).map(([key, value]) => ({ key, value }))),
        upsert: jest.fn(async ({ where, create }: { where: { key: string }; create: { value: string } }) => {
          store[where.key] = create.value;
          return { key: where.key, value: create.value };
        }),
      },
      $disconnect: jest.fn(async () => undefined),
    },
  };
});

const adv = (price: number, extra: Record<string, string> = {}) => ({
  adv: { price: String(price), tradableQuantity: '500', maxSingleTransAmount: '5000', ...extra },
});
const json = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body, text: async () => '' });

function mockFetch(handler: (url: string, init?: { body?: string }) => unknown) {
  (global as unknown as { fetch: unknown }).fetch = jest.fn(async (url: string, init?: { body?: string }) => handler(url, init));
}

const BUY = [11.8, 11.85, 11.9, 11.9, 12.0];
const SELL = [11.95, 12.0, 12.05, 12.1, 12.2];

function binanceHandler(buy: unknown[], sell: unknown[]) {
  return (url: string, init?: { body?: string }) => {
    if (url.includes('p2p.binance.com')) {
      const t = JSON.parse(init?.body ?? '{}').tradeType;
      return json({ data: t === 'BUY' ? buy : sell });
    }
    if (url.includes('er-api.com')) return json({ rates: { BOB: 6.96, EUR: 0.9, JPY: 150, ARS: 1000, PEN: 3.7, CLP: 950, UYU: 40, BRL: 5.5 } });
    return json({}, false);
  };
}

describe('Cotización Binance P2P', () => {
  const original = global.fetch;
  afterEach(() => {
    (global as unknown as { fetch: unknown }).fetch = original;
  });

  it('mediana simple y robusta', () => {
    expect(svc.median([3, 1, 2])).toBe(2);
    expect(svc.median([1, 2, 3, 4])).toBe(2.5);
    expect(svc.robustMedian([11.9, 12, 12.1, 30, 0.5])).toBeCloseTo(12, 5);
  });

  it('promedia la mediana de compra y la de venta y envía el cuerpo correcto', async () => {
    mockFetch(binanceHandler(BUY.map((p) => adv(p)), SELL.map((p) => adv(p))));
    const rate = await svc.fetchBinanceUsdRate();
    expect(rate).toBeCloseTo((11.9 + 12.05) / 2, 4);
    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[1].method).toBe('POST');
    expect(call[1].headers['User-Agent']).toBeTruthy();
    expect(JSON.parse(call[1].body)).toMatchObject({ fiat: 'BOB', asset: 'USDT', rows: 10 });
  });

  it('ignora anuncios con poca liquidez y outliers', async () => {
    const buy = [...BUY.map((p) => adv(p)), adv(99, { tradableQuantity: '0.5' }), adv(30)];
    mockFetch(binanceHandler(buy, SELL.map((p) => adv(p))));
    const rate = await svc.fetchBinanceUsdRate();
    expect(rate).toBeGreaterThan(11.9);
    expect(rate).toBeLessThan(12.1);
  });

  it('devuelve null con menos de 3 anuncios por lado o si falla la red', async () => {
    mockFetch(binanceHandler([adv(11.9), adv(12)], SELL.map((p) => adv(p))));
    expect(await svc.fetchBinanceUsdRate()).toBeNull();
    mockFetch(() => {
      throw new Error('red caída');
    });
    expect(await svc.fetchBinanceUsdRate()).toBeNull();
  });

  it('refreshRates usa Binance como fuente principal y ancla las demás monedas', async () => {
    mockFetch(binanceHandler(BUY.map((p) => adv(p)), SELL.map((p) => adv(p))));
    const rates = await svc.refreshRates();
    expect(rates.USD).toBeCloseTo(11.975, 3);
    expect(rates.EUR).toBeCloseTo(11.975 / 0.9, 3);
    expect(await svc.getRatesSource()).toBe('Binance P2P');
  });

  it('cae a er-api cuando Binance y BCB fallan', async () => {
    mockFetch((url) => (url.includes('er-api.com') ? json({ rates: { BOB: 6.96, EUR: 0.9 } }) : json({}, false)));
    const rates = await svc.refreshRates();
    expect(rates.USD).toBe(6.96);
    expect(await svc.getRatesSource()).toMatch(/er-api/);
  });

  it('el intervalo aleatorio queda dentro de los límites', () => {
    expect(svc.nextRefreshDelayMs(8, 14, () => 0)).toBe(8 * 60_000);
    expect(svc.nextRefreshDelayMs(8, 14, () => 0.999999)).toBeLessThanOrEqual(14 * 60_000);
    for (let i = 0; i < 50; i++) {
      const d = svc.nextRefreshDelayMs(8, 14);
      expect(d).toBeGreaterThanOrEqual(8 * 60_000);
      expect(d).toBeLessThanOrEqual(14 * 60_000);
    }
  });
});
