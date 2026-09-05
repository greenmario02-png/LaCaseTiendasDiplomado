// Sistema de diseño del foro LaCASE — rediseñado con los tokens del "LaCase Unified System"
// (Material 3 claro; índigo #4F46E5, ámbar #FEA619, esmeralda #006E4B).
// Se mantienen las MISMAS claves para que todos los componentes del foro hereden el estilo nuevo.
import { getUnifiedTokens } from './unifiedTokens';

const t = getUnifiedTokens(false);

export const forumPalette = {
  accent: t.primary,
  accentHover: t.primaryContainer,
  accentMuted: `${t.primary}1A`,
  bgBase: t.background,
  bgCard: t.surfaceContainerLowest,
  bgInput: '#FFFFFF',
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
