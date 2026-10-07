/**
 * Contenido inicial con contexto de Tarija (Bolivia): tiendas, productos, subastas y publicaciones del foro en
 * distintas categorías, para que la plataforma no se vea vacía mientras se registran los primeros vendedores reales.
 *
 * - Idempotente: puede ejecutarse varias veces; no duplica tiendas, productos, subastas ni publicaciones.
 * - Son perfiles de DEMOSTRACIÓN (nombres de tienda y personas ficticios): la descripción de cada tienda lo indica y
 *   NO se marcan como verificadas. No tienen contraseña utilizable, así que nadie puede iniciar sesión con ellas.
 * - No toca cuentas existentes ni usa variables de entorno con claves.
 *
 * Requiere haber ejecutado antes seed-prod.ts (categorías de productos) y seed-forum.ts (categorías del foro).
 * Ejecutar:  npx tsx prisma/seed-tarija.ts
 */
import { PrismaClient, Role, ProductCondition, DeliveryType, ForumPostType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../src/config/env';
import { BCRYPT_COST } from '../src/config/security';
import { ensureForumProfile } from '../src/services/forum.service';

const prisma = new PrismaClient();

const IMAGENES: Record<string, string> = {
  artesanias: 'artesanias.jpg',
  'bar-y-bebidas': 'bar-y-bebidas.jpg',
  celulares: 'celulares.png',
  'hogar-y-muebles': 'hogar-y-muebles.jpg',
  'musica-e-instrumentos': 'musica-e-instrumentos.jpg',
  'libros-y-papeleria': 'libros-y-papeleria.jpg',
  deportes: 'deportes.jpg',
  antiguedades: 'antiguedades.jpg',
};
const imagen = (slugSuperior: string) => `${env.BACKEND_URL}/seed-assets/categories/${IMAGENES[slugSuperior]}`;

interface ProductoSeed {
  nombre: string;
  categoria: string; // slug de la categoría hija (o superior)
  precio: number;
  stock: number;
  descripcion: string;
  marca?: string;
  destacado?: boolean;
}
interface TiendaSeed {
  correo: string;
  nombre: string;
  apellido: string;
  tienda: string;
  descripcion: string;
  rubro: string;
  slugSuperior: string; // para la imagen
  prefijoSku: string;
  zona: string;
  latitud: number;
  longitud: number;
  productos: ProductoSeed[];
}

const NOTA = ' Perfil de demostración con datos iniciales.';

const TIENDAS: TiendaSeed[] = [
  {
    correo: 'ceramica.cintis@lacase.test', nombre: 'Rosa', apellido: 'Vaca', tienda: 'Cerámica y Tejidos del Valle',
    descripcion: 'Piezas de barro y tejidos de lana hechos por artesanos del valle central de Tarija.' + NOTA,
    rubro: 'Artesanías', slugSuperior: 'artesanias', prefijoSku: 'CTV', zona: 'San Roque', latitud: -21.5318, longitud: -64.7335,
    productos: [
      { nombre: 'Cántaro de barro decorado', categoria: 'artesanias-cer-mica', precio: 85, stock: 12, descripcion: 'Cántaro de barro cocido con motivos pintados a mano. Alto aproximado: 28 cm.', destacado: true },
      { nombre: 'Juego de 4 tazas de barro', categoria: 'artesanias-cer-mica', precio: 120, stock: 15, descripcion: 'Cuatro tazas de cerámica esmaltada por dentro, aptas para bebidas calientes.' },
      { nombre: 'Chalina de lana de oveja', categoria: 'artesanias-tejidos', precio: 150, stock: 9, descripcion: 'Chalina tejida a mano en lana de oveja, en colores naturales. Largo: 1,60 m.' },
      { nombre: 'Poncho tejido para niños', categoria: 'artesanias-tejidos', precio: 190, stock: 6, descripcion: 'Poncho de lana tejido a telar, talla de 4 a 8 años.' },
      { nombre: 'Jarra de cerámica con tapa', categoria: 'artesanias-cer-mica', precio: 95, stock: 10, descripcion: 'Jarra de un litro con tapa, ideal para servir bebidas frías.' },
    ],
  },
  {
    correo: 'bodega.valledulce@lacase.test', nombre: 'Gonzalo', apellido: 'Arce', tienda: 'Bodega Valle Dulce',
    descripcion: 'Vinos, singanis y licores de uva elaborados en los valles de Tarija. Venta a mayores de 18 años.' + NOTA,
    rubro: 'Bar y Bebidas', slugSuperior: 'bar-y-bebidas', prefijoSku: 'BVD', zona: 'Avenida La Banda', latitud: -21.5262, longitud: -64.7252,
    productos: [
      { nombre: 'Vino tinto Cabernet Sauvignon 750 ml', categoria: 'bar-y-bebidas-vinos', precio: 75, stock: 40, descripcion: 'Vino tinto de altura, cosecha reciente, con notas de frutos rojos.', marca: 'Valle Dulce', destacado: true },
      { nombre: 'Vino blanco Torrontés 750 ml', categoria: 'bar-y-bebidas-vinos', precio: 70, stock: 30, descripcion: 'Vino blanco aromático, fresco y de acidez media.', marca: 'Valle Dulce' },
      { nombre: 'Singani reserva 750 ml', categoria: 'bar-y-bebidas-licores', precio: 95, stock: 25, descripcion: 'Destilado de uva moscatel, añejado en barrica de roble.', marca: 'Valle Dulce' },
      { nombre: 'Licor artesanal de uva 500 ml', categoria: 'bar-y-bebidas-licores', precio: 55, stock: 18, descripcion: 'Licor dulce elaborado con uva de la zona.', marca: 'Valle Dulce' },
      { nombre: 'Caja de 6 vinos tintos', categoria: 'bar-y-bebidas-vinos', precio: 390, stock: 8, descripcion: 'Caja de seis botellas de vino tinto para regalo o reuniones.', marca: 'Valle Dulce' },
    ],
  },
  {
    correo: 'tecno.centro@lacase.test', nombre: 'Daniela', apellido: 'Flores', tienda: 'Tecno Tarija Centro',
    descripcion: 'Accesorios y repuestos para celulares, con atención en el centro de la ciudad.' + NOTA,
    rubro: 'Celulares', slugSuperior: 'celulares', prefijoSku: 'TTC', zona: 'Centro', latitud: -21.5355, longitud: -64.7296,
    productos: [
      { nombre: 'Funda reforzada para celular', categoria: 'celulares-fundas', precio: 35, stock: 60, descripcion: 'Funda de silicona con bordes elevados que protege la pantalla y la cámara.' },
      { nombre: 'Cargador rápido de 25 W', categoria: 'celulares-cargadores', precio: 90, stock: 35, descripcion: 'Cargador de pared con salida USB-C y cable de 1 m incluido.', destacado: true },
      { nombre: 'Cable USB-C de 1 metro', categoria: 'celulares-cargadores', precio: 25, stock: 80, descripcion: 'Cable trenzado resistente para carga y transferencia de datos.' },
      { nombre: 'Audífonos inalámbricos', categoria: 'celulares', precio: 140, stock: 22, descripcion: 'Audífonos con Bluetooth y estuche de carga, hasta 5 horas de uso.' },
      { nombre: 'Soporte de celular para auto', categoria: 'celulares', precio: 40, stock: 30, descripcion: 'Soporte con ventosa para tablero o parabrisas.' },
    ],
  },
  {
    correo: 'madera.chapaca@lacase.test', nombre: 'Julio', apellido: 'Cruz', tienda: 'Taller de Madera Chapaca',
    descripcion: 'Muebles pequeños y utensilios de madera fabricados a mano en nuestro taller.' + NOTA,
    rubro: 'Hogar y Muebles', slugSuperior: 'hogar-y-muebles', prefijoSku: 'TMC', zona: 'Miraflores', latitud: -21.5441, longitud: -64.7201,
    productos: [
      { nombre: 'Mesa auxiliar de algarrobo', categoria: 'hogar-y-muebles-muebles-para-hogar', precio: 380, stock: 5, descripcion: 'Mesa auxiliar de madera de algarrobo con acabado natural. Medidas: 45 x 45 x 50 cm.', destacado: true },
      { nombre: 'Banco rústico de madera', categoria: 'hogar-y-muebles-muebles-para-hogar', precio: 220, stock: 7, descripcion: 'Banco para recibidor o jardín, resistente y barnizado.' },
      { nombre: 'Tabla de picar de madera', categoria: 'hogar-y-muebles-decoraci-n', precio: 65, stock: 25, descripcion: 'Tabla gruesa de madera dura para cocina.' },
      { nombre: 'Portallaves de pared', categoria: 'hogar-y-muebles-decoraci-n', precio: 45, stock: 20, descripcion: 'Portallaves de madera con cinco ganchos.' },
    ],
  },
  {
    correo: 'musica.delvalle@lacase.test', nombre: 'Marcelo', apellido: 'Rojas', tienda: 'Música del Valle',
    descripcion: 'Instrumentos tradicionales y de estudio para la música chapaca y el folklore boliviano.' + NOTA,
    rubro: 'Música e Instrumentos', slugSuperior: 'musica-e-instrumentos', prefijoSku: 'MDV', zona: 'Las Panosas', latitud: -21.5297, longitud: -64.7384,
    productos: [
      { nombre: 'Caja chapaca de estudio', categoria: 'musica-e-instrumentos', precio: 300, stock: 6, descripcion: 'Caja tradicional con parche de cuero, ideal para quienes empiezan.', destacado: true },
      { nombre: 'Guitarra criolla de estudio', categoria: 'musica-e-instrumentos-guitarras', precio: 520, stock: 8, descripcion: 'Guitarra acústica de cuerdas de nailon, con funda.' },
      { nombre: 'Juego de cuerdas para guitarra', categoria: 'musica-e-instrumentos-guitarras', precio: 40, stock: 50, descripcion: 'Seis cuerdas de nailon con entorchado de acero.' },
      { nombre: 'Flauta dulce escolar', categoria: 'musica-e-instrumentos-instrumentos-de-viento', precio: 30, stock: 45, descripcion: 'Flauta de plástico con estuche, para clases de música.' },
    ],
  },
  {
    correo: 'libreria.laplaza@lacase.test', nombre: 'Patricia', apellido: 'Mendoza', tienda: 'Librería y Papelería La Plaza',
    descripcion: 'Útiles escolares, papelería y libros de estudio cerca de la plaza principal.' + NOTA,
    rubro: 'Libros y Papelería', slugSuperior: 'libros-y-papeleria', prefijoSku: 'LPL', zona: 'Centro', latitud: -21.5349, longitud: -64.7311,
    productos: [
      { nombre: 'Cuaderno universitario de 100 hojas', categoria: 'libros-y-papeleria-papeler-a', precio: 12, stock: 120, descripcion: 'Cuaderno con tapa dura y hojas rayadas.' },
      { nombre: 'Pack de 5 bolígrafos', categoria: 'libros-y-papeleria-papeler-a', precio: 15, stock: 90, descripcion: 'Bolígrafos de tinta azul de punta media.' },
      { nombre: 'Calculadora científica', categoria: 'libros-y-papeleria-educativos', precio: 120, stock: 20, descripcion: 'Calculadora con 240 funciones, apta para colegio y universidad.', destacado: true },
      { nombre: 'Mochila escolar', categoria: 'libros-y-papeleria-papeler-a', precio: 140, stock: 18, descripcion: 'Mochila resistente con tres compartimientos.' },
      { nombre: 'Atlas escolar de Bolivia', categoria: 'libros-y-papeleria-educativos', precio: 60, stock: 25, descripcion: 'Atlas con mapas departamentales y datos básicos.' },
    ],
  },
  {
    correo: 'deportes.chapaco@lacase.test', nombre: 'Sergio', apellido: 'Torrez', tienda: 'Deportes Chapaco',
    descripcion: 'Artículos para fútbol, ciclismo y gimnasio para jóvenes y aficionados de Tarija.' + NOTA,
    rubro: 'Deportes', slugSuperior: 'deportes', prefijoSku: 'DCH', zona: 'Aranjuez', latitud: -21.5387, longitud: -64.7433,
    productos: [
      { nombre: 'Pelota de fútbol N.º 5', categoria: 'deportes-f-tbol', precio: 110, stock: 30, descripcion: 'Pelota cosida a máquina, tamaño oficial.', destacado: true },
      { nombre: 'Guantes de arquero', categoria: 'deportes-f-tbol', precio: 95, stock: 14, descripcion: 'Guantes con palma de látex y cierre ajustable.' },
      { nombre: 'Casco para ciclista', categoria: 'deportes-bicicletas', precio: 160, stock: 12, descripcion: 'Casco ligero con ventilación y regulación de talla.' },
      { nombre: 'Pesas ajustables de 10 kg (par)', categoria: 'deportes-gimnasio', precio: 210, stock: 9, descripcion: 'Par de mancuernas con discos intercambiables.' },
    ],
  },
];

interface SubastaSeed {
  titulo: string;
  descripcion: string;
  correo: string;
  categoria: string;
  slugSuperior: string;
  inicial: number;
  reserva?: number;
  compraYa?: number;
  incremento: number;
  dias: number;
}

const SUBASTAS: SubastaSeed[] = [
  { titulo: 'Caja chapaca artesanal de colección', descripcion: 'Caja tradicional con parche de cuero y aros de madera, hecha por un artesano de la zona. Pieza única.', correo: 'musica.delvalle@lacase.test', categoria: 'musica-e-instrumentos', slugSuperior: 'musica-e-instrumentos', inicial: 180, reserva: 250, incremento: 10, dias: 9 },
  { titulo: 'Cántaro de barro usado (años 80)', descripcion: 'Cántaro de barro de uso doméstico, en buen estado, con una pequeña marca en la base.', correo: 'ceramica.cintis@lacase.test', categoria: 'artesanias-cer-mica', slugSuperior: 'artesanias', inicial: 70, incremento: 5, dias: 7 },
  { titulo: 'Singani de edición limitada 750 ml', descripcion: 'Botella numerada de singani de uva moscatel, solo para mayores de 18 años.', correo: 'bodega.valledulce@lacase.test', categoria: 'bar-y-bebidas-licores', slugSuperior: 'bar-y-bebidas', inicial: 120, reserva: 160, compraYa: 260, incremento: 10, dias: 12 },
  { titulo: 'Reloj de pared antiguo de madera', descripcion: 'Reloj de pared de péndulo, funcionando, con caja de madera. Usado.', correo: 'madera.chapaca@lacase.test', categoria: 'antiguedades-relojes', slugSuperior: 'antiguedades', inicial: 200, reserva: 300, incremento: 20, dias: 14 },
  { titulo: 'Colección de leyendas tarijeñas (libro usado)', descripcion: 'Libro de leyendas y tradiciones del valle, en buen estado, con anotaciones a lápiz.', correo: 'libreria.laplaza@lacase.test', categoria: 'libros-y-papeleria-novelas', slugSuperior: 'libros-y-papeleria', inicial: 25, incremento: 5, dias: 6 },
];

interface PublicacionSeed {
  categoria: string; // slug de la categoría del foro
  tipo: ForumPostType;
  titulo: string;
  cuerpo: string;
  autor: string; // correo de la tienda que publica
  respuestas?: Array<{ autor: string; texto: string }>;
}

const A = {
  ceramica: 'ceramica.cintis@lacase.test', bodega: 'bodega.valledulce@lacase.test', tecno: 'tecno.centro@lacase.test', madera: 'madera.chapaca@lacase.test',
  musica: 'musica.delvalle@lacase.test', libreria: 'libreria.laplaza@lacase.test', deportes: 'deportes.chapaco@lacase.test',
};

const PUBLICACIONES: PublicacionSeed[] = [
  { categoria: 'gastronomia', tipo: ForumPostType.GENERAL, autor: A.deportes, titulo: '¿Dónde comer buen saice o ranga cerca del Mercado Central?',
    cuerpo: 'Vienen unos familiares de visita este fin de semana y quiero llevarlos a probar comida típica tarijeña. ¿Qué lugares recomiendan cerca del Mercado Central?',
    respuestas: [{ autor: A.bodega, texto: 'En las cocinerías del propio mercado el saice sale bien servido y a buen precio. Conviene ir temprano, antes del mediodía.' }, { autor: A.ceramica, texto: 'Para la ranga prefiero una picantería de barrio; pregunta por las que abren desde las 11.' }] },
  { categoria: 'transporte', tipo: ForumPostType.GENERAL, autor: A.libreria, titulo: '¿Cómo llegar a Tomatitas desde el centro sin auto?',
    cuerpo: 'Quiero pasar el domingo en Tomatitas con mi familia. ¿Qué micro o trufi sale desde el centro y cada cuánto pasa?',
    respuestas: [{ autor: A.tecno, texto: 'Salen micros desde la zona de la terminal y desde el centro; en la mañana pasan seguido. Lleva efectivo en monedas para el pasaje.' }] },
  { categoria: 'servicios', tipo: ForumPostType.GENERAL, autor: A.madera, titulo: '¿Recomiendan un electricista de confianza en Tarija?',
    cuerpo: 'Necesito cambiar el tablero eléctrico de un taller y quiero a alguien que dé factura y garantía por el trabajo. ¿Alguien tuvo buena experiencia?' },
  { categoria: 'educacion', tipo: ForumPostType.GENERAL, autor: A.libreria, titulo: '¿Cursos de inglés para jóvenes en Tarija?',
    cuerpo: 'Mi hija termina el colegio este año y quiere empezar inglés desde cero. ¿Qué institutos recomiendan por horario y precio?',
    respuestas: [{ autor: A.musica, texto: 'Hay varios institutos en el centro con turnos de tarde. Pide una clase de prueba antes de pagar el semestre.' }] },
  { categoria: 'salud', tipo: ForumPostType.GENERAL, autor: A.ceramica, titulo: '¿Farmacias de turno el fin de semana en Tarija?',
    cuerpo: 'Necesito saber qué farmacias atienden de noche el sábado por la zona de San Roque. ¿Alguien tiene el dato actualizado?' },
  { categoria: 'empleos', tipo: ForumPostType.EMPLEO, autor: A.tecno, titulo: 'Busco ayudante de ventas para tienda de accesorios en el centro',
    cuerpo: 'Necesito una persona de confianza para atender en el mostrador por las tardes. Se valora el buen trato con los clientes. Escribir por mensaje privado.' },
  { categoria: 'alquileres', tipo: ForumPostType.ALQUILER, autor: A.madera, titulo: '¿Cuánto cuesta alquilar un local pequeño cerca de la Avenida Las Américas?',
    cuerpo: 'Quiero mover mi taller a un local de unos 40 m² con buen acceso. ¿Cuál es el precio mensual referencial por esa zona?',
    respuestas: [{ autor: A.deportes, texto: 'Depende mucho de la cuadra; en las avenidas principales piden más. Compara al menos tres opciones y revisa el contrato con calma.' }] },
  { categoria: 'anticreticos', tipo: ForumPostType.ANTICROTICO, autor: A.libreria, titulo: '¿Conviene el anticrético para una vivienda cerca de la universidad?',
    cuerpo: 'Estoy comparando alquiler y anticrético para una vivienda cerca de la Universidad Autónoma Juan Misael Saracho. ¿Qué recomiendan revisar antes de firmar?',
    respuestas: [{ autor: A.madera, texto: 'Que el contrato sea notariado y que figure claramente el monto y la fecha de devolución. Pide el folio real de la propiedad.' }] },
  { categoria: 'direcciones', tipo: ForumPostType.DIRECCION, autor: A.musica, titulo: '¿Dónde queda el Mercado Campesino?',
    cuerpo: 'Voy a comprar verduras y frutas por primera vez en el Mercado Campesino. ¿Cuál es la mejor forma de llegar y a qué hora conviene ir?',
    respuestas: [{ autor: A.bodega, texto: 'Queda hacia la zona sur de la ciudad; los micros que van por esa ruta te dejan cerca. Los sábados por la mañana hay más variedad.' }] },
  { categoria: 'tecnologia', tipo: ForumPostType.GENERAL, autor: A.tecno, titulo: '¿Qué conviene para el wifi de casa: repetidor o cambiar el router?',
    cuerpo: 'Tengo mala señal en el segundo piso. ¿Es mejor comprar un repetidor o cambiar el router por uno de doble banda?' ,
    respuestas: [{ autor: A.libreria, texto: 'Primero prueba cambiar el router de lugar, más al centro de la casa. Si no basta, un repetidor de doble banda suele resolverlo.' }] },
  { categoria: 'comercio', tipo: ForumPostType.GENERAL, autor: A.ceramica, titulo: '¿Cómo cobrar con QR en un puesto de artesanías?',
    cuerpo: 'Quiero empezar a aceptar pagos con código QR en mi puesto. ¿Qué banco o aplicación recomiendan para vendedores pequeños?',
    respuestas: [{ autor: A.tecno, texto: 'Casi todos los bancos tienen QR gratis para personas; lo importante es verificar el abono en tu aplicación antes de entregar el producto.' }] },
  { categoria: 'eventos', tipo: ForumPostType.GENERAL, autor: A.bodega, titulo: '¿Cuándo es la Fiesta de la Vendimia este año?',
    cuerpo: 'Quiero organizar una degustación de vinos por esas fechas. ¿Alguien sabe el cronograma o dónde se publica?' },
  { categoria: 'mascotas', tipo: ForumPostType.GENERAL, autor: A.deportes, titulo: '¿Veterinaria con atención de emergencia en Tarija?',
    cuerpo: 'Mi perro se enfermó de noche y no encontré dónde atenderlo. ¿Hay alguna veterinaria con guardia?' },
  { categoria: 'moda', tipo: ForumPostType.GENERAL, autor: A.ceramica, titulo: '¿Dónde comprar lana de oveja para tejer?',
    cuerpo: 'Busco lana natural para tejer chalinas y ponchos. ¿Dónde la venden por kilo en Tarija o en las comunidades cercanas?',
    respuestas: [{ autor: A.madera, texto: 'En las ferias de las comunidades del valle la ofrecen por madeja o por kilo, y suele ser más barata que en las tiendas.' }] },
  { categoria: 'clases', tipo: ForumPostType.GENERAL, autor: A.musica, titulo: '¿Alguien da clases de guitarra para principiantes?',
    cuerpo: 'Tengo una guitarra criolla guardada y quiero aprender desde cero. ¿Conocen profesores por la zona de Las Panosas o el centro?' },
  { categoria: 'comunidad', tipo: ForumPostType.GENERAL, autor: A.libreria, titulo: 'Colecta de útiles escolares para escuelas rurales de Tarija',
    cuerpo: 'Estamos juntando cuadernos, lápices y mochilas para escuelas del área rural. Quien quiera colaborar puede dejar sus donaciones en nuestra librería en horario de atención.',
    respuestas: [{ autor: A.deportes, texto: 'Cuenten con pelotas y material deportivo usado en buen estado para las escuelas.' }] },
  { categoria: 'aficiones', tipo: ForumPostType.GENERAL, autor: A.musica, titulo: '¿Peñas folklóricas para ir el fin de semana en Tarija?',
    cuerpo: 'Me gustaría escuchar música chapaca en vivo. ¿Qué peñas o locales tienen presentaciones los viernes y sábados?' },
];

async function categoriaPorSlug(slug: string) {
  const c = await prisma.category.findUnique({ where: { slug } });
  if (c) return c;
  // si la hija no existe, se usa la categoría de nivel superior (primer fragmento del slug)
  const partes = slug.split('-');
  for (let n = partes.length - 1; n >= 1; n--) {
    const padre = await prisma.category.findUnique({ where: { slug: partes.slice(0, n).join('-') } });
    if (padre) return padre;
  }
  throw new Error(`No existe la categoría "${slug}". Ejecuta antes prisma/seed-prod.ts.`);
}

async function crearTienda(t: TiendaSeed) {
  // Sin contraseña utilizable: el hash es de un valor aleatorio que no se guarda en ninguna parte.
  const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), BCRYPT_COST);
  const usuario = await prisma.user.upsert({
    where: { email: t.correo },
    update: {},
    create: {
      email: t.correo, passwordHash, firstName: t.nombre, lastName: t.apellido, role: Role.SELLER,
      storeName: t.tienda, storeDescription: t.descripcion, storeCategory: t.rubro,
      storeLogo: imagen(t.slugSuperior), storeBanner: imagen(t.slugSuperior),
      locationCity: 'Tarija', locationState: 'Tarija', country: 'BO',
      latitude: t.latitud, longitude: t.longitud, locationVerified: false,
      isApproved: true, isVerified: false, isActive: true,
    },
  });
  let creados = 0;
  for (const [i, p] of t.productos.entries()) {
    const slug = `${p.nombre}-${t.prefijoSku}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existente = await prisma.product.findUnique({ where: { slug } });
    if (existente) continue;
    const categoria = await categoriaPorSlug(p.categoria);
    await prisma.product.create({
      data: {
        sellerId: usuario.id, categoryId: categoria.id, name: p.nombre, slug, description: p.descripcion,
        condition: ProductCondition.NEW, price: p.precio, stock: p.stock, brand: p.marca ?? null,
        sku: `${t.prefijoSku}-${String(i + 1).padStart(4, '0')}`,
        deliveryTypes: [DeliveryType.PRESENCIAL, DeliveryType.RETIRO, DeliveryType.DELIVERY],
        isActive: true, isApproved: true, isFeatured: !!p.destacado,
        images: { create: [{ url: imagen(t.slugSuperior), order: 0, isPrimary: true }] },
      },
    });
    creados++;
  }
  return { usuario, creados };
}

async function crearSubasta(s: SubastaSeed, vendedores: Map<string, number>) {
  const sellerId = vendedores.get(s.correo);
  if (!sellerId) throw new Error(`Vendedor desconocido: ${s.correo}`);
  const existe = await prisma.auction.findFirst({ where: { sellerId, title: s.titulo } });
  if (existe) return false;
  const categoria = await categoriaPorSlug(s.categoria);
  await prisma.auction.create({
    data: {
      sellerId, title: s.titulo, description: s.descripcion, categoryId: categoria.id, imageUrl: imagen(s.slugSuperior),
      startingPrice: s.inicial, currentPrice: s.inicial, reservePrice: s.reserva ?? null, buyNowPrice: s.compraYa ?? null,
      minIncrement: s.incremento, maxIncrement: s.incremento * 10,
      endDate: new Date(Date.now() + s.dias * 24 * 60 * 60 * 1000), isActive: true,
    },
  });
  return true;
}

async function main() {
  // Las imágenes se guardan con la URL pública de la API: en una base remota hay que definirla (si no, apuntarían a localhost).
  const baseLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '');
  if (!baseLocal && /localhost/.test(env.BACKEND_URL)) {
    throw new Error('Define BACKEND_URL con la URL pública de la API (por ejemplo https://lacase-diplomado-api.onrender.com) antes de sembrar una base remota.');
  }
  const vendedores = new Map<string, number>();
  let productos = 0;
  for (const t of TIENDAS) {
    const { usuario, creados } = await crearTienda(t);
    vendedores.set(t.correo, usuario.id);
    productos += creados;
  }

  let subastas = 0;
  for (const s of SUBASTAS) if (await crearSubasta(s, vendedores)) subastas++;

  // Foro: un perfil por tienda (con alias anónimo) y publicaciones de Tarija en distintas categorías.
  const perfiles = new Map<string, number>();
  for (const [correo, id] of vendedores) perfiles.set(correo, (await ensureForumProfile(id)).id);
  let publicaciones = 0;
  for (const p of PUBLICACIONES) {
    const autorId = perfiles.get(p.autor);
    if (!autorId) throw new Error(`Autor desconocido: ${p.autor}`);
    const existe = await prisma.forumPost.findFirst({ where: { title: p.titulo, authorId: autorId } });
    if (existe) continue;
    const categoria = await prisma.forumCategory.findUnique({ where: { slug: p.categoria } });
    if (!categoria) throw new Error(`No existe la categoría del foro "${p.categoria}". Ejecuta antes prisma/seed-forum.ts.`);
    const post = await prisma.forumPost.create({
      data: { authorId: autorId, categoryId: categoria.id, title: p.titulo, body: p.cuerpo, city: 'Tarija', type: p.tipo, replyCount: p.respuestas?.length ?? 0 },
    });
    for (const r of p.respuestas ?? []) {
      await prisma.forumReply.create({ data: { postId: post.id, authorId: perfiles.get(r.autor)!, body: r.texto } });
    }
    publicaciones++;
  }
  console.log(`Seed de Tarija completado: ${TIENDAS.length} tiendas, ${productos} productos nuevos, ${subastas} subastas nuevas, ${publicaciones} publicaciones nuevas.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : 'Error en el seed de Tarija');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
