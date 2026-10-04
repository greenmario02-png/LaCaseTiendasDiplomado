import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';

/**
 * Gates de acceso a subforos especiales:
 * - Subforo profesional (`ForumCategory.requiresFieldId`): SOLO bloquea publicar
 *   (post/reply) — leer queda abierto a todos.
 * - Subforo de universidad (`ForumCategory.universityId`): bloquea VER la actividad,
 *   no solo publicar — un usuario de otra ciudad no puede entrar salvo que ya tenga
 *   actividad previa ahí (grandfather).
 *
 * Las categorías hijas (ej. "Debates" bajo "Informática") heredan el gate de su padre.
 */

export interface CategoryGates {
  requiresFieldId: number | null;
  universityId: number | null;
}

export async function resolveCategoryGates(categoryId: number): Promise<CategoryGates> {
  const category = await prisma.forumCategory.findUnique({
    where: { id: categoryId },
    select: {
      requiresFieldId: true,
      universityId: true,
      parent: { select: { requiresFieldId: true, universityId: true } },
    },
  });
  if (!category) throw ApiError.notFound('Categoría no encontrada.');
  return {
    requiresFieldId: category.requiresFieldId ?? category.parent?.requiresFieldId ?? null,
    universityId: category.universityId ?? category.parent?.universityId ?? null,
  };
}

/** Lanza 403 si el perfil no tiene una ProfessionalVerification PASSED para ese field. */
export async function assertProfessionalVerified(profileId: number, fieldId: number): Promise<void> {
  const passed = await prisma.professionalVerification.findFirst({
    where: { profileId, fieldId, status: 'PASSED' },
    select: { id: true },
  });
  if (!passed) {
    throw new ApiError(
      403,
      'PROFESSIONAL_VERIFICATION_REQUIRED',
      'Necesitas aprobar la verificación de esta área profesional para publicar aquí.',
    );
  }
}

/**
 * true si el perfil puede VER un subforo de universidad: es de la misma ciudad de la
 * universidad, o ya tiene actividad previa (post/reply) en alguna categoría de esa
 * universidad (grandfather — ej. se mudó de ciudad pero ya participaba ahí).
 * Un viewer anónimo (sin profileId) nunca puede ver subforos de universidad.
 */
export async function canAccessUniversity(
  viewerProfileId: number | undefined,
  universityId: number,
): Promise<boolean> {
  if (!viewerProfileId) return false;

  const [profile, university] = await Promise.all([
    prisma.forumProfile.findUnique({ where: { id: viewerProfileId }, select: { cityId: true } }),
    prisma.university.findUnique({ where: { id: universityId }, select: { cityId: true } }),
  ]);
  if (profile?.cityId && university?.cityId && profile.cityId === university.cityId) return true;

  const hasPostActivity = await prisma.forumPost.findFirst({
    where: { authorId: viewerProfileId, category: { universityId } },
    select: { id: true },
  });
  if (hasPostActivity) return true;

  const hasReplyActivity = await prisma.forumReply.findFirst({
    where: { authorId: viewerProfileId, post: { category: { universityId } } },
    select: { id: true },
  });
  return !!hasReplyActivity;
}

/** Lanza 403 si el perfil no puede ver este subforo de universidad. */
export async function assertCanAccessUniversity(
  viewerProfileId: number | undefined,
  universityId: number,
): Promise<void> {
  const allowed = await canAccessUniversity(viewerProfileId, universityId);
  if (!allowed) {
    throw new ApiError(
      403,
      'UNIVERSITY_FORUM_RESTRICTED',
      'Este subforo es exclusivo de la comunidad universitaria de esa ciudad.',
    );
  }
}
