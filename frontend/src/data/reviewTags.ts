// Etiquetas de reseña sobre vendedores (pares positivo/negativo votables).
// Copia del backend (public.controller.ts REVIEW_TAG_PAIRS) — mantener sincronizado.
export const REVIEW_TAG_PAIRS = [
  { positive: 'Recomendar', negative: 'No recomendar' },
  { positive: 'Cumplió', negative: 'No cumplió' },
  { positive: 'Verificado', negative: 'No verificado' },
  { positive: 'Confiable', negative: 'No confiable' },
  { positive: 'Todo correcto', negative: 'Hubo un problema' },
  { positive: 'Llegó a tiempo', negative: 'Llegó tarde' },
  { positive: 'Trato correcto', negative: 'Trato problemático' },
  { positive: 'Seguro', negative: 'No me sentí seguro' },
  { positive: 'Contrataría otra vez', negative: 'No contrataría otra vez' },
  { positive: 'Confirmado', negative: 'Reportado' },
  { positive: 'Lo avalo', negative: 'No lo avalo' },
  { positive: 'Experiencia positiva', negative: 'Experiencia negativa' },
] as const;

export type ReviewTagPair = (typeof REVIEW_TAG_PAIRS)[number];
export type ReviewTag = ReviewTagPair['positive'] | ReviewTagPair['negative'];

export const ALL_REVIEW_TAGS: string[] = REVIEW_TAG_PAIRS.flatMap((p) => [p.positive, p.negative]);
