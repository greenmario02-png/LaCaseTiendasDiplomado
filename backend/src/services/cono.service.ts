import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ensureForumProfile } from './forum.service';

/**
 * memes y torneo (foro): ranking de memes estilo
 * cuantarazon.com (modalidad MEME, voto positivo/nica libre) y torneo de eliminatorias
 * estilo VS con votación diaria (modalidad TOURNAMENT — "peor banco de Bolivia", etc.).
 * 
 */

/**
 * Nota de timezone: `ConoMatch.votingDate` es `@db.Date` y se guarda parseando un string
 * "YYYY-MM-DD" con `new Date(...)`, que JS interpreta como medianoche UTC de esa fecha (no
 * medianoche local). Cualquier comparación contra "hoy"/"mañana" tiene que construirse con
 * ese MISMO criterio (medianoche UTC de la fecha-calendario en Bolivia) — usar la hora local
 * del proceso (`new Date(); .setHours(0,0,0,0)`) es un bug real: según la hora del día y el
 * timezone del proceso, "hoy" y "ayer" pueden terminar siendo la misma fecha calendario y el
 * cierre de votación nunca dispara. `boliviaTodayAsUtcDate()` es la única fuente de verdad acá.
 */
function boliviaTodayAsUtcDate(): Date {
  const boliviaDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' }); // "YYYY-MM-DD"
  return new Date(boliviaDateStr);
}

async function assertHasAnyVerification(profileId: number): Promise<void> {
  const any = await prisma.professionalVerification.findFirst({
    where: { profileId, status: 'PASSED' },
    select: { id: true },
  });
  if (!any) {
    throw new ApiError(
      403,
      'PROFESSIONAL_VERIFICATION_REQUIRED',
      'Necesitás al menos una verificación profesional aprobada para crear un tema/votación.',
    );
  }
}

// ─── Temas ───────────────────────────────────────────────────────────

export async function createTheme(userId: number, data: {
  slug: string; title: string; description?: string; type: 'MEME' | 'TOURNAMENT';
}) {
  const profile = await ensureForumProfile(userId);
  await assertHasAnyVerification(profile.id);
  return prisma.conoTheme.create({
    data: {
      slug: data.slug,
      title: data.title.trim(),
      description: data.description?.trim(),
      type: data.type as never,
      createdById: profile.id,
    },
  });
}

export async function listThemes(type?: 'MEME' | 'TOURNAMENT') {
  return prisma.conoTheme.findMany({
    where: { isActive: true, ...(type ? { type: type as never } : {}) },
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { forumUsername: true } }, _count: { select: { entries: true } } },
  });
}

export async function getThemeBySlug(slug: string) {
  const theme = await prisma.conoTheme.findFirst({
    where: { slug, isActive: true },
    include: { createdBy: { select: { forumUsername: true } } },
  });
  if (!theme) throw ApiError.notFound('Tema no encontrado.');
  return theme;
}

// ─── Entradas (modalidad MEME) ──────────────────────────────────────

export async function createEntry(userId: number, themeId: number, data: { label: string; imageUrl: string }) {
  const profile = await ensureForumProfile(userId);
  const theme = await prisma.conoTheme.findUnique({ where: { id: themeId } });
  if (!theme || !theme.isActive) throw ApiError.notFound('Tema no encontrado.');

  return prisma.conoEntry.create({
    data: {
      themeId,
      submittedById: profile.id,
      label: data.label.trim(),
      imageUrl: data.imageUrl,
    },
  });
}

export async function getEntry(entryId: number) {
  const entry = await prisma.conoEntry.findFirst({
    where: { id: entryId, deletedAt: null },
    include: {
      theme: { select: { id: true, slug: true, title: true, type: true } },
      submittedBy: { select: { forumUsername: true, avatarUrl: true, tag: true } },
    },
  });
  if (!entry) throw ApiError.notFound('Entrada no encontrada.');
  return entry;
}

/**
 * Ranking de un tema. `window` filtra el score a un período (voto neto dentro de la
 * ventana, calculado desde los votos reales — no desde el contador acumulado, que es
 * histórico). Sin window, ordena por el contador acumulado (all-time).
 */
export async function listEntries(themeId: number, window?: 'daily' | 'weekly' | 'monthly') {
  if (!window) {
    return prisma.conoEntry.findMany({
      where: { themeId, deletedAt: null, isHidden: false },
      orderBy: [{ positiveCount: 'desc' }, { createdAt: 'desc' }],
      include: { submittedBy: { select: { forumUsername: true } } },
    });
  }

  const since = new Date();
  if (window === 'daily') since.setDate(since.getDate() - 1);
  else if (window === 'weekly') since.setDate(since.getDate() - 7);
  else since.setMonth(since.getMonth() - 1);

  const votes = await prisma.conoVote.findMany({
    where: { entry: { themeId, deletedAt: null, isHidden: false }, createdAt: { gte: since } },
    select: { entryId: true, value: true },
  });
  const net = new Map<number, number>();
  for (const v of votes) net.set(v.entryId, (net.get(v.entryId) ?? 0) + (v.value === 'POSITIVE' ? 1 : -1));

  const entryIds = [...net.keys()];
  if (entryIds.length === 0) return [];
  const entries = await prisma.conoEntry.findMany({
    where: { id: { in: entryIds } },
    include: { submittedBy: { select: { forumUsername: true } } },
  });
  return entries
    .map((e) => ({ ...e, windowScore: net.get(e.id) ?? 0 }))
    .sort((a, b) => b.windowScore - a.windowScore);
}

async function recountEntryVotes(tx: import('@prisma/client').Prisma.TransactionClient, entryId: number) {
  const [positiveCount, negativeCount] = await Promise.all([
    tx.conoVote.count({ where: { entryId, value: 'POSITIVE' } }),
    tx.conoVote.count({ where: { entryId, value: 'NEGATIVE' } }),
  ]);
  await tx.conoEntry.update({ where: { id: entryId }, data: { positiveCount, negativeCount } });
  return { positiveCount, negativeCount };
}

/**
 * Voto positivo/nica sobre una entrada. Mismo patrón de retry-tras-P2002 que
 * forum.service.ts:voteTarget y comments.service.ts:voteComment (ver esos archivos para
 * el porqué: en Postgres, un unique_violation dentro de una transacción la aborta entera).
 */
export async function voteEntry(userId: number, entryId: number, value: 'POSITIVE' | 'NEGATIVE') {
  const profile = await ensureForumProfile(userId);
  const entry = await prisma.conoEntry.findUniqueOrThrow({ where: { id: entryId } });
  if (entry.submittedById === profile.id) {
    throw new ApiError(403, 'SELF_VOTE', 'No puedes votar tu propia entrada.');
  }

  const runVoteTx = () => prisma.$transaction(async (tx) => {
    const existing = await tx.conoVote.findUnique({
      where: { entryId_profileId: { entryId, profileId: profile.id } },
    });
    if (existing) {
      if (existing.value === value) await tx.conoVote.delete({ where: { id: existing.id } });
      else await tx.conoVote.update({ where: { id: existing.id }, data: { value } });
    } else {
      await tx.conoVote.create({ data: { entryId, profileId: profile.id, value } });
    }
    return recountEntryVotes(tx, entryId);
  });

  try {
    return await runVoteTx();
  } catch (e) {
    if ((e as { code?: string }).code !== 'P2002') throw e;
    return await runVoteTx();
  }
}

// ─── Torneo (modalidad TOURNAMENT) ──────────────────────────────────

export async function createMatch(userId: number, data: {
  themeId: number; round: number; entryAId: number; entryBId: number; votingDate: string;
}) {
  const profile = await ensureForumProfile(userId);
  const theme = await prisma.conoTheme.findUniqueOrThrow({ where: { id: data.themeId } });
  if (theme.createdById !== profile.id) {
    throw new ApiError(403, 'NOT_THEME_CREATOR', 'Solo quien creó el tema puede armar los enfrentamientos.');
  }
  if (data.entryAId === data.entryBId) throw ApiError.badRequest('Un enfrentamiento necesita dos entradas distintas.');

  return prisma.conoMatch.create({
    data: {
      themeId: data.themeId,
      round: data.round,
      entryAId: data.entryAId,
      entryBId: data.entryBId,
      votingDate: new Date(data.votingDate),
      status: 'ACTIVE',
    },
  });
}

export async function listMatches(themeId: number) {
  return prisma.conoMatch.findMany({
    where: { themeId },
    orderBy: [{ round: 'asc' }, { votingDate: 'asc' }],
    include: {
      entryA: { select: { id: true, label: true, imageUrl: true } },
      entryB: { select: { id: true, label: true, imageUrl: true } },
      winner: { select: { id: true, label: true } },
    },
  });
}

async function recountMatchVotes(tx: import('@prisma/client').Prisma.TransactionClient, matchId: number) {
  const [votesA, votesB] = await Promise.all([
    tx.conoMatchVote.count({ where: { matchId, choice: 'A' } }),
    tx.conoMatchVote.count({ where: { matchId, choice: 'B' } }),
  ]);
  await tx.conoMatch.update({ where: { id: matchId }, data: { votesA, votesB } });
  return { votesA, votesB };
}

export async function voteMatch(userId: number, matchId: number, choice: 'A' | 'B') {
  const profile = await ensureForumProfile(userId);
  const match = await prisma.conoMatch.findUniqueOrThrow({ where: { id: matchId } });
  if (match.status !== 'ACTIVE') {
    throw new ApiError(409, 'MATCH_NOT_ACTIVE', 'Este enfrentamiento no está abierto a votación.');
  }

  const runTx = () => prisma.$transaction(async (tx) => {
    const existing = await tx.conoMatchVote.findUnique({
      where: { matchId_profileId: { matchId, profileId: profile.id } },
    });
    if (existing) {
      if (existing.choice === choice) await tx.conoMatchVote.delete({ where: { id: existing.id } });
      else await tx.conoMatchVote.update({ where: { id: existing.id }, data: { choice } });
    } else {
      await tx.conoMatchVote.create({ data: { matchId, profileId: profile.id, choice } });
    }
    return recountMatchVotes(tx, matchId);
  });

  try {
    return await runTx();
  } catch (e) {
    if ((e as { code?: string }).code !== 'P2002') throw e;
    return await runTx();
  }
}

/**
 * Cierra la votación de los enfrentamientos cuyo `votingDate` ya pasó y fija el ganador.
 * Pensado para correr desde un cron diario (ver server.ts — mismo patrón que
 * forum-daily.service.ts). Idempotente: solo toca matches todavía ACTIVE.
 */
export async function closeDailyMatches(): Promise<number> {
  const today = boliviaTodayAsUtcDate();

  const matches = await prisma.conoMatch.findMany({
    where: { status: 'ACTIVE', votingDate: { lt: today } },
  });

  let closed = 0;
  const touchedRounds = new Set<string>(); // `${themeId}:${round}`
  for (const m of matches) {
    const winnerId = m.votesA >= m.votesB ? m.entryAId : m.entryBId;
    await prisma.conoMatch.update({ where: { id: m.id }, data: { status: 'RESOLVED', winnerId } });
    closed++;
    touchedRounds.add(`${m.themeId}:${m.round}`);
  }

  for (const key of touchedRounds) {
    const [themeIdStr, roundStr] = key.split(':');
    await tryAdvanceRound(Number(themeIdStr), Number(roundStr)).catch((e) => {
      logger.warn(`[cono] Error avanzando de ronda (tema ${themeIdStr}, ronda ${roundStr}): ${(e as Error).message}`);
    });
  }

  return closed;
}

/**
 * Si TODOS los enfrentamientos de una ronda ya están RESOLVED, arma automáticamente los
 * de la ronda siguiente emparejando ganadores en el mismo orden en que se crearon los
 * matches de esta ronda (match 1 vs match 2, match 3 vs match 4, ...), con votingDate =
 * mañana. Solo funciona con un número PAR de ganadores (brackets potencia de 2) — con un
 * número impar de ganadores no avanza sola, queda un registro en el log para que el
 * creador del tema arme ese enfrentamiento a mano (caso de "bye" no está automatizado).
 * Idempotente: si la ronda siguiente ya existe, no hace nada.
 */
async function tryAdvanceRound(themeId: number, round: number): Promise<void> {
  const roundMatches = await prisma.conoMatch.findMany({ where: { themeId, round }, orderBy: { id: 'asc' } });
  if (roundMatches.length === 0) return;
  if (roundMatches.some((m) => m.status !== 'RESOLVED')) return; // la ronda no terminó del todo

  const nextRoundExists = await prisma.conoMatch.count({ where: { themeId, round: round + 1 } });
  if (nextRoundExists > 0) return; // ya se armó — no duplicar

  const winners = roundMatches
    .map((m) => m.winnerId)
    .filter((wid): wid is number => wid !== null);

  if (winners.length < 2) return; // ya hay un campeón (1 ganador) o algo inesperado (0)

  if (winners.length % 2 !== 0) {
    logger.warn(
      `[cono] Ronda ${round} del tema ${themeId} terminó con un número impar de ganadores ` +
      `(${winners.length}) — no se arma la ronda siguiente sola, hace falta un bye manual.`,
    );
    return;
  }

  const tomorrow = boliviaTodayAsUtcDate();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  for (let i = 0; i < winners.length; i += 2) {
    await prisma.conoMatch.create({
      data: {
        themeId,
        round: round + 1,
        entryAId: winners[i],
        entryBId: winners[i + 1],
        votingDate: tomorrow,
        status: 'ACTIVE',
      },
    });
  }
  logger.info(`[cono] Ronda ${round + 1} del tema ${themeId} armada automáticamente (${winners.length / 2} enfrentamientos).`);
}
