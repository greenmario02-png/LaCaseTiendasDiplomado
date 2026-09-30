/**
 * Actualiza SOLO las URLs de imagen (categorías, imágenes de producto, logo/banner de tienda,
 * foto de perfil de usuario) para que apunten a las fotos locales curadas de
 * prisma/seed-assets/, en vez de las que tenía antes (aleatorias / sin relación con la
 * categoría). No borra ni crea ninguna fila — no toca cuentas, pedidos, mensajes, nada más
 * que esos 4 campos de imagen.
 *
 * Por defecto corre en modo DRY-RUN (solo cuenta cuántas filas cambiaría, no escribe nada).
 * Pasar --apply para escribir de verdad.
 *
 * Uso (con la DATABASE_URL de producción, nunca la local):
 *   cd backend
 *   DATABASE_URL="<la de producción>" npx tsx scripts/backfill-seed-images.ts            # dry-run
 *   DATABASE_URL="<la de producción>" npx tsx scripts/backfill-seed-images.ts --apply     # aplica de verdad
 *
 * BACKEND_URL (opcional): si no se pasa, usa https://lacase-diplomado-api.onrender.com.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORY_IMAGE_FILES: Record<string, string> = {
  hardware: 'hardware.jpg',
  perifericos: 'perifericos.jpg',
  ropa: 'ropa.jpg',
  celulares: 'celulares.png',
  electrodomesticos: 'electrodomesticos.jpg',
  antiguedades: 'antiguedades.jpg',
  'bar-y-bebidas': 'bar-y-bebidas.jpg',
  juguetes: 'juguetes.jpg',
  deportes: 'deportes.jpg',
  'hogar-y-muebles': 'hogar-y-muebles.jpg',
  'salud-y-belleza': 'salud-y-belleza.jpg',
  mascotas: 'mascotas.jpg',
  'musica-e-instrumentos': 'musica-e-instrumentos.jpg',
  videojuegos: 'videojuegos.jpg',
  'libros-y-papeleria': 'libros-y-papeleria.jpg',
  artesanias: 'artesanias.jpg',
  herramientas: 'herramientas.jpg',
};

const SLUG_TO_NAME: Record<string, string> = {
  hardware: 'Hardware',
  perifericos: 'Periféricos',
  ropa: 'Ropa',
  celulares: 'Celulares',
  electrodomesticos: 'Electrodomésticos',
  antiguedades: 'Antigüedades',
  'bar-y-bebidas': 'Bar y Bebidas',
  juguetes: 'Juguetes',
  deportes: 'Deportes',
  'hogar-y-muebles': 'Hogar y Muebles',
  'salud-y-belleza': 'Salud y Belleza',
  mascotas: 'Mascotas',
  'musica-e-instrumentos': 'Música e Instrumentos',
  videojuegos: 'Videojuegos',
  'libros-y-papeleria': 'Libros y Papelería',
  artesanias: 'Artesanías',
  herramientas: 'Herramientas',
};

const AVATAR_COUNT = 5;

function localCategoryImage(slug: string, backendUrl: string): string {
  const file = CATEGORY_IMAGE_FILES[slug] ?? CATEGORY_IMAGE_FILES.hardware;
  return `${backendUrl}/seed-assets/categories/${file}`;
}

function localAvatarImage(index: number, backendUrl: string): string {
  return `${backendUrl}/seed-assets/avatars/avatar-${(index % AVATAR_COUNT) + 1}.jpg`;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const backendUrl = process.env.BACKEND_URL || 'https://lacase-diplomado-api.onrender.com';

  console.log(`Modo: ${apply ? 'APLICANDO CAMBIOS' : 'DRY-RUN (no escribe nada)'} — BACKEND_URL=${backendUrl}\n`);

  // Mapa id -> categoría, para subir hasta el ancestro de nivel superior de cualquier categoría.
  const categories = await prisma.category.findMany({ select: { id: true, slug: true, parentId: true } });
  const byId = new Map(categories.map((c) => [c.id, c]));
  function topSlugFor(catId: number | null): string {
    let c = catId != null ? byId.get(catId) : undefined;
    const seen = new Set<number>();
    while (c?.parentId && !seen.has(c.id)) {
      seen.add(c.id);
      c = byId.get(c.parentId);
    }
    return c?.slug ?? 'hardware';
  }

  // 1) Categorías: imagen de su propia rama de nivel superior.
  let catCount = 0;
  for (const cat of categories) {
    const url = localCategoryImage(topSlugFor(cat.id), backendUrl);
    if (apply) await prisma.category.update({ where: { id: cat.id }, data: { imageUrl: url } });
    catCount++;
  }

  // 2) Imágenes de producto: todas las filas de cada producto pasan a la foto de su categoría.
  const products = await prisma.product.findMany({ select: { id: true, categoryId: true } });
  let imgCount = 0;
  for (const p of products) {
    const url = localCategoryImage(topSlugFor(p.categoryId), backendUrl);
    if (apply) {
      const res = await prisma.productImage.updateMany({ where: { productId: p.id }, data: { url } });
      imgCount += res.count;
    } else {
      imgCount += await prisma.productImage.count({ where: { productId: p.id } });
    }
  }

  // 3) Tiendas: rubro real (categoría más vendida por esa tienda) -> storeCategory + logo/banner.
  const sellers = await prisma.user.findMany({ where: { role: 'SELLER' }, select: { id: true } });
  let sellerCount = 0;
  for (const s of sellers) {
    const grouped = await prisma.product.groupBy({
      by: ['categoryId'],
      where: { sellerId: s.id },
      _count: { categoryId: true },
      orderBy: { _count: { categoryId: 'desc' } },
      take: 1,
    });
    const slug = grouped[0] ? topSlugFor(grouped[0].categoryId) : 'hardware';
    const url = localCategoryImage(slug, backendUrl);
    if (apply) {
      await prisma.user.update({
        where: { id: s.id },
        data: { storeCategory: SLUG_TO_NAME[slug], storeLogo: url, storeBanner: url },
      });
    }
    sellerCount++;
  }

  // 4) Usuarios sin foto de perfil: avatar genérico, rotando.
  const users = await prisma.user.findMany({ select: { id: true, profileImage: true } });
  let userCount = 0;
  let avatarIdx = 0;
  for (const u of users) {
    if (u.profileImage) continue;
    const url = localAvatarImage(avatarIdx++, backendUrl);
    if (apply) await prisma.user.update({ where: { id: u.id }, data: { profileImage: url } });
    userCount++;
  }

  console.log('Resultado:');
  console.log(`  Categorías actualizadas:        ${catCount}`);
  console.log(`  Imágenes de producto actualizadas: ${imgCount}`);
  console.log(`  Tiendas actualizadas:            ${sellerCount}`);
  console.log(`  Usuarios con avatar nuevo:       ${userCount}`);
  if (!apply) console.log('\n(Dry-run: no se escribió nada. Volvé a correr con --apply para aplicar de verdad.)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
