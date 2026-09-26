import { z } from 'zod';

// Dominio cerrado de roles de plataforma (coincide con el enum Role de Prisma).
export const ROLES = ['ADMIN', 'SELLER', 'CUSTOMER'] as const;

export const adminUpdateUserSchema = z.object({
  body: z
    .object({
      role: z.enum(ROLES).optional(),
      isActive: z.boolean().optional(),
      isApproved: z.boolean().optional(),
      isVerified: z.boolean().optional(),
      locationVerified: z.boolean().optional(),
    })
    .strict('Campos no permitidos'),
});

export const adminCreateUserSchema = z.object({
  body: z
    .object({
      email: z.string().trim().email('Email inválido').max(200),
      password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(200),
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
      phone: z.string().max(40).optional().nullable(),
      // 'USER' se acepta por compatibilidad y se normaliza a CUSTOMER en el controlador
      role: z.enum(['ADMIN', 'SELLER', 'CUSTOMER', 'USER']).optional(),
      storeName: z.string().max(150).optional().nullable(),
    })
    .strict('Campos no permitidos'),
});

const bannerFields = {
  title: z.string().max(200).nullable().optional(),
  imageDesktop: z.string().min(1).max(2000),
  imageTablet: z.string().max(2000).nullable().optional(),
  imageMobile: z.string().max(2000).nullable().optional(),
  link: z.string().max(2000).nullable().optional(),
  newWindow: z.boolean().optional(),
  backgroundColor: z.string().max(40).nullable().optional(),
  order: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
};

export const updateBannerSchema = z.object({
  body: z.object(bannerFields).partial(),
});

export const updatePromotionSchema = z.object({
  body: z
    .object({
      title: z.string().min(1).max(200),
      description: z.string().max(2000).nullable(),
      discountType: z.enum(['PERCENTAGE', 'FIXED']),
      discountValue: z.coerce.number().nonnegative(),
      minQuantity: z.coerce.number().int().positive().nullable(),
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      isActive: z.boolean(),
    })
    .partial(),
});
