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
  antiguedades: 'antiguedades.jpg',
  artesanias: 'artesanias.jpg',
  'bar-y-bebidas': 'bar-y-bebidas.jpg',
  celulares: 'celulares.png',
  deportes: 'deportes.jpg',
  electrodomesticos: 'electrodomesticos.jpg',
  hardware: 'hardware.jpg',
  herramientas: 'herramientas.jpg',
  'hogar-y-muebles': 'hogar-y-muebles.jpg',
  juguetes: 'juguetes.jpg',
  'libros-y-papeleria': 'libros-y-papeleria.jpg',
  mascotas: 'mascotas.jpg',
  'musica-e-instrumentos': 'musica-e-instrumentos.jpg',
  perifericos: 'perifericos.jpg',
  ropa: 'ropa.jpg',
  'salud-y-belleza': 'salud-y-belleza.jpg',
  videojuegos: 'videojuegos.jpg',
};
/** Imagen de la categoría de nivel superior a la que pertenece el slug (p. ej. «ropa-camperas» → ropa.jpg). */
const imagenDe = (slugCategoria: string) => {
  const clave = Object.keys(IMAGENES).find((k) => slugCategoria === k || slugCategoria.startsWith(k + '-'));
  if (!clave) throw new Error(`Sin imagen para la categoría ${slugCategoria}`);
  return `${env.BACKEND_URL}/seed-assets/categories/${IMAGENES[clave]}`;
};
const avatar = (n: number) => `${env.BACKEND_URL}/seed-assets/avatars/avatar-${(n % 5) + 1}.jpg`;

interface ProductoSeed { nombre: string; categoria: string; precio: number; stock: number; descripcion: string; marca?: string; destacado?: boolean }
interface VendedorSeed {
  correo: string; nombre: string; apellido: string; tienda: string; descripcion: string; rubro: string; categoriaLogo: string;
  prefijoSku: string; latitud: number; longitud: number; telefono: string; productos: ProductoSeed[];
}
interface SubastaSeed {
  titulo: string; descripcion: string; correo: string; categoria: string; inicial: number; reserva?: number; compraYa?: number; incremento: number;
}

// Precios en bolivianos, siempre enteros (sin centavos).
const VENDEDORES: VendedorSeed[] = [
  {
    correo: 'lucia.mamani@correo.example', nombre: 'Lucía', apellido: 'Mamani', tienda: 'Tejidos y Moda Los Andes',
    descripcion: 'Ropa de abrigo, tejidos de lana y artesanías andinas para toda la familia, con prendas hechas por tejedoras de los valles de Tarija.',
    rubro: 'Ropa', categoriaLogo: 'ropa', prefijoSku: 'TMA', latitud: -21.5389, longitud: -64.7311, telefono: '+59171234501',
    productos: [
      { nombre: 'Chompa de lana de alpaca', categoria: 'ropa-camperas', precio: 220, stock: 14, descripcion: 'Chompa tejida en lana de alpaca, abrigada y liviana, en tonos tierra.' },
      { nombre: 'Chullo andino tejido a mano', categoria: 'ropa-accesorios', precio: 65, stock: 30, descripcion: 'Gorro con orejeras tejido en lana de oveja, con guardas tradicionales.' },
      { nombre: 'Campera de abrigo para invierno', categoria: 'ropa-camperas', precio: 320, stock: 10, descripcion: 'Campera con relleno sintético y capucha desmontable.', destacado: true },
      { nombre: 'Aguayo multicolor tejido', categoria: 'artesanias-tejidos', precio: 180, stock: 16, descripcion: 'Manta andina de colores vivos, usada para cargar o decorar.', destacado: true },
      { nombre: 'Manta de lana de oveja', categoria: 'hogar-y-muebles-blanquer-a', precio: 260, stock: 12, descripcion: 'Manta gruesa tejida a telar, de 1,60 por 2 metros.' },
      { nombre: 'Pantalón de jean clásico', categoria: 'ropa-pantalones', precio: 180, stock: 25, descripcion: 'Jean de corte recto en tela resistente, tallas 28 a 38.' },
      { nombre: 'Zapatillas urbanas', categoria: 'ropa-calzado', precio: 260, stock: 18, descripcion: 'Zapatillas livianas con suela antideslizante para uso diario.' },
    ],
  },
  {
    correo: 'jorge.condori@correo.example', nombre: 'Jorge', apellido: 'Condori', tienda: 'Ferretería Santa Anita',
    descripcion: 'Herramientas manuales y eléctricas, artículos de jardinería, iluminación para el hogar y bicicletas.',
    rubro: 'Herramientas', categoriaLogo: 'herramientas', prefijoSku: 'FSA', latitud: -21.5471, longitud: -64.7240, telefono: '+59171234502',
    productos: [
      { nombre: 'Taladro percutor de 650 W', categoria: 'herramientas-el-ctricas', precio: 380, stock: 9, descripcion: 'Taladro con velocidad variable y maletín con brocas.', marca: 'Bosch', destacado: true },
      { nombre: 'Juego de destornilladores (12 piezas)', categoria: 'herramientas-manuales', precio: 75, stock: 30, descripcion: 'Puntas planas y de estrella con mango antideslizante.' },
      { nombre: 'Manguera de jardín de 15 metros', categoria: 'herramientas-jardiner-a', precio: 110, stock: 16, descripcion: 'Manguera reforzada con conectores incluidos.' },
      { nombre: 'Candado de seguridad de 50 mm', categoria: 'herramientas-seguridad', precio: 48, stock: 35, descripcion: 'Candado de acero con tres llaves.' },
      { nombre: 'Lámpara LED de mesa', categoria: 'hogar-y-muebles-iluminaci-n', precio: 85, stock: 20, descripcion: 'Lámpara con brazo flexible y luz cálida de bajo consumo.' },
      { nombre: 'Silla plegable de madera', categoria: 'hogar-y-muebles-muebles-para-hogar', precio: 145, stock: 14, descripcion: 'Silla plegable de madera de pino barnizada.' },
      { nombre: 'Bicicleta de montaña rodado 26', categoria: 'deportes-bicicletas', precio: 1650, stock: 5, descripcion: 'Bicicleta de 21 velocidades con frenos de disco y suspensión delantera.', destacado: true },
    ],
  },
  {
    correo: 'marcela.quispe@correo.example', nombre: 'Marcela', apellido: 'Quispe', tienda: 'ElectroHogar Tarija',
    descripcion: 'Electrodomésticos de cocina, cuidado personal y artículos para el hogar, con garantía de la tienda.',
    rubro: 'Electrodomésticos', categoriaLogo: 'electrodomesticos', prefijoSku: 'EHT', latitud: -21.5297, longitud: -64.7349, telefono: '+59171234503',
    productos: [
      { nombre: 'Licuadora de 1,5 litros', categoria: 'electrodomesticos-peque-os', precio: 240, stock: 12, descripcion: 'Licuadora de vaso de vidrio con tres velocidades.' },
      { nombre: 'Horno microondas de 20 litros', categoria: 'electrodomesticos-microondas', precio: 780, stock: 6, descripcion: 'Microondas con panel digital y descongelado rápido.', destacado: true },
      { nombre: 'Cocina a gas de 4 hornallas', categoria: 'electrodomesticos-cocinas', precio: 1450, stock: 4, descripcion: 'Cocina con horno y encendido eléctrico.' },
      { nombre: 'Secador de pelo de 2000 W', categoria: 'salud-y-belleza-cuidado-personal', precio: 150, stock: 18, descripcion: 'Secador con dos velocidades y boquilla concentradora.' },
      { nombre: 'Perfume floral de 100 ml', categoria: 'salud-y-belleza-perfumes', precio: 190, stock: 15, descripcion: 'Fragancia floral de larga duración.' },
      { nombre: 'Juego de ollas de aluminio (5 piezas)', categoria: 'hogar-y-muebles-decoraci-n', precio: 310, stock: 10, descripcion: 'Set de cocina con tapas de vidrio, apto para gas y eléctrica.' },
      { nombre: 'Smartwatch con monitor de ritmo cardíaco', categoria: 'celulares-smartwatches', precio: 330, stock: 13, descripcion: 'Reloj inteligente con notificaciones, podómetro y batería de cinco días.' },
    ],
  },
  {
    correo: 'veronica.choque@correo.example', nombre: 'Verónica', apellido: 'Choque', tienda: 'Librería y Juguetería El Arlequín',
    descripcion: 'Libros, útiles escolares, juguetes didácticos e instrumentos andinos para niños y jóvenes.',
    rubro: 'Libros y Papelería', categoriaLogo: 'libros-y-papeleria', prefijoSku: 'LJA', latitud: -21.5340, longitud: -64.7290, telefono: '+59171234504',
    productos: [
      { nombre: 'Cuaderno universitario de 100 hojas', categoria: 'libros-y-papeleria-papeler-a', precio: 18, stock: 80, descripcion: 'Cuaderno cuadriculado con tapa dura, pack de tres unidades.' },
      { nombre: 'Atlas geográfico de Bolivia', categoria: 'libros-y-papeleria-educativos', precio: 95, stock: 20, descripcion: 'Atlas escolar con mapas departamentales y datos de cada región.', destacado: true },
      { nombre: 'Novela boliviana de bolsillo', categoria: 'libros-y-papeleria-novelas', precio: 60, stock: 25, descripcion: 'Novela de autor boliviano en edición de bolsillo.' },
      { nombre: 'Bloques de construcción (120 piezas)', categoria: 'juguetes-construcci-n', precio: 130, stock: 20, descripcion: 'Bloques de colores compatibles entre sí, para mayores de 4 años.' },
      { nombre: 'Rompecabezas de 500 piezas', categoria: 'juguetes-juegos-de-mesa', precio: 70, stock: 28, descripcion: 'Rompecabezas con paisaje de los valles de Tarija.' },
      { nombre: 'Zampoña de caña de 13 tubos', categoria: 'musica-e-instrumentos-instrumentos-de-viento', precio: 160, stock: 10, descripcion: 'Zampoña andina afinada, con funda de tela.' },
      { nombre: 'Charango de madera para estudio', categoria: 'musica-e-instrumentos-guitarras', precio: 420, stock: 6, descripcion: 'Charango de diez cuerdas con caja de madera, ideal para aprender.', destacado: true },
    ],
  },
  {
    correo: 'pablo.ustarez@correo.example', nombre: 'Pablo', apellido: 'Ustárez', tienda: 'Mundo Mascotas Tarija',
    descripcion: 'Alimento, camas y accesorios para perros y gatos, además de equipos de camping y cuidado personal.',
    rubro: 'Mascotas', categoriaLogo: 'mascotas', prefijoSku: 'MMT', latitud: -21.5421, longitud: -64.7388, telefono: '+59171234505',
    productos: [
      { nombre: 'Alimento para perro adulto (15 kg)', categoria: 'mascotas-alimento', precio: 310, stock: 18, descripcion: 'Alimento balanceado con proteínas y fibra, bolsa de 15 kg.', destacado: true },
      { nombre: 'Alimento para gato (3 kg)', categoria: 'mascotas-alimento', precio: 120, stock: 25, descripcion: 'Croquetas con pescado para gatos adultos.' },
      { nombre: 'Cama acolchada mediana', categoria: 'mascotas-accesorios-para-mascotas', precio: 140, stock: 10, descripcion: 'Cama lavable con base antideslizante.' },
      { nombre: 'Pelota de goma para perros', categoria: 'mascotas-juguetes-para-mascotas', precio: 25, stock: 50, descripcion: 'Pelota resistente que rebota y flota.' },
      { nombre: 'Carpa para 4 personas', categoria: 'deportes-camping', precio: 520, stock: 7, descripcion: 'Carpa impermeable de armado rápido, ideal para una salida al Valle de la Concepción.', destacado: true },
      { nombre: 'Linterna recargable de camping', categoria: 'deportes-camping', precio: 90, stock: 24, descripcion: 'Linterna LED con tres modos y carga por USB.' },
      { nombre: 'Shampoo para mascotas de 500 ml', categoria: 'salud-y-belleza-cuidado-personal', precio: 45, stock: 30, descripcion: 'Shampoo hipoalergénico con aroma suave.' },
    ],
  },
  {
    correo: 'diego.cuellar@correo.example', nombre: 'Diego', apellido: 'Cuéllar', tienda: 'Bit Tarija Gaming',
    descripcion: 'Videojuegos, componentes de computadora, periféricos y accesorios para celular.',
    rubro: 'Videojuegos', categoriaLogo: 'videojuegos', prefijoSku: 'BTG', latitud: -21.5333, longitud: -64.7282, telefono: '+59171234506',
    productos: [
      { nombre: 'Control inalámbrico para consola', categoria: 'videojuegos-accesorios-gaming', precio: 350, stock: 11, descripcion: 'Control con vibración y batería recargable.', destacado: true },
      { nombre: 'Juego de fútbol para consola', categoria: 'videojuegos-juegos', precio: 290, stock: 14, descripcion: 'Edición del año con ligas y selecciones.' },
      { nombre: 'Disco sólido SSD de 480 GB', categoria: 'hardware-almacenamiento', precio: 330, stock: 16, descripcion: 'Unidad SSD SATA de alta velocidad para laptop o computadora de escritorio.' },
      { nombre: 'Memoria RAM DDR4 de 8 GB', categoria: 'hardware-memorias-ram', precio: 260, stock: 20, descripcion: 'Módulo de 3200 MHz compatible con la mayoría de las placas.' },
      { nombre: 'Teclado mecánico retroiluminado', categoria: 'perifericos-teclados', precio: 410, stock: 8, descripcion: 'Teclado con interruptores mecánicos y luces de colores.' },
      { nombre: 'Mouse gamer de 6 botones', categoria: 'perifericos-mouse', precio: 130, stock: 22, descripcion: 'Mouse óptico de 7200 DPI con peso ajustable.' },
      { nombre: 'Cargador rápido de 25 W', categoria: 'celulares-cargadores', precio: 90, stock: 35, descripcion: 'Cargador de pared con salida USB-C y cable de 1 m incluido.' },
    ],
  },
];

const COMPRADORES = [
  { correo: 'camila.ayala@correo.example', nombre: 'Camila', apellido: 'Ayala' },
  { correo: 'rodrigo.mendieta@correo.example', nombre: 'Rodrigo', apellido: 'Mendieta' },
  { correo: 'sofia.aguirre@correo.example', nombre: 'Sofía', apellido: 'Aguirre' },
  { correo: 'mauricio.tapia@correo.example', nombre: 'Mauricio', apellido: 'Tapia' },
];

const DIAS_SUBASTA = 30;
const SUBASTAS: SubastaSeed[] = [
  { titulo: 'Poncho tejido a mano (pieza única)', descripcion: 'Poncho de lana de oveja tejido a mano por una artesana de San Lorenzo, talla única, sin uso.', correo: 'lucia.mamani@correo.example', categoria: 'ropa-camperas', inicial: 180, reserva: 280, compraYa: 520, incremento: 10 },
  { titulo: 'Taladro de banco de segunda mano', descripcion: 'Taladro de banco de columna, funcionando, con mandril nuevo. Se entrega probado.', correo: 'jorge.condori@correo.example', categoria: 'herramientas-el-ctricas', inicial: 300, reserva: 450, incremento: 20 },
  { titulo: 'Microondas usado en buen estado', descripcion: 'Horno microondas de 25 litros, dos años de uso, con plato giratorio original.', correo: 'marcela.quispe@correo.example', categoria: 'electrodomesticos-microondas', inicial: 250, reserva: 350, compraYa: 600, incremento: 15 },
  { titulo: 'Charango de colección de madera de nogal', descripcion: 'Charango artesanal de nogal con clavijero tallado, afinado y con funda.', correo: 'veronica.choque@correo.example', categoria: 'musica-e-instrumentos-guitarras', inicial: 350, reserva: 550, compraYa: 900, incremento: 20 },
  { titulo: 'Transportadora para mascotas grande', descripcion: 'Transportadora rígida para perro mediano, con seguro de puerta y bandeja removible.', correo: 'pablo.ustarez@correo.example', categoria: 'mascotas-accesorios-para-mascotas', inicial: 100, reserva: 170, incremento: 10 },
  { titulo: 'Consola retro con 2 controles', descripcion: 'Consola retro de colección con dos controles y cables originales, funcionando.', correo: 'diego.cuellar@correo.example', categoria: 'videojuegos-consolas', inicial: 400, reserva: 600, compraYa: 950, incremento: 25 },
  { titulo: 'Bicicleta de ruta usada rodado 28', descripcion: 'Bicicleta de ruta de aluminio, 18 velocidades, recién revisada, lista para usar.', correo: 'jorge.condori@correo.example', categoria: 'deportes-bicicletas', inicial: 700, reserva: 1000, compraYa: 1500, incremento: 30 },
  { titulo: 'Colección de cuentos bolivianos (3 tomos)', descripcion: 'Tres tomos de cuentos de autores bolivianos, tapa blanda, en buen estado.', correo: 'veronica.choque@correo.example', categoria: 'libros-y-papeleria-novelas', inicial: 80, reserva: 130, incremento: 5 },
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
      storeLogo: imagenDe(v.categoriaLogo), storeBanner: imagenDe(v.categoriaLogo),
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
        images: { create: [{ url: imagenDe(p.categoria), order: 0, isPrimary: true }] },
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
      sellerId, title: s.titulo, description: s.descripcion, categoryId: categoria.id, imageUrl: imagenDe(s.categoria),
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
