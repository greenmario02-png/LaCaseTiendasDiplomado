import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pctienda_test';
process.env.JWT_SECRET = 'test-secret-2026-9f2c4a1b7e3d8c';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-2026-5d8e2f1a9c4b7e';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.PORT = '3001';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

afterAll(async () => {
  const { prisma } = await import('../src/config/database');
  await prisma.$disconnect();
});
