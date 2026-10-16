import crypto from 'crypto';

import { chatLimits } from '../../config/chat';

/**
 * URL firmada de un adjunto del chat. La firma ata adjunto + usuario + vencimiento con HMAC-SHA256,
 * asi un <img src> funciona sin cabecera Authorization y la URL no sirve a otra persona ni despues de vencer.
 * Clave: CHAT_FILES_SECRET o, si falta, una derivada de JWT_SECRET (nunca la misma clave en claro).
 */
function key(): Buffer {
  const explicit = process.env.CHAT_FILES_SECRET;
  if (explicit && explicit.length >= 32) return Buffer.from(explicit, 'utf8');
  return crypto.createHmac('sha256', process.env.JWT_SECRET ?? '').update('lacase-chat-files-v1').digest();
}

function mac(attachmentId: number, userId: number, exp: number): string {
  return crypto.createHmac('sha256', key()).update(`${attachmentId}.${userId}.${exp}`).digest('base64url');
}

/** Vencimiento redondeado al final de la hora siguiente: misma URL durante la hora (cache del navegador). */
export function signFileUrl(attachmentId: number, userId: number, now = Date.now()): string {
  const ttl = chatLimits.fileUrlTtlMs();
  const exp = Math.ceil((now + ttl) / 3_600_000) * 3600;
  return `/api/chat/files/${attachmentId}?u=${userId}&e=${exp}&s=${mac(attachmentId, userId, exp)}`;
}

export function verifyFileSignature(attachmentId: number, userId: number, exp: number, sig: string, now = Date.now()): boolean {
  if (!Number.isInteger(attachmentId) || !Number.isInteger(userId) || !Number.isInteger(exp) || typeof sig !== 'string') return false;
  if (exp * 1000 < now) return false;
  const expected = Buffer.from(mac(attachmentId, userId, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
