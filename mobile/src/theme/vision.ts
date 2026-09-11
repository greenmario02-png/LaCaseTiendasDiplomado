/**
 * Vision UI — tokens de diseño para la app móvil.
 * Espejo de frontend/src/theme/vision.ts (Creative Tim Vision UI Dashboard):
 * fondo nocturno con gradiente + glows radiales, tarjetas glassmorphism,
 * gradientes de acento y texto claro. Usado por los dashboards, el foro y el home.
 */
export const vision = {
  // Fondo principal (linear-gradient 135deg)
  bgGradient: ['#0f1535', '#141a45', '#1d2150', '#2a2358', '#3b2a66'],

  // Glows radiales simulados con círculos semitransparentes (sin blur nativo)
  glows: [
    { color: 'rgba(99,91,255,0.28)', top: '10%', left: '15%', size: 260 },
    { color: 'rgba(106,210,255,0.18)', top: '5%', left: '85%', size: 220 },
    { color: 'rgba(255,105,180,0.14)', top: '85%', left: '90%', size: 200 },
    { color: 'rgba(0,209,160,0.14)', top: '90%', left: '5%', size: 200 },
    { color: 'rgba(138,43,226,0.16)', top: '30%', left: '20%', size: 180 },
  ],

  // Gradientes de acento (pares para LinearGradient)
  gradPrimary: ['#4318ff', '#6ad2ff'],
  gradCyan: ['#007cf0', '#00dfd8'],
  gradGreen: ['#00b09b', '#96c93d'],
  gradOrange: ['#ff8008', '#ffc837'],
  gradPink: ['#f857a6', '#ff5858'],
  gradViolet: ['#8a2be2', '#4318ff'],

  // Texto sobre fondo nocturno
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.72)',
  textMuted: 'rgba(255,255,255,0.48)',

  // Tarjeta glassmorphism
  glass: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderRadius: 18,
    shadowColor: '#0f1535',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  // Chip fantasma: color de fondo al 15% + borde al 33%
  chipGhost: (color: string) => ({
    backgroundColor: `${color}26`,
    borderColor: `${color}55`,
  }),
} as const;
