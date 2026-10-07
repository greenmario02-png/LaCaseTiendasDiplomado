import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../src/config/security';

/**
 * Seed mínimo e idempotente para un entorno real: administrador (desde variables de entorno),
 * árbol base de categorías y, opcionalmente, dos cuentas demo ficticias.
 * Variables: ADMIN_EMAIL, ADMIN_PASSWORD (obligatorias), ADMIN_PREVIOUS_EMAIL (opcional: renombra al admin existente),
 * DEMO_PASSWORD (opcional: cuentas demo .bo) y REVIEW_PASSWORD (opcional: vendedor@/comprador@lacase.test).
 * Nunca imprime contraseñas.
 */
const prisma = new PrismaClient();

const CATEGORY_TREE = [
  {
    name: 'Hardware',
    slug: 'hardware',
    icon: 'Memory',
    children: ['Procesadores', 'Placas de Video', 'Motherboards', 'Memorias RAM', 'Almacenamiento', 'Gabinetes', 'Fuentes de Poder', 'Refrigeración'],
  },
  {
    name: 'Periféricos',
    slug: 'perifericos',
    icon: 'Devices',
    children: ['Teclados', 'Mouse', 'Auriculares', 'Monitores', 'Micrófonos'],
  },
  {
    name: 'Ropa',
    slug: 'ropa',
    icon: 'Checkroom',
    children: ['Remeras', 'Pantalones', 'Camperas', 'Calzado', 'Accesorios'],
  },
  {
    name: 'Celulares',
    slug: 'celulares',
    icon: 'Smartphone',
    children: ['Smartphones', 'Fundas', 'Cargadores', 'Smartwatches'],
  },
  {
    name: 'Electrodomésticos',
    slug: 'electrodomesticos',
    icon: 'Kitchen',
    children: ['Heladeras', 'Lavarropas', 'Cocinas', 'Microondas', 'Pequeños'],
  },
  {
    name: 'Antigüedades',
    slug: 'antiguedades',
    icon: 'Diamond',
    children: ['Muebles', 'Discos de Vinilo', 'Cámaras', 'Relojes', 'Libros'],
  },
  {
    name: 'Bar y Bebidas',
    slug: 'bar-y-bebidas',
    icon: 'LocalBar',
    children: ['Cervezas', 'Vinos', 'Licores', 'Bebidas sin alcohol'],
  },
  {
    name: 'Juguetes',
    slug: 'juguetes',
    icon: 'Toys',
    children: ['Juegos de mesa', 'Muñecos', 'Construcción', 'Peluches'],
  },
  {
    name: 'Deportes',
    slug: 'deportes',
    icon: 'SportsSoccer',
    children: ['Fútbol', 'Bicicletas', 'Gimnasio', 'Camping'],
  },
  {
    name: 'Hogar y Muebles',
    slug: 'hogar-y-muebles',
    icon: 'Chair',
    children: ['Muebles para Hogar', 'Decoración', 'Iluminación', 'Blanquería'],
  },
  {
    name: 'Salud y Belleza',
    slug: 'salud-y-belleza',
    icon: 'Spa',
    children: ['Cosméticos', 'Cuidado personal', 'Perfumes'],
  },
  {
    name: 'Mascotas',
    slug: 'mascotas',
    icon: 'Pets',
    children: ['Alimento', 'Accesorios para mascotas', 'Juguetes para mascotas'],
  },
  {
    name: 'Música e Instrumentos',
    slug: 'musica-e-instrumentos',
    icon: 'MusicNote',
    children: ['Guitarras', 'Teclados musicales', 'Audio', 'Instrumentos de viento'],
  },
  {
    name: 'Videojuegos',
    slug: 'videojuegos',
    icon: 'SportsEsports',
    children: ['Consolas', 'Juegos', 'Accesorios gaming'],
  },
  {
    name: 'Libros y Papelería',
    slug: 'libros-y-papeleria',
    icon: 'MenuBook',
    children: ['Novelas', 'Educativos', 'Comics y Mangas', 'Papelería'],
  },
  {
    name: 'Artesanías',
    slug: 'artesanias',
    icon: 'Handyman',
    children: ['Cerámica', 'Tejidos', 'Madera', 'Joyería artesanal'],
  },
  {
    name: 'Herramientas',
    slug: 'herramientas',
    icon: 'Construction',
    children: ['Manuales', 'Eléctricas', 'Jardinería', 'Seguridad'],
  },
];

async function seedCategories() {
  for (const parent of CATEGORY_TREE) {
    const p = await prisma.category.upsert({
      where: { slug: parent.slug },
      update: {},
      create: { name: parent.name, slug: parent.slug, icon: parent.icon, order: 0 },
    });
    for (const child of parent.children) {
      const slug = `${parent.slug}-${child.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      await prisma.category.upsert({
        where: { slug },
        update: {},
        create: { name: child, slug, parentId: p.id, order: 1 },
      });
    }
  }
}

/** Si el admin existente tiene otro correo (ADMIN_PREVIOUS_EMAIL), se RENOMBRA en su sitio: no se crea un segundo admin. */
async function renameAdminEmail(previousEmail: string, email: string) {
  if (previousEmail === email) return;
  const existing = await prisma.user.findUnique({ where: { email: previousEmail } });
  if (!existing) return;
  if (existing.role !== Role.ADMIN) throw new Error('ADMIN_PREVIOUS_EMAIL no corresponde a un administrador.');
  if (await prisma.user.findUnique({ where: { email } })) throw new Error('El correo nuevo ya está en uso por otra cuenta.');
  await prisma.user.update({ where: { id: existing.id }, data: { email } });
}

async function seedAdmin(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: Role.ADMIN, isActive: true, isApproved: true, isVerified: true },
    create: {
      email,
      passwordHash,
      firstName: 'Admin',
      lastName: 'Principal',
      role: Role.ADMIN,
      isVerified: true,
      isApproved: true,
    },
  });
}

async function seedDemo(password: string) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await prisma.user.upsert({
    where: { email: 'vendedor.demo@lacase.bo' },
    update: {},
    create: {
      email: 'vendedor.demo@lacase.bo',
      passwordHash,
      firstName: 'Mateo',
      lastName: 'Quispe',
      role: Role.SELLER,
      storeName: 'TecnoCase Demo',
      storeDescription: 'Tienda de demostración (datos ficticios).',
      locationCity: 'Cochabamba',
      locationState: 'Cochabamba',
      country: 'BO',
      isVerified: true,
      isApproved: true,
    },
  });
  await prisma.user.upsert({
    where: { email: 'comprador.demo@lacase.bo' },
    update: {},
    create: {
      email: 'comprador.demo@lacase.bo',
      passwordHash,
      firstName: 'Valeria',
      lastName: 'Mamani',
      role: Role.CUSTOMER,
      locationCity: 'La Paz',
      locationState: 'La Paz',
      country: 'BO',
    },
  });
}

/** Renombra en su sitio la primera cuenta existente de `previos` (mismo rol) a `email`, sin duplicar usuarios. */
async function renameAccount(previos: string[], email: string, role: Role) {
  if (await prisma.user.findUnique({ where: { email } })) return;
  for (const previo of previos) {
    const existing = await prisma.user.findUnique({ where: { email: previo } });
    if (existing && existing.role === role) {
      await prisma.user.update({ where: { id: existing.id }, data: { email } });
      return;
    }
  }
}

/**
 * Una cuenta ficticia por rol con dominio reservado .test (vendedor@ y comprador@lacase.test).
 * Si ya existían las cuentas demo (vendedor.demo@/comprador.demo@lacase.bo) se RENOMBRAN en su sitio:
 * conservan su tienda y sus datos. La contraseña viene SOLO de REVIEW_PASSWORD (entorno): nunca se
 * escribe en el repositorio. Re-ejecutar con otra REVIEW_PASSWORD la rota.
 */
async function seedReview(password: string) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await renameAccount(['vendedor.demo@lacase.bo', 'vendedor.revision@lacase.test'], 'vendedor@lacase.test', Role.SELLER);
  await renameAccount(['comprador.demo@lacase.bo', 'comprador.revision@lacase.test'], 'comprador@lacase.test', Role.CUSTOMER);
  await prisma.user.upsert({
    where: { email: 'vendedor@lacase.test' },
    update: { passwordHash, isActive: true, isApproved: true },
    create: {
      email: 'vendedor@lacase.test',
      passwordHash,
      firstName: 'Mateo',
      lastName: 'Quispe',
      role: Role.SELLER,
      storeName: 'TecnoCase Demo',
      storeDescription: 'Tienda de demostración (datos ficticios).',
      locationCity: 'Tarija',
      locationState: 'Tarija',
      country: 'BO',
      isVerified: true,
      isApproved: true,
    },
  });
  await prisma.user.upsert({
    where: { email: 'comprador@lacase.test' },
    update: { passwordHash, isActive: true },
    create: {
      email: 'comprador@lacase.test',
      passwordHash,
      firstName: 'Valeria',
      lastName: 'Mamani',
      role: Role.CUSTOMER,
      locationCity: 'Tarija',
      locationState: 'Tarija',
      country: 'BO',
    },
  });
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD en el entorno.');
  }
  if (password.length < 10) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 10 caracteres.');
  }
  await seedCategories();
  const previousEmail = process.env.ADMIN_PREVIOUS_EMAIL?.trim().toLowerCase();
  if (previousEmail) await renameAdminEmail(previousEmail, email);
  await seedAdmin(email, password);
  if (process.env.DEMO_PASSWORD) await seedDemo(process.env.DEMO_PASSWORD);
  if (process.env.REVIEW_PASSWORD) {
    if (process.env.REVIEW_PASSWORD.length < 10) throw new Error('REVIEW_PASSWORD debe tener al menos 10 caracteres.');
    await seedReview(process.env.REVIEW_PASSWORD);
  }
  console.log('Seed de producción completado.');
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : 'Error en el seed');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
