// Tokens de estilo "Vision UI Dashboard" (Creative Tim) para los paneles
// de administración y vendedor: fondo oscuro con gradientes, glassmorphism
// y acentos violeta → cian. Uso: import { vision } from '../../theme/vision';

export const vision = {
  // Fondo del panel: gradiente nocturno con destellos violeta/cian
  bg: 'linear-gradient(135deg, #0f1535 0%, #141a45 30%, #1d2150 60%, #2a2358 85%, #3b2a66 100%)',
  // Destellos decorativos (radial) superpuestos al fondo
  glowPrimary: 'radial-gradient(circle at 15% 10%, rgba(99,91,255,0.28), transparent 45%)',
  glowCyan: 'radial-gradient(circle at 85% 5%, rgba(106,210,255,0.18), transparent 40%)',
  glowPink: 'radial-gradient(circle at 90% 85%, rgba(255,105,180,0.14), transparent 45%)',
  glowGreen: 'radial-gradient(circle at 5% 90%, rgba(0,209,160,0.14), transparent 40%)',
  glowViolet: 'radial-gradient(circle at 20% 30%, rgba(138,43,226,0.16), transparent 45%)',

  // Gradientes de acento
  gradientPrimary: 'linear-gradient(135deg, #4318ff 0%, #6ad2ff 100%)',
  gradientCyan: 'linear-gradient(135deg, #007cf0 0%, #00dfd8 100%)',
  gradientGreen: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)',
  gradientOrange: 'linear-gradient(135deg, #ff8008 0%, #ffc837 100%)',
  gradientPink: 'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)',
  gradientViolet: 'linear-gradient(135deg, #8a2be2 0%, #4318ff 100%)',

  // Tarjeta glass (fondo translúcido + blur) sobre fondo oscuro
  card: {
    bgcolor: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '18px',
    boxShadow: '0 20px 40px rgba(15, 21, 53, 0.5)',
    color: '#fff',
  } as const,

  cardHover: {
    border: '1px solid rgba(106,210,255,0.45)',
    boxShadow: '0 24px 48px rgba(67, 24, 255, 0.35)',
    transform: 'translateY(-3px)',
  } as const,

  // Textos sobre fondo oscuro
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255,255,255,0.72)',
    muted: 'rgba(255,255,255,0.48)',
  },

  // Chip de estado translúcido
  chipGhost: (color: string) => ({
    bgcolor: `${color}26`,
    color,
    border: `1px solid ${color}55`,
    fontWeight: 700,
  }),

  // Tipografía del panel (fallback Montserrat ya cargada en la app)
  font: "'Nunito', 'Montserrat', 'Segoe UI', sans-serif",
};
