import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pctienda_test';
  process.env.NODE_ENV = 'test';

  console.log('\n[globalSetup] Inicializando BD de test...');

  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env },
    stdio: 'pipe',
  });

  console.log('[globalSetup] Aplicando seed de prueba...');

  execSync('npx tsx prisma/seed.ts', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env },
    stdio: 'pipe',
  });

  console.log('[globalSetup] Aplicando seed del foro (categorías)...');

  execSync('npx tsx prisma/seed-forum.ts', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env },
    stdio: 'pipe',
  });

  console.log('[globalSetup] Listo.\n');
}
