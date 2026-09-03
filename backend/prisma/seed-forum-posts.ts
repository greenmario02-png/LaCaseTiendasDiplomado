/**
 * Seed de contenido del foro (preguntas, respuestas y votos de ejemplo) con
 * contexto boliviano real, para que el foro no se vea vacío en la demo.
 *
 * Requiere haber corrido antes prisma/seed.ts (usuarios) y prisma/seed-forum.ts
 * (categorías/ciudades). Ejecutar: npx tsx prisma/seed-forum-posts.ts
 */
import { PrismaClient } from '@prisma/client';
import { ensureForumProfile } from '../src/services/forum.service';

const prisma = new PrismaClient();

const POSTS: Array<{
  categorySlug: string;
  city: string;
  title: string;
  body: string;
  type: 'GENERAL' | 'PRECIO' | 'EXISTENCIA' | 'EMPLEO' | 'ALQUILER' | 'ANTICROTICO';
  replies?: string[];
}> = [
  {
    categorySlug: 'precio-producto',
    city: 'La Paz',
    title: '¿Cuánto está el dólar hoy en la calle Camacho?',
    body: 'Necesito cambiar unos dólares y no sé si conviene ir al banco o a la calle Camacho. ¿Alguien cambió hoy? ¿A cuánto está el paralelo?',
    type: 'PRECIO',
    replies: [
      'Hoy estaba a Bs 6,96 el oficial, en la calle un poco más alto pero no mucho.',
      'Yo cambié en la mañana en Camacho, sin problema y rápido.',
    ],
  },
  {
    categorySlug: 'transporte',
    city: 'La Paz',
    title: '¿Qué minibús me deja cerca de la Ceja en El Alto?',
    body: 'Vivo por Achumani y necesito llegar a la Ceja para las 8. ¿Alguien sabe qué línea me conviene sin hacer transbordo?',
    type: 'GENERAL',
    replies: ['El 262 te deja bien cerca, pasa cada 10 minutos más o menos.'],
  },
  {
    categorySlug: 'anticreticos',
    city: 'La Paz',
    title: '¿Es seguro un anticrético sin contrato notariado en Sopocachi?',
    body: 'Me ofrecen un anticrético en Sopocachi pero el dueño dice que el contrato simple alcanza. ¿Alguien tuvo problemas por no notariar?',
    type: 'ANTICROTICO',
    replies: [
      'Siempre notariá, aunque cueste un poco más. Te cubre si después hay lío con la devolución.',
    ],
  },
  {
    categorySlug: 'tecnologia',
    city: 'Cochabamba',
    title: '¿Dónde reparan pantallas de laptop en la Cancha?',
    body: 'Se me rajó la pantalla de mi laptop y quiero cotizar en la Cancha antes de ir a un centro autorizado. ¿Algún puesto recomendado?',
    type: 'GENERAL',
    replies: ['En la sección de electrónica, cerca de la calle Tarata, hay varios que reparan al toque.'],
  },
  {
    categorySlug: 'gastronomia',
    city: 'Cochabamba',
    title: '¿Cuál es el mejor lugar para un chicharrón un domingo en Quillacollo?',
    body: 'Vienen visitas de Santa Cruz y quiero llevarlos a comer un buen chicharrón en Quillacollo. ¿Recomendaciones?',
    type: 'GENERAL',
  },
  {
    categorySlug: 'empleos',
    city: 'Cochabamba',
    title: 'Busco trabajo de medio tiempo cerca de la zona norte',
    body: 'Soy estudiante de la UMSS y busco algo de medio tiempo, de preferencia atención al cliente, por la zona norte. ¿Alguien sabe de alguna vacante?',
    type: 'EMPLEO',
  },
  {
    categorySlug: 'vehiculos',
    city: 'Santa Cruz',
    title: '¿Conviene comprar un auto importado de Chile o Japón directo?',
    body: 'Estoy viendo precios de autos usados y me sale más barato traerlo directo. ¿Alguien tuvo experiencia con el trámite de importación?',
    type: 'GENERAL',
    replies: ['Depende del año y los impuestos, a veces sale más caro por el ICE. Fijate bien antes de comprometerte.'],
  },
  {
    categorySlug: 'alquileres',
    city: 'Santa Cruz',
    title: '¿Cuánto se paga de alquiler por un depa de 2 dormitorios cerca del cuarto anillo?',
    body: 'Estoy buscando mudarme cerca del cuarto anillo, zona norte. ¿Cuál es el precio referencial de un depa de 2 dormitorios ahí?',
    type: 'ALQUILER',
  },
  {
    categorySlug: 'existencia-stock',
    city: 'Santa Cruz',
    title: '¿Alguna tienda tiene stock de memorias RAM DDR5 en Equipetrol?',
    body: 'Necesito ampliar la RAM de mi PC y las tiendas cerca de mi casa no tienen DDR5. ¿Alguien vio stock por Equipetrol?',
    type: 'EXISTENCIA',
  },
  {
    categorySlug: 'direcciones',
    city: 'Sucre',
    title: '¿Dónde queda exactamente la Casa de la Libertad?',
    body: 'Vienen unos amigos de otro departamento y quiero llevarlos a la Casa de la Libertad. ¿Está cerca de la plaza 25 de Mayo?',
    type: 'GENERAL',
    replies: ['Sí, está justo en la plaza principal, al lado de la catedral.'],
  },
  {
    categorySlug: 'educacion',
    city: 'Sucre',
    title: '¿Institutos de inglés recomendados en Sucre?',
    body: 'Quiero empezar un curso de inglés desde cero. ¿Cuál institutos recomiendan por buena relación precio-calidad?',
    type: 'GENERAL',
  },
  {
    categorySlug: 'salud',
    city: 'Oruro',
    title: '¿Farmacias de turno este fin de semana en Oruro?',
    body: 'Necesito saber qué farmacias están de turno el sábado por la zona centro. ¿Alguien tiene el dato?',
    type: 'GENERAL',
  },
  {
    categorySlug: 'servicios',
    city: 'Tarija',
    title: '¿Recomiendan un gasfitero de confianza en Tarija?',
    body: 'Se me rompió una cañería y necesito a alguien de confianza, de preferencia con garantía del trabajo.',
    type: 'GENERAL',
  },
  {
    categorySlug: 'mascotas',
    city: 'Potosí',
    title: '¿Veterinarias con atención de emergencia en Potosí?',
    body: 'Mi perro se lastimó y no sé si hay alguna veterinaria de emergencia abierta a esta hora en Potosí.',
    type: 'GENERAL',
  },
  {
    categorySlug: 'comercio',
    city: 'Trinidad',
    title: '¿Dónde comprar artículos de pesca en Trinidad?',
    body: 'Estoy buscando anzuelos y línea de buena calidad. ¿Alguna tienda recomendada en el centro de Trinidad?',
    type: 'GENERAL',
  },
];

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: ['comprador@lacase.bo', 'vendedor@lacase.bo'] } },
  });
  const otherUsers = await prisma.user.findMany({ take: 10, orderBy: { id: 'asc' } });
  const pool = [...users, ...otherUsers];
  if (pool.length === 0) {
    console.log('[seed-forum-posts] No hay usuarios — corré prisma/seed.ts primero.');
    return;
  }

  const profiles = [];
  for (const u of pool) {
    profiles.push(await ensureForumProfile(u.id));
  }

  let created = 0;
  let repliesCreated = 0;
  for (let i = 0; i < POSTS.length; i++) {
    const def = POSTS[i];
    const category = await prisma.forumCategory.findUnique({ where: { slug: def.categorySlug } });
    if (!category) continue;

    const author = profiles[i % profiles.length];
    const existing = await prisma.forumPost.findFirst({ where: { title: def.title } });
    if (existing) continue;

    const post = await prisma.forumPost.create({
      data: {
        authorId: author.id,
        categoryId: category.id,
        title: def.title,
        body: def.body,
        images: [],
        tags: [],
        city: def.city,
        type: def.type as any,
        upvotes: Math.floor(Math.random() * 12) + 1,
        viewCount: Math.floor(Math.random() * 200) + 10,
      },
    });
    created++;

    for (let r = 0; r < (def.replies?.length ?? 0); r++) {
      const replier = profiles[(i + r + 1) % profiles.length];
      await prisma.forumReply.create({
        data: {
          postId: post.id,
          authorId: replier.id,
          body: def.replies![r],
          upvotes: Math.floor(Math.random() * 6),
          isAccepted: r === 0 && Math.random() > 0.5,
        },
      });
      repliesCreated++;
    }

    await prisma.forumPost.update({
      where: { id: post.id },
      data: { replyCount: def.replies?.length ?? 0, status: def.replies?.length ? 'RESOLVED' : 'OPEN' },
    });
  }

  console.log(`✅ Foro poblado: ${created} preguntas nuevas, ${repliesCreated} respuestas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
