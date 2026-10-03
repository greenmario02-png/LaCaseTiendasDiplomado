/**
 * Prueba de conexión de SOLO LECTURA contra DATABASE_URL: dice a qué host/puerto intenta conectar
 * (sin mostrar usuario ni contraseña), responde en máximo 25 s y cuenta usuarios por rol.
 * Sirve para distinguir "no hay red / URL equivocada" de "Prisma está trabajando".
 */
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL ?? '';
let u: URL;
try {
  u = new URL(url);
} catch {
  console.error('DATABASE_URL no es una URL válida (debe empezar con postgresql://).');
  process.exit(1);
}
console.log(`Conectando a ${u.hostname}:${u.port || 5432} (base "${u.pathname.slice(1)}")...`);

const timer = setTimeout(() => {
  console.error('SIN RESPUESTA en 25 s: la base no es alcanzable desde esta red con esa URL.');
  console.error('Si el host es db.<proyecto>.supabase.co (conexión directa, solo IPv6) usa la cadena del "Session pooler" (puerto 5432, aws-*.pooler.supabase.com).');
  process.exit(2);
}, 25000);

const prisma = new PrismaClient({ datasources: { db: { url } } });
prisma.user
  .groupBy({ by: ['role'], _count: { _all: true } })
  .then((rows) => {
    console.log('Conexión OK. Usuarios por rol:', rows.map((r) => `${r.role}=${r._count._all}`).join(', '));
    return prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } });
  })
  .then((admins) => console.log('Administradores existentes:', admins.map((a) => a.email).join(', ') || '(ninguno)'))
  .catch((e) => {
    console.error('ERROR de conexión:', String(e.message ?? e).split('\n').slice(-4).join(' ').slice(0, 300));
    process.exitCode = 3;
  })
  .finally(async () => {
    clearTimeout(timer);
    await prisma.$disconnect();
  });
