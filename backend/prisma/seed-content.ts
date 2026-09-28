/**
 * Seed de contenido "real" para producción: catálogo completo de productos (todas las
 * categorías), usuarios adicionales con tienda/foto, reseñas, carritos, mensajes, foro
 * (categorías, universidades con sus carreras, reglas), y Rinconcito Boliviano (memes +
 * torneos). Idempotente: se puede volver a correr sin duplicar datos.
 *
 * Requiere que ya haya corrido seed-prod.ts (admin + cuentas demo + categorías base).
 * Ejecutar: npx tsx prisma/seed-content.ts
 */
import { PrismaClient, Role, ProductCondition } from '@prisma/client';
import { fakerES as faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

import { CATEGORY_TREE, ATTR_DEFS, PRODUCT_TEMPLATES, categoryImage, flickrImage, DESC_INTROS, DESC_CLOSERS, REVIEW_COMMENTS, FORUM_CITIES } from './seed-data/catalog';
import { seedForum } from './seed-forum';
import { seedProfessional } from './seed-professional';

const prisma = new PrismaClient();

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Slug de subcategoría IDÉNTICO al que genera seed-prod.ts (que ya corrió en producción):
 * NO normaliza tildes/ñ. Si se usara `slugify()` acá (que sí las normaliza), cada categoría
 * con acento generaría un slug distinto al ya existente y crearía una categoría duplicada
 * vacía en vez de reutilizar la que ya tiene productos/tienda asociada.
 */
function categoryChildSlug(parentSlug: string, child: string): string {
  return `${parentSlug}-${child.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function productDescription(name: string, categoryName: string, condition: 'NEW' | 'REFURBISHED' | 'USED'): string {
  const intro = faker.helpers.arrayElement(DESC_INTROS[condition]);
  const closer = faker.helpers.arrayElement(DESC_CLOSERS);
  return `${name} — categoría ${categoryName}. ${intro} ${closer}`;
}

// ---------- Usuarios adicionales (más allá de las 2 cuentas demo oficiales) ----------
const EXTRA_SELLERS = [
  { first: 'Ronald', last: 'Choque', store: 'ElectroAndina', city: 'La Paz', dept: 'La Paz', keyword: 'electronics-store' },
  { first: 'Fátima', last: 'Rojas', store: 'Modas Pilar', city: 'Santa Cruz de la Sierra', dept: 'Santa Cruz', keyword: 'clothing-store' },
  { first: 'Freddy', last: 'Vargas', store: 'Ferretería El Constructor', city: 'Cochabamba', dept: 'Cochabamba', keyword: 'hardware-store' },
  { first: 'Nayra', last: 'Colque', store: 'Artesanías Wara', city: 'Sucre', dept: 'Chuquisaca', keyword: 'craft-market' },
  { first: 'Marcelo', last: 'Fernández', store: 'GamerZone Bolivia', city: 'El Alto', dept: 'La Paz', keyword: 'gaming-store' },
];

const EXTRA_CUSTOMERS = [
  { first: 'Yenny', last: 'Apaza', city: 'La Paz', dept: 'La Paz' },
  { first: 'Diego', last: 'Suárez', city: 'Santa Cruz de la Sierra', dept: 'Santa Cruz' },
  { first: 'Carla', last: 'Mamani', city: 'Cochabamba', dept: 'Cochabamba' },
  { first: 'Erick', last: 'Flores', city: 'Oruro', dept: 'Oruro' },
  { first: 'Ruth', last: 'Gutiérrez', city: 'Tarija', dept: 'Tarija' },
];

async function seedExtraUsers(demoPassword: string): Promise<{ sellers: number[]; customers: number[] }> {
  const passwordHash = await bcrypt.hash(demoPassword, 10);
  const sellers: number[] = [];
  for (const s of EXTRA_SELLERS) {
    const email = `${slugify(s.first)}.${slugify(s.last)}@lacase.bo`;
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash,
        firstName: s.first,
        lastName: s.last,
        role: Role.SELLER,
        storeName: s.store,
        storeDescription: `Tienda verificada en ${s.city} (datos de demostración).`,
        storeLogo: flickrImage(s.keyword, 400, 400),
        locationCity: s.city,
        locationState: s.dept,
        country: 'BO',
        isVerified: true,
        isApproved: true,
        phone: `+591 7${faker.string.numeric(7)}`,
      },
    });
    sellers.push(u.id);
  }

  const customers: number[] = [];
  for (const c of EXTRA_CUSTOMERS) {
    const email = `${slugify(c.first)}.${slugify(c.last)}@correo.bo`;
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash,
        firstName: c.first,
        lastName: c.last,
        role: Role.CUSTOMER,
        locationCity: c.city,
        locationState: c.dept,
        country: 'BO',
        phone: `+591 6${faker.string.numeric(7)}`,
      },
    });
    customers.push(u.id);
  }

  return { sellers, customers };
}

// ---------- Categorías (upsert por slug, mismo árbol que usa seed-prod.ts) ----------
async function seedCategories(): Promise<Record<string, { id: number; slug: string }>> {
  const map: Record<string, { id: number; slug: string }> = {};
  for (const parent of CATEGORY_TREE) {
    const p = await prisma.category.upsert({
      where: { slug: parent.slug },
      update: {},
      create: { name: parent.name, slug: parent.slug, icon: parent.icon, imageUrl: categoryImage(parent.name, 800, 600), order: 0 },
    });
    map[parent.name] = { id: p.id, slug: p.slug };
    for (const child of parent.children) {
      const slug = categoryChildSlug(parent.slug, child);
      const c = await prisma.category.upsert({
        where: { slug },
        update: {},
        create: { name: child, slug, parentId: p.id, order: 1 },
      });
      map[child] = { id: c.id, slug: c.slug };
    }
  }
  return map;
}

async function seedAttributes(categoryMap: Record<string, { id: number; slug: string }>): Promise<Record<string, number>> {
  const attrMap: Record<string, number> = {};
  for (const def of ATTR_DEFS) {
    const existing = await prisma.attributeDefinition.findFirst({ where: { name: def.name, categoryId: categoryMap[def.category]?.id ?? null } });
    const a = existing
      ? existing
      : await prisma.attributeDefinition.create({
          data: {
            name: def.name,
            type: def.type as any,
            categoryId: categoryMap[def.category]?.id ?? null,
            options: def.options ? { values: def.options } : null,
            unit: def.unit ?? null,
            isVariant: def.isVariant ?? false,
            isFilterable: def.isFilterable ?? true,
          },
        });
    attrMap[`${def.category}-${def.name}`] = a.id;
  }
  return attrMap;
}

// ---------- Productos: al menos 1 por cada categoría hoja, ninguna vacía ----------
async function seedProducts(categoryMap: Record<string, { id: number; slug: string }>, attrMap: Record<string, number>, sellerIds: number[]) {
  let created = 0;
  let sellerCursor = 0;
  for (const [categoryName, templates] of Object.entries(PRODUCT_TEMPLATES)) {
    const cat = categoryMap[categoryName];
    if (!cat) continue; // categoría no existe en el árbol (no debería pasar)

    for (let i = 0; i < templates.length; i++) {
      const tpl = templates[i];
      const slug = `${cat.slug}-p${i}`;
      const exists = await prisma.product.findUnique({ where: { slug } });
      if (exists) continue;

      const sellerId = sellerIds[sellerCursor % sellerIds.length];
      sellerCursor++;

      const price = faker.number.float({ min: tpl.price[0], max: tpl.price[1], fractionDigits: 2 });
      const condition = categoryName === 'Antigüedades' ? ProductCondition.USED : faker.datatype.boolean(0.15) ? ProductCondition.REFURBISHED : ProductCondition.NEW;
      const conditionScore = condition === ProductCondition.NEW ? null : faker.number.int({ min: 6, max: 10 });

      const product = await prisma.product.create({
        data: {
          sellerId,
          categoryId: cat.id,
          name: tpl.name,
          slug,
          description: productDescription(tpl.name, categoryName, condition),
          condition,
          conditionScore,
          price,
          originalPrice: faker.datatype.boolean(0.4) ? price * faker.number.float({ min: 1.05, max: 1.3, fractionDigits: 2 }) : null,
          stock: faker.number.int({ min: 3, max: 50 }),
          sku: `${categoryName.substring(0, 3).toUpperCase()}-${cat.id}-${i}`,
          warrantyInfo: faker.datatype.boolean(0.6) ? 'Garantía oficial 12 meses' : null,
          brand: faker.helpers.arrayElement(['Genérico', 'Samsung', 'Sony', 'LG', 'Logitech', 'Razer', 'Nintendo', 'Apple', 'Xiaomi', 'Motorola', 'Corsair', 'ASUS']),
          deliveryTypes: faker.helpers.arrayElements(['PRESENCIAL', 'DELIVERY', 'ENVIO', 'RETIRO'], faker.number.int({ min: 1, max: 3 })) as any,
          acceptsTrade: faker.datatype.boolean(0.3),
          isActive: true,
          isApproved: true,
          isFeatured: faker.datatype.boolean(0.2),
          viewCount: faker.number.int({ min: 10, max: 5000 }),
          saleCount: faker.number.int({ min: 0, max: 300 }),
          images: {
            create: Array.from({ length: faker.number.int({ min: 2, max: 5 }) }).map((_, imgIdx) => ({
              url: categoryImage(categoryName),
              order: imgIdx,
              isPrimary: imgIdx === 0,
            })),
          },
        },
      });
      created++;

      if (tpl.attrs) {
        for (const [attrName, value] of Object.entries(tpl.attrs)) {
          const defId = attrMap[`${categoryName}-${attrName}`];
          if (!defId) continue;
          const def = ATTR_DEFS.find((d) => d.category === categoryName && d.name === attrName)!;
          await prisma.productAttribute.create({
            data: {
              productId: product.id,
              attributeDefinitionId: defId,
              valueText: def.type === 'TEXT' || def.type === 'SELECT' ? String(value) : null,
              valueNumber: def.type === 'NUMBER' ? Number(value) : null,
            },
          });
        }
      }
    }
  }
  console.log(`[seed-content] Productos creados: ${created}`);
}

async function seedReviews(customerIds: number[]) {
  const products = await prisma.product.findMany({ select: { id: true, sellerId: true }, where: { isActive: true } });
  let created = 0;
  for (const p of products) {
    const already = await prisma.review.count({ where: { productId: p.id } });
    if (already > 0) continue;
    if (!faker.datatype.boolean(0.55)) continue; // no todos los productos tienen reseña, para que se vea orgánico
    const reviewer = faker.helpers.arrayElement(customerIds);
    await prisma.review.create({
      data: {
        productId: p.id,
        sellerId: p.sellerId,
        userId: reviewer,
        rating: faker.number.int({ min: 3, max: 5 }),
        comment: faker.datatype.boolean(0.8) ? faker.helpers.arrayElement(REVIEW_COMMENTS) : null,
      },
    });
    created++;
  }
  console.log(`[seed-content] Reseñas creadas: ${created}`);
}

async function seedCart(buyerId: number) {
  const products = await prisma.product.findMany({ select: { id: true }, take: 30, orderBy: { id: 'asc' } });
  if (products.length === 0) return;
  const cart = await prisma.cart.upsert({ where: { userId: buyerId }, update: {}, create: { userId: buyerId } });
  const picks = faker.helpers.arrayElements(products, 3);
  for (const p of picks) {
    const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId: p.id, variantId: null } });
    if (existing) continue;
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: p.id, quantity: faker.number.int({ min: 1, max: 2 }) } });
  }
}

async function seedConversations(buyerId: number, sellerId: number) {
  const product = await prisma.product.findFirst({ where: { sellerId }, orderBy: { id: 'asc' } });
  let conv = await prisma.conversation.findFirst({ where: { buyerId, sellerId, productId: product?.id ?? null } });
  if (!conv) conv = await prisma.conversation.create({ data: { buyerId, sellerId, productId: product?.id } });
  const already = await prisma.message.count({ where: { conversationId: conv.id } });
  if (already > 0) return;
  const exchange = [
    { senderId: buyerId, content: 'Hola, ¿el producto todavía está disponible?' },
    { senderId: sellerId, content: 'Hola, sí, tenemos stock disponible. ¿En qué ciudad te encuentras?' },
    { senderId: buyerId, content: 'Perfecto, estoy en la misma ciudad. ¿Manejan envío a domicilio?' },
    { senderId: sellerId, content: 'Sí, hacemos envío o también puedes recoger en tienda. Cualquier duda, aquí estamos.' },
  ];
  for (const m of exchange) {
    await prisma.message.create({ data: { conversationId: conv.id, senderId: m.senderId, content: m.content } });
  }
}

// ---------- Perfiles de foro ----------
async function ensureForumProfile(userId: number, city: string, username: string) {
  return prisma.forumProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, forumUsername: username, city },
  });
}

// ---------- Universidades: carreras (subforos hijos) con publicaciones candentes ----------
const CARRERAS = [
  {
    suffix: 'informatica',
    name: 'Informática',
    posts: [
      { title: '¿Vale la pena especializarse en IA o conviene ir por desarrollo web?', body: 'Estoy en tercer año y no sé si enfocarme en machine learning o quedarme con desarrollo web/backend, que parece tener más pega inmediata acá en Bolivia. ¿Qué opinan los que ya están trabajando?' },
      { title: 'Freelance vs. práctica en empresa: ¿qué les sirvió más para conseguir trabajo?', body: 'Tengo la opción de hacer freelance por proyectos sueltos o buscar una práctica formal en una empresa. ¿Cuál les abrió más puertas después de salir de la carrera?' },
      { title: '¿Qué lenguaje conviene aprender primero si quieres trabajar en Bolivia?', body: 'Veo ofertas pidiendo de todo: JavaScript, Python, Java, PHP. ¿Cuál se pide más en el mercado local realmente?' },
    ],
  },
  {
    suffix: 'derecho',
    name: 'Derecho',
    posts: [
      { title: '¿Especializarse en penal o civil? ¿Cuál tiene más demanda hoy en día?', body: 'Estoy por elegir área de especialización y quiero saber qué rama está teniendo más movimiento en juzgados y estudios jurídicos actualmente.' },
      { title: 'Prácticas en juzgados: ¿cómo consiguieron la suya?', body: 'Llevo meses buscando dónde hacer mi práctica y no encuentro cupo. ¿Algún consejo de cómo conseguirlo o a quién contactar?' },
      { title: '¿La maestría se hace apenas sales o primero hay que trabajar unos años?', body: 'Tengo la duda de si conviene salir directo a una maestría o mejor ganar experiencia laboral primero. ¿Qué les funcionó a ustedes?' },
    ],
  },
  {
    suffix: 'administracion-de-empresas',
    name: 'Administración de Empresas',
    posts: [
      { title: '¿Emprender apenas sales de la carrera o primero trabajar en relación de dependencia?', body: 'Tengo una idea de negocio pero no sé si lanzarla ya o esperar a tener más experiencia trabajando para alguien más primero. ¿Qué opinan?' },
      { title: 'Recomiéndenme certificaciones que realmente sirvan (Excel avanzado, SAP, etc.)', body: 'Quiero reforzar mi perfil con certificaciones cortas antes de salir. ¿Cuáles les han servido de verdad para conseguir trabajo?' },
      { title: '¿Qué tan real es que piden "2 años de experiencia" para el primer empleo?', body: 'Todas las ofertas piden experiencia previa. ¿Cómo hicieron para entrar a su primer trabajo formal sin tenerla?' },
    ],
  },
];

async function seedUniversityCareers(profileIds: number[]) {
  const universities = await prisma.university.findMany({ include: { categories: { where: { parentId: null } } } });
  let postsCreated = 0;
  for (const uni of universities) {
    const uniCategory = uni.categories[0];
    if (!uniCategory) continue;

    for (const [ci, carrera] of CARRERAS.entries()) {
      const slug = `${uniCategory.slug}-${carrera.suffix}`;
      const careerCategory = await prisma.forumCategory.upsert({
        where: { slug },
        update: { parentId: uniCategory.id },
        create: {
          slug,
          name: carrera.name,
          description: `Comunidad de estudiantes de ${carrera.name} de ${uni.name}.`,
          icon: '🎓',
          color: '#6A1B9A',
          parentId: uniCategory.id,
          sortOrder: ci,
        },
      });

      const existingPosts = await prisma.forumPost.count({ where: { categoryId: careerCategory.id } });
      if (existingPosts > 0) continue;

      for (const [pi, post] of carrera.posts.entries()) {
        const author = profileIds[(pi + ci + uni.id) % profileIds.length];
        const created = await prisma.forumPost.create({
          data: {
            authorId: author,
            categoryId: careerCategory.id,
            title: post.title,
            body: post.body,
            city: 'Bolivia',
            upvotes: faker.number.int({ min: 4, max: 45 }),
            viewCount: faker.number.int({ min: 20, max: 600 }),
          },
        });
        const replyAuthor = profileIds[(pi + ci + uni.id + 1) % profileIds.length];
        if (replyAuthor !== author) {
          await prisma.forumReply.create({
            data: {
              postId: created.id,
              authorId: replyAuthor,
              body: 'Yo pasé por lo mismo, te recomiendo preguntar directamente en la facultad y hablar con gente que ya esté trabajando en el área.',
              upvotes: faker.number.int({ min: 1, max: 15 }),
            },
          });
          await prisma.forumPost.update({ where: { id: created.id }, data: { replyCount: 1 } });
        }
        postsCreated++;
      }
    }
  }
  console.log(`[seed-content] Publicaciones de universidades creadas: ${postsCreated}`);
}

// ---------- Rinconcito Boliviano (memes + torneos) ----------
const MEME_ENTRIES = [
  'Cuando el trufi pasa lleno justo cuando ya te resignaste a caminar',
  'La cara de todos cuando anuncian paro y bloqueo el mismo día del examen',
  'Cuando pides "una salteñita nomás" y terminas pidiendo tres',
  'El vendedor de la esquina que tiene de todo menos lo que buscas',
  'Cuando el profe dice "el examen es fácil" y era todo lo contrario',
  'La familia completa apretujada en un solo trufi porque "sí cabe, sí cabe"',
  'Cuando cortan el agua justo el día que te ibas a bañar temprano',
  'El clásico "ahorita llego" que se convierte en dos horas',
  'Cuando alguien dice que Cochabamba tiene el mejor clima y nadie lo discute',
  'La cueca que no puede faltar en ningún carnaval, aunque no sepas bailarla',
  'Cuando pides fiado en la tienda del barrio y el tendero ya sabe tu nombre',
  'El infaltable "para el resfrío, mate de coca" de las abuelas',
];

const TOURNAMENTS: { slug: string; title: string; description: string; entries: string[] }[] = [
  {
    slug: 'mejores-lugares-turisticos-bolivia',
    title: 'Mejor Lugar Turístico de Bolivia',
    description: 'Vota cuál de estos lugares te parece el mejor destino turístico del país.',
    entries: ['Salar de Uyuni', 'Lago Titicaca / Isla del Sol', 'Valle de la Luna (La Paz)', 'Parque Nacional Madidi', 'Tiwanaku', 'Cristo de la Concordia (Cochabamba)', 'Camino de los Yungas', 'Torotoro (Potosí)'],
  },
  {
    slug: 'zonas-mas-inseguras-bolivia',
    title: 'Percepción: ¿Qué zona sientes más insegura?',
    description: 'Según la percepción de la comunidad (no es un dato oficial), ¿cuál de estas zonas urbanas genera más desconfianza al caminar de noche?',
    entries: ['El Alto — Ceja', 'Plan 3000 (Santa Cruz)', 'Villa Fátima (La Paz)', 'Av. Buenos Aires (La Paz)', 'Terminal de Buses (Cochabamba)', 'Villa Primero de Mayo (Santa Cruz)'],
  },
  {
    slug: 'figura-politica-boliviana-mas-influyente',
    title: 'La Figura Política Más Influyente de la Historia de Bolivia',
    description: 'De la época republicana hasta hoy: ¿cuál de estas figuras marcó más la política boliviana? (No es un juicio de valor, es sobre influencia e impacto histórico).',
    entries: ['Simón Bolívar', 'Antonio José de Sucre', 'Víctor Paz Estenssoro', 'Hugo Banzer Suárez', 'Gonzalo Sánchez de Lozada', 'Evo Morales', 'Jeanine Áñez', 'Luis Arce'],
  },
  {
    slug: 'mejor-plato-tipico-boliviano',
    title: 'Mejor Plato Típico Boliviano',
    description: 'La competencia más reñida: ¿cuál es la verdadera comida bandera de Bolivia?',
    entries: ['Salteña', 'Pique Macho', 'Silpancho', 'Chairo', 'Fricasé', 'Sopa de Maní', 'Majadito', 'Anticucho'],
  },
  {
    slug: 'mejor-equipo-futbol-boliviano',
    title: 'Mejor Equipo de Fútbol Boliviano',
    description: 'El clásico debate de cancha: ¿cuál es el mejor equipo del fútbol boliviano?',
    entries: ['Bolívar', 'The Strongest', 'Blooming', 'Club Jorge Wilstermann', 'Oriente Petrolero', 'Real Potosí'],
  },
];

async function seedRinconcitoBoliviano(profileIds: number[]) {
  const creatorId = profileIds[0];

  const memeTitle = 'Rinconcito Boliviano — Memes';
  const memeDescription = 'Memes y momentos bien bolivianos, votados por la comunidad.';
  const memeTheme = await prisma.conoTheme.upsert({
    where: { slug: 'rinconcito-boliviano-memes' },
    update: { title: memeTitle, description: memeDescription },
    create: { slug: 'rinconcito-boliviano-memes', title: memeTitle, description: memeDescription, type: 'MEME', createdById: creatorId },
  });
  const existingMemeEntries = await prisma.conoEntry.count({ where: { themeId: memeTheme.id } });
  if (existingMemeEntries === 0) {
    for (const [i, label] of MEME_ENTRIES.entries()) {
      const submittedBy = profileIds[i % profileIds.length];
      const entry = await prisma.conoEntry.create({
        data: {
          themeId: memeTheme.id,
          submittedById: submittedBy,
          label,
          imageUrl: flickrImage('bolivia-street', 700, 700),
          positiveCount: faker.number.int({ min: 5, max: 120 }),
          negativeCount: faker.number.int({ min: 0, max: 15 }),
        },
      });
      // un par de votos reales respetando 1 voto por perfil (unique [entryId, profileId])
      const voters = faker.helpers.arrayElements(profileIds, Math.min(3, profileIds.length));
      for (const voterId of voters) {
        if (voterId === submittedBy) continue;
        await prisma.conoVote.upsert({
          where: { entryId_profileId: { entryId: entry.id, profileId: voterId } },
          update: {},
          create: { entryId: entry.id, profileId: voterId, value: faker.datatype.boolean(0.75) ? 'POSITIVE' : 'NEGATIVE' },
        });
      }
    }
  }

  let entriesCreated = existingMemeEntries === 0 ? MEME_ENTRIES.length : 0;

  for (const t of TOURNAMENTS) {
    const theme = await prisma.conoTheme.upsert({
      where: { slug: t.slug },
      update: { title: t.title, description: t.description },
      create: { slug: t.slug, title: t.title, description: t.description, type: 'TOURNAMENT', createdById: creatorId },
    });
    const existingEntries = await prisma.conoEntry.count({ where: { themeId: theme.id } });
    if (existingEntries > 0) continue;

    const entryIds: number[] = [];
    for (const [i, label] of t.entries.entries()) {
      const submittedBy = profileIds[i % profileIds.length];
      const entry = await prisma.conoEntry.create({
        data: {
          themeId: theme.id,
          submittedById: submittedBy,
          label,
          imageUrl: flickrImage(slugify(label) || 'bolivia', 700, 700),
        },
      });
      entryIds.push(entry.id);
      entriesCreated++;
    }

    // Primera ronda: empareja de a 2, votación abierta hoy.
    const today = new Date();
    for (let i = 0; i + 1 < entryIds.length; i += 2) {
      const match = await prisma.conoMatch.create({
        data: {
          themeId: theme.id,
          round: 1,
          entryAId: entryIds[i],
          entryBId: entryIds[i + 1],
          votingDate: today,
          status: 'ACTIVE',
        },
      });
      const voters = faker.helpers.arrayElements(profileIds, Math.min(4, profileIds.length));
      let votesA = 0;
      let votesB = 0;
      for (const voterId of voters) {
        const choice = faker.datatype.boolean() ? 'A' : 'B';
        await prisma.conoMatchVote.upsert({
          where: { matchId_profileId: { matchId: match.id, profileId: voterId } },
          update: {},
          create: { matchId: match.id, profileId: voterId, choice },
        });
        if (choice === 'A') votesA++; else votesB++;
      }
      await prisma.conoMatch.update({ where: { id: match.id }, data: { votesA, votesB } });
    }
  }

  console.log(`[seed-content] Rinconcito Boliviano: ${entriesCreated} publicaciones (memes + torneos) creadas.`);
}

// ---------- Ayuda: reglas del foro y reglas de LaCase Multitiendas ----------
const FORUM_RULES = [
  { title: 'Respeto ante todo', body: 'No se permiten insultos, amenazas ni discurso de odio hacia otros usuarios. Las discusiones fuertes de opinión van a Zona de Debate.' },
  { title: 'Sin spam ni publicidad no autorizada', body: 'No repitas la misma publicación en varias categorías ni uses el foro para promocionar tiendas fuera del espacio permitido para vendedores.' },
  { title: 'Evidencia en Rinconcito Boliviano', body: 'Las publicaciones de Rinconcito Boliviano deben incluir una imagen propia o con derecho de uso. No se permite contenido que exponga datos personales de terceros sin su consentimiento.' },
  { title: 'Un reporte, una razón válida', body: 'Al reportar contenido, explica brevemente el motivo. Los reportes sin fundamento o usados para hostigar a otro usuario pueden derivar en sanción.' },
  { title: 'Verificación profesional', body: 'Los subforos profesionales (Informática, Psicología, etc.) requieren aprobar un cuestionario breve antes de poder publicar, para mantener la calidad de las respuestas.' },
];

const LACASE_FAQS = [
  { question: '¿Cómo compro un producto en LaCase Multitiendas?', answer: 'Busca el producto, revisa la ficha y el vendedor, agrégalo al carrito y sigue los pasos de pago. Puedes coordinar el envío o el retiro directamente con la tienda desde el chat de la compra.' },
  { question: '¿Cómo abro mi tienda como vendedor?', answer: 'Regístrate eligiendo el rol de vendedor, completa los datos de tu tienda (nombre, ciudad y logo) y espera la aprobación del equipo de LaCase antes de publicar tus primeros productos.' },
  { question: '¿Qué pasa si el producto no llega como se describía?', answer: 'Puedes abrir una solicitud de devolución desde el detalle de tu pedido. El equipo de LaCase revisa el caso junto con el vendedor para resolverlo.' },
  { question: '¿Cómo se paga en LaCase Multitiendas?', answer: 'Los medios de pago disponibles se muestran en el checkout (QR, transferencia u otros habilitados por cada vendedor). LaCase no almacena datos de tarjetas.' },
  { question: '¿LaCase Multitiendas cobra comisión a los vendedores?', answer: 'Sí, se aplica una comisión por venta concretada, visible para el vendedor desde su panel antes de publicar cada producto.' },
  { question: '¿Puedo tener más de una tienda con la misma cuenta?', answer: 'No, cada cuenta de vendedor administra una sola tienda. Si necesitas separar rubros, puedes usar categorías y etiquetas dentro de la misma tienda.' },
];

async function seedAyudaYReglas() {
  const existingRules = await prisma.forumRule.count();
  if (existingRules === 0) {
    for (const [i, r] of FORUM_RULES.entries()) {
      await prisma.forumRule.create({ data: { title: r.title, body: r.body, sortOrder: i } });
    }
  }

  const existingFaqs = await prisma.faq.count();
  if (existingFaqs === 0) {
    for (const [i, f] of LACASE_FAQS.entries()) {
      await prisma.faq.create({ data: { question: f.question, answer: f.answer, order: i } });
    }
  }
  console.log('[seed-content] Reglas del foro y preguntas frecuentes de LaCase listas.');
}

/**
 * Corrige texto en voseo que haya quedado sembrado por una corrida anterior a estas
 * correcciones (los posts de universidades no se actualizan solos porque solo se crean
 * una vez por categoría). Es un no-op si el texto ya está corregido.
 */
async function corregirTextosPrevios() {
  const fixes: Array<{ old: string; new: string }> = [
    {
      old: '¿Qué lenguaje conviene aprender primero si querés trabajar en Bolivia?',
      new: '¿Qué lenguaje conviene aprender primero si quieres trabajar en Bolivia?',
    },
    {
      old: '¿Emprender apenas salís de la carrera o primero trabajar en relación de dependencia?',
      new: '¿Emprender apenas sales de la carrera o primero trabajar en relación de dependencia?',
    },
  ];
  for (const f of fixes) {
    await prisma.forumPost.updateMany({ where: { title: f.old }, data: { title: f.new } });
  }
}

/**
 * Reemplaza toda foto que haya quedado apuntando a loremflickr.com (servicio que ahora bloquea
 * las peticiones con una verificación anti-bot en vez de servir la imagen, por eso se veían
 * "rotas" en el sitio) por una foto estable de Picsum. Es idempotente: una vez corregida una
 * fila, ya no vuelve a coincidir con el filtro y no se toca de nuevo.
 */
async function corregirImagenesRotas() {
  let total = 0;

  const images = await prisma.productImage.findMany({ where: { url: { contains: 'loremflickr.com' } } });
  for (const img of images) {
    await prisma.productImage.update({ where: { id: img.id }, data: { url: `https://picsum.photos/seed/product-image-${img.id}/800/800` } });
  }
  total += images.length;

  const categories = await prisma.category.findMany({ where: { imageUrl: { contains: 'loremflickr.com' } } });
  for (const c of categories) {
    await prisma.category.update({ where: { id: c.id }, data: { imageUrl: `https://picsum.photos/seed/category-${c.id}/800/600` } });
  }
  total += categories.length;

  const stores = await prisma.user.findMany({ where: { storeLogo: { contains: 'loremflickr.com' } } });
  for (const u of stores) {
    await prisma.user.update({ where: { id: u.id }, data: { storeLogo: `https://picsum.photos/seed/store-logo-${u.id}/400/400` } });
  }
  total += stores.length;

  const entries = await prisma.conoEntry.findMany({ where: { imageUrl: { contains: 'loremflickr.com' } } });
  for (const e of entries) {
    await prisma.conoEntry.update({ where: { id: e.id }, data: { imageUrl: `https://picsum.photos/seed/cono-entry-${e.id}/700/700` } });
  }
  total += entries.length;

  if (total > 0) console.log(`[seed-content] Imágenes rotas de LoremFlickr corregidas: ${total}`);
}

// ---------- Empleos ----------
const JOB_CATEGORIES = [
  { name: 'Tecnología', slug: 'tecnologia', icon: 'Computer' },
  { name: 'Ventas y Atención al Cliente', slug: 'ventas-atencion-cliente', icon: 'Storefront' },
  { name: 'Logística y Reparto', slug: 'logistica-reparto', icon: 'LocalShipping' },
  { name: 'Diseño y Marketing', slug: 'diseno-marketing', icon: 'Brush' },
  { name: 'Administración', slug: 'administracion', icon: 'Business' },
];

const JOB_POSTINGS = [
  { categorySlug: 'tecnologia', title: 'Desarrollador/a Frontend Junior', description: 'Buscamos apoyo para mantener y mejorar nuestra tienda en línea. Se valora conocimiento de React.', requirements: 'Conocimientos básicos de HTML, CSS y JavaScript. Ganas de aprender.', payPeriod: 'MONTHLY' as const, salaryMin: 3000, salaryMax: 4500, schedule: 'Lunes a viernes, horario de oficina' },
  { categorySlug: 'ventas-atencion-cliente', title: 'Vendedor/a de Tienda', description: 'Atención al cliente en tienda física y por WhatsApp, manejo de pedidos y caja.', requirements: 'Buena atención al cliente, disponibilidad de horario completo.', payPeriod: 'MONTHLY' as const, salaryMin: 2200, salaryMax: 2800, schedule: 'Turnos rotativos' },
  { categorySlug: 'logistica-reparto', title: 'Repartidor/a con Movilidad Propia', description: 'Entrega de pedidos dentro de la ciudad. Se paga por entrega realizada.', requirements: 'Moto propia y licencia de conducir vigente.', payPeriod: 'DAILY' as const, salaryMin: 100, salaryMax: 180, schedule: 'Medio tiempo o tiempo completo' },
  { categorySlug: 'diseno-marketing', title: 'Community Manager', description: 'Manejo de redes sociales de la tienda, creación de contenido y promociones.', requirements: 'Manejo de Instagram y Facebook Ads, edición básica de imágenes.', payPeriod: 'MONTHLY' as const, salaryMin: 2000, salaryMax: 3200, schedule: 'Medio tiempo, remoto' },
  { categorySlug: 'administracion', title: 'Asistente Administrativo/a', description: 'Apoyo en control de inventario, facturación y coordinación con proveedores.', requirements: 'Manejo de Excel, orden y buena redacción.', payPeriod: 'MONTHLY' as const, salaryMin: 2500, salaryMax: 3500, schedule: 'Lunes a sábado' },
  { categorySlug: 'ventas-atencion-cliente', title: 'Cajero/a', description: 'Manejo de caja, cobros y arqueo diario en tienda física.', requirements: 'Experiencia previa en caja es un plus, no excluyente.', payPeriod: 'MONTHLY' as const, salaryMin: 2000, salaryMax: 2400, schedule: 'Turno mañana o tarde' },
];

async function seedJobs(sellers: Array<{ id: number; city: string; state: string }>, adminId: number) {
  const categoryIds: Record<string, number> = {};
  for (const c of JOB_CATEGORIES) {
    const cat = await prisma.jobCategory.upsert({ where: { slug: c.slug }, update: {}, create: c });
    categoryIds[c.slug] = cat.id;
  }

  const existing = await prisma.jobPosting.count();
  if (existing > 0) return;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 86400000);
  let created = 0;
  for (const [i, job] of JOB_POSTINGS.entries()) {
    const seller = sellers[i % sellers.length];
    await prisma.jobPosting.create({
      data: {
        storeId: seller.id,
        createdById: seller.id,
        categoryId: categoryIds[job.categorySlug],
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        city: seller.city,
        locationState: seller.state,
        payPeriod: job.payPeriod,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        vacancies: faker.number.int({ min: 1, max: 3 }),
        schedule: job.schedule,
        status: 'APPROVED',
        reviewedById: adminId,
        reviewedAt: now,
        publishedAt: now,
        expiresAt,
      },
    });
    created++;
  }
  console.log(`[seed-content] Ofertas de empleo creadas: ${created}`);
}

async function main() {
  const demoPassword = process.env.DEMO_PASSWORD;
  if (!demoPassword) throw new Error('Falta DEMO_PASSWORD en el entorno (se reutiliza para los usuarios adicionales de demostración).');

  console.log('[seed-content] Asegurando categorías completas...');
  const categoryMap = await seedCategories();
  const attrMap = await seedAttributes(categoryMap);

  console.log('[seed-content] Creando usuarios adicionales...');
  const { sellers: extraSellers, customers: extraCustomers } = await seedExtraUsers(demoPassword);

  const demoSeller = await prisma.user.findUnique({ where: { email: 'vendedor.demo@lacase.bo' } });
  const demoBuyer = await prisma.user.findUnique({ where: { email: 'comprador.demo@lacase.bo' } });
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (!demoSeller || !demoBuyer || !admin) {
    throw new Error('Faltan las cuentas base (admin/vendedor.demo/comprador.demo). Corre primero npm run db:seed:prod.');
  }

  const allSellerIds = [demoSeller.id, ...extraSellers];
  const allCustomerIds = [demoBuyer.id, ...extraCustomers];

  console.log('[seed-content] Sembrando catálogo de productos (todas las categorías)...');
  await seedProducts(categoryMap, attrMap, allSellerIds);

  console.log('[seed-content] Sembrando reseñas...');
  await seedReviews(allCustomerIds);

  console.log('[seed-content] Sembrando carrito de compras de la cuenta comprador.demo...');
  await seedCart(demoBuyer.id);

  console.log('[seed-content] Sembrando conversaciones y mensajes...');
  await seedConversations(demoBuyer.id, demoSeller.id);
  await seedConversations(extraCustomers[0], extraSellers[0]);

  console.log('[seed-content] Sembrando ofertas de empleo...');
  const sellersForJobs = [
    { id: demoSeller.id, city: 'Cochabamba', state: 'Cochabamba' },
    ...extraSellers.map((id, i) => ({ id, city: EXTRA_SELLERS[i].city, state: EXTRA_SELLERS[i].dept })),
  ];
  await seedJobs(sellersForJobs, admin.id);

  console.log('[seed-content] Sembrando perfiles de foro...');
  const adminProfile = await ensureForumProfile(admin.id, 'La Paz', `Admin_${admin.id}`);
  const sellerProfile = await ensureForumProfile(demoSeller.id, 'Cochabamba', `Vendedor_${demoSeller.id}`);
  const buyerProfile = await ensureForumProfile(demoBuyer.id, 'La Paz', `Usuario_${demoBuyer.id}`);
  const extraSellerProfiles = [];
  for (const [i, id] of extraSellers.entries()) extraSellerProfiles.push(await ensureForumProfile(id, EXTRA_SELLERS[i].city, `Vendedor_${id}`));
  const extraCustomerProfiles = [];
  for (const [i, id] of extraCustomers.entries()) extraCustomerProfiles.push(await ensureForumProfile(id, EXTRA_CUSTOMERS[i].city, `Usuario_${id}`));

  const allProfileIds = [adminProfile.id, sellerProfile.id, buyerProfile.id, ...extraSellerProfiles.map((p) => p.id), ...extraCustomerProfiles.map((p) => p.id)];

  console.log('[seed-content] Sembrando ciudades del catálogo de geolocalización del foro...');
  await prisma.forumCity.createMany({ data: FORUM_CITIES, skipDuplicates: true });

  console.log('[seed-content] Sembrando categorías de foro y subforos por ciudad...');
  await seedForum();

  console.log('[seed-content] Sembrando áreas profesionales y universidades...');
  await seedProfessional();

  console.log('[seed-content] Sembrando carreras universitarias con publicaciones...');
  await seedUniversityCareers(allProfileIds);
  await corregirTextosPrevios();

  console.log('[seed-content] Corrigiendo imágenes que hayan quedado rotas...');
  await corregirImagenesRotas();

  console.log('[seed-content] Sembrando Rinconcito Boliviano (memes + torneos)...');
  await seedRinconcitoBoliviano(allProfileIds);

  console.log('[seed-content] Sembrando reglas del foro y ayuda de LaCase...');
  await seedAyudaYReglas();

  console.log('[seed-content] Listo.');
}

main()
  .catch((e) => {
    console.error('[seed-content] Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
