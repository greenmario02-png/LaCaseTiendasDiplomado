import { describe, it, expect } from '@jest/globals';
import { getNeoShadow, getSilkColors, silkLight, silkDark } from './silkTokens';

describe('silkTokens', () => {
  it('getSilkColors(false) devuelve la paleta Silk clara (neomórfica)', () => {
    const c = getSilkColors(false);
    expect(c.primary).toBe('#6366F1');
    expect(c.background).toBe('#E8EAF0');
    expect(c.surface).toBe('#E8EAF0');
    expect(c.text).toBe('#1F2430');
    expect(c.success).toBe('#10B981');
  });

  it('getSilkColors(true) devuelve la paleta oscura con contraste', () => {
    const c = getSilkColors(true);
    expect(c.primary).toBe('#818CF8');
    expect(c.background).toBe('#16181D');
    expect(c.surface).toBe('#16181D');
    expect(c.text).toBe('#EDEFF4');
    expect(c.success).toBe('#34D399');
  });

  it('silkLight y silkDark difieren en primary y background', () => {
    expect(silkLight.primary).not.toBe(silkDark.primary);
    expect(silkLight.background).not.toBe(silkDark.background);
  });

  it('getNeoShadow(false, "raised") aplica sombra elevada (neomorfismo)', () => {
    const s = getNeoShadow(false, 'raised');
    expect(s.elevation).toBe(6);
    expect(s.shadowOffset?.height).toBe(6);
    expect(s.shadowOpacity).toBeGreaterThan(0);
  });

  it('getNeoShadow(false, "pressed") aplica sombra hundida con menos elevación', () => {
    const p = getNeoShadow(false, 'pressed');
    expect(p.elevation).toBe(0);
    expect(p.shadowOffset?.height).toBe(4);
  });

  it('getNeoShadow difiere entre modo claro y oscuro', () => {
    expect(getNeoShadow(false, 'raised').shadowOpacity).not.toBe(getNeoShadow(true, 'raised').shadowOpacity);
  });
});
