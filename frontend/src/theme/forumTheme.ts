// Sistema de diseño del foro LaCASE — rediseñado con los tokens del "LaCase Unified System"
// (Material 3; índigo #4F46E5, ámbar #FEA619, esmeralda #006E4B — claro u oscuro según el modo
// de la app). Se mantienen las MISMAS claves para que todos los componentes del foro hereden el
// estilo nuevo.
import { getUnifiedTokens, type UnifiedTokens } from './unifiedTokens';
import { useThemeStore } from '../stores/themeStore';

function buildForumPalette(t: UnifiedTokens) {
  return {
    accent: t.primary,
    accentHover: t.primaryContainer,
    accentMuted: `${t.primary}1A`,
    bgBase: t.background,
    bgCard: t.surfaceContainerLowest,
    bgInput: t.surfaceContainerLowest,
    bgHover: t.primary + '0D',
    border: t.outline + '40',
    textPrimary: t.onSurface,
    textSecondary: t.onSurfaceVariant,
    textMuted: t.outline,
    karmaGold: t.karmaBadges.Leyenda.text,
    karmaUp: t.tertiaryContainer,
    karmaDown: t.error,
    amarillo: t.secondaryContainer,
    rojo: t.error,
    verde: t.tertiaryContainer,
    // Rangos de karma (tintes del Unified System)
    rankNuevo: t.karmaBadges.Novato.text,
    rankActivo: t.karmaBadges.Activo.text,
    rankExperto: t.karmaBadges.Experto.text,
    rankMaestro: t.karmaBadges.Maestro.text,
    rankLeyenda: t.karmaBadges.Leyenda.text,
  };
}

/**
 * Paleta del foro reactiva al modo oscuro real de la app. Antes era una constante calculada UNA
 * SOLA VEZ en modo claro (`getUnifiedTokens(false)`) — con la app en modo oscuro, el texto y los
 * fondos del foro quedaban con tonos claros ilegibles/desentonados. Los componentes del foro que
 * ya importaban `forumPalette` como objeto plano siguen funcionando: import `useForumPalette` y
 * asigná `const forumPalette = useForumPalette();` al principio del componente (shadowing), sin
 * tocar el resto de las referencias `forumPalette.x`.
 */
export function useForumPalette() {
  const darkMode = useThemeStore((s) => s.darkMode);
  return buildForumPalette(getUnifiedTokens(darkMode));
}

/** @deprecated Usa `useForumPalette()` dentro de un componente — esta constante es solo modo claro. */
export const forumPalette = buildForumPalette(getUnifiedTokens(false));

export function getTag(karma: number): string {
  const thresholds = [
    { min: 3000, tag: 'Leyenda' },
    { min: 1000, tag: 'Maestro' },
    { min: 500, tag: 'Experto' },
    { min: 200, tag: 'Activo' },
    { min: 50, tag: 'Colaborador' },
    { min: 0, tag: 'Novato' },
  ];
  return thresholds.find((t) => karma >= t.min)?.tag ?? 'Novato';
}

export function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hace 1 día';
  return `hace ${days} días`;
}
