import { z } from 'zod';

const text = (max = 500) => z.string().max(max).nullable().optional();
// Campos numéricos que el formulario puede enviar como número, texto numérico, vacío o null
const numeric = z
  .union([z.number(), z.string().max(30).refine((v) => v === '' || Number.isFinite(Number(v)), 'Valor numérico inválido'), z.null()])
  .optional();

// Lista blanca de campos editables del perfil de tienda; el resto se descarta.
export const updateSellerProfileSchema = z.object({
  body: z.object({
    storeName: text(150),
    storeDescription: text(5000),
    storeLogo: text(2000),
    storeBanner: text(2000),
    profileImage: text(2000),
    bio: text(2000),
    storeCategory: text(150),
    country: text(100),
    locationCity: text(100),
    locationState: text(100),
    locationPostalCode: text(20),
    latitude: numeric,
    longitude: numeric,
    youtubeUrl: text(2000),
    tiktokUrl: text(2000),
    instagramUrl: text(2000),
    facebookUrl: text(2000),
    whatsappPhone: text(40),
    phone: text(40),
    paymentQrUrl: text(2000),
    freeShippingThreshold: numeric,
  }),
});
