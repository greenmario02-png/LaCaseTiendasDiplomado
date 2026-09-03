import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 10000 : 10,
  message: { error: { code: 'RATE_LIMIT', message: 'Demasiados intentos. Esperá un minuto.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 100000 : 5, // 5 registros por minuto por IP (anti creación masiva de cuentas)
  message: { error: { code: 'RATE_LIMIT', message: 'Demasiados registros desde esta IP. Esperá un minuto.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 100000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
});

export const forumPostLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 10000 : 5, // 5 publicaciones por minuto por IP
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiadas publicaciones. Espera un minuto.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const forumVoteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 100000 : 30, // 30 votos por minuto por IP
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiados votos. Espera un momento.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const forumGifLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 100000 : 30, // 30 búsquedas de GIFs por minuto por IP (09-spec G4.2)
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiadas búsquedas. Espera un momento.' } },
  standardHeaders: true,
  legacyHeaders: false,
});
