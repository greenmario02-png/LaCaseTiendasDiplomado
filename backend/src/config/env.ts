import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET debe tener al menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // En producción fallamos rápido; en desarrollo mostramos los errores claramente
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error('❌ Configuración de entorno inválida:\n' + issues);
  process.exit(1);
}

export const env = parsed.data;

// Validación extra: en producción no permitir secrets por defecto
if (env.NODE_ENV === 'production') {
  if (env.JWT_SECRET.startsWith('dev-') || env.JWT_REFRESH_SECRET.startsWith('dev-')) {
    throw new Error('En producción debes definir JWT_SECRET y JWT_REFRESH_SECRET seguros');
  }
}
