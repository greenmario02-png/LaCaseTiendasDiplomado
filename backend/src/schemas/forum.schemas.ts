import { z } from 'zod';

// ── Post ────────────────────────────────────────────────────────────

export const createPostSchema = z.object({
  body: z.object({
    title:      z.string().min(10).max(200),
    body:       z.string().min(20).max(5000),
    categoryId: z.number().int().positive(),
    city:       z.string().min(2).max(80),
    type:       z.enum(['GENERAL','PRECIO','EXISTENCIA','EMPLEO','ALQUILER','ANTICROTICO','DIRECCION']).default('GENERAL'),
    tags:       z.array(z.string().max(30)).max(5).default([]),
    images:     z.array(z.string().min(1).max(500)).max(4).default([]),
  }),
});

export const updatePostSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body:   z.object({
    title: z.string().min(10).max(200).optional(),
    body:  z.string().min(20).max(5000).optional(),
    tags:  z.array(z.string().max(30)).max(5).optional(),
  }),
});

export const listPostsSchema = z.object({
  query: z.object({
    page:     z.coerce.number().int().min(1).default(1),
    limit:    z.coerce.number().int().min(1).max(50).default(20),
    mode:     z.enum(['RECIENTE','POPULAR','SIN_RESPUESTA','MI_CIUDAD']).default('RECIENTE'),
    city:     z.string().optional(),
    category: z.string().optional(),
    q:        z.string().max(100).optional(),
    type:     z.string().optional(),
  }),
});

// ── Reply ───────────────────────────────────────────────────────────

export const createReplySchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body:   z.object({
    body: z.string().min(10).max(3000),
  }),
});

// ── Vote ────────────────────────────────────────────────────────────

export const voteSchema = z.object({
  body: z.object({
    value: z.literal(1).or(z.literal(-1)),
  }),
});

// ── Redeem ──────────────────────────────────────────────────────────

export const redeemKarmaSchema = z.object({
  body: z.object({
    karmaAmount: z.number().int().min(100).multipleOf(100),
  }),
});

// ── Profile ─────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  body: z.object({
    forumUsername: z.string()
      .min(3).max(30)
      .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guión bajo')
      .optional(),
    city:          z.string().min(2).max(80).optional(),
    signatureText: z.string().max(200).optional(),
    twitterUrl:    z.string().url().optional().or(z.literal('')),
    linkedinUrl:   z.string().url().optional().or(z.literal('')),
    whatsappPhone: z.string().max(20).optional().or(z.literal('')),
    websiteUrl:    z.string().url().optional().or(z.literal('')),
  }),
});

// ── Report ──────────────────────────────────────────────────────────

export const reportSchema = z.object({
  body: z.object({
    reason: z.enum(['SPAM','CONTENIDO_INAPROPIADO','DESINFORMACION','CONTENIDO_FALSO','CONTENIDO_IA','ESTAFA','DATOS_PERSONALES','PUBLICIDAD_ENCUBIERTA','ES_UN_BOT','ACOSO','OTRO']),
    detail: z.string().max(500).optional(),
  }),
});

// ── Reputation ──────────────────────────────────────────────────────

export const reputationSchema = z.object({
  params: z.object({ username: z.string() }),
  body: z.object({
    value:   z.literal(1).or(z.literal(-1)),
    comment: z.string().max(300).optional(),
  }),
});

// ── Category (admin) ────────────────────────────────────────────────

export const categorySchema = z.object({
  body: z.object({
    slug:        z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
    name:        z.string().min(2).max(80),
    description: z.string().max(300).optional(),
    icon:        z.string().emoji().default('💬'),
    color:       z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#FF6B35'),
    parentId:    z.number().int().positive().optional(),
    sortOrder:   z.number().int().default(0),
  }),
});

// Geolocalización del foro (09-spec G2)
export const geoSchema = z.object({
  body: z.object({
    cityId:    z.number().int().positive().optional(),
    latitude:  z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radioKm:   z.number().int().min(1).max(500).optional(),
  }),
});

export const resolveGeoSchema = z.object({
  body: z.object({
    latitude:  z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

// Reglas de uso y gestión de ciudades del foro (09-spec G3)
export const ruleSchema = z.object({
  body: z.object({
    title:     z.string().min(2).max(120),
    body:      z.string().min(2).max(2000),
    sortOrder: z.number().int().default(0),
  }),
});

export const updateRuleSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body:   z.object({
    title:     z.string().min(2).max(120).optional(),
    body:      z.string().min(2).max(2000).optional(),
    sortOrder: z.number().int().optional(),
    isActive:  z.boolean().optional(),
  }),
});

export const citySchema = z.object({
  body: z.object({
    name:       z.string().min(2).max(80),
    department: z.string().min(2).max(80),
    latitude:   z.number().min(-90).max(90),
    longitude:  z.number().min(-180).max(180),
    radiusKm:   z.number().int().min(1).max(500).default(30),
  }),
});

export const updateCitySchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body:   z.object({
    name:       z.string().min(2).max(80).optional(),
    department: z.string().min(2).max(80).optional(),
    latitude:   z.number().min(-90).max(90).optional(),
    longitude:  z.number().min(-180).max(180).optional(),
    radiusKm:   z.number().int().min(1).max(500).optional(),
    isActive:   z.boolean().optional(),
    sortOrder:  z.number().int().optional(),
  }),
});

export const cityCategoriesSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body:   z.object({ categoryIds: z.array(z.number().int().positive()) }),
});
