import { z } from 'zod';

export const createConversationSchema = z.object({
  body: z.object({
    sellerId: z.number().int().positive('sellerId obligatorio'),
    productId: z.number().int().positive().optional(),
  }),
});

const id = z.coerce.number().int().positive().max(2_147_483_647);
/** Id del cliente para envio optimista: corto y sin caracteres raros (se guarda y se devuelve tal cual). */
const clientId = z.string().trim().regex(/^[A-Za-z0-9_-]{8,64}$/, 'clientId inválido').optional().nullable();
const optionalId = z.preprocess((v) => (v === '' || v === undefined || v === null || v === 'null' ? undefined : v), id.optional());

export const sendMessageSchema = z.object({
  params: z.object({ id }),
  body: z.object({
    content: z.string().min(1, 'Escribe un mensaje').max(2000, 'Mensaje demasiado largo'),
    clientId,
    replyToId: id.optional().nullable(),
  }),
});

export const getConversationSchema = z.object({
  params: z.object({ id }),
  query: z.object({
    before: optionalId,
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }).passthrough(),
});

export const conversationIdSchema = z.object({ params: z.object({ id }) });

/** Campos de texto del multipart de adjuntos (llegan como string). */
export const attachmentSchema = z.object({
  params: z.object({ id }),
  body: z.object({
    kind: z.enum(['IMAGE', 'FILE', 'PAYMENT_PROOF']).optional(),
    caption: z.string().max(1000, 'Texto demasiado largo').optional().nullable(),
    clientId,
    replyToId: optionalId,
    orderId: optionalId,
  }),
});

export const paymentQrSchema = z.object({
  params: z.object({ id }),
  body: z.object({ clientId }).default({}),
});

export const deleteMessageSchema = z.object({
  params: z.object({ id, messageId: id }),
  query: z.object({ scope: z.enum(['me', 'all']).default('me') }).passthrough(),
});

export const muteSchema = z.object({
  params: z.object({ id }),
  body: z.object({ muted: z.boolean() }),
});

export const userIdSchema = z.object({ params: z.object({ userId: id }) });

export const reportSchema = z.object({
  params: z.object({ id }),
  body: z.object({
    reason: z.enum(['SPAM', 'FRAUD', 'ABUSE', 'INAPPROPRIATE', 'OTHER']),
    details: z.string().trim().max(500).optional().nullable(),
    block: z.boolean().optional(),
  }),
});

export const settingsSchema = z.object({
  body: z.object({ hideLastSeen: z.boolean() }),
});

export const orderOpenSchema = z.object({ params: z.object({ orderId: id }) });

export const fileSchema = z.object({
  params: z.object({ attachmentId: id }),
  query: z.object({ u: id, e: id, s: z.string().regex(/^[A-Za-z0-9_-]{20,100}$/) }).passthrough(),
});

export const reportListSchema = z.object({
  query: z.object({
    status: z.enum(['OPEN', 'REVIEWED', 'DISMISSED']).optional(),
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }).passthrough(),
});

export const reportIdSchema = z.object({
  params: z.object({ reportId: id }),
  query: z.object({ before: optionalId }).passthrough(),
});

export const resolveReportSchema = z.object({
  params: z.object({ reportId: id }),
  body: z.object({ status: z.enum(['REVIEWED', 'DISMISSED']) }),
});
