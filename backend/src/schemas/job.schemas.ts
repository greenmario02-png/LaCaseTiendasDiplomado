import { z } from 'zod';

const payPeriod = z.enum(['DAILY', 'WEEKLY', 'MONTHLY'], { errorMap: () => ({ message: 'El período de pago debe ser DAILY, WEEKLY o MONTHLY' }) });
const money = z.coerce.number().nonnegative('El monto no puede ser negativo').max(99_999_999);

const jobBody = z.object({
  categoryId: z.coerce.number().int().positive('Elige una categoría de trabajo'),
  title: z.string().trim().min(5, 'El título debe tener al menos 5 caracteres').max(120),
  description: z.string().trim().min(20, 'Describe el puesto con al menos 20 caracteres').max(5000),
  requirements: z.string().trim().max(3000).optional().nullable(),
  city: z.string().trim().min(2, 'La ciudad es obligatoria').max(80),
  locationState: z.string().trim().max(80).optional().nullable(),
  payPeriod,
  salaryMin: money.optional().nullable(),
  salaryMax: money.optional().nullable(),
  vacancies: z.coerce.number().int().min(1).max(500).default(1),
  schedule: z.string().trim().max(120).optional().nullable(),
  contactPhone: z.string().trim().max(30).optional().nullable(),
});

const salaryOrder = (v: { salaryMin?: number | null; salaryMax?: number | null }) =>
  v.salaryMin == null || v.salaryMax == null || v.salaryMin <= v.salaryMax;

export const createJobSchema = z.object({
  body: jobBody.refine(salaryOrder, { message: 'El sueldo mínimo no puede superar al máximo', path: ['salaryMin'] }),
});

export const updateJobSchema = z.object({
  body: jobBody.partial().refine(salaryOrder, { message: 'El sueldo mínimo no puede superar al máximo', path: ['salaryMin'] }),
});

export const listJobsSchema = z.object({
  query: z.object({
    q: z.string().trim().max(80).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    categorySlug: z.string().trim().max(80).optional(),
    payPeriod: payPeriod.optional(),
    city: z.string().trim().max(80).optional(),
    storeId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    radiusKm: z.coerce.number().optional(),
  }),
});

export const moderateJobSchema = z.object({
  body: z
    .object({
      action: z.enum(['approve', 'reject']),
      reason: z.string().trim().max(500).optional(),
    })
    .refine((v) => v.action === 'approve' || (v.reason && v.reason.length >= 5), {
      message: 'Indica el motivo del rechazo (mínimo 5 caracteres)',
      path: ['reason'],
    }),
});

export const jobCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(60),
    icon: z.string().trim().max(10).optional().nullable(),
    sortOrder: z.coerce.number().int().min(0).max(999).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const applyJobSchema = z.object({
  body: z.object({
    message: z.string().trim().min(10, 'Cuenta brevemente por qué eres buen candidato (mínimo 10 caracteres)').max(2000),
    contactPhone: z.string().trim().min(6, 'Indica un teléfono de contacto').max(30),
    expectedSalary: z.coerce.number().nonnegative().max(99_999_999).optional().nullable(),
    resumeUrl: z.string().trim().url('El enlace a tu CV no es válido').max(500).optional().nullable().or(z.literal('')),
  }),
});

export const applicationStatusSchema = z.object({
  body: z.object({
    status: z.enum(['VIEWED', 'SHORTLISTED', 'REJECTED', 'HIRED']),
    note: z.string().trim().max(500).optional().nullable(),
  }),
});

