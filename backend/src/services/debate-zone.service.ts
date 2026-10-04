import { prisma } from '../config/database';

/**
 * Zona de Debate. Subforo marcado con
 * `ForumCategory.isDebateZone=true`:
 * - Alias estable por usuario : la plataforma sigue sabiendo la autoría real
 *   (moderación normal aplica), pero de cara a otros usuarios se muestra un alias
 *   en vez del `forumUsername` — evita ligar la postura de alguien en un tema
 *   polémico a su historial/karma normal del foro.
 * - Detector de sesgo/incitación: heurístico sin IA — lista de
 *   palabras/temas gatillo + densidad de mayúsculas. Umbral SIN calibrar con
 *   datos reales a propósito (decisión documentada) — arranca en modo "solo
 *   sugerir", nunca mueve un post/respuesta automáticamente.
 */

// Umbral de sugerencia — sin calibrar con datos reales de producción.
// Punto de partida conservador: cualquier score >= 0.4 dispara la sugerencia.
export const DEBATE_SUGGEST_THRESHOLD = 0.4;

// Lista inicial de temas gatillo — configurable por un admin en una iteración futura
//.
const TRIGGER_WORDS = [
  'política', 'politica', 'presidente', 'gobierno', 'elecciones', 'golpe de estado',
  'religión', 'religion', 'dios', 'iglesia', 'evangélico', 'evangelico', 'católico', 'catolico',
  'aborto', 'comunismo', 'socialismo', 'capitalismo', 'fascista', 'fascismo',
  'mas-ipsp', 'evo morales', 'separatismo',
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // quita tildes para matchear "política"/"politica" por igual
}

/**
 * Heurístico — devuelve un score 0-1, no una decisión binaria. NO usa IA todavía
 * (explícitamente pospuesta).
 */
export function evaluateDebateRisk(text: string): number {
  if (!text || !text.trim()) return 0;

  const normalized = normalize(text);
  const words = normalized.split(/\W+/).filter(Boolean);
  if (!words.length) return 0;

  const triggerHits = TRIGGER_WORDS.filter((tw) => normalized.includes(normalize(tw))).length;
  const triggerScore = Math.min(1, triggerHits / 3); // 3+ palabras gatillo = score máximo por este factor

  const letters = text.replace(/[^a-zA-ZÀ-ÿ]/g, '');
  const capsRatio = letters.length ? (letters.replace(/[a-zà-ÿ]/g, '').length / letters.length) : 0;
  const capsScore = letters.length >= 20 ? Math.min(1, Math.max(0, (capsRatio - 0.3) / 0.5)) : 0;

  // Ponderación: el contenido temático pesa más que el estilo (mayúsculas es una señal débil sola).
  return Math.min(1, triggerScore * 0.8 + capsScore * 0.2);
}

/**
 * Corre el detector sobre un post o respuesta recién creado y, si supera el umbral, marca los
 * campos `debateFlagScore`/`debateSuggestedAt` — nunca mueve el contenido, solo dispara una
 * sugerencia visible para el autor/moderador (ver `10-zona-de-debate.md` §3). No lanza si falla
 * (es una señal adicional, no debe romper la creación del post/respuesta).
 */
export async function flagIfPolemic(kind: 'post' | 'reply', id: number, text: string): Promise<void> {
  try {
    const score = evaluateDebateRisk(text);
    if (score < DEBATE_SUGGEST_THRESHOLD) return;

    const data = { debateFlagScore: score, debateSuggestedAt: new Date() };
    if (kind === 'post') {
      await prisma.forumPost.update({ where: { id }, data });
    } else {
      await prisma.forumReply.update({ where: { id }, data });
    }
  } catch {
    // Señal best-effort — un fallo aquí nunca debe tumbar la creación del contenido.
  }
}

/** Genera un alias legible y no repetido, mismo estilo que `generateUniqueAlias` del foro. */
async function generateUniqueDebateAlias(): Promise<string> {
  const ADJECTIVES = ['Neutral', 'Curioso', 'Prudente', 'Franco', 'Sereno', 'Directo', 'Discreto', 'Firme'];
  const NOUNS = ['Cóndor', 'Kantuta', 'Salar', 'Altiplano', 'Wayra', 'Illimani', 'Titicaca', 'Chaco'];
  let alias: string;
  do {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const suffix = Math.floor(1000 + Math.random() * 9000);
    alias = `${adj}${noun}${suffix}`;
    // eslint-disable-next-line no-await-in-loop
  } while (await prisma.debateZoneAlias.findUnique({ where: { alias } }));
  return alias;
}

/**
 * Devuelve el alias estable de Zona de Debate para un usuario, creándolo si es la primera vez
 * que participa ahí. Idempotente bajo carrera (mismo patrón P2002 + re-fetch que
 * `ensureForumProfile` en forum.service.ts).
 */
export async function ensureDebateZoneAlias(userId: number): Promise<string> {
  const existing = await prisma.debateZoneAlias.findUnique({ where: { userId } });
  if (existing) return existing.alias;

  const alias = await generateUniqueDebateAlias();
  try {
    const created = await prisma.debateZoneAlias.create({ data: { userId, alias } });
    return created.alias;
  } catch (err) {
    const isUniqueViolation = (err as { code?: string }).code === 'P2002';
    if (!isUniqueViolation) throw err;
    const retry = await prisma.debateZoneAlias.findUnique({ where: { userId } });
    if (!retry) throw err;
    return retry.alias;
  }
}

/**
 * Reemplaza `forumUsername` por el alias de Zona de Debate en una lista de autores, cuando la
 * categoría del contenido es `isDebateZone`. Resuelve en batch (una consulta) para no hacer N+1
 * sobre un feed. `authors` viene con `userId` (necesario para resolver el alias) pero el llamador
 * es responsable de NO exponer `userId` en la respuesta final al cliente.
 */
export async function maskAuthorsForDebateZone<
  T extends { forumUsername: string; userId: number } | null
>(authors: T[], isDebateZone: boolean): Promise<Map<number, string>> {
  const aliasByUserId = new Map<number, string>();
  if (!isDebateZone) return aliasByUserId;

  const userIds = [...new Set(authors.filter((a): a is NonNullable<T> => a !== null).map((a) => a.userId))];
  if (!userIds.length) return aliasByUserId;

  const existing = await prisma.debateZoneAlias.findMany({ where: { userId: { in: userIds } } });
  const existingIds = new Set(existing.map((e) => e.userId));
  existing.forEach((e) => aliasByUserId.set(e.userId, e.alias));

  const missing = userIds.filter((id) => !existingIds.has(id));
  for (const userId of missing) {
    // eslint-disable-next-line no-await-in-loop
    const alias = await ensureDebateZoneAlias(userId);
    aliasByUserId.set(userId, alias);
  }

  return aliasByUserId;
}
