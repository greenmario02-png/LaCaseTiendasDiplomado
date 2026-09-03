import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    firstName: z.string().min(2, 'El nombre es obligatorio'),
    lastName: z.string().min(2, 'El apellido es obligatorio'),
    phone: z.string().optional(),
    referralCode: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'La contraseña es obligatoria'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token obligatorio'),
  }),
});

export const sellerRegisterSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    firstName: z.string().min(2, 'El nombre es obligatorio'),
    lastName: z.string().min(2, 'El apellido es obligatorio'),
    phone: z.string().min(7, 'El celular de contacto es obligatorio'),
    storeName: z.string().min(2, 'El nombre de la tienda es obligatorio'),
    storeDescription: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
    storeCategory: z.string().min(2, 'Seleccioná la categoría de productos que vendés'),
    country: z.string().min(2, 'Seleccioná el país'),
    locationCity: z.string().min(2, 'La ciudad es obligatoria'),
    locationState: z.string().min(2, 'El departamento/provincia es obligatorio'),
    locationPostalCode: z.string().optional(),
  }),
});
