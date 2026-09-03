/**
 * Seed del foro LaCASE (sección 8.6) — categorías/etiquetas + subforos por defecto por ciudad.
 * Idempotente: usa createMany + skipDuplicates para poder re-ejecutarse.
 *
 * Ejecutar: npx tsx prisma/seed-forum.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Etiquetas / subforos del foro. Se agruparon categorías del modelo de sitios de
 * anuncios (p. ej. locanto.com.bo) con nombres efectivos orientados a preguntas
 * locales tipo "¿alguien sabe?". Las primeras 15 son las originales del foro.
 */
const CATEGORIAS = [
  { slug: 'precio-producto',  name: 'Precio de producto',            icon: '💰', color: '#FF6B35', description: '¿Cuánto cuesta? Pregunta por precios de productos en la multitienda.' },
  { slug: 'existencia-stock', name: 'Existencia / Stock',            icon: '📦', color: '#F9A825', description: '¿Hay stock? Consulta disponibilidad de productos por tienda.' },
  { slug: 'salud',            name: 'Salud',                         icon: '🏥', color: '#E53935', description: 'Médicos, clínicas, farmacias y recomendaciones de salud.' },
  { slug: 'tecnologia',       name: 'Tecnología',                    icon: '💻', color: '#1E88E5', description: 'Celulares, computadoras, repuestos y servicios técnicos.' },
  { slug: 'comercio',         name: 'Comercio y Precios',            icon: '🛒', color: '#43A047', description: 'Tiendas, mercados y comparación de precios en general.' },
  { slug: 'servicios',        name: 'Servicios',                     icon: '🔧', color: '#8E24AA', description: 'Plomería, electricidad, reparaciones y servicios varios.' },
  { slug: 'educacion',        name: 'Educación',                     icon: '📚', color: '#00ACC1', description: 'Colegios, institutos, universidades y cursos.' },
  { slug: 'transporte',       name: 'Transporte',                    icon: '🚌', color: '#F4511E', description: 'Trufis, micros, taxis y rutas de transporte.' },
  { slug: 'gastronomia',      name: 'Gastronomía',                   icon: '🍽️', color: '#FB8C00', description: 'Restaurantes, cafeterías y recomendaciones gastronómicas.' },
  { slug: 'legal',            name: 'Legal y Trámites',              icon: '⚖️', color: '#546E7A', description: 'Abogados, notarías y trámites administrativos.' },
  { slug: 'empleos',          name: 'Empleos',                       icon: '💼', color: '#00897B', description: 'Ofertas laborales, currículums y búsqueda de trabajo.' },
  { slug: 'alquileres',       name: 'Alquileres',                    icon: '🏠', color: '#D81B60', description: 'Casas, departamentos y locales en alquiler.' },
  { slug: 'anticreticos',     name: 'Anticrético',                   icon: '🔑', color: '#6D4C41', description: 'Anticréticos y alquileres con depósito (modalidad boliviana).' },
  { slug: 'direcciones',      name: 'Direcciones / ¿Dónde queda?',   icon: '📍', color: '#039BE5', description: '¿Dónde queda X? Consulta direcciones y referencias de ubicación.' },
  { slug: 'general',          name: 'General',                       icon: '💬', color: '#78909C', description: 'Preguntas cotidianas que no encajan en otra categoría.' },
  // ---- Agrupadas de sitios de anuncios (locanto.com.bo) con nombres efectivos ----
  { slug: 'vehiculos',        name: 'Vehículos',                     icon: '🚗', color: '#EF6C00', description: 'Autos, motos, bicicletas, repuestos y compra/venta de vehículos.' },
  { slug: 'mascotas',         name: 'Mascotas',                      icon: '🐾', color: '#795548', description: 'Mascotas, veterinarias, paseadores y artículos para animales.' },
  { slug: 'hogar',            name: 'Hogar y Jardín',                icon: '🛋️', color: '#5D4037', description: 'Muebles, electrodomésticos, herramientas y mejoras del hogar.' },
  { slug: 'moda',             name: 'Moda y Belleza',                icon: '👗', color: '#C2185B', description: 'Ropa, accesorios, productos de belleza y cuidado personal.' },
  { slug: 'bebes',            name: 'Bebés y Niños',                 icon: '🧸', color: '#F06292', description: 'Juguetes, ropa de bebé y artículos para niños.' },
  { slug: 'aficiones',        name: 'Aficiones y Tiempo Libre',      icon: '🎨', color: '#7B1FA2', description: 'Arte, coleccionismo, deportes, hobbies y entretenimiento.' },
  { slug: 'libros',           name: 'Música, Cine y Libros',         icon: '🎵', color: '#4527A0', description: 'Libros, música, películas y cultura.' },
  { slug: 'clases',           name: 'Clases y Cursos',               icon: '🎓', color: '#00838F', description: 'Idiomas, música, informática, deportes y cursos en general.' },
  { slug: 'eventos',          name: 'Eventos',                       icon: '🎪', color: '#F57F17', description: 'Conciertos, eventos culturales, deportivos y reuniones.' },
  { slug: 'comunidad',        name: 'Comunidad y Ayuda',             icon: '🤝', color: '#388E3C', description: 'Ayuda a domicilio, animadores, compartir afición y solidaridad.' },
];

/**
 * Asigna los subforos por defecto a cada ciudad (ForumCityCategory).
 * Todos los subforos activos del catálogo pasan a ser "foros por defecto"
 * de cada ciudad, además del subforo propio de la ciudad "¿Alguien sabe {Ciudad}?"
 * que se resuelve en el feed como el modo general de esa ciudad.
 */
async function seedSubforosPorCiudad() {
  const cities = await prisma.forumCity.findMany({ where: { isActive: true } });
  const categories = await prisma.forumCategory.findMany({ where: { isActive: true } });
  let count = 0;
  for (const city of cities) {
    const created = await prisma.forumCityCategory.createMany({
      data: categories.map((c) => ({ cityId: city.id, categoryId: c.id })),
      skipDuplicates: true,
    });
    count += created.count;
  }
  const total = await prisma.forumCityCategory.count();
  console.log(
    `[seed-forum] Subforos por defecto: ${count} asignaciones nuevas (skip duplicadas). Total en BD: ${total} (ciudades: ${cities.length} × categorías: ${categories.length}).`
  );
}

async function main() {
  const created = await prisma.forumCategory.createMany({
    data: CATEGORIAS.map((c, i) => ({ ...c, sortOrder: i })),
    skipDuplicates: true,
  });

  const total = await prisma.forumCategory.count();
  console.log(`[seed-forum] ${created.count} categorías insertadas (skip duplicadas). Total en BD: ${total}`);

  await seedSubforosPorCiudad();
}

main()
  .catch((e) => {
    console.error('[seed-forum] Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
