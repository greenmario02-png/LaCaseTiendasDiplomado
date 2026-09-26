import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

import { prisma } from '../config/database';
import { env } from '../config/env';
import { CV_DIR } from '../middlewares/upload';
import { ApiError } from '../utils/errors';
import { createNotification } from './notification.service';

interface Actor {
  id: number;
  role: string;
  storeOwnerId?: number | null;
}

const storeIdOf = (a: Actor) => a.storeOwnerId ?? a.id;

// ─── CV ──────────────────────────────────────────────────────────────────

const CV_LINK_TTL = '5m';

/** Verifica la firma real del archivo (no solo la extensión): PDF, DOC (OLE2) o DOCX (ZIP). */
function looksLikeCv(filePath: string, ext: string): boolean {
  const fd = fs.openSync(filePath, 'r');
  try {
    const head = Buffer.alloc(8);
    fs.readSync(fd, head, 0, 8, 0);
    if (ext === '.pdf') return head.subarray(0, 5).toString('latin1') === '%PDF-';
    if (ext === '.docx') return head[0] === 0x50 && head[1] === 0x4b;
    if (ext === '.doc') return head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0;
    return false;
  } finally {
    fs.closeSync(fd);
  }
}

const removeFile = (name?: string | null) => {
  if (!name) return;
  fs.promises.unlink(path.join(CV_DIR, path.basename(name))).catch(() => undefined);
};

/** Nunca se expone la ruta interna del archivo: solo si hay CV y su nombre original. */
export function toPublicApplication<T extends { cvFile?: string | null }>(a: T) {
  const { cvFile, ...rest } = a;
  return { ...rest, hasCv: !!cvFile };
}

const JOB_SUMMARY = {
  id: true,
  title: true,
  city: true,
  payPeriod: true,
  salaryMin: true,
  salaryMax: true,
  status: true,
  expiresAt: true,
  category: { select: { id: true, name: true, icon: true } },
  store: { select: { id: true, storeName: true, storeLogo: true, isVerified: true } },
} as const;

// ─── Candidato ───────────────────────────────────────────────────────────

export async function applyToJob(
  actor: Actor,
  jobId: number,
  input: { message: string; contactPhone: string; expectedSalary?: number | null; resumeUrl?: string | null },
  file?: Express.Multer.File,
) {
  if (file && !looksLikeCv(file.path, path.extname(file.originalname).toLowerCase())) {
    removeFile(file.filename);
    throw ApiError.badRequest('El archivo no parece un PDF, DOC o DOCX válido');
  }
  try {
    return await applyToJobInner(actor, jobId, input, file);
  } catch (e) {
    if (file) removeFile(file.filename);
    throw e;
  }
}

async function applyToJobInner(
  actor: Actor,
  jobId: number,
  input: { message: string; contactPhone: string; expectedSalary?: number | null; resumeUrl?: string | null },
  file?: Express.Multer.File,
) {
  const job = await prisma.jobPosting.findFirst({
    where: { id: jobId, status: 'APPROVED', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: { id: true, title: true, storeId: true },
  });
  if (!job) throw ApiError.notFound('Empleo no encontrado o ya no está disponible');
  if (job.storeId === storeIdOf(actor)) throw ApiError.forbidden('No podés postularte a un empleo de tu propia tienda');

  const existing = await prisma.jobApplication.findUnique({ where: { jobId_applicantId: { jobId, applicantId: actor.id } } });
  if (existing && existing.status !== 'WITHDRAWN') throw ApiError.badRequest('Ya te postulaste a este empleo');

  const data = {
    message: input.message,
    contactPhone: input.contactPhone,
    expectedSalary: input.expectedSalary ?? null,
    resumeUrl: input.resumeUrl || null,
    ...(file ? { cvFile: file.filename, cvName: file.originalname.slice(0, 120) } : {}),
    status: 'RECEIVED' as const,
    storeNote: null,
    reviewedAt: null,
  };
  // Si retiró una postulación anterior, se reactiva en lugar de duplicarla (unique jobId+applicantId).
  if (existing && file) removeFile(existing.cvFile);
  const application = existing
    ? await prisma.jobApplication.update({ where: { id: existing.id }, data })
    : await prisma.jobApplication.create({ data: { ...data, jobId, applicantId: actor.id } });

  const applicant = await prisma.user.findUnique({ where: { id: actor.id }, select: { firstName: true, lastName: true } });
  await createNotification({
    userId: job.storeId,
    type: 'JOB_APPLICATION_RECEIVED',
    title: 'Nueva postulación',
    message: `${applicant?.firstName ?? 'Un candidato'} ${applicant?.lastName ?? ''} se postuló a "${job.title}".`.replace(/\s+/g, ' '),
    refType: 'job',
    refId: job.id,
  });
  return toPublicApplication(application);
}

export async function withdrawApplication(actor: Actor, jobId: number) {
  const app = await prisma.jobApplication.findUnique({ where: { jobId_applicantId: { jobId, applicantId: actor.id } } });
  if (!app || app.status === 'WITHDRAWN') throw ApiError.notFound('No tenés una postulación activa a este empleo');
  if (app.status === 'HIRED') throw ApiError.badRequest('Ya fuiste contratado: no se puede retirar la postulación');
  return prisma.jobApplication.update({ where: { id: app.id }, data: { status: 'WITHDRAWN' } });
}

export async function listMyApplications(actor: Actor) {
  const rows = await prisma.jobApplication.findMany({
    where: { applicantId: actor.id },
    orderBy: { createdAt: 'desc' },
    include: { job: { select: JOB_SUMMARY } },
  });
  return rows.map(toPublicApplication);
}

/** Estado de la postulación del usuario a un empleo (para mostrar "Ya te postulaste"). */
export async function myApplicationFor(userId: number, jobId: number) {
  return prisma.jobApplication.findUnique({
    where: { jobId_applicantId: { jobId, applicantId: userId } },
    select: { id: true, status: true, createdAt: true },
  });
}

// ─── Tienda ──────────────────────────────────────────────────────────────

async function assertStoreJob(actor: Actor, jobId: number) {
  const job = await prisma.jobPosting.findUnique({ where: { id: jobId }, select: { id: true, title: true, storeId: true } });
  if (!job || (job.storeId !== storeIdOf(actor) && actor.role !== 'ADMIN')) throw ApiError.notFound('Empleo no encontrado');
  return job;
}

export async function listApplicationsForJob(actor: Actor, jobId: number) {
  await assertStoreJob(actor, jobId);
  const rows = await prisma.jobApplication.findMany({
    where: { jobId, status: { not: 'WITHDRAWN' } },
    orderBy: [{ createdAt: 'desc' }],
    include: { applicant: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, profileImage: true } } },
  });
  return rows.map(toPublicApplication);
}

const STATUS_LABEL: Record<string, string> = {
  VIEWED: 'fue vista',
  SHORTLISTED: 'fue preseleccionada',
  REJECTED: 'no fue seleccionada',
  HIRED: '¡te contrataron!',
};

export async function updateApplicationStatus(
  actor: Actor,
  applicationId: number,
  status: 'VIEWED' | 'SHORTLISTED' | 'REJECTED' | 'HIRED',
  note?: string | null,
) {
  const app = await prisma.jobApplication.findUnique({ where: { id: applicationId }, include: { job: { select: { id: true, title: true, storeId: true } } } });
  if (!app || (app.job.storeId !== storeIdOf(actor) && actor.role !== 'ADMIN')) throw ApiError.notFound('Postulación no encontrada');
  if (app.status === 'WITHDRAWN') throw ApiError.badRequest('El candidato retiró su postulación');
  const updated = await prisma.jobApplication.update({
    where: { id: applicationId },
    data: { status, storeNote: note ?? app.storeNote, reviewedAt: new Date() },
  });
  await createNotification({
    userId: app.applicantId,
    type: 'JOB_APPLICATION_UPDATED',
    title: 'Novedades de tu postulación',
    message: `Tu postulación a "${app.job.title}" ${STATUS_LABEL[status]}.${note ? ` Mensaje de la tienda: ${note}` : ''}`,
    refType: 'job',
    refId: app.job.id,
  });
  return updated;
}

// ─── Descarga segura del CV ──────────────────────────────────────────────

/** Enlace de corta duración (5 min) para bajar el CV; solo lo obtiene el candidato o la tienda dueña del empleo. */
export async function createCvLink(actor: Actor, applicationId: number) {
  const app = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: { job: { select: { storeId: true } } },
  });
  const allowed = app && (app.applicantId === actor.id || app.job.storeId === storeIdOf(actor) || actor.role === 'ADMIN');
  if (!app || !allowed) throw ApiError.notFound('Postulación no encontrada');
  if (!app.cvFile) throw ApiError.notFound('Esta postulación no tiene un CV adjunto');
  const token = jwt.sign({ purpose: 'cv', appId: app.id, uid: actor.id }, env.JWT_SECRET, { expiresIn: CV_LINK_TTL });
  return { path: `/api/jobs/cv/download?token=${token}`, name: app.cvName ?? 'cv', expiresInSeconds: 300 };
}

export async function resolveCvDownload(token: string) {
  let payload: { purpose?: string; appId?: number };
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as typeof payload;
  } catch {
    throw ApiError.unauthorized('El enlace de descarga venció o no es válido');
  }
  if (payload.purpose !== 'cv' || !payload.appId) throw ApiError.unauthorized('El enlace de descarga no es válido');
  const app = await prisma.jobApplication.findUnique({ where: { id: payload.appId }, select: { cvFile: true, cvName: true } });
  if (!app?.cvFile) throw ApiError.notFound('Archivo no disponible');
  const filePath = path.join(CV_DIR, path.basename(app.cvFile));
  if (!fs.existsSync(filePath)) throw ApiError.notFound('Archivo no disponible');
  return { filePath, name: app.cvName ?? path.basename(app.cvFile) };
}

// ─── Administración ──────────────────────────────────────────────────────

const APPLICATION_STATUSES = ['RECEIVED', 'VIEWED', 'SHORTLISTED', 'REJECTED', 'HIRED', 'WITHDRAWN'] as const;
type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Vista global (solo lectura) de todas las postulaciones, con filtros, búsqueda y conteo por estado. */
export async function listAllApplications(q: { status?: string; jobId?: number; q?: string; page?: number; limit?: number }) {
  const page = Math.max(1, q.page ?? 1);
  const limit = Math.min(50, Math.max(1, q.limit ?? 20));
  const status = APPLICATION_STATUSES.includes(q.status as ApplicationStatus) ? (q.status as ApplicationStatus) : undefined;
  const term = q.q?.trim();
  const base = {
    ...(q.jobId ? { jobId: q.jobId } : {}),
    ...(term
      ? {
          OR: [
            { applicant: { firstName: { contains: term, mode: 'insensitive' as const } } },
            { applicant: { lastName: { contains: term, mode: 'insensitive' as const } } },
            { applicant: { email: { contains: term, mode: 'insensitive' as const } } },
            { job: { title: { contains: term, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };
  const where = { ...base, ...(status ? { status } : {}) };
  const [rows, total, grouped] = await Promise.all([
    prisma.jobApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        applicant: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        job: { select: { id: true, title: true, store: { select: { id: true, firstName: true, lastName: true, storeName: true } } } },
      },
    }),
    prisma.jobApplication.count({ where }),
    prisma.jobApplication.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
  ]);
  const stats: Record<string, number> = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0]));
  for (const g of grouped) stats[g.status] = g._count._all;
  return { items: rows.map(toPublicApplication), total, page, limit, stats };
}
