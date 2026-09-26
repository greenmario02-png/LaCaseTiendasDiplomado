import { z } from 'zod';

// ── Verificación profesional ────────────────────────────────────────

export const submitVerificationSchema = z.object({
  params: z.object({ slug: z.string().min(1) }),
  body: z.object({
    answers: z.array(z.object({
      questionId: z.number().int().positive(),
      selectedOptionIndex: z.number().int().min(0),
    })).min(1).max(50),
  }),
});

export const adminCreateFieldSchema = z.object({
  body: z.object({
    slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
    name: z.string().min(2).max(80),
    description: z.string().max(300).optional(),
  }),
});

export const adminUpdateFieldSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    name: z.string().min(2).max(80).optional(),
    description: z.string().max(300).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const adminCreateQuestionSchema = z.object({
  body: z.object({
    fieldId: z.number().int().positive(),
    question: z.string().min(5).max(300),
    options: z.array(z.string().min(1).max(120)).min(2).max(8),
    correctOptionIndex: z.number().int().min(0),
    sortOrder: z.number().int().default(0),
  }),
});

export const adminUpdateQuestionSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    question: z.string().min(5).max(300).optional(),
    options: z.array(z.string().min(1).max(120)).min(2).max(8).optional(),
    correctOptionIndex: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  }),
});

// ── Universidades ────────────────────────────────────────────────────

export const adminCreateUniversitySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    cityId: z.number().int().positive(),
  }),
});

export const adminUpdateUniversitySchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    cityId: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
  }),
});

// ── Comentarios genéricos ────────────────────────────────────────────

export const listCommentsSchema = z.object({
  query: z.object({
    targetType: z.string().min(1).max(40),
    targetId: z.coerce.number().int().positive(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export const createCommentSchema = z.object({
  body: z.object({
    targetType: z.string().min(1).max(40),
    targetId: z.number().int().positive(),
    body: z.string().min(1).max(500),
  }),
});

export const voteCommentSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    type: z.enum(['AGREE', 'FAKE', 'AI_GENERATED']),
  }),
});
