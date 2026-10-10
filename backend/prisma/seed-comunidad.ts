/**
 * Cuentas y contenido de ejemplo para que el catálogo, las subastas y los perfiles se vean completos:
 * 6 vendedores con su tienda y sus productos, 4 compradores y subastas de 30 días.
 *
 * - Idempotente: puede ejecutarse varias veces; no duplica cuentas, productos ni subastas.
 * - Son cuentas CREADAS POR EL AUTOR del proyecto con nombres ficticios (correos del dominio reservado .example); no son
 *   vendedores ni compradores reales y no se cuentan como evidencia del piloto.
 * - La contraseña de todas las cuentas se toma de la variable de entorno COMUNIDAD_PASSWORD (mínimo 10 caracteres): no se
 *   escribe en ningún archivo ni se imprime. Solo se guarda su hash (bcrypt).
 * - Requiere haber ejecutado antes seed-prod.ts (categorías). Con una base remota hay que definir BACKEND_URL.
 *
 * Ejecutar:  COMUNIDAD_PASSWORD=... npx tsx prisma/seed-comunidad.ts   (en Windows: scripts\sembrar-comunidad.ps1)
 */
import { PrismaClient, Role, ProductCondition, DeliveryType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env';
import { BCRYPT_COST } from '../src/config/security';

const prisma = new PrismaClient();

const IMAGENES: Record<string, string> = {
  ropa: 'ropa.jpg',
  herramientas: 'herramientas.jpg',
  electrodomesticos: 'electrodomesticos.jpg',
  juguetes: 'juguetes.jpg',
  mascotas: 'mascotas.jpg',
  videojuegos: 'videojuegos.jpg',
};
const imagen = (slug: string) => `${env.BACKEND_URL}/seed-assets/categories/${IMAGENES[slug]}`;
const avatar = (n: number) => `${env.BACKEND_URL}/seed-assets/avatars/avatar-${(n % 5) + 1}.jpg`;

interface ProductoSeed { nombre: string; categoria: string; precio: number; stock: number; descripcion: string; marca?: string; destacado?: boolean }
interface VendedorSeed {
  correo: string; nombre: string; apellido: string; tienda: string; descripcion: string; rubro: string; slugSuperior: string;
  prefijoSku: string; zona: string; latitud: number; longitud: number; telefono: string; productos: ProductoSeed[];
}
interface SubastaSeed {
  titulo: string; descripcion: string; correo: string; categoria: string; slugSuperior: string;
  inicial: number; reserva?: number; compraYa?: number; incremento: number;
}

const VENDEDORES: VendedorSeed[] = [
  {
    correo: 'lucia.mendoza@correo.example', nombre: 'Lucía', apellido: 'Mendoza', tienda: 'Moda Chapaca',
    descripcion: 'Ropa de abrigo y de diario para toda la familia, con prendas de tejido local y confección en Tarija.',
    rubro: 'Ropa', slugSuperior: 'ropa', prefijoSku: 'MCH', zona: 'Barrio Moto Méndez', latitud: -21.5389, longitud: -64.7311, telefono: '+59171234501',
    productos: [
      { nombre: 'Chompa de lana de alpaca', categoria: 'ropa-camperas', precio: 220, stock: 14, descripcion: 'Chompa tejida en lana de alpaca, abrigada y liviana, en tonos tierra.' },
      { nombre: 'Campera de abrigo para invierno', categoria: 'ropa-camperas', precio: 320, stock: 10, descripcion: 'Campera con relleno sintético y capucha desmontable.', destacado: true },
      { nombre: 'Pantalón de jean clásico', categoria: 'ropa-pantalones', precio: 180, stock: 25, descripcion: 'Jean de corte recto en tela resistente, tallas 28 a 38.' },
      { nombre: 'Polera de algodón básica', categoria: 'ropa-remeras', precio: 65, stock: 40, descripcion: 'Polera de algodón de manga corta, varios colores.' },
      { nombre: 'Zapatillas urbanas', categoria: 'ropa-calzado', precio: 260, stock: 18, descripcion: 'Zapatillas livianas con suela antideslizante para uso diario.' },
    ],
  },
  {
    correo: 'jorge.calizaya@correo.example', nombre: 'Jorge', apellido: 'Calizaya', tienda: 'Ferretería Santa Anita',
    descripcion: 'Herramientas manuales y eléctricas, materiales de construcción pequeños y artículos de jardinería.',
    rubro: 'Herramientas', slugSuperior: 'herramientas', prefijoSku: 'FSA', zona: 'Mercado Campesino', latitud: -21.5471, longitud: -64.7240, telefono: '+59171234502',
    productos: [
      { nombre: 'Taladro percutor de 650 W', categoria: 'herramientas-el-ctricas', precio: 380, stock: 9, descripcion: 'Taladro con velocidad variable y maletín con brocas.', marca: 'Bosch', destacado: true },
      { nombre: 'Juego de destornilladores (12 piezas)', categoria: 'herramientas-manuales', precio: 75, stock: 30, descripcion: 'Puntas planas y de estrella con mango antideslizante.' },
      { nombre: 'Martillo de carpintero', categoria: 'herramientas-manuales', precio: 55, stock: 22, descripcion: 'Cabeza de acero forjado y mango de madera.' },
      { nombre: 'Manguera de jardín de 15 metros', categoria: 'herramientas-jardiner-a', precio: 110, stock: 16, descripcion: 'Manguera reforzada con conectores incluidos.' },
      { nombre: 'Candado de seguridad de 50 mm', categoria: 'herramientas-seguridad', precio: 48, stock: 35, descripcion: 'Candado de acero con tres llaves.' },
    ],
  },
  {
    correo: 'marcela.torrez@correo.example', nombre: 'Marcela', apellido: 'Torrez', tienda: 'ElectroHogar Tarija',
    descripcion: 'Electrodomésticos de cocina y pequeños equipos para el hogar, con garantía de la tienda.',
    rubro: 'Electrodomésticos', slugSuperior: 'electrodomesticos', prefijoSku: 'EHT', zona: 'Avenida Las Américas', latitud: -21.5297, longitud: -64.7349, telefono: '+59171234503',
    productos: [
      { nombre: 'Licuadora de 1,5 litros', categoria: 'electrodomesticos-peque-os', precio: 240, stock: 12, descripcion: 'Licuadora de vaso de vidrio con tres velocidades.' },
      { nombre: 'Horno microondas de 20 litros', categoria: 'electrodomesticos-microondas', precio: 780, stock: 6, descripcion: 'Microondas con panel digital y descongelado rápido.', destacado: true },
      { nombre: 'Plancha a vapor', categoria: 'electrodomesticos-peque-os', precio: 160, stock: 15, descripcion: 'Plancha con suela antiadherente y tanque de 300 ml.' },
      { nombre: 'Hervidor eléctrico de 1,7 litros', categoria: 'electrodomesticos-peque-os', precio: 130, stock: 20, descripcion: 'Hervidor de acero con apagado automático.' },
      { nombre: 'Cocina a gas de 4 hornallas', categoria: 'electrodomesticos-cocinas', precio: 1450, stock: 4, descripcion: 'Cocina con horno y encendido eléctrico.' },
    ],
  },
  {
    correo: 'veronica.rios@correo.example', nombre: 'Verónica', apellido: 'Ríos', tienda: 'Juguetería Pequeños Pasos',
    descripcion: 'Juguetes didácticos, juegos de mesa y peluches seleccionados por edades.',
    rubro: 'Juguetes', slugSuperior: 'juguetes', prefijoSku: 'JPP', zona: 'Plaza Luis de Fuentes', latitud: -21.5340, longitud: -64.7290, telefono: '+59171234504',
    productos: [
      { nombre: 'Bloques de construcción (120 piezas)', categoria: 'juguetes-construcci-n', precio: 130, stock: 20, descripcion: 'Bloques de colores compatibles entre sí, para mayores de 4 años.' },
      { nombre: 'Juego de mesa familiar', categoria: 'juguetes-juegos-de-mesa', precio: 95, stock: 24, descripcion: 'Juego de estrategia y azar para 2 a 6 jugadores.' },
      { nombre: 'Peluche oso grande', categoria: 'juguetes-peluches', precio: 150, stock: 12, descripcion: 'Peluche suave de 60 cm, lavable.', destacado: true },
      { nombre: 'Rompecabezas de 500 piezas', categoria: 'juguetes-juegos-de-mesa', precio: 70, stock: 28, descripcion: 'Rompecabezas con paisaje de los valles de Tarija.' },
      { nombre: 'Muñeca articulada con accesorios', categoria: 'juguetes-mu-ecos', precio: 110, stock: 16, descripcion: 'Muñeca de 30 cm con ropa intercambiable.' },
    ],
  },
  {
    correo: 'pablo.ustarez@correo.example', nombre: 'Pablo', apellido: 'Ustárez', tienda: 'Mundo Mascotas Tarija',
    descripcion: 'Alimento, camas y accesorios para perros y gatos, con entrega en la ciudad.',
    rubro: 'Mascotas', slugSuperior: 'mascotas', prefijoSku: 'MMT', zona: 'Barrio San Jerónimo', latitud: -21.5421, longitud: -64.7388, telefono: '+59171234505',
    productos: [
      { nombre: 'Alimento para perro adulto (15 kg)', categoria: 'mascotas-alimento', precio: 310, stock: 18, descripcion: 'Alimento balanceado con proteínas y fibra, bolsa de 15 kg.', destacado: true },
      { nombre: 'Alimento para gato (3 kg)', categoria: 'mascotas-alimento', precio: 120, stock: 25, descripcion: 'Croquetas con pescado para gatos adultos.' },
      { nombre: 'Cama acolchada mediana', categoria: 'mascotas-accesorios-para-mascotas', precio: 140, stock: 10, descripcion: 'Cama lavable con base antideslizante.' },
      { nombre: 'Correa retráctil de 5 metros', categoria: 'mascotas-accesorios-para-mascotas', precio: 85, stock: 20, descripcion: 'Correa con freno y mango ergonómico.' },
      { nombre: 'Pelota de goma para perros', categoria: 'mascotas-juguetes-para-mascotas', precio: 25, stock: 50, descripcion: 'Pelota resistente que rebota y flota.' },
    ],
  },
  {
    correo: 'diego.cuellar@correo.example', nombre: 'Diego', apellido: 'Cuéllar', tienda: 'Bit Tarija Gaming',
    descripcion: 'Videojuegos, controles y accesorios gamer para consolas y computadora.',
    rubro: 'Videojuegos', slugSuperior: 'videojuegos', prefijoSku: 'BTG', zona: 'Calle Bolívar', latitud: -21.5333, longitud: -64.7282, telefono: '+59171234506',
    productos: [
      { nombre: 'Control inalámbrico para consola', categoria: 'videojuegos-accesorios-gaming', precio: 350, stock: 11, descripcion: 'Control con vibración y batería recargable.', destacado: true },
      { nombre: 'Auriculares gamer con micrófono', categoria: 'videojuegos-accesorios-gaming', precio: 220, stock: 15, descripcion: 'Auriculares con sonido envolvente y almohadillas suaves.' },
      { nombre: 'Teclado mecánico retroiluminado', categoria: 'videojuegos-accesorios-gaming', precio: 410, stock: 8, descripcion: 'Teclado con interruptores mecánicos y luces de colores.' },
      { nombre: 'Juego de fútbol para consola', categoria: 'videojuegos-juegos', precio: 290, stock: 14, descripcion: 'Edición del año con ligas y selecciones.' },
      { nombre: 'Mouse gamer de 6 botones', categoria: 'videojuegos-accesorios-gaming', precio: 130, stock: 22, descripcion: 'Mouse óptico de 7200 DPI con peso ajustable.' },
    ],
  },
];

const COMPRADORES = [
  { correo: 'camila.vargas@correo.example', nombre: 'Camila', apellido: 'Vargas', zona: 'Barrio Luis Espinal' },
  { correo: 'rodrigo.paz@correo.example', nombre: 'Rodrigo', apellido: 'Paz', zona: 'Barrio Aeropuerto' },
  { correo: 'sofia.guzman@correo.example', nombre: 'Sofía', apellido: 'Guzmán', zona: 'Barrio El Molino' },
  { correo: 'mauricio.rojas@correo.example', nombre: 'Mauricio', apellido: 'Rojas', zona: 'Barrio Juan Pablo II' },
];

const DIAS_SUBASTA = 30;
const SUBASTAS: SubastaSeed[] = [
  { titulo: 'Chompa tejida a mano (pieza única)', descripcion: 'Chompa de lana tejida a mano por una artesana de San Lorenzo, talla M, sin uso.', correo: 'lucia.mendoza@correo.example', categoria: 'ropa-camperas', slugSuperior: 'ropa', inicial: 120, reserva: 200, compraYa: 420, incremento: 10 },
  { titulo: 'Taladro de banco de segunda mano', descripcion: 'Taladro de banco de columna, funcionando, con mandril nuevo. Se entrega probado.', correo: 'jorge.calizaya@correo.example', categoria: 'herramientas-el-ctricas', slugSuperior: 'herramientas', inicial: 300, reserva: 450, incremento: 20 },
  { titulo: 'Microondas usado en buen estado', descripcion: 'Horno microondas de 25 litros, dos años de uso, con plato giratorio original.', correo: 'marcela.torrez@correo.example', categoria: 'electrodomesticos-microondas', slugSuperior: 'electrodomesticos', inicial: 250, reserva: 350, compraYa: 600, incremento: 15 },
  { titulo: 'Juego de ajedrez de madera tallada', descripcion: 'Tablero y piezas de madera tallada a mano, caja incluida.', correo: 'veronica.rios@correo.example', categoria: 'juguetes-juegos-de-mesa', slugSuperior: 'juguetes', inicial: 90, reserva: 150, incremento: 10 },
  { titulo: 'Transportadora para mascotas grande', descripcion: 'Transportadora rígida para perro mediano, con seguro de puerta y bandeja removible.', correo: 'pablo.ustarez@correo.example', categoria: 'mascotas-accesorios-para-mascotas', slugSuperior: 'mascotas', inicial: 100, reserva: 170, incremento: 10 },
  { titulo: 'Consola retro con 2 controles', descripcion: 'Consola retro de colección con dos controles y cables originales, funcionando.', correo: 'diego.cuellar@correo.example', categoria: 'videojuegos-consolas', slugSuperior: 'videojuegos', inicial: 400, reserva: 600, compraYa: 950, incremento: 25 },
  { titulo: 'Abrigo de invierno talla L', descripcion: 'Abrigo largo de paño, talla L, usado una temporada, en perfecto estado.', correo: 'lucia.mendoza@correo.example', categoria: 'ropa-camperas', slugSuperior: 'ropa', inicial: 150, reserva: 220, incremento: 10 },
  { titulo: 'Juego de llaves combinadas (14 piezas)', descripcion: 'Llaves combinadas de acero cromo vanadio de 8 a 24 mm, con estuche.', correo: 'jorge.calizaya@correo.example', categoria: 'herramientas-manuales', slugSuperior: 'herramientas', inicial: 80, reserva: 120, incremento: 5 },
];

async function categoriaPorSlug(slug: string) {
  const c = await prisma.category.findUnique({ where: { slug } });
  if (c) return c;
  const partes = slug.split('-');
  for (let n = partes.length - 1; n >= 1; n--) {
    const padre = await prisma.category.findUnique({ where: { slug: partes.slice(0, n).join('-') } });
    if (padre) return padre;
  }
  throw new Error(`No existe la categoría "${slug}". Ejecuta antes prisma/seed-prod.ts.`);
}

async function crearVendedor(v: VendedorSeed, passwordHash: string, indice: number) {
  const usuario = await prisma.user.upsert({
    where: { email: v.correo },
    update: {},
    create: {
      email: v.correo, passwordHash, firstName: v.nombre, lastName: v.apellido, role: Role.SELLER,
      phone: v.telefono, whatsappPhone: v.telefono, profileImage: avatar(indice),
      storeName: v.tienda, storeDescription: v.descripcion, storeCategory: v.rubro,
      storeLogo: imagen(v.slugSuperior), storeBanner: imagen(v.slugSuperior),
      locationCity: 'Tarija', locationState: 'Tarija', country: 'BO',
      latitude: v.latitud, longitude: v.longitud, locationVerified: false,
      isApproved: true, isVerified: false, isActive: true,
    },
  });
  let creados = 0;
  for (const [i, p] of v.productos.entries()) {
    const slug = `${p.nombre}-${v.prefijoSku}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (await prisma.product.findUnique({ where: { slug } })) continue;
    const categoria = await categoriaPorSlug(p.categoria);
    await prisma.product.create({
      data: {
        sellerId: usuario.id, categoryId: categoria.id, name: p.nombre, slug, description: p.descripcion,
        condition: ProductCondition.NEW, price: p.precio, stock: p.stock, brand: p.marca ?? null,
        sku: `${v.prefijoSku}-${String(i + 1).padStart(4, '0')}`,
        deliveryTypes: [DeliveryType.PRESENCIAL, DeliveryType.RETIRO, DeliveryType.DELIVERY],
        isActive: true, isApproved: true, isFeatured: !!p.destacado,
        images: { create: [{ url: imagen(v.slugSuperior), order: 0, isPrimary: true }] },
      },
    });
    creados++;
  }
  return { usuario, creados };
}

async function crearSubasta(s: SubastaSeed, vendedores: Map<string, number>) {
  const sellerId = vendedores.get(s.correo);
  if (!sellerId) throw new Error(`Vendedor desconocido: ${s.correo}`);
  if (await prisma.auction.findFirst({ where: { sellerId, title: s.titulo } })) return false;
  const categoria = await categoriaPorSlug(s.categoria);
  await prisma.auction.create({
    data: {
      sellerId, title: s.titulo, description: s.descripcion, categoryId: categoria.id, imageUrl: imagen(s.slugSuperior),
      startingPrice: s.inicial, currentPrice: s.inicial, reservePrice: s.reserva ?? null, buyNowPrice: s.compraYa ?? null,
      minIncrement: s.incremento, maxIncrement: s.incremento * 10,
      endDate: new Date(Date.now() + DIAS_SUBASTA * 24 * 60 * 60 * 1000), isActive: true,
    },
  });
  return true;
}

async function main() {
  const clave = process.env.COMUNIDAD_PASSWORD;
  if (!clave || clave.length < 10) throw new Error('Define COMUNIDAD_PASSWORD (mínimo 10 caracteres) en el entorno.');
  const baseLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '');
  if (!baseLocal && /localhost/.test(env.BACKEND_URL)) {
    throw new Error('Define BACKEND_URL con la URL pública de la API (por ejemplo https://lacase-diplomado-api.onrender.com) antes de sembrar una base remota.');
  }
  const passwordHash = await bcrypt.hash(clave, BCRYPT_COST);

  const vendedores = new Map<string, number>();
  let productos = 0;
  for (const [i, v] of VENDEDORES.entries()) {
    const { usuario, creados } = await crearVendedor(v, passwordHash, i);
    vendedores.set(v.correo, usuario.id);
    productos += creados;
  }
  for (const [i, c] of COMPRADORES.entries()) {
    await prisma.user.upsert({
      where: { email: c.correo },
      update: {},
      create: {
        email: c.correo, passwordHash, firstName: c.nombre, lastName: c.apellido, role: Role.CUSTOMER,
        profileImage: avatar(i + 2), locationCity: 'Tarija', locationState: 'Tarija', country: 'BO', isActive: true,
      },
    });
  }
  let subastas = 0;
  for (const s of SUBASTAS) if (await crearSubasta(s, vendedores)) subastas++;
  console.log(`Cuentas de ejemplo: ${VENDEDORES.length} vendedores y ${COMPRADORES.length} compradores; ${productos} productos y ${subastas} subastas nuevas (cierre en ${DIAS_SUBASTA} días).`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : 'Error en el seed de la comunidad');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
