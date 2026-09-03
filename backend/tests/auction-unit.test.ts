import { getDynamicIncrement, maybeExtend } from '../src/services/auction.service';

describe('Unit — getDynamicIncrement', () => {
  it('incremento fijo devuelve el mínimo', () => {
    expect(getDynamicIncrement(1000, 'fixed', 5, 100)).toBe(5);
  });

  it('precio bajo → incremento pequeño', () => {
    expect(getDynamicIncrement(50, 'dynamic', 1, 100)).toBe(1);
  });

  it('precio < 500 → ~2%', () => {
    const inc = getDynamicIncrement(200, 'dynamic', 1, 100);
    expect(inc).toBeGreaterThanOrEqual(4);
    expect(inc).toBeLessThanOrEqual(10);
  });

  it('precio < 2000 → ~2%', () => {
    const inc = getDynamicIncrement(1000, 'dynamic', 1, 100);
    expect(inc).toBe(20);
  });

  it('precio < 10000 → ~1.5%', () => {
    const inc = getDynamicIncrement(5000, 'dynamic', 1, 500);
    expect(inc).toBe(75);
  });

  it('precio alto → 1%, nunca supera el máximo', () => {
    const inc = getDynamicIncrement(50000, 'dynamic', 1, 100);
    expect(inc).toBeLessThanOrEqual(100);
  });

  it('es monótono: precios más altos → incrementos >= o iguales', () => {
    const low = getDynamicIncrement(100, 'dynamic', 1, 1000);
    const high = getDynamicIncrement(5000, 'dynamic', 1, 1000);
    expect(high).toBeGreaterThanOrEqual(low);
  });
});

describe('Unit — maybeExtend (anti-sniping)', () => {
  const future = (minutes: number) => new Date(Date.now() + minutes * 60000);

  it('sin ventana de extensión → nunca extiende', () => {
    const auction = { endDate: future(2), extensionMinutes: 0 };
    expect(maybeExtend(auction)).toBe(false);
  });

  it('queda más tiempo que la ventana → no extiende', () => {
    const auction = { endDate: future(10), extensionMinutes: 5 };
    expect(maybeExtend(auction)).toBe(false);
  });

  it('queda menos que la ventana → extiende', () => {
    const auction = { endDate: future(3), extensionMinutes: 5 };
    expect(maybeExtend(auction)).toBe(true);
  });

  it('ya terminó → no extiende', () => {
    const auction = { endDate: new Date(Date.now() - 1000), extensionMinutes: 5 };
    expect(maybeExtend(auction)).toBe(false);
  });
});
