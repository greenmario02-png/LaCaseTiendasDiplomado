import cors from 'cors';

import { assertSecureCorsConfig } from './corsValidation';
import { env } from './env';

// CORS_ORIGIN acepta una lista separada por comas (p. ej. web + Expo web + emulador).
export const corsOriginList = env.CORS_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Falla al arrancar si en producción CORS_ORIGIN es '*' o apunta a localhost
assertSecureCorsConfig(corsOriginList, env.NODE_ENV);

export const corsOrigin: cors.CorsOptions['origin'] =
  corsOriginList.length === 1 ? corsOriginList[0] : corsOriginList;

export const corsOptions: cors.CorsOptions = {
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
};
