import { describe, it, expect } from 'vitest';
import { getUnifiedTokens, unifiedLight, unifiedDark, KARMA_LEVELS } from './unifiedTokens';

describe('unifiedTokens', () => {
  it('getUnifiedTokens(false) devuelve los tokens del tema claro (paleta LaCase Unified)', () => {
    const t = getUnifiedTokens(false);
    expect(t.primary).toBe('#4F46E5');
    expect(t.secondaryContainer).toBe('#FEA619');
    expect(t.tertiaryContainer).toBe('#006E4B');
    expect(t.background).toBe('#F8FAFC');
    expect(t.surface).toBe('#F7F9FB');
    expect(t.onSurface).toBe('#191C1E');
  });

  it('getUnifiedTokens(true) devuelve los tokens del tema oscuro con contraste', () => {
    const t = getUnifiedTokens(true);
    expect(t.primary).toBe('#B8B2FF');
    expect(t.background).toBe('#0F0F14');
    expect(t.surface).toBe('#121318');
    expect(t.onSurface).toBe('#E6E1E5');
    expect(t.cardShadow).toContain('rgba(0, 0, 0');
  });

  it('ambos temas difieren en primary y background', () => {
    expect(unifiedLight.primary).not.toBe(unifiedDark.primary);
    expect(unifiedLight.background).not.toBe(unifiedDark.background);
  });

  it('karmaBadges define los 6 niveles con bg y text (insignias pill del foro)', () => {
    expect(KARMA_LEVELS).toEqual(['Novato', 'Colaborador', 'Activo', 'Experto', 'Maestro', 'Leyenda']);
    for (const darkMode of [false, true]) {
      const t = getUnifiedTokens(darkMode);
      for (const level of KARMA_LEVELS) {
        expect(t.karmaBadges[level], `badge ${level} (${darkMode ? 'dark' : 'light'})`).toBeDefined();
        expect(t.karmaBadges[level].bg).toMatch(/^#/);
        expect(t.karmaBadges[level].text).toMatch(/^#/);
      }
    }
  });
});
