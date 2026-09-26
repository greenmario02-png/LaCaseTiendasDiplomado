import { Prisma } from '@prisma/client';

import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { createNotification } from './notification.service';
import { cityCoordsMap, nearestFirst, withCityFallback, type Coords } from './geo.service';

const JOB_TTL_DAYS = 30;

const PUBLIC_INCLUDE = {
  category: { select: { id: true, name: true, slug: true, icon: true } },
  store: { select: { id: true, storeName: true, storeLogo: true, isVerified: true, locationCity: true } },
} satisfies Prisma.JobPostingInclude;

export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

interface Actor {
  id: number;
  role: string;
  storeOwnerId?: number | null;
}

/** La tienda dueña de la oferta: el dueño si quien publica es del equipo, o el propio vendedor. */
function storeIdOf(actor: Actor): number {
  return actor.storeOwnerId ?? actor.id;
}

/** Solo tiendas verificadas por el admin, aprobadas y activas pueden publicar empleos. */
async function assertStoreCanPost(actor: Actor) {
  const store = await prisma.user.findUnique({
    where: { id: storeIdOf(actor) },
    select: { id: true, role: true, isVerified: true, isApproved: true, storePaused: true, storeName: true },
  });
  if (!store || store.role !== 'SELLER') throw ApiError.forbidden('Solo las tiendas pueden publicar empleos');
  if (!store.isApproved) throw ApiError.forbidden('Tu tienda debe ser aprobada por un administrador');
  if (store.storePaused) throw ApiError.forbidden('Tu tienda está pausada por el administrador');
  if (!store.isVerified) {
    throw ApiError.forbidden('Solo las tiendas verificadas pueden publicar empleos. Solicitá la verificación de tu tienda.');
  }
  return store;
}

async function assertCategory(categoryId: number) {
  const cat = await prisma.jobCategory.findFirst({ where: { id: categoryId, isActive: true } });
  if (!cat) throw ApiError.badRequest('La categoría de trabajo no existe o está inactiva');
}

type JobInput = {
  categoryId: number;
  title: string;
  description: string;
  requirements?: string | null;
  city: string;
  locationState?: string | null;
  payPeriod: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  salaryMin?: number | null;
  salaryMax?: number | null;
  vacancies?: number;
  schedule?: string | null;
  contactPhone?: string | null;
};

// ─── Vendedor ────────────────────────────────────────────────────────────

export async function createJob(actor: Actor, input: JobInput) {
  const store = await assertStoreCanPost(actor);
  await assertCategory(input.categoryId);
  const job = await prisma.jobPosting.create({
    data: { ...input, storeId: store.id, createdById: actor.id, status: 'PENDING' },
    include: PUBLIC_INCLUDE,
  });
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
  await Promise.all(
    admins.map((a) =>
      createNotification({
        userId: a.id,
        type: 'JOB_SUBMITTED',
        title: 'Nuevo empleo por aprobar',
        message: `${store.storeName ?? 'Una tienda'} publicó "${job.title}" y espera tu revisión.`,
        refType: 'job',
        refId: job.id,
      }),
    ),
  );
  return job;
}

async function ownedJob(actor: Actor, id: number) {
  const job = await prisma.jobPosting.findUnique({ where: { id } });
  if (!job || (job.storeId !== storeIdOf(actor) && actor.role !== 'ADMIN')) throw ApiError.notFound('Empleo no encontrado');
  return job;
}

export async function updateJob(actor: Actor, id: number, input: Partial<JobInput>) {
  const job = await ownedJob(actor, id);
  if (job.status === 'CLOSED') throw ApiError.badRequest('El empleo está cerrado y no se puede editar');
  await assertStoreCanPost(actor);
  if (input.categoryId) await assertCategory(input.categoryId);
  // Cualquier edición de una oferta ya revisada vuelve a moderación.
  return prisma.jobPosting.update({
    where: { id },
    data: { ...input, status: 'PENDING', rejectionReason: null, reviewedAt: null, reviewedById: null, publishedAt: null, expiresAt: null },
    include: PUBLIC_INCLUDE,
  });
}

export async function closeJob(actor: Actor, id: number) {
  await ownedJob(actor, id);
  return prisma.jobPosting.update({ where: { id }, data: { status: 'CLOSED' }, include: PUBLIC_INCLUDE });
}

export async function listMyJobs(actor: Actor) {
  const [jobs, store] = await Promise.all([
    prisma.jobPosting.findMany({
      where: { storeId: storeIdOf(actor) },
      orderBy: { createdAt: 'desc' },
      include: { ...PUBLIC_INCLUDE, _count: { select: { applications: { where: { status: { not: 'WITHDRAWN' } } } } } },
    }),
    prisma.user.findUnique({ where: { id: storeIdOf(actor) }, select: { isVerified: true, isApproved: true, storePaused: true } }),
  ]);
  return { jobs, canPost: !!store && store.isVerified && store.isApproved && !store.storePaused, isVerified: !!store?.isVerified };
}

// ─── Público ─────────────────────────────────────────────────────────────

const publicWhere = (): Prisma.JobPostingWhereInput => ({
  status: 'APPROVED',
  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
});

export interface ListFilters {
  q?: string;
  categoryId?: number;
  categorySlug?: string;
  payPeriod?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  city?: string;
  storeId?: number;
  page: number;
  limit: number;
}

export async function listPublicJobs(f: ListFilters, origin?: (Coords & { radiusKm: number }) | null) {
  const where: Prisma.JobPostingWhereInput = {
    AND: [
      publicWhere(),
      f.categoryId ? { categoryId: f.categoryId } : {},
      f.categorySlug ? { category: { slug: f.categorySlug } } : {},
      f.payPeriod ? { payPeriod: f.payPeriod } : {},
      f.city ? { city: { contains: f.city, mode: 'insensitive' } } : {},
      f.storeId ? { storeId: f.storeId } : {},
      f.q ? { OR: [{ title: { contains: f.q, mode: 'insensitive' } }, { description: { contains: f.q, mode: 'insensitive' } }] } : {},
    ],
  };

  if (origin) {
    const all = await prisma.jobPosting.findMany({ where, orderBy: { publishedAt: 'desc' }, take: 300, include: PUBLIC_INCLUDE });
    const mapa = await cityCoordsMap();
    const near = nearestFirst(all.map((j) => withCityFallback(j, j.city, mapa)), origin, origin.radiusKm);
    const start = (f.page - 1) * f.limit;
    return { items: near.slice(start, start + f.limit), total: near.length };
  }

  const [items, total] = await Promise.all([
    prisma.jobPosting.findMany({ where, orderBy: { publishedAt: 'desc' }, skip: (f.page - 1) * f.limit, take: f.limit, include: PUBLIC_INCLUDE }),
    prisma.jobPosting.count({ where }),
  ]);
  return { items, total };
}

export async function getPublicJob(id: number) {
  const job = await prisma.jobPosting.findFirst({ where: { id, ...publicWhere() }, include: PUBLIC_INCLUDE });
  if (!job) throw ApiError.notFound('Empleo no encontrado');
  return job;
}

export const listCategories = () =>
  prisma.jobCategory.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });

// ─── Admin ───────────────────────────────────────────────────────────────

export async function listAdminJobs(status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLOSED') {
  return prisma.jobPosting.findMany({
    where: status ? { status } : {},
    orderBy: [{ createdAt: 'desc' }],
    include: { ...PUBLIC_INCLUDE, reviewedBy: { select: { id: true, firstName: true, lastName: true } } },
  });
}

export async function moderateJob(adminId: number, id: number, action: 'approve' | 'reject', reason?: string) {
  const job = await prisma.jobPosting.findUnique({ where: { id } });
  if (!job) throw ApiError.notFound('Empleo no encontrado');
  if (job.status === 'CLOSED') throw ApiError.badRequest('El empleo está cerrado');
  const now = new Date();
  const updated = await prisma.jobPosting.update({
    where: { id },
    data:
      action === 'approve'
        ? { status: 'APPROVED', rejectionReason: null, reviewedById: adminId, reviewedAt: now, publishedAt: now, expiresAt: new Date(now.getTime() + JOB_TTL_DAYS * 86400000) }
        : { status: 'REJECTED', rejectionReason: reason ?? null, reviewedById: adminId, reviewedAt: now, publishedAt: null, expiresAt: null },
    include: PUBLIC_INCLUDE,
  });
  await createNotification({
    userId: job.storeId,
    type: action === 'approve' ? 'JOB_APPROVED' : 'JOB_REJECTED',
    title: action === 'approve' ? 'Tu empleo fue aprobado' : 'Tu empleo fue rechazado',
    message: action === 'approve' ? `"${job.title}" ya está publicado en Empleos por ${JOB_TTL_DAYS} días.` : `"${job.title}" no fue aprobado: ${reason}`,
    refType: 'job',
    refId: job.id,
  });
  return updated;
}

export const listAllCategories = () => prisma.jobCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });

export async function upsertCategory(id: number | null, input: { name: string; icon?: string | null; sortOrder?: number; isActive?: boolean }) {
  const data = { name: input.name, slug: slugify(input.name), icon: input.icon ?? null, sortOrder: input.sortOrder ?? 0, ...(input.isActive !== undefined && { isActive: input.isActive }) };
  try {
    return id ? await prisma.jobCategory.update({ where: { id }, data }) : await prisma.jobCategory.create({ data });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') throw ApiError.badRequest('Ya existe una categoría con ese nombre');
    throw e;
  }
}

export async function deleteCategory(id: number) {
  const used = await prisma.jobPosting.count({ where: { categoryId: id } });
  if (used > 0) {
    // Con ofertas asociadas se desactiva en vez de borrar, para no romper el historial.
    return prisma.jobCategory.update({ where: { id }, data: { isActive: false } });
  }
  return prisma.jobCategory.delete({ where: { id } });
}
