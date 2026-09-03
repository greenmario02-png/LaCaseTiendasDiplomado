import { PrismaClient, Role, ProductCondition, SlotType } from '@prisma/client';
import { fakerES as faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

import { BOLIVIANISMOS } from '../src/data/bolivianismos';

const prisma = new PrismaClient();

/** Número de celular boliviano: 8 dígitos, empieza con 6 o 7. */
function boliviaPhone(): string {
  const prefix = faker.helpers.arrayElement(['6', '7']);
  const rest = faker.string.numeric(7);
  return `+591 ${prefix}${rest}`;
}

function lacaseEmail(firstName: string, lastName: string): string {
  return faker.internet.email({ firstName, lastName, provider: 'lacase.bo' }).toLowerCase();
}

const STORE_TAGLINES = [
  'Envíos a todo el departamento y atención por WhatsApp.',
  'Más de 5 años vendiendo en el mercado local.',
  'Precios de fábrica, sin intermediarios.',
  'Recibimos tu producto usado como parte de pago.',
  'Garantía escrita en todos nuestros productos.',
];

function storeTagline(): string {
  return faker.helpers.arrayElement(STORE_TAGLINES);
}

const DESC_INTROS: Record<string, string[]> = {
  NEW: ['Producto nuevo, sellado de fábrica.', 'A estrenar, con caja y accesorios originales.'],
  REFURBISHED: ['Reacondicionado y revisado, funcionando al 100%.', 'Reacondicionado con garantía de la tienda.'],
  USED: ['Usado, en buen estado y funcionando correctamente.', 'De segunda mano, cuidado y con poco uso.'],
};

const DESC_CLOSERS = [
  'Entrega en el punto de encuentro o envío a domicilio dentro de la ciudad.',
  'Consultanos por WhatsApp para coordinar la entrega.',
  'Aceptamos pago por QR o transferencia bancaria.',
  'Stock limitado, hacé tu pedido antes de que se agote.',
  'Ideal para uso diario o como regalo.',
];

function productDescription(name: string, categoryName: string, condition: 'NEW' | 'REFURBISHED' | 'USED'): string {
  const intro = faker.helpers.arrayElement(DESC_INTROS[condition]);
  const closer = faker.helpers.arrayElement(DESC_CLOSERS);
  return `${name} — categoría ${categoryName}. ${intro} ${closer}`;
}

const REVIEW_COMMENTS = [
  'Llegó rápido y en buen estado, tal como se describía.',
  'Buena atención del vendedor, todo bien con la compra.',
  'El producto es tal cual la foto, muy conforme.',
  'Un poco demorado el envío pero el producto vale la pena.',
  'Excelente relación precio-calidad, lo recomiendo.',
];

function reviewComment(): string {
  return faker.helpers.arrayElement(REVIEW_COMMENTS);
}

const ORDER_NOTES = [
  'Entregar después de las 18:00 por favor.',
  'Dejar con el portero si no estoy.',
  'Llamar antes de llegar al domicilio.',
  'Es para regalo, si se puede envolver mejor.',
];

function orderNote(): string {
  return faker.helpers.arrayElement(ORDER_NOTES);
}

// Palabra clave en inglés por categoría, para pedir fotos reales y relevantes a LoremFlickr
// (en vez de fotos aleatorias sin relación con el producto).
const CATEGORY_KEYWORDS: Record<string, string> = {
  Hardware: 'computer-hardware',
  Procesadores: 'cpu',
  'Placas de Video': 'graphics-card',
  Motherboards: 'motherboard',
  'Memorias RAM': 'ram-memory',
  Almacenamiento: 'ssd',
  Gabinetes: 'pc-case',
  'Fuentes de Poder': 'power-supply',
  Refrigeración: 'pc-cooling',
  Periféricos: 'computer-peripherals',
  Teclados: 'keyboard',
  Mouse: 'computer-mouse',
  Auriculares: 'headphones',
  Monitores: 'monitor',
  Micrófonos: 'microphone',
  Ropa: 'clothing',
  Remeras: 'tshirt',
  Pantalones: 'jeans',
  Camperas: 'jacket',
  Calzado: 'shoes',
  Accesorios: 'fashion-accessories',
  Celulares: 'smartphone',
  Smartphones: 'smartphone',
  Fundas: 'phone-case',
  Cargadores: 'phone-charger',
  Smartwatches: 'smartwatch',
  Cámaras: 'camera',
  Electrodomésticos: 'home-appliance',
  Heladeras: 'refrigerator',
  Lavarropas: 'washing-machine',
  Cocinas: 'kitchen-stove',
  Microondas: 'microwave',
  Pequeños: 'small-appliances',
  Antigüedades: 'antiques',
  Relojes: 'antique-clock',
  'Discos de Vinilo': 'vinyl-record',
  Cervezas: 'beer',
  Vinos: 'wine',
  Licores: 'whiskey',
  'Bebidas sin alcohol': 'soda',
  'Juegos de mesa': 'board-game',
  Muñecos: 'doll',
  Construcción: 'lego',
  Peluches: 'teddy-bear',
  Fútbol: 'soccer-ball',
  Bicicletas: 'bicycle',
  Gimnasio: 'dumbbell',
  Camping: 'camping-tent',
  'Muebles para Hogar': 'sofa',
  Muebles: 'furniture',
  Decoración: 'home-decor',
  Iluminación: 'lamp',
  Blanquería: 'bedsheets',
  Cosméticos: 'makeup',
  'Cuidado personal': 'hair-clipper',
  Perfumes: 'perfume',
  Alimento: 'dog-food',
  'Accesorios para mascotas': 'pet-collar',
  'Juguetes para mascotas': 'cat-toy',
  Guitarras: 'guitar',
  'Teclados musicales': 'piano-keyboard',
  Audio: 'speaker',
  'Instrumentos de viento': 'trumpet',
  Consolas: 'game-console',
  Juegos: 'video-game',
  'Accesorios gaming': 'gaming-headset',
  Libros: 'books',
  Novelas: 'books',
  Educativos: 'textbook',
  'Comics y Mangas': 'comic-book',
  Papelería: 'notebook-stationery',
  Artesanías: 'handicraft',
  Cerámica: 'pottery',
  Tejidos: 'weaving',
  Madera: 'woodcraft',
  'Joyería artesanal': 'handmade-jewelry',
  Manuales: 'vintage-book',
  Eléctricas: 'power-drill',
  Jardinería: 'gardening-tools',
  Seguridad: 'security-camera',
};

let flickrSeed = 100;

/** Foto real (LoremFlickr) para una palabra clave dada, en vez de una imagen aleatoria sin relación. */
function flickrImage(keyword: string, width = 800, height = width): string {
  flickrSeed += 1;
  return `https://loremflickr.com/${width}/${height}/${keyword}?lock=${flickrSeed}`;
}

/** Foto real (LoremFlickr) relacionada a la categoría del producto. */
function categoryImage(categoryName: string, width = 800, height = width): string {
  const keyword = CATEGORY_KEYWORDS[categoryName] ?? 'store';
  return flickrImage(keyword, width, height);
}

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

const ATTR_DEFS = [
  // Hardware — CPU
  { name: 'Socket', type: 'SELECT', category: 'Procesadores', options: ['AM4', 'AM5', 'LGA1700', 'LGA1200'], isFilterable: true },
  { name: 'Socket', type: 'SELECT', category: 'Motherboards', options: ['AM4', 'AM5', 'LGA1700', 'LGA1200'], isFilterable: true },
  { name: 'Núcleos', type: 'NUMBER', category: 'Procesadores', unit: 'núcleos', isFilterable: true },
  { name: 'Frecuencia', type: 'NUMBER', category: 'Procesadores', unit: 'GHz', isFilterable: true },
  { name: 'TDP', type: 'NUMBER', category: 'Procesadores', unit: 'W', isFilterable: true },
  // Placas de video
  { name: 'VRAM', type: 'NUMBER', category: 'Placas de Video', unit: 'GB', isFilterable: true },
  { name: 'Conector', type: 'SELECT', category: 'Placas de Video', options: ['PCIe 4.0', 'PCIe 5.0'], isFilterable: true },
  // Memorias RAM
  { name: 'Capacidad', type: 'NUMBER', category: 'Memorias RAM', unit: 'GB', isFilterable: true },
  { name: 'Velocidad', type: 'NUMBER', category: 'Memorias RAM', unit: 'MHz', isFilterable: true },
  { name: 'Latencias', type: 'SELECT', category: 'Memorias RAM', options: ['CL30', 'CL32', 'CL36', 'CL40'], isFilterable: true },
  // Almacenamiento
  { name: 'Capacidad', type: 'NUMBER', category: 'Almacenamiento', unit: 'GB', isFilterable: true },
  { name: 'Interfaz', type: 'SELECT', category: 'Almacenamiento', options: ['NVMe', 'SATA III'], isFilterable: true },
  // Monitores
  { name: 'Tamaño', type: 'NUMBER', category: 'Monitores', unit: 'pulgadas', isFilterable: true },
  { name: 'Resolución', type: 'SELECT', category: 'Monitores', options: ['1920x1080', '2560x1440', '3840x2160'], isFilterable: true },
  { name: 'Tasa Refresco', type: 'NUMBER', category: 'Monitores', unit: 'Hz', isFilterable: true },
  // Ropa
  { name: 'Talle', type: 'SELECT', category: 'Ropa', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], isVariant: true, isFilterable: true },
  { name: 'Color', type: 'SELECT', category: 'Ropa', options: ['Negro', 'Blanco', 'Azul', 'Rojo', 'Verde'], isVariant: true, isFilterable: true },
  { name: 'Material', type: 'TEXT', category: 'Ropa', isFilterable: false },
  // Celulares
  { name: 'RAM', type: 'NUMBER', category: 'Celulares', unit: 'GB', isFilterable: true },
  { name: 'Almacenamiento', type: 'NUMBER', category: 'Celulares', unit: 'GB', isFilterable: true },
  { name: 'Pantalla', type: 'NUMBER', category: 'Celulares', unit: 'pulgadas', isFilterable: true },
  { name: 'Cámara', type: 'NUMBER', category: 'Celulares', unit: 'MP', isFilterable: false },
  // Electrodomésticos
  { name: 'Capacidad', type: 'TEXT', category: 'Electrodomésticos', isFilterable: true },
  { name: 'Eficiencia', type: 'SELECT', category: 'Electrodomésticos', options: ['A++', 'A+', 'A', 'B', 'C'], isFilterable: true },
  // Antigüedades
  { name: 'Época', type: 'TEXT', category: 'Antigüedades', isFilterable: true },
  { name: 'Material', type: 'TEXT', category: 'Antigüedades', isFilterable: false },
  { name: 'Estado', type: 'SELECT', category: 'Antigüedades', options: ['Excelente', 'Muy bueno', 'Bueno', 'Aceptable'], isFilterable: true },
  // Libros y Papelería
  { name: 'Autor', type: 'TEXT', category: 'Novelas', isFilterable: false },
  { name: 'Editorial', type: 'TEXT', category: 'Novelas', isFilterable: false },
  { name: 'Idioma', type: 'SELECT', category: 'Novelas', options: ['Español', 'Inglés', 'Portugués'], isFilterable: true },
  { name: 'Formato', type: 'SELECT', category: 'Papelería', options: ['Cuaderno', 'Lápices', 'Marcadores', 'Agendas'], isFilterable: true },
  // Artesanías
  { name: 'Técnica', type: 'TEXT', category: 'Cerámica', isFilterable: false },
  { name: 'Material', type: 'SELECT', category: 'Tejidos', options: ['Lana', 'Algodón', 'Seda'], isFilterable: true },
  { name: 'Tipo', type: 'SELECT', category: 'Joyería artesanal', options: ['Collar', 'Pulsera', 'Aros', 'Anillo'], isFilterable: true },
  // Herramientas
  { name: 'Marca', type: 'TEXT', category: 'Manuales', isFilterable: false },
  { name: 'Tipo', type: 'SELECT', category: 'Eléctricas', options: ['Taladro', 'Amoladora', 'Atornillador', 'Sierra'], isFilterable: true },
  // Deportes
  { name: 'Talle', type: 'SELECT', category: 'Fútbol', options: ['S', 'M', 'L', 'XL'], isVariant: true, isFilterable: true },
  { name: 'Rodado', type: 'NUMBER', category: 'Bicicletas', unit: 'pulgadas', isFilterable: true },
  { name: 'Material', type: 'SELECT', category: 'Bicicletas', options: ['Aluminio', 'Acero', 'Carbono'], isFilterable: true },
  { name: 'Capacidad', type: 'NUMBER', category: 'Gimnasio', unit: 'kg', isFilterable: true },
  // Juguetes
  { name: 'Edad mínima', type: 'NUMBER', category: 'Juegos de mesa', unit: 'años', isFilterable: true },
  { name: 'Jugadores', type: 'NUMBER', category: 'Juegos de mesa', unit: 'jugadores', isFilterable: false },
  { name: 'Edad', type: 'SELECT', category: 'Muñecos', options: ['0-3', '4-7', '8+'], isFilterable: true },
  // Hogar
  { name: 'Material', type: 'SELECT', category: 'Muebles para Hogar', options: ['Madera', 'Metal', 'Plástico', 'Ratán'], isFilterable: true },
  { name: 'Ambiente', type: 'SELECT', category: 'Decoración', options: ['Living', 'Dormitorio', 'Cocina', 'Baño'], isFilterable: true },
  { name: 'Tipo', type: 'SELECT', category: 'Iluminación', options: ['LED', 'Incandescente', 'Smart'], isFilterable: true },
  // Salud y Belleza
  { name: 'Tipo de piel', type: 'SELECT', category: 'Cosméticos', options: ['Seca', 'Grasa', 'Mixta', 'Normal'], isFilterable: false },
  { name: 'Volumen', type: 'NUMBER', category: 'Perfumes', unit: 'ml', isFilterable: true },
  // Mascotas
  { name: 'Especie', type: 'SELECT', category: 'Alimento', options: ['Perro', 'Gato', 'Ave', 'Pez'], isFilterable: true },
  { name: 'Tipo', type: 'SELECT', category: 'Accesorios para mascotas', options: ['Collar', 'Correa', 'Cama', 'Comedero'], isFilterable: true },
  // Música
  { name: 'Cuerdas', type: 'NUMBER', category: 'Guitarras', unit: 'cuerdas', isFilterable: false },
  { name: 'Tipo', type: 'SELECT', category: 'Guitarras', options: ['Acústica', 'Eléctrica', 'Criolla'], isFilterable: true },
  // Bar
  { name: 'Alcohol', type: 'NUMBER', category: 'Cervezas', unit: '%', isFilterable: true },
  { name: 'Variedad', type: 'SELECT', category: 'Cervezas', options: ['Lager', 'IPA', 'Porter', 'Sin alcohol'], isFilterable: true },
  { name: 'Añejamiento', type: 'TEXT', category: 'Vinos', isFilterable: false },
  // Videojuegos
  { name: 'Plataforma', type: 'SELECT', category: 'Juegos', options: ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch'], isFilterable: true },
  { name: 'Género', type: 'SELECT', category: 'Juegos', options: ['Acción', 'Aventura', 'Deportes', 'Estrategia', 'RPG'], isFilterable: true },
  { name: 'Almacenamiento', type: 'NUMBER', category: 'Consolas', unit: 'GB', isFilterable: true },
];

const PRODUCT_TEMPLATES: Record<string, Array<{ name: string; price: [number, number]; attrs?: Record<string, string | number> }>> = {
  Procesadores: [
    { name: 'AMD Ryzen 9 7950X3D', price: [10700, 13550], attrs: { Socket: 'AM5', Núcleos: 16, Frecuencia: 4.2, TDP: 120 } },
    { name: 'AMD Ryzen 7 7800X3D', price: [6450, 8200], attrs: { Socket: 'AM5', Núcleos: 8, Frecuencia: 4.2, TDP: 120 } },
    { name: 'AMD Ryzen 5 7600', price: [3200, 4150], attrs: { Socket: 'AM5', Núcleos: 6, Frecuencia: 3.8, TDP: 65 } },
    { name: 'Intel Core i9-14900K', price: [10000, 12150], attrs: { Socket: 'LGA1700', Núcleos: 24, Frecuencia: 3.2, TDP: 125 } },
    { name: 'Intel Core i7-14700K', price: [6800, 8550], attrs: { Socket: 'LGA1700', Núcleos: 20, Frecuencia: 3.4, TDP: 125 } },
    { name: 'AMD Ryzen 7 5800X3D', price: [5350, 6800], attrs: { Socket: 'AM4', Núcleos: 8, Frecuencia: 3.4, TDP: 105 } },
  ],
  'Placas de Video': [
    { name: 'NVIDIA GeForce RTX 4090', price: [22850, 27850], attrs: { VRAM: 24, Conector: 'PCIe 4.0' } },
    { name: 'NVIDIA GeForce RTX 4080 SUPER', price: [15000, 18550], attrs: { VRAM: 16, Conector: 'PCIe 4.0' } },
    { name: 'AMD Radeon RX 7900 XTX', price: [13550, 16450], attrs: { VRAM: 24, Conector: 'PCIe 4.0' } },
    { name: 'NVIDIA GeForce RTX 4070 SUPER', price: [9300, 11800], attrs: { VRAM: 12, Conector: 'PCIe 4.0' } },
    { name: 'AMD Radeon RX 7800 XT', price: [7150, 8950], attrs: { VRAM: 16, Conector: 'PCIe 4.0' } },
  ],
  Motherboards: [
    { name: 'ASUS ROG STRIX X670E-E Gaming', price: [5700, 7000], attrs: { Socket: 'AM5' } },
    { name: 'Gigabyte B650 AORUS Elite AX', price: [2500, 3150], attrs: { Socket: 'AM5' } },
    { name: 'MSI MAG Z790 TOMAHAWK WIFI', price: [3700, 4650], attrs: { Socket: 'LGA1700' } },
    { name: 'ASRock B550M Steel Legend', price: [1300, 1650], attrs: { Socket: 'AM4' } },
  ],
  'Memorias RAM': [
    { name: 'Corsair Vengeance DDR5 32GB 6000MHz CL30', price: [2000, 2500], attrs: { Capacidad: 32, Velocidad: 6000, Latencias: 'CL30' } },
    { name: 'G.Skill Trident Z5 RGB 32GB 6400MHz CL32', price: [2150, 2700], attrs: { Capacidad: 32, Velocidad: 6400, Latencias: 'CL32' } },
    { name: 'Kingston Fury Beast DDR5 16GB 5600MHz', price: [860, 1100], attrs: { Capacidad: 16, Velocidad: 5600, Latencias: 'CL36' } },
  ],
  Almacenamiento: [
    { name: 'Samsung 990 PRO 1TB NVMe', price: [2000, 2450], attrs: { Capacidad: 1000, Interfaz: 'NVMe' } },
    { name: 'WD Black SN850X 2TB NVMe', price: [3000, 3550], attrs: { Capacidad: 2000, Interfaz: 'NVMe' } },
    { name: 'Kingston NV2 500GB NVMe', price: [640, 860], attrs: { Capacidad: 500, Interfaz: 'NVMe' } },
  ],
  Gabinetes: [
    { name: 'NZXT H7 Flow', price: [1800, 2200] },
    { name: 'Corsair 4000D Airflow', price: [1550, 1950] },
    { name: 'Lian Li O11 Dynamic', price: [2150, 2650] },
  ],
  'Fuentes de Poder': [
    { name: 'Corsair RM850x 80+ Gold', price: [2000, 2500] },
    { name: 'be quiet! Straight Power 12 1000W', price: [3200, 3950] },
    { name: 'EVGA SuperNOVA 750 GT', price: [1300, 1650] },
  ],
  Refrigeración: [
    { name: 'Noctua NH-D15', price: [1800, 2200] },
    { name: 'Corsair iCUE H150i Elite LCD', price: [2700, 3300] },
    { name: 'DeepCool LS520', price: [1450, 1800] },
  ],
  Monitores: [
    { name: 'Samsung Odyssey G7 27" 240Hz', price: [5000, 6050], attrs: { Tamaño: 27, Resolución: '2560x1440', 'Tasa Refresco': 240 } },
    { name: 'LG UltraGear 27GP850 27" 165Hz', price: [3550, 4450], attrs: { Tamaño: 27, Resolución: '2560x1440', 'Tasa Refresco': 165 } },
    { name: 'BenQ Zowie XL2546K 24.5" 240Hz', price: [4650, 5550], attrs: { Tamaño: 24, Resolución: '1920x1080', 'Tasa Refresco': 240 } },
  ],
  Teclados: [
    { name: 'Logitech G Pro X TKL', price: [1300, 1650] },
    { name: 'Razer BlackWidow V4 Pro', price: [2000, 2450] },
  ],
  Mouse: [
    { name: 'Logitech G Pro X Superlight 2', price: [1550, 1950] },
    { name: 'Razer DeathAdder V3 Pro', price: [1350, 1700] },
  ],
  Auriculares: [
    { name: 'HyperX Cloud III', price: [1050, 1350] },
    { name: 'Logitech G733 LIGHTSYNC', price: [1300, 1550] },
  ],
  Micrófonos: [
    { name: 'Blue Yeti USB', price: [1450, 1800] },
  ],
  Remeras: [
    { name: 'Remera Oversize Gamer', price: [180, 290], attrs: { Color: 'Negro', Material: 'Algodón' } },
    { name: 'Remera Estampada Retro', price: [200, 300], attrs: { Color: 'Blanco', Material: 'Algodón' } },
  ],
  Pantalones: [
    { name: 'Jogger Techwear', price: [320, 460], attrs: { Color: 'Negro', Material: 'Poliéster' } },
  ],
  Camperas: [
    { name: 'Campera Denim Clásica', price: [640, 930], attrs: { Color: 'Azul', Material: 'Jean' } },
  ],
  Calzado: [
    { name: 'Zapatillas Urbanas', price: [570, 860], attrs: { Color: 'Blanco', Material: 'Cuero sintético' } },
  ],
  Accesorios: [
    { name: 'Gorra Trucker', price: [110, 180], attrs: { Color: 'Rojo', Material: 'Algodón' } },
  ],
  Smartphones: [
    { name: 'Samsung Galaxy S24 Ultra', price: [15700, 18550], attrs: { RAM: 12, Almacenamiento: 512, Pantalla: 6.8, Cámara: 200 } },
    { name: 'iPhone 15 Pro', price: [17150, 20000], attrs: { RAM: 8, Almacenamiento: 256, Pantalla: 6.1, Cámara: 48 } },
    { name: 'Xiaomi Redmi Note 13 Pro', price: [3200, 4150], attrs: { RAM: 8, Almacenamiento: 256, Pantalla: 6.67, Cámara: 200 } },
    { name: 'Motorola G84', price: [2500, 3050], attrs: { RAM: 8, Almacenamiento: 256, Pantalla: 6.5, Cámara: 50 } },
  ],
  Fundas: [
    { name: 'Funda Silicona Transparente', price: [85, 130] },
  ],
  Cargadores: [
    { name: 'Cargador 65W USB-C GaN', price: [320, 430] },
  ],
  Smartwatches: [
    { name: 'Apple Watch Series 9', price: [4650, 5550] },
    { name: 'Samsung Galaxy Watch 6', price: [3200, 3950] },
  ],
  Heladeras: [
    { name: 'Heladera Samsung No Frost 420L', price: [10700, 12850], attrs: { Capacidad: '420L', Eficiencia: 'A+' } },
    { name: 'Heladera LG 350L Inverter', price: [8550, 10350], attrs: { Capacidad: '350L', Eficiencia: 'A' } },
  ],
  Lavarropas: [
    { name: 'Lavarropas Drean 8kg', price: [4300, 5350], attrs: { Capacidad: '8kg', Eficiencia: 'A' } },
  ],
  Cocinas: [
    { name: 'Cocina Escorial 5 Hornallas', price: [2850, 3700], attrs: { Eficiencia: 'B' } },
  ],
  Microondas: [
    { name: 'Microondas Whirlpool 25L', price: [1300, 1700], attrs: { Capacidad: '25L' } },
  ],
  Pequeños: [
    { name: 'Pava Eléctrica Philips', price: [320, 430] },
    { name: 'Licuadora Oster', price: [570, 790] },
  ],
  Muebles: [
    { name: 'Escritorio de Roble 1930', price: [2150, 3000], attrs: { Época: '1930', Material: 'Roble', Estado: 'Muy bueno' } },
  ],
  'Discos de Vinilo': [
    { name: 'Pink Floyd — The Dark Side of the Moon', price: [570, 790], attrs: { Época: '1973', Estado: 'Bueno' } },
    { name: 'Led Zeppelin IV', price: [540, 710], attrs: { Época: '1971', Estado: 'Muy bueno' } },
  ],
  Cámaras: [
    { name: 'Cámara Analógica Canon AE-1', price: [1800, 2300], attrs: { Época: '1976', Material: 'Metal', Estado: 'Excelente' } },
  ],
  Relojes: [
    { name: 'Reloj Pulsera Mecánico 1950', price: [1450, 2000], attrs: { Época: '1950', Material: 'Acero', Estado: 'Bueno' } },
  ],
  Libros: [
    { name: 'El Principito — Edición 1955', price: [430, 610], attrs: { Época: '1955', Estado: 'Aceptable' } },
  ],
  'Cervezas': [
    { name: 'Cerveza Artesanal IPA 6 Pack', price: [110, 160] },
    { name: 'Cerveza Lager 12 Pack', price: [130, 180] },
  ],
  'Vinos': [
    { name: 'Vino Tinto Malbec Reserva', price: [140, 230] },
    { name: 'Vino Blanco Sauvignon Blanc', price: [110, 170] },
  ],
  'Licores': [
    { name: 'Whisky Escocés 12 años', price: [570, 860] },
  ],
  'Bebidas sin alcohol': [
    { name: 'Gaseosa Cola 2.25L', price: [25, 35] },
  ],
  'Juegos de mesa': [
    { name: 'Juego de Mesa Familia', price: [320, 460] },
    { name: 'Ajedrez de Madera', price: [140, 210] },
  ],
  'Muñecos': [
    { name: 'Muñeco Coleccionable 20cm', price: [110, 180] },
  ],
  'Construcción': [
    { name: 'Set de Construcción 500 piezas', price: [250, 360] },
  ],
  'Peluches': [
    { name: 'Peluche Oso 40cm', price: [130, 200] },
  ],
  'Fútbol': [
    { name: 'Pelota de Fútbol Oficial', price: [180, 290] },
    { name: 'Camiseta Equipo Local', price: [320, 500] },
  ],
  'Bicicletas': [
    { name: 'Bicicleta MTB Rodado 29', price: [2850, 4300] },
  ],
  'Gimnasio': [
    { name: 'Mancuernas Ajustables 2x10kg', price: [570, 860] },
    { name: 'Colchoneta de Yoga', price: [110, 180] },
  ],
  'Camping': [
    { name: 'Carpa 4 Personas Impermeable', price: [860, 1300] },
  ],
  'Muebles para Hogar': [
    { name: 'Sillón Reclinable', price: [2500, 3550] },
    { name: 'Mesa de Madera 6 sillas', price: [2150, 3200] },
  ],
  'Decoración': [
    { name: 'Cuadro Abstracto 60x40', price: [180, 290] },
  ],
  'Iluminación': [
    { name: 'Lámpara de Pie LED', price: [210, 320] },
  ],
  'Blanquería': [
    { name: 'Juego de Sábanas Queen', price: [250, 390] },
  ],
  'Cosméticos': [
    { name: 'Set de Maquillaje 12 piezas', price: [180, 290] },
  ],
  'Cuidado personal': [
    { name: 'Cortadora de Pelo Inalámbrica', price: [290, 430] },
  ],
  'Perfumes': [
    { name: 'Perfume Hombre 100ml', price: [360, 570] },
  ],
  'Alimento': [
    { name: 'Alimento Balanceado Perro 15kg', price: [320, 460] },
  ],
  'Accesorios': [
    { name: 'Correa y Arnés para Mascota', price: [85, 130] },
  ],
  'Juguetes para mascotas': [
    { name: 'Juguete Interactivo para Gato', price: [55, 100] },
  ],
  'Guitarras': [
    { name: 'Guitarra Acústica', price: [1050, 1800] },
    { name: 'Guitarra Eléctrica', price: [1800, 2850] },
  ],
  'Teclados musicales': [
    { name: 'Teclado Musical 61 Teclas', price: [860, 1300] },
  ],
  'Audio': [
    { name: 'Parlante Bluetooth Potente', price: [430, 640] },
  ],
  'Instrumentos de viento': [
    { name: 'Flauta Dulce Escolar', price: [110, 160] },
  ],
  'Consolas': [
    { name: 'Consola PlayStation 5', price: [12850, 15700] },
    { name: 'Consola Nintendo Switch', price: [6450, 8550] },
  ],
  'Juegos': [
    { name: 'Juego PS5 Aventura AAA', price: [860, 1150] },
  ],
  'Accesorios gaming': [
    { name: 'Auriculares Gaming 7.1', price: [640, 1000] },
    { name: 'Volante de Carreras USB', price: [1050, 1550] },
  ],
  'Novelas': [
    { name: 'Novela de Aventuras (Tapa Dura)', price: [95, 150], attrs: { Autor: 'Pablo Quesada', Idioma: 'Español' } },
    { name: 'Novela Romántica Best Seller', price: [85, 135], attrs: { Autor: 'Lucía Marín', Idioma: 'Español' } },
    { name: 'Cuentos Cortos Latinoamericanos', price: [70, 115], attrs: { Autor: 'Jorge Ríos', Idioma: 'Español' } },
  ],
  'Educativos': [
    { name: 'Enciclopedia de Historia Universal', price: [220, 340], attrs: { Autor: 'Editorial Andina', Idioma: 'Español' } },
    { name: 'Manual de Matemáticas Avanzadas', price: [160, 250], attrs: { Autor: 'Dra. Ana Sol', Idioma: 'Español' } },
  ],
  'Comics y Mangas': [
    { name: 'Manga de Aventuras (Tomo 1)', price: [60, 100], attrs: { Idioma: 'Español' } },
    { name: 'Cómic de Superhéroes Edición Especial', price: [110, 180], attrs: { Idioma: 'Español' } },
  ],
  'Papelería': [
    { name: 'Set de Marcadores 24 colores', price: [45, 80], attrs: { Formato: 'Marcadores' } },
    { name: 'Cuaderno Tapa Dura A4', price: [35, 60], attrs: { Formato: 'Cuaderno' } },
  ],
  'Cerámica': [
    { name: 'Juego de Tazas de Cerámica (6 unid.)', price: [180, 290], attrs: { Técnica: 'Esmaltado a mano' } },
    { name: 'Máscara Decorativa de Barro', price: [220, 380], attrs: { Técnica: 'Modelado' } },
  ],
  'Tejidos': [
    { name: 'Poncho de Lana de Alpaca', price: [420, 650], attrs: { Material: 'Lana' } },
    { name: 'Bufanda Tejida a Mano', price: [85, 140], attrs: { Material: 'Algodón' } },
  ],
  'Madera': [
    { name: 'Tabla de Picar de Roble Artesanal', price: [130, 210] },
    { name: 'Caja de Madera Tallada', price: [240, 390] },
  ],
  'Joyería artesanal': [
    { name: 'Collar de Plata con Turquesa', price: [380, 590], attrs: { Tipo: 'Collar' } },
    { name: 'Pulsera de Cuero y Piedras', price: [120, 190], attrs: { Tipo: 'Pulsera' } },
  ],
  'Manuales': [
    { name: 'Set de Destornilladores de Precisión', price: [140, 220], attrs: { Marca: 'ProTool' } },
    { name: 'Martillo de Carpintero', price: [90, 150], attrs: { Marca: 'FerreMax' } },
  ],
  'Eléctricas': [
    { name: 'Taladro Percutor 800W', price: [480, 720], attrs: { Tipo: 'Taladro', Marca: 'PowerPlus' } },
    { name: 'Amoladora Angular 900W', price: [390, 580], attrs: { Tipo: 'Amoladora', Marca: 'PowerPlus' } },
  ],
  'Jardinería': [
    { name: 'Set de Herramientas de Jardín (5 piezas)', price: [160, 250] },
    { name: 'Manguera Reforzada 20m', price: [120, 190] },
  ],
  'Seguridad': [
    { name: 'Candado de Seguridad Reforzado', price: [85, 140] },
    { name: 'Cerradura Inteligente Bluetooth', price: [520, 780] },
  ],
  // Deportes
  'Fútbol': [
    { name: 'Pelota de Fútbol Profesional', price: [150, 260], attrs: { Talle: 'M' } },
    { name: 'Camiseta Deportiva (Equipo Local)', price: [180, 320], attrs: { Talle: 'L' } },
    { name: 'Guantes de Arquero', price: [120, 210] },
  ],
  'Bicicletas': [
    { name: 'Bicicleta MTB Rodado 26', price: [2800, 4200], attrs: { Rodado: 26, Material: 'Aluminio' } },
    { name: 'Bicicleta Urbana Rodado 28', price: [3200, 4800], attrs: { Rodado: 28, Material: 'Acero' } },
    { name: 'Casco de Ciclismo', price: [180, 300] },
  ],
  'Gimnasio': [
    { name: 'Juego de Mancuernas (20kg)', price: [650, 950], attrs: { Capacidad: 20 } },
    { name: 'Mancuerna Ajustable 10kg', price: [380, 560], attrs: { Capacidad: 10 } },
    { name: 'Esterilla de Yoga', price: [90, 160] },
  ],
  'Camping': [
    { name: 'Carpa para 2 Personas', price: [450, 700] },
    { name: 'Mochila de Camping 60L', price: [380, 620] },
  ],
  // Juguetes
  'Juegos de mesa': [
    { name: 'Juego de Ajedrez de Madera', price: [120, 220], attrs: { 'Edad mínima': 6, Jugadores: 2 } },
    { name: 'Dominó Clásico', price: [80, 140], attrs: { 'Edad mínima': 5, Jugadores: 4 } },
  ],
  'Muñecos': [
    { name: 'Muñeco Articulado (Superhéroe)', price: [110, 190], attrs: { Edad: '8+' } },
    { name: 'Muñeca de Trapo Artesanal', price: [90, 160], attrs: { Edad: '4-7' } },
  ],
  'Construcción': [
    { name: 'Set de Bloques de Construcción (120 pzas)', price: [150, 250] },
    { name: 'Bloques Magnéticos (60 pzas)', price: [220, 360] },
  ],
  'Peluches': [
    { name: 'Peluche Oso Gigante 1m', price: [180, 300] },
    { name: 'Peluche de Gato', price: [90, 150] },
  ],
  // Hogar
  'Muebles para Hogar': [
    { name: 'Mesa de Comedor de Madera', price: [1800, 2800], attrs: { Material: 'Madera' } },
    { name: 'Estante Metálico 5 niveles', price: [420, 680], attrs: { Material: 'Metal' } },
  ],
  'Decoración': [
    { name: 'Espejo Decorativo Redondo', price: [180, 320], attrs: { Ambiente: 'Living' } },
    { name: 'Juego de Velas Aromáticas', price: [80, 150], attrs: { Ambiente: 'Dormitorio' } },
  ],
  'Iluminación': [
    { name: 'Lámpara de Pie LED', price: [220, 380], attrs: { Tipo: 'LED' } },
    { name: 'Foco Inteligente RGB', price: [60, 120], attrs: { Tipo: 'Smart' } },
  ],
  'Blanquería': [
    { name: 'Juego de Sábanas Queen', price: [160, 280] },
    { name: 'Toalla Rizada (set x3)', price: [120, 210] },
  ],
  // Salud y Belleza
  'Cosméticos': [
    { name: 'Set de Maquillaje Completo', price: [140, 260], attrs: { 'Tipo de piel': 'Mixta' } },
    { name: 'Crema Facial Hidratante', price: [80, 150], attrs: { 'Tipo de piel': 'Seca' } },
  ],
  'Cuidado personal': [
    { name: 'Secador de Pelo 2000W', price: [150, 280] },
    { name: 'Kit de Barbería Profesional', price: [220, 380] },
  ],
  'Perfumes': [
    { name: 'Perfume Hombre 100ml', price: [320, 520], attrs: { Volumen: 100 } },
    { name: 'Perfume Mujer 50ml', price: [280, 460], attrs: { Volumen: 50 } },
  ],
  // Mascotas
  'Alimento': [
    { name: 'Alimento para Perro (15kg)', price: [280, 420], attrs: { Especie: 'Perro' } },
    { name: 'Alimento para Gato (7kg)', price: [210, 340], attrs: { Especie: 'Gato' } },
  ],
  'Accesorios para mascotas': [
    { name: 'Collar con Placa', price: [60, 110], attrs: { Tipo: 'Collar' } },
    { name: 'Cama para Mascotas Grande', price: [180, 300], attrs: { Tipo: 'Cama' } },
  ],
  'Juguetes para mascotas': [
    { name: 'Juguete Masticable de Goma', price: [45, 85] },
    { name: 'Pelota Squeaky', price: [30, 60] },
  ],
  // Bar y Bebidas
  'Cervezas': [
    { name: 'Pack de Cerveza Artesanal IPA (6)', price: [90, 160], attrs: { Alcohol: 6.5, Variedad: 'IPA' } },
    { name: 'Cerveza Lager Importada (6)', price: [80, 140], attrs: { Alcohol: 5, Variedad: 'Lager' } },
  ],
  'Vinos': [
    { name: 'Vino Tinto Malbec Reserva', price: [180, 320], attrs: { Añejamiento: '12 meses' } },
    { name: 'Vino Blanco Chardonnay', price: [140, 250] },
  ],
  'Licores': [
    { name: 'Whisky Escocés 750ml', price: [450, 750] },
    { name: 'Ron Añejo 750ml', price: [250, 420] },
  ],
  'Bebidas sin alcohol': [
    { name: 'Jugo Natural 100% (1L)', price: [25, 50] },
    { name: 'Agua con Gas (pack x6)', price: [35, 60] },
  ],
  // Música e Instrumentos
  'Guitarras': [
    { name: 'Guitarra Acústica Dreadnought', price: [650, 950], attrs: { Cuerdas: 6, Tipo: 'Acústica' } },
    { name: 'Guitarra Eléctrica Start', price: [1200, 1800], attrs: { Cuerdas: 6, Tipo: 'Eléctrica' } },
  ],
  'Teclados musicales': [
    { name: 'Teclado Musical 61 teclas', price: [900, 1400] },
    { name: 'Sintetizador Portátil', price: [1500, 2400] },
  ],
  'Audio': [
    { name: 'Micrófono Condenser USB', price: [320, 520] },
    { name: 'Monitores de Estudio (par)', price: [700, 1100] },
  ],
  // Videojuegos
  'Juegos': [
    { name: 'Juego de Aventura AAA (PC)', price: [250, 380], attrs: { Plataforma: 'PC', Género: 'Aventura' } },
    { name: 'Juego de Deportes (PlayStation)', price: [280, 400], attrs: { Plataforma: 'PlayStation', Género: 'Deportes' } },
  ],
  'Consolas': [
    { name: 'Consola Portátil Retro', price: [600, 900], attrs: { Almacenamiento: 64 } },
    { name: 'Control Inalámbrico Pro', price: [280, 420] },
  ],
  'Accesorios gaming': [
    { name: 'Silla Gamer Ergonómica', price: [1800, 2800] },
    { name: 'Base Refrigerante para Notebook', price: [120, 210] },
  ],
};

// ===== RBAC (core de administración dinámico, 01-spec-core-rbac.md) =====
const RBAC_PERMISSIONS = [
  { code: 'admin.dashboard', module: 'admin', name: 'Ver panel admin' },
  { code: 'admin.users.manage', module: 'admin', name: 'Gestionar usuarios' },
  { code: 'admin.rbac.manage', module: 'admin', name: 'Gestionar roles y permisos' },
  { code: 'admin.reports.view', module: 'admin', name: 'Ver reportes' },
  { code: 'seller.products.manage', module: 'seller', name: 'Gestionar productos' },
  { code: 'seller.store.manage', module: 'seller', name: 'Gestionar tienda' },
  { code: 'forum.post', module: 'forum', name: 'Publicar en el foro' },
  { code: 'forum.moderate', module: 'forum', name: 'Moderar el foro' },
  { code: 'forum.geo.manage', module: 'forum', name: 'Configurar zona/geolocalización' },
];

const RBAC_MENUS: Array<{ code: string; label: string; path: string; module: string; sortOrder: number }> = [
  // Públicos
  { code: 'public.home', label: 'Inicio', path: '/', module: 'public', sortOrder: 0 },
  { code: 'public.products', label: 'Productos', path: '/productos', module: 'public', sortOrder: 1 },
  { code: 'public.auctions', label: 'Subastas', path: '/subastas', module: 'public', sortOrder: 2 },
  { code: 'public.forum', label: 'Foro', path: '/foro', module: 'public', sortOrder: 3 },
  { code: 'public.promotions', label: 'Promociones', path: '/promociones', module: 'public', sortOrder: 4 },
  // Panel vendedor
  { code: 'seller.dashboard', label: 'Dashboard', path: '/seller', module: 'seller', sortOrder: 0 },
  { code: 'seller.products', label: 'Productos', path: '/seller/productos', module: 'seller', sortOrder: 1 },
  { code: 'seller.labels', label: 'Etiquetas', path: '/seller/etiquetas', module: 'seller', sortOrder: 2 },
  { code: 'seller.calendar', label: 'Calendario', path: '/seller/calendario', module: 'seller', sortOrder: 3 },
  { code: 'seller.auctions', label: 'Subastas', path: '/seller/subastas', module: 'seller', sortOrder: 4 },
  { code: 'seller.privileged', label: 'Compradores VIP', path: '/seller/privilegiados', module: 'seller', sortOrder: 5 },
  { code: 'seller.promotions', label: 'Promociones', path: '/seller/promociones', module: 'seller', sortOrder: 6 },
  { code: 'seller.coupons', label: 'Cupones', path: '/seller/cupones', module: 'seller', sortOrder: 7 },
  { code: 'seller.gifts', label: 'Promos de regalo', path: '/seller/regalos', module: 'seller', sortOrder: 8 },
  { code: 'seller.payouts', label: 'Mis pagos', path: '/seller/pagos', module: 'seller', sortOrder: 9 },
  { code: 'seller.team', label: 'Equipo', path: '/seller/equipo', module: 'seller', sortOrder: 10 },
  { code: 'seller.returns', label: 'Devoluciones', path: '/seller/devoluciones', module: 'seller', sortOrder: 11 },
  { code: 'seller.settings', label: 'Configuración', path: '/seller/configuracion', module: 'seller', sortOrder: 12 },
  { code: 'seller.messages', label: 'Mensajes', path: '/mensajes', module: 'seller', sortOrder: 13 },
  // Panel admin
  { code: 'admin.dashboard', label: 'Dashboard', path: '/admin', module: 'admin', sortOrder: 0 },
  { code: 'admin.products', label: 'Moderación productos', path: '/admin/productos', module: 'admin', sortOrder: 1 },
  { code: 'admin.verification', label: 'Verificación de tiendas', path: '/admin/verificacion', module: 'admin', sortOrder: 2 },
  { code: 'admin.sellers', label: 'Vendedores', path: '/admin/vendedores', module: 'admin', sortOrder: 3 },
  { code: 'admin.users', label: 'Usuarios', path: '/admin/usuarios', module: 'admin', sortOrder: 4 },
  { code: 'admin.categories', label: 'Categorías y atributos', path: '/admin/categorias', module: 'admin', sortOrder: 5 },
  { code: 'admin.banners', label: 'Banners', path: '/admin/banners', module: 'admin', sortOrder: 6 },
  { code: 'admin.promotions', label: 'Promociones', path: '/admin/promociones', module: 'admin', sortOrder: 7 },
  { code: 'admin.coupons', label: 'Cupones', path: '/admin/cupones', module: 'admin', sortOrder: 8 },
  { code: 'admin.payouts', label: 'Payouts', path: '/admin/pagos', module: 'admin', sortOrder: 9 },
  { code: 'admin.returns', label: 'Devoluciones', path: '/admin/devoluciones', module: 'admin', sortOrder: 10 },
  { code: 'admin.taxes', label: 'Impuestos', path: '/admin/impuestos', module: 'admin', sortOrder: 11 },
  { code: 'admin.affiliates', label: 'Afiliados', path: '/admin/afiliados', module: 'admin', sortOrder: 12 },
  { code: 'admin.reports', label: 'Reportes', path: '/admin/reportes', module: 'admin', sortOrder: 13 },
  { code: 'admin.content', label: 'Contenido del sitio', path: '/admin/contenido', module: 'admin', sortOrder: 14 },
  { code: 'admin.currency', label: 'Moneda', path: '/admin/moneda', module: 'admin', sortOrder: 15 },
  { code: 'admin.logs', label: 'Logs de acciones', path: '/admin/logs', module: 'admin', sortOrder: 16 },
  { code: 'admin.forum', label: 'Foro (moderación)', path: '/admin/foro', module: 'admin', sortOrder: 17 },
  { code: 'admin.calendar', label: 'Calendario', path: '/admin/calendario', module: 'admin', sortOrder: 18 },
  { code: 'admin.rbac', label: 'Roles y permisos', path: '/admin/rbac', module: 'admin', sortOrder: 19 },
];

async function seedRbac() {
  // Roles de fábrica (isSystem, no se borran). MODERADOR_FORO no es un rol primario de
  // plataforma (no está en el enum Role): es una asignación RBAC sobre un CUSTOMER o SELLER
  // cualquiera, acotada a su propio departamento (ForumProfile.department) — ver roles.ts.
  const roles: Record<string, string> = {
    ADMIN: 'Administrador global',
    MODERADOR_FORO: 'Moderador de foro (por subforo/departamento)',
    SELLER: 'Vendedor',
    CUSTOMER: 'Cliente',
  };
  const roleIds: Record<string, number> = {};
  for (const [code, name] of Object.entries(roles)) {
    const r = await prisma.rbacRole.upsert({
      where: { code },
      update: { name, isSystem: true },
      create: { code, name, isSystem: true },
    });
    roleIds[code] = r.id;
  }

  // Permisos
  const permIds: Record<string, number> = {};
  for (const p of RBAC_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, module: p.module },
      create: p,
    });
    permIds[p.code] = perm.id;
  }

  // Menús
  const menuIds: Record<string, number> = {};
  for (const m of RBAC_MENUS) {
    const menu = await prisma.menu.upsert({
      where: { code: m.code },
      update: { label: m.label, path: m.path, module: m.module, sortOrder: m.sortOrder },
      create: m,
    });
    menuIds[m.code] = menu.id;
  }

  // Asignaciones: ADMIN → todos los permisos y menús; SELLER → seller + públicos; CUSTOMER →
  // públicos; MODERADOR_FORO → foro + públicos + admin.forum (misma vista de moderación que
  // usa ADMIN, pero acotada por departamento en el middleware, no por lo que ve acá).
  const permissionCodes: Record<string, string[]> = {
    ADMIN: RBAC_PERMISSIONS.map((p) => p.code),
    SELLER: ['seller.products.manage', 'seller.store.manage', 'forum.post'],
    CUSTOMER: ['forum.post'],
    MODERADOR_FORO: ['forum.post', 'forum.moderate', 'forum.geo.manage'],
  };
  const menuCodes: Record<string, string[]> = {
    ADMIN: RBAC_MENUS.map((m) => m.code),
    SELLER: RBAC_MENUS.filter((m) => m.module === 'seller' || m.module === 'public').map((m) => m.code),
    CUSTOMER: RBAC_MENUS.filter((m) => m.module === 'public').map((m) => m.code),
    MODERADOR_FORO: [...RBAC_MENUS.filter((m) => m.module === 'public').map((m) => m.code), 'admin.forum'],
  };

  for (const [code, perms] of Object.entries(permissionCodes)) {
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: roleIds[code], permissionId: permIds[p] })),
      skipDuplicates: true,
    });
  }
  for (const [code, menus] of Object.entries(menuCodes)) {
    await prisma.roleMenu.createMany({
      data: menus.map((m) => ({ roleId: roleIds[code], menuId: menuIds[m] })),
      skipDuplicates: true,
    });
  }

  // UserRole para usuarios existentes según su rol primario (rol enum → rol RBAC)
  const users = await prisma.user.findMany({ select: { id: true, role: true } });
  for (const u of users) {
    const rbac = roleIds[u.role as string];
    if (rbac) {
      await prisma.userRole.createMany({ data: [{ userId: u.id, roleId: rbac }], skipDuplicates: true });
    }
  }

  // Usuario de ejemplo con moderación de foro asignada (demo): comprador@lacase.bo modera
  // La Paz. No es un cambio de su rol primario (sigue siendo CUSTOMER) — es una asignación
  // RBAC adicional, tal como lo haría un ADMIN desde el panel (PUT /api/rbac/users/:id/roles).
  const moderatorDemoUser = await prisma.user.findUnique({ where: { email: 'comprador@lacase.bo' } });
  if (moderatorDemoUser) {
    await prisma.forumProfile.upsert({
      where: { userId: moderatorDemoUser.id },
      update: { department: 'La Paz' },
      create: {
        userId: moderatorDemoUser.id,
        forumUsername: `Usuario_${String(moderatorDemoUser.id).padStart(4, '0')}`,
        city: 'La Paz',
        department: 'La Paz',
      },
    });
    await prisma.userRole.createMany({
      data: [{ userId: moderatorDemoUser.id, roleId: roleIds.MODERADOR_FORO }],
      skipDuplicates: true,
    });
  }
}

async function main() {
  console.log('Limpiando base...');
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productAttribute.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productTag.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.buildComponent.deleteMany();
  await prisma.build.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.promotionProduct.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.giftPromotionItem.deleteMany();
  await prisma.giftPromotion.deleteMany();
  await prisma.couponProduct.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.product.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.attributeDefinition.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.auctionBid.deleteMany();
  await prisma.auctionProxyBid.deleteMany();
  await prisma.auctionWatchlist.deleteMany();
  await prisma.auction.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.searchHistory.deleteMany();
  await prisma.productView.deleteMany();
  await prisma.affiliateReferral.deleteMany();
  await prisma.affiliate.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.payoutAccount.deleteMany();
  await prisma.privilegedBuyer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.warranty.deleteMany();
  await prisma.reach.deleteMany();
  await prisma.banner.deleteMany();

  // ---------- USERS ----------
  const passwordHash = await bcrypt.hash('password123', 10);
  const adminHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@lacase.bo',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'Principal',
      role: Role.ADMIN,
      isVerified: true,
      isApproved: true,
    },
  });

  const cities = [
    { city: 'La Paz', state: 'La Paz', cp: '0200' },
    { city: 'El Alto', state: 'La Paz', cp: '0201' },
    { city: 'Cochabamba', state: 'Cochabamba', cp: '3000' },
    { city: 'Santa Cruz de la Sierra', state: 'Santa Cruz', cp: '0700' },
    { city: 'Oruro', state: 'Oruro', cp: '4000' },
    { city: 'Potosí', state: 'Potosí', cp: '5000' },
    { city: 'Tarija', state: 'Tarija', cp: '6000' },
    { city: 'Sucre', state: 'Chuquisaca', cp: '7000' },
    { city: 'Trinidad', state: 'Beni', cp: '8000' },
    { city: 'Cobija', state: 'Pando', cp: '9000' },
  ];

  // Cuenta fija de vendedor para pruebas/demo (además de los vendedores aleatorios).
  const demoSeller = await prisma.user.create({
    data: {
      email: 'vendedor@lacase.bo',
      passwordHash,
      firstName: 'Mateo',
      lastName: 'Quispe',
      phone: boliviaPhone(),
      role: Role.SELLER,
      storeName: 'TecnoCase Cochabamba',
      storeDescription: 'Tienda de tecnología y electrodomésticos en Cochabamba.',
      storeLogo: flickrImage('electronics-store', 200),
      storeBanner: flickrImage('electronics-store', 1200, 300),
      locationCity: 'Cochabamba',
      locationState: 'Cochabamba',
      locationPostalCode: '3000',
      country: 'BO',
      paymentQrUrl: flickrImage('qr-code', 300),
      rating: 4.7,
      totalSales: 128,
      isVerified: true,
      isApproved: true,
      gamerCoins: 250,
    },
  });

  const sellers: number[] = [demoSeller.id];
  for (let i = 0; i < 12; i++) {
    const loc = cities[i % cities.length];
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const seller = await prisma.user.create({
      data: {
        email: lacaseEmail(firstName, lastName),
        passwordHash,
        firstName,
        lastName,
        phone: boliviaPhone(),
        role: Role.SELLER,
        storeName: faker.company.name(),
        storeDescription: storeTagline(),
        storeLogo: flickrImage('storefront', 200),
        storeBanner: flickrImage('storefront', 1200, 300),
        locationCity: loc.city,
        locationState: loc.state,
        locationPostalCode: loc.cp,
        country: 'BO',
        paymentQrUrl: flickrImage('qr-code', 300),
        rating: faker.number.float({ min: 3, max: 5, fractionDigits: 1 }),
        totalSales: faker.number.int({ min: 0, max: 200 }),
        isVerified: faker.datatype.boolean(0.7),
        isApproved: true,
        gamerCoins: faker.number.int({ min: 0, max: 500 }),
      },
    });
    sellers.push(seller.id);
  }

  // Cuenta fija de comprador para pruebas/demo (además de los compradores aleatorios).
  const demoBuyer = await prisma.user.create({
    data: {
      email: 'comprador@lacase.bo',
      passwordHash,
      firstName: 'Valeria',
      lastName: 'Mamani',
      phone: boliviaPhone(),
      role: Role.CUSTOMER,
      locationCity: 'La Paz',
      locationState: 'La Paz',
      locationPostalCode: '0200',
      gamerCoins: 120,
    },
  });
  await prisma.address.create({
    data: {
      userId: demoBuyer.id,
      street: faker.location.street(),
      number: String(faker.number.int({ min: 1, max: 9999 })),
      city: 'La Paz',
      state: 'La Paz',
      postalCode: '0200',
      isDefault: true,
    },
  });

  const customers: number[] = [demoBuyer.id];
  for (let i = 0; i < 30; i++) {
    const loc = cities[faker.number.int({ min: 0, max: cities.length - 1 })];
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const customer = await prisma.user.create({
      data: {
        email: lacaseEmail(firstName, lastName),
        passwordHash,
        firstName,
        lastName,
        phone: boliviaPhone(),
        role: Role.CUSTOMER,
        locationCity: loc.city,
        locationState: loc.state,
        locationPostalCode: loc.cp,
        gamerCoins: faker.number.int({ min: 0, max: 300 }),
      },
    });
    customers.push(customer.id);

    await prisma.address.create({
      data: {
        userId: customer.id,
        street: faker.location.street(),
        number: String(faker.number.int({ min: 1, max: 9999 })),
        floor: faker.datatype.boolean(0.3) ? `Piso ${faker.number.int({ min: 1, max: 20 })}` : null,
        city: loc.city,
        state: loc.state,
        postalCode: loc.cp,
        isDefault: true,
      },
    });
  }

  // ---------- CATEGORIES ----------
  const categoryMap: Record<string, number> = {};
  for (const parent of CATEGORY_TREE) {
    const p = await prisma.category.create({
      data: {
        name: parent.name,
        slug: parent.slug,
        icon: (parent as any).icon ?? null,
        imageUrl: categoryImage(parent.name, 800, 600),
        order: 0,
      },
    });
    categoryMap[parent.name] = p.id;
    for (const child of parent.children) {
      const c = await prisma.category.create({
        data: { name: child, slug: `${parent.slug}-${child.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, parentId: p.id, order: 1 },
      });
      categoryMap[child] = c.id;
    }
  }

  // ---------- ATTRIBUTE DEFS ----------
  const attrMap: Record<string, number> = {};
  for (const def of ATTR_DEFS) {
    const a = await prisma.attributeDefinition.create({
      data: {
        name: def.name,
        type: def.type as any,
        categoryId: categoryMap[def.category] ?? null,
        options: def.options ? { values: def.options } : null,
        unit: def.unit ?? null,
        isVariant: def.isVariant ?? false,
        isFilterable: def.isFilterable ?? true,
      },
    });
    attrMap[`${def.category}-${def.name}`] = a.id;
  }

  // ---------- TAGS ----------
  const tagDefs = [
    { name: 'Envío Gratis', slug: 'envio-gratis', group: 'envio' },
    { name: 'Nuevo Ingreso', slug: 'nuevo-ingreso', group: 'tipo' },
    { name: 'Oferta', slug: 'oferta', group: 'precio' },
    { name: 'Vintage', slug: 'vintage', group: 'tipo' },
    { name: 'Importado', slug: 'importado', group: 'origen' },
    { name: 'Más Vendido', slug: 'mas-vendido', group: 'popularidad' },
    { name: 'Reacondicionado', slug: 'reacondicionado', group: 'tipo' },
  ];
  const tagIds: number[] = [];
  for (const t of tagDefs) {
    const tag = await prisma.tag.create({ data: t });
    tagIds.push(tag.id);
  }

  // ---------- PRODUCTS ----------
  const productIds: number[] = [];
  const productSellerMap = new Map<number, number>();
  let index = 0;
  for (const [categoryName, templates] of Object.entries(PRODUCT_TEMPLATES)) {
    for (const tpl of templates) {
      const sellerId = sellers[index % sellers.length];
      const slug = `${tpl.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${index}`;
      const price = faker.number.float({
        min: tpl.price[0],
        max: tpl.price[1],
        fractionDigits: 2,
      });
      const condition =
        categoryName === 'Antigüedades' ? ProductCondition.USED : faker.datatype.boolean(0.15) ? ProductCondition.REFURBISHED : ProductCondition.NEW;
      const conditionScore = condition === ProductCondition.NEW ? null : faker.number.int({ min: 6, max: 10 });

      const product = await prisma.product.create({
        data: {
          sellerId,
          categoryId: categoryMap[categoryName],
          name: tpl.name,
          slug,
          description: productDescription(tpl.name, categoryName, condition),
          condition,
          conditionScore,
          price,
          originalPrice: faker.datatype.boolean(0.4) ? price * faker.number.float({ min: 1.05, max: 1.3, fractionDigits: 2 }) : null,
          stock: faker.number.int({ min: 0, max: 50 }),
          sku: `${categoryName.substring(0, 3).toUpperCase()}-${String(index).padStart(4, '0')}`,
          warrantyInfo: faker.datatype.boolean(0.6) ? 'Garantía oficial 12 meses' : null,
          brand: faker.helpers.arrayElement(['Genérico', 'Samsung', 'Sony', 'LG', 'Logitech', 'Razer', 'Nintendo', 'Apple', 'Xiaomi', 'Motorola', 'Corsair', 'ASUS', 'AMD', 'Intel']),
          deliveryTypes: faker.helpers.arrayElements(
            ['PRESENCIAL', 'DELIVERY', 'ENVIO', 'RETIRO'],
            faker.number.int({ min: 1, max: 3 })
          ) as any,
          acceptsTrade: faker.datatype.boolean(0.3),
          isActive: true,
          isApproved: true,
          isFeatured: faker.datatype.boolean(0.2),
          viewCount: faker.number.int({ min: 0, max: 5000 }),
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
      productIds.push(product.id);
      productSellerMap.set(product.id, sellerId);

      if (tpl.attrs) {
        for (const [attrName, value] of Object.entries(tpl.attrs)) {
          const defId = attrMap[`${categoryName}-${attrName}`];
          if (defId) {
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

      // Variantes para ropa
      if (categoryName === 'Ropa') {
        for (const talle of ['S', 'M', 'L']) {
          await prisma.productVariant.create({
            data: {
              productId: product.id,
              sku: `${product.sku}-${talle}`,
              priceModifier: 0,
              stock: faker.number.int({ min: 0, max: 20 }),
              attributesJson: { talle },
            },
          });
        }
      }

      // Tags aleatorios
      const tagCount = faker.number.int({ min: 0, max: 3 });
      const chosen = new Set<number>();
      while (chosen.size < tagCount) {
        chosen.add(tagIds[faker.number.int({ min: 0, max: tagIds.length - 1 })]);
      }
      for (const tagId of chosen) {
        await prisma.productTag.create({ data: { productId: product.id, tagId } });
      }

      index++;
    }
  }

  // ---------- PROMOTIONS ----------
  const promoDefs = [
    { title: 'Hot Sale Tech', description: 'Descuentos en hardware seleccionado', discountType: 'PERCENTAGE', discountValue: 15, start: new Date(), end: new Date(Date.now() + 7 * 86400000) },
    { title: '2x1 en Periféricos', description: 'Llevá 2 periféricos y pagá 1', discountType: 'FIXED', discountValue: 350, start: new Date(), end: new Date(Date.now() + 30 * 86400000) },
    { title: 'CyberMonday Ropa', description: 'Ropa con 20% de descuento', discountType: 'PERCENTAGE', discountValue: 20, start: new Date(), end: new Date(Date.now() + 5 * 86400000) },
  ];
  for (let i = 0; i < promoDefs.length; i++) {
    const p = promoDefs[i];
    const promo = await prisma.promotion.create({
      data: {
        title: p.title,
        description: p.description,
        discountType: p.discountType as any,
        discountValue: p.discountValue,
        startDate: p.start,
        endDate: p.end,
        isActive: true,
      },
    });
    for (let j = 0; j < 5; j++) {
      const productId = productIds[faker.number.int({ min: 0, max: productIds.length - 1 })];
      try {
        await prisma.promotionProduct.create({ data: { promotionId: promo.id, productId } });
      } catch {
        // duplicado, ignorar
      }
    }
  }

  // ---------- BANNERS ----------
  const bannerDefs = [
    { title: 'Hot Sale Tech', bg: '#f0320a', link: '/productos?tag=oferta' },
    { title: 'Nuevos Procesadores', bg: '#1a1a2e', link: '/categoria/hardware-procesadores' },
    { title: 'CyberMonday', bg: '#0f3460', link: '/promociones' },
    { title: 'Ropa de Temporada', bg: '#16a34a', link: '/categoria/ropa' },
  ];
  for (let i = 0; i < bannerDefs.length; i++) {
    await prisma.banner.create({
      data: {
        title: bannerDefs[i].title,
        imageDesktop: flickrImage('sale-shopping', 1920, 400),
        imageTablet: flickrImage('sale-shopping', 1024, 400),
        imageMobile: flickrImage('sale-shopping', 600, 400),
        link: bannerDefs[i].link,
        backgroundColor: bannerDefs[i].bg,
        order: i,
        isActive: true,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
      },
    });
  }

  // ---------- ORDERS ----------
  for (let i = 0; i < 25; i++) {
    const buyerId = customers[faker.number.int({ min: 0, max: customers.length - 1 })];
    const sellerId = sellers[faker.number.int({ min: 0, max: sellers.length - 1 })];
    const itemsCount = faker.number.int({ min: 1, max: 4 });
    let subtotal = 0;
    const items = [];
    for (let j = 0; j < itemsCount; j++) {
      const productId = productIds[faker.number.int({ min: 0, max: productIds.length - 1 })];
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) continue;
      const qty = faker.number.int({ min: 1, max: 3 });
      subtotal += Number(product.price) * qty;
      items.push({ productId, quantity: qty, unitPrice: product.price });
    }
    if (items.length === 0) continue;
    const shippingCost = faker.number.int({ min: 15, max: 60 });
    const statuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED'] as const;
    const order = await prisma.order.create({
      data: {
        buyerId,
        sellerId,
        status: statuses[faker.number.int({ min: 0, max: statuses.length - 1 })] as any,
        subtotal,
        shippingCost,
        total: subtotal + shippingCost,
        paymentMethod: 'QR',
        paymentStatus: faker.datatype.boolean(0.7) ? 'VERIFIED' : 'PENDING',
        notes: faker.datatype.boolean(0.3) ? orderNote() : null,
        items: { create: items },
      },
    });
    void order;
  }

  // ---------- REVIEWS ----------
  for (let i = 0; i < 40; i++) {
    const productId = productIds[faker.number.int({ min: 0, max: productIds.length - 1 })];
    const userId = customers[faker.number.int({ min: 0, max: customers.length - 1 })];
    await prisma.review.create({
      data: {
        productId,
        userId,
        rating: faker.number.int({ min: 1, max: 5 }),
        comment: faker.datatype.boolean(0.7) ? reviewComment() : null,
      },
    });
  }

  // ---------- WISHLISTS ----------
  for (let i = 0; i < 30; i++) {
    const userId = customers[faker.number.int({ min: 0, max: customers.length - 1 })];
    const productId = productIds[faker.number.int({ min: 0, max: productIds.length - 1 })];
    try {
      await prisma.wishlistItem.create({ data: { userId, productId } });
    } catch {
      // duplicado, ignorar
    }
  }

  // ---------- CARTS ----------
  const usedCarts = new Set<number>();
  for (let i = 0; i < 10; i++) {
    const userId = customers[faker.number.int({ min: 0, max: customers.length - 1 })];
    if (usedCarts.has(userId)) continue;
    usedCarts.add(userId);
    const cart = await prisma.cart.create({ data: { userId } });
    const itemsCount = faker.number.int({ min: 1, max: 4 });
    for (let j = 0; j < itemsCount; j++) {
      const productId = productIds[faker.number.int({ min: 0, max: productIds.length - 1 })];
      try {
        await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity: faker.number.int({ min: 1, max: 3 }) } });
      } catch {
        // duplicado
      }
    }
  }

  // ---------- BUILDS ----------
  for (let i = 0; i < 8; i++) {
    const userId = customers[faker.number.int({ min: 0, max: customers.length - 1 })];
    const slotDefs: Array<{ slot: SlotType; cat: string }> = [
      { slot: SlotType.CPU, cat: 'Procesadores' },
      { slot: SlotType.MOTHERBOARD, cat: 'Motherboards' },
      { slot: SlotType.RAM, cat: 'Memorias RAM' },
      { slot: SlotType.GPU, cat: 'Placas de Video' },
      { slot: SlotType.STORAGE, cat: 'Almacenamiento' },
      { slot: SlotType.PSU, cat: 'Fuentes de Poder' },
      { slot: SlotType.CASE, cat: 'Gabinetes' },
      { slot: SlotType.COOLER, cat: 'Refrigeración' },
    ];
    const components = [];
    let total = 0;
    for (const { slot, cat } of slotDefs) {
      const matching = await prisma.product.findMany({
        where: { categoryId: categoryMap[cat], isActive: true, isApproved: true },
        take: 1,
        skip: faker.number.int({ min: 0, max: 2 }),
      });
      if (matching[0]) {
        components.push({ productId: matching[0].id, slotType: slot });
        total += Number(matching[0].price);
      }
    }
    if (components.length > 0) {
      await prisma.build.create({
        data: { userId, name: `Build ${i + 1}`, totalPrice: total, components: { create: components } },
      });
    }
  }

  // ---------- CONTENT ----------
  const faqs = [
    { question: '¿Cómo funciona el pago con QR?', answer: 'Al finalizar tu compra verás el QR del vendedor. Realizá la transferencia y subí el comprobante.', order: 1 },
    { question: '¿Cuánto tarda el envío?', answer: 'Depende de la ubicación del vendedor y del comprador. El costo se calcula automáticamente en el checkout.', order: 2 },
    { question: '¿Qué pasa si el producto llega dañado?', answer: 'Contactá al vendedor por el sistema de mensajería dentro de las 48hs de recibido.', order: 3 },
  ];
  for (const f of faqs) await prisma.faq.create({ data: f });

  const warranties = [
    { title: 'Garantía de hardware', content: 'Todos los productos de hardware tienen garantía oficial del fabricante de 12 meses.', order: 1 },
  ];
  for (const w of warranties) await prisma.warranty.create({ data: w });

  const reaches = [
    { title: 'Gamer', content: 'Todo para tu setup: hardware, periféricos y monitores.', order: 1 },
    { title: 'Hogar', content: 'Electrodomésticos y tecnología para tu casa.', order: 2 },
    { title: 'Vintage', content: 'Antigüedades seleccionadas con historia.', order: 3 },
  ];
  for (const r of reaches) await prisma.reach.create({ data: r });

  await seedRbac();

  // ===== Geolocalización del foro (09-spec G1.2): ciudades de Bolivia por departamento =====
  const FORUM_CITIES = [
    // La Paz
    { name: 'La Paz', department: 'La Paz', latitude: -16.4897, longitude: -68.1193, radiusKm: 40, sortOrder: 1 },
    { name: 'El Alto', department: 'La Paz', latitude: -16.5047, longitude: -68.1633, radiusKm: 35, sortOrder: 2 },
    // Oruro
    { name: 'Oruro', department: 'Oruro', latitude: -17.9667, longitude: -67.1167, radiusKm: 30, sortOrder: 1 },
    // Santa Cruz
    { name: 'Santa Cruz de la Sierra', department: 'Santa Cruz', latitude: -17.7833, longitude: -63.1821, radiusKm: 55, sortOrder: 1 },
    { name: 'Montero', department: 'Santa Cruz', latitude: -17.3383, longitude: -63.2583, radiusKm: 25, sortOrder: 2 },
    // Cochabamba
    { name: 'Cochabamba', department: 'Cochabamba', latitude: -17.3895, longitude: -66.1568, radiusKm: 40, sortOrder: 1 },
    { name: 'Quillacollo', department: 'Cochabamba', latitude: -17.3916, longitude: -66.2837, radiusKm: 20, sortOrder: 2 },
    // Potosí
    { name: 'Potosí', department: 'Potosí', latitude: -19.5729, longitude: -65.755, radiusKm: 25, sortOrder: 1 },
    // Chuquisaca
    { name: 'Sucre', department: 'Chuquisaca', latitude: -19.0333, longitude: -65.2627, radiusKm: 20, sortOrder: 1 },
    // Tarija
    { name: 'Tarija', department: 'Tarija', latitude: -21.5355, longitude: -64.7296, radiusKm: 20, sortOrder: 1 },
    // Beni
    { name: 'Trinidad', department: 'Beni', latitude: -14.8333, longitude: -64.9, radiusKm: 25, sortOrder: 1 },
    // Pando
    { name: 'Cobija', department: 'Pando', latitude: -11.0267, longitude: -68.7692, radiusKm: 15, sortOrder: 1 },
  ];
  await prisma.forumCity.createMany({ data: FORUM_CITIES, skipDuplicates: true });

  // ---------- SUBASTAS ACTIVAS (varias semanas) ----------
  const auctionCount = Math.min(6, productIds.length);
  const auctionProductIds = faker.helpers.arrayElements(productIds, auctionCount);
  let auctionsCreated = 0;
  for (const productId of auctionProductIds) {
    const sellerId = productSellerMap.get(productId);
    if (!sellerId) continue;
    const product = await prisma.product.findUnique({ where: { id: productId }, include: { images: { take: 1, orderBy: { order: 'asc' } } } });
    if (!product) continue;

    const startingPrice = Number(product.price) * 0.6;
    const weeksOut = faker.number.int({ min: 2, max: 6 });
    const bidderPool = customers.filter((id) => id !== sellerId);
    const bidCount = faker.number.int({ min: 0, max: 4 });
    const bidders = faker.helpers.arrayElements(bidderPool, Math.min(bidCount, bidderPool.length));

    const auction = await prisma.auction.create({
      data: {
        sellerId,
        productId,
        title: product.name,
        description: product.description,
        categoryId: product.categoryId,
        imageUrl: product.images[0]?.url ?? flickrImage('auction', 800),
        startingPrice,
        currentPrice: startingPrice,
        reservePrice: faker.datatype.boolean(0.4) ? startingPrice * 1.2 : null,
        buyNowPrice: faker.datatype.boolean(0.5) ? Number(product.price) * 1.15 : null,
        endDate: new Date(Date.now() + weeksOut * 7 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });

    let currentPrice = startingPrice;
    for (const bidderId of bidders) {
      currentPrice = Math.round((currentPrice + startingPrice * faker.number.float({ min: 0.05, max: 0.15, fractionDigits: 2 })) * 100) / 100;
      await prisma.auctionBid.create({ data: { auctionId: auction.id, bidderId, bidAmount: currentPrice } });
    }
    if (bidders.length > 0) {
      await prisma.auction.update({ where: { id: auction.id }, data: { currentPrice } });
    }
    auctionsCreated++;
  }

  // ---------- CHATS COMPRADOR-VENDEDOR ----------
  function icebreakersFor(city: string): string[] {
    const match = BOLIVIANISMOS.find((r) => r.aliases.includes(city.toLowerCase()));
    return (match ?? BOLIVIANISMOS[0]).icebreakers;
  }

  async function seedConversation(buyerId: number, sellerId: number, productId: number | null, sellerCity: string) {
    const conversation = await prisma.conversation.create({
      data: { buyerId, sellerId, productId },
    });
    const phrases = icebreakersFor(sellerCity);
    const exchange: Array<{ senderId: number; content: string }> = [
      { senderId: buyerId, content: faker.helpers.arrayElement(phrases) },
      { senderId: sellerId, content: '¡Hola! Sí, está disponible todavía.' },
      { senderId: buyerId, content: '¿Hace delivery o es solo presencial?' },
      { senderId: sellerId, content: 'Hago envío a todo el departamento, sin costo extra dentro de la ciudad.' },
    ];
    for (let i = 0; i < exchange.length; i++) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: exchange[i].senderId,
          content: exchange[i].content,
          createdAt: new Date(Date.now() - (exchange.length - i) * 60 * 60 * 1000),
        },
      });
    }
    return conversation;
  }

  // Chat fijo entre las cuentas demo, para que sea fácil de verificar al revisar la app.
  await seedConversation(demoBuyer.id, demoSeller.id, productSellerMap.get(auctionProductIds[0]) === demoSeller.id ? auctionProductIds[0] : null, 'Cochabamba');

  let conversationsCreated = 1;
  const extraChats = Math.min(5, customers.length, sellers.length);
  for (let i = 0; i < extraChats; i++) {
    const buyerId = customers[faker.number.int({ min: 0, max: customers.length - 1 })];
    const sellerId = sellers[faker.number.int({ min: 0, max: sellers.length - 1 })];
    if (buyerId === sellerId) continue;
    const seller = await prisma.user.findUnique({ where: { id: sellerId } });
    try {
      await seedConversation(buyerId, sellerId, null, seller?.locationCity ?? 'La Paz');
      conversationsCreated++;
    } catch {
      // conversación duplicada (mismo comprador/vendedor/producto) — se ignora
    }
  }

  console.log('✅ Seed completado');
  console.log(`  Usuarios: ${customers.length + sellers.length + 1}`);
  console.log(`  Categorías: ${Object.keys(categoryMap).length}`);
  console.log(`  Productos: ${productIds.length}`);
  console.log(`  Sellers: ${sellers.length}`);
  console.log(`  Atributos: ${Object.keys(attrMap).length}`);
  console.log(`  Tags: ${tagIds.length}`);
  console.log(`  Subastas activas: ${auctionsCreated}`);
  console.log(`  Chats: ${conversationsCreated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

