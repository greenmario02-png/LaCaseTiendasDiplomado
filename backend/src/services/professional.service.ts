import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';

// ─── Público ─────────────────────────────────────────────────────────

export async function listFields() {
  return prisma.professionalField.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, slug: true, name: true, description: true },
  });
}

/** Preguntas para rendir el cuestionario — NUNCA incluye `correctOptionIndex`. */
export async function getFieldQuestions(slug: string) {
  const field = await prisma.professionalField.findFirst({ where: { slug, isActive: true } });
  if (!field) throw ApiError.notFound('Área profesional no encontrada.');

  const questions = await prisma.professionalFieldQuestion.findMany({
    where: { fieldId: field.id, isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, question: true, options: true },
  });
  if (questions.length === 0) {
    throw new ApiError(409, 'NO_QUESTIONS', 'Esta área todavía no tiene preguntas de verificación configuradas.');
  }
  return { field: { id: field.id, slug: field.slug, name: field.name }, questions };
}

const PASS_THRESHOLD = 0.7; // 70% de respuestas correctas para aprobar

/** Reintentos: máx 3 intentos por field cada 24 h — evita fuerza bruta contra el cuestionario. */
async function assertCanAttempt(profileId: number, fieldId: number): Promise<void> {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const recentAttempts = await prisma.professionalVerification.count({
    where: { profileId, fieldId, createdAt: { gte: since } },
  });
  if (recentAttempts >= 3) {
    throw new ApiError(429, 'TOO_MANY_ATTEMPTS', 'Ya intentaste esta verificación varias veces hoy. Volvé a intentar en 24 h.');
  }
}

export async function submitVerification(
  profileId: number,
  slug: string,
  answers: { questionId: number; selectedOptionIndex: number }[],
): Promise<{ status: 'PASSED' | 'FAILED'; score: number; totalQuestions: number }> {
  const field = await prisma.professionalField.findFirst({ where: { slug, isActive: true } });
  if (!field) throw ApiError.notFound('Área profesional no encontrada.');

  await assertCanAttempt(profileId, field.id);

  const questions = await prisma.professionalFieldQuestion.findMany({
    where: { fieldId: field.id, isActive: true },
  });
  if (questions.length === 0) {
    throw new ApiError(409, 'NO_QUESTIONS', 'Esta área todavía no tiene preguntas de verificación configuradas.');
  }

  const correctByQuestionId = new Map(questions.map((q) => [q.id, q.correctOptionIndex]));
  let score = 0;
  for (const a of answers) {
    const correctIndex = correctByQuestionId.get(a.questionId);
    if (correctIndex !== undefined && correctIndex === a.selectedOptionIndex) score += 1;
  }

  const status = score / questions.length >= PASS_THRESHOLD ? 'PASSED' : 'FAILED';

  await prisma.professionalVerification.create({
    data: {
      profileId,
      fieldId: field.id,
      status,
      score,
      totalQuestions: questions.length,
      answers: answers as never,
    },
  });

  return { status, score, totalQuestions: questions.length };
}

/** Áreas en las que el perfil ya está verificado (PASSED). */
export async function getMyVerifications(profileId: number) {
  const verifications = await prisma.professionalVerification.findMany({
    where: { profileId, status: 'PASSED' },
    orderBy: { createdAt: 'desc' },
    include: { field: { select: { id: true, slug: true, name: true } } },
  });
  // Solo la más reciente por field
  const seen = new Set<number>();
  return verifications.filter((v) => {
    if (seen.has(v.fieldId)) return false;
    seen.add(v.fieldId);
    return true;
  });
}

// ─── Admin ───────────────────────────────────────────────────────────

export async function adminListFields() {
  return prisma.professionalField.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { questions: true, verifications: true } } },
  });
}

export async function adminCreateField(data: { slug: string; name: string; description?: string }) {
  return prisma.professionalField.create({ data });
}

export async function adminUpdateField(id: number, data: Partial<{ name: string; description: string; isActive: boolean }>) {
  return prisma.professionalField.update({ where: { id }, data });
}

export async function adminCreateQuestion(data: {
  fieldId: number; question: string; options: string[]; correctOptionIndex: number; sortOrder?: number;
}) {
  if (data.correctOptionIndex < 0 || data.correctOptionIndex >= data.options.length) {
    throw ApiError.badRequest('correctOptionIndex debe ser un índice válido de options.');
  }
  return prisma.professionalFieldQuestion.create({ data });
}

export async function adminUpdateQuestion(id: number, data: Partial<{
  question: string; options: string[]; correctOptionIndex: number; isActive: boolean; sortOrder: number;
}>) {
  return prisma.professionalFieldQuestion.update({ where: { id }, data });
}

export async function adminDeleteQuestion(id: number) {
  return prisma.professionalFieldQuestion.update({ where: { id }, data: { isActive: false } });
}
