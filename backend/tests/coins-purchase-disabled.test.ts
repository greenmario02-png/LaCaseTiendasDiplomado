/**
 * La compra de monedas está bloqueada hasta integrar un pago real: ningún usuario puede
 * acreditarse monedas por su cuenta. Prisma simulado (no requiere BD).
 */
const mockStore: Record<string, any> = {};
const mockPrisma: any = new Proxy(mockStore, {
  get(t, k: string) {
    if (k.startsWith('$')) return (t[k] ??= jest.fn());
    return (t[k] ??= new Proxy({} as Record<string, any>, { get: (m, mk: string) => (m[mk] ??= jest.fn()) }));
  },
});

jest.mock('../src/config/database', () => ({ prisma: mockPrisma }));

import { buyCoins, getBalance } from '../src/controllers/coins.controller';

async function run(handler: any, req: any) {
  const res: any = { statusCode: 200 };
  res.status = jest.fn((c: number) => { res.statusCode = c; return res; });
  res.json = jest.fn(() => res);
  let err: any;
  await handler(req, res, (e?: any) => { err = e; });
  return { res, err };
}

beforeEach(() => {
  Object.values(mockStore).forEach((m: any) => Object.values(m).forEach((f: any) => f?.mockReset?.()));
});

describe('POST /coins/buy desactivado', () => {
  it('responde 501 COINS_PURCHASE_DISABLED con mensaje en español y no acredita nada', async () => {
    const { err } = await run(buyCoins, { user: { id: 7 }, body: { amount: 1000 }, ip: '1.1.1.1' });
    expect(err.statusCode).toBe(501);
    expect(err.code).toBe('COINS_PURCHASE_DISABLED');
    expect(err.message).toBe('La compra de monedas aún no está disponible');
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.coinTransaction.create).not.toHaveBeenCalled();
  });

  it('con cualquier cantidad (límite, excedida o inválida) tampoco acredita', async () => {
    for (const amount of [1, 10000, 100000, 999999, -1, 'x', undefined]) {
      const { err } = await run(buyCoins, { user: { id: 7 }, body: { amount }, ip: '1.1.1.1' });
      expect(err.code).toBe('COINS_PURCHASE_DISABLED');
    }
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.coinTransaction.create).not.toHaveBeenCalled();
  });

  it('se mantiene en producción', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const { err } = await run(buyCoins, { user: { id: 7 }, body: { amount: 5 } });
      expect(err.statusCode).toBe(501);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});

describe('GET /coins/balance', () => {
  it('informa purchaseEnabled=false y conserva saldo e historial', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 7, gamerCoins: 42 });
    mockPrisma.coinTransaction.findMany.mockResolvedValue([{ id: 1, amount: 42 }]);
    const { res, err } = await run(getBalance, { user: { id: 7 } });
    expect(err).toBeUndefined();
    expect(res.json.mock.calls[0][0].data).toMatchObject({ balance: 42, purchaseEnabled: false, transactions: [{ id: 1, amount: 42 }] });
  });
});
