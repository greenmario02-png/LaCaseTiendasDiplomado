import { describe, expect, it } from 'vitest';
import { BIG_PAYMENT_BS, SAFETY_TIPS_ES, SAFETY_TIP_IDS, pickSafetyTip } from './paymentSafety';

const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe('pickSafetyTip (doc 61)', () => {
  it('tiene al menos 10 recomendaciones distintas e incluye las dos obligatorias', () => {
    expect(SAFETY_TIP_IDS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(Object.values(SAFETY_TIPS_ES)).size).toBe(SAFETY_TIP_IDS.length);
    expect(SAFETY_TIPS_ES.qrName).toMatch(/nombre que aparece al escanear el QR coincida con los datos del vendedor y el número de cuenta del vendedor/);
    expect(SAFETY_TIPS_ES.physicalStore).toMatch(/verifica la existencia física de la tienda antes de pagar/);
  });

  it('montos > Bs 50 priorizan «verifica la existencia física»', () => {
    expect(pickSafetyTip(50.01, () => 0)).toBe('physicalStore');
    expect(pickSafetyTip(300, () => 0.59)).toBe('physicalStore');
    // el resto del tiempo alterna con las demás
    expect(pickSafetyTip(300, () => 0.6)).not.toBe('physicalStore');
  });

  it('montos <= Bs 50 nunca muestran la de la tienda física', () => {
    for (let i = 0; i < 200; i++) expect(pickSafetyTip(BIG_PAYMENT_BS, () => i / 200)).not.toBe('physicalStore');
    expect(pickSafetyTip(null, () => 0)).not.toBe('physicalStore');
  });

  it('con un RNG determinista recorre todas las demás (incluida la del QR)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(pickSafetyTip(10, () => i / 100));
    expect(seen.has('qrName')).toBe(true);
    expect(seen.size).toBe(SAFETY_TIP_IDS.length - 1);
  });

  it('en montos grandes la distribución da ~60 % a la tienda física', () => {
    let rnd = 12345;
    const lcg = () => ((rnd = (rnd * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    let n = 0;
    for (let i = 0; i < 2000; i++) if (pickSafetyTip(120, lcg) === 'physicalStore') n++;
    expect(n / 2000).toBeGreaterThan(0.5);
    expect(n / 2000).toBeLessThan(0.7);
  });

  it('evita repetir la recomendación anterior y tolera RNG fuera de rango', () => {
    expect(pickSafetyTip(10, () => 0, 'qrName')).not.toBe('qrName');
    expect(pickSafetyTip(300, () => 0, 'physicalStore')).not.toBe('physicalStore');
    expect(SAFETY_TIP_IDS).toContain(pickSafetyTip(10, () => 5));
    expect(SAFETY_TIP_IDS).toContain(pickSafetyTip(10, seq(Number.NaN)));
  });
});
