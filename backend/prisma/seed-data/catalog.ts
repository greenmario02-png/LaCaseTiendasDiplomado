/**
 * Catálogo compartido (árbol de categorías, atributos y plantillas de productos) usado
 * tanto por el seed de desarrollo (seed.ts) como por el seed de contenido de producción
 * (seed-content.ts), para no duplicar la misma lista de 190+ productos en dos archivos.
 */

export const CATEGORY_TREE = [
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

export const ATTR_DEFS = [
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

export const PRODUCT_TEMPLATES: Record<string, Array<{ name: string; price: [number, number]; attrs?: Record<string, string | number> }>> = {
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
  Cervezas: [
    { name: 'Pack de Cerveza Artesanal IPA (6)', price: [90, 160], attrs: { Alcohol: 6.5, Variedad: 'IPA' } },
    { name: 'Cerveza Lager Importada (6)', price: [80, 140], attrs: { Alcohol: 5, Variedad: 'Lager' } },
  ],
  Vinos: [
    { name: 'Vino Tinto Malbec Reserva', price: [180, 320], attrs: { Añejamiento: '12 meses' } },
    { name: 'Vino Blanco Chardonnay', price: [140, 250] },
  ],
  Licores: [
    { name: 'Whisky Escocés 750ml', price: [450, 750] },
    { name: 'Ron Añejo 750ml', price: [250, 420] },
  ],
  'Bebidas sin alcohol': [
    { name: 'Jugo Natural 100% (1L)', price: [25, 50] },
    { name: 'Agua con Gas (pack x6)', price: [35, 60] },
  ],
  'Juegos de mesa': [
    { name: 'Juego de Ajedrez de Madera', price: [120, 220], attrs: { 'Edad mínima': 6, Jugadores: 2 } },
    { name: 'Dominó Clásico', price: [80, 140], attrs: { 'Edad mínima': 5, Jugadores: 4 } },
  ],
  Muñecos: [
    { name: 'Muñeco Articulado (Superhéroe)', price: [110, 190], attrs: { Edad: '8+' } },
    { name: 'Muñeca de Trapo Artesanal', price: [90, 160], attrs: { Edad: '4-7' } },
  ],
  Construcción: [
    { name: 'Set de Bloques de Construcción (120 pzas)', price: [150, 250] },
    { name: 'Bloques Magnéticos (60 pzas)', price: [220, 360] },
  ],
  Peluches: [
    { name: 'Peluche Oso Gigante 1m', price: [180, 300] },
    { name: 'Peluche de Gato', price: [90, 150] },
  ],
  Fútbol: [
    { name: 'Pelota de Fútbol Profesional', price: [150, 260], attrs: { Talle: 'M' } },
    { name: 'Camiseta Deportiva (Equipo Local)', price: [180, 320], attrs: { Talle: 'L' } },
    { name: 'Guantes de Arquero', price: [120, 210] },
  ],
  Bicicletas: [
    { name: 'Bicicleta MTB Rodado 26', price: [2800, 4200], attrs: { Rodado: 26, Material: 'Aluminio' } },
    { name: 'Bicicleta Urbana Rodado 28', price: [3200, 4800], attrs: { Rodado: 28, Material: 'Acero' } },
    { name: 'Casco de Ciclismo', price: [180, 300] },
  ],
  Gimnasio: [
    { name: 'Juego de Mancuernas (20kg)', price: [650, 950], attrs: { Capacidad: 20 } },
    { name: 'Mancuerna Ajustable 10kg', price: [380, 560], attrs: { Capacidad: 10 } },
    { name: 'Esterilla de Yoga', price: [90, 160] },
  ],
  Camping: [
    { name: 'Carpa para 2 Personas', price: [450, 700] },
    { name: 'Mochila de Camping 60L', price: [380, 620] },
  ],
  'Muebles para Hogar': [
    { name: 'Mesa de Comedor de Madera', price: [1800, 2800], attrs: { Material: 'Madera' } },
    { name: 'Estante Metálico 5 niveles', price: [420, 680], attrs: { Material: 'Metal' } },
  ],
  Decoración: [
    { name: 'Espejo Decorativo Redondo', price: [180, 320], attrs: { Ambiente: 'Living' } },
    { name: 'Juego de Velas Aromáticas', price: [80, 150], attrs: { Ambiente: 'Dormitorio' } },
  ],
  Iluminación: [
    { name: 'Lámpara de Pie LED', price: [220, 380], attrs: { Tipo: 'LED' } },
    { name: 'Foco Inteligente RGB', price: [60, 120], attrs: { Tipo: 'Smart' } },
  ],
  Blanquería: [
    { name: 'Juego de Sábanas Queen', price: [160, 280] },
    { name: 'Toalla Rizada (set x3)', price: [120, 210] },
  ],
  Cosméticos: [
    { name: 'Set de Maquillaje Completo', price: [140, 260], attrs: { 'Tipo de piel': 'Mixta' } },
    { name: 'Crema Facial Hidratante', price: [80, 150], attrs: { 'Tipo de piel': 'Seca' } },
  ],
  'Cuidado personal': [
    { name: 'Secador de Pelo 2000W', price: [150, 280] },
    { name: 'Kit de Barbería Profesional', price: [220, 380] },
  ],
  Perfumes: [
    { name: 'Perfume Hombre 100ml', price: [320, 520], attrs: { Volumen: 100 } },
    { name: 'Perfume Mujer 50ml', price: [280, 460], attrs: { Volumen: 50 } },
  ],
  Alimento: [
    { name: 'Alimento para Perro (15kg)', price: [280, 420], attrs: { Especie: 'Perro' } },
    { name: 'Alimento para Gato (7kg)', price: [210, 340], attrs: { Especie: 'Gato' } },
  ],
  'Accesorios para mascotas': [
    { name: 'Collar con Placa', price: [60, 110], attrs: { Tipo: 'Collar' } },
    { name: 'Cama para Mascotas Grande', price: [180, 300], attrs: { Tipo: 'Cama' } },
    { name: 'Correa y Arnés para Mascota', price: [85, 130], attrs: { Tipo: 'Correa' } },
  ],
  'Juguetes para mascotas': [
    { name: 'Juguete Masticable de Goma', price: [45, 85] },
    { name: 'Pelota Squeaky', price: [30, 60] },
  ],
  Guitarras: [
    { name: 'Guitarra Acústica Dreadnought', price: [650, 950], attrs: { Cuerdas: 6, Tipo: 'Acústica' } },
    { name: 'Guitarra Eléctrica Start', price: [1200, 1800], attrs: { Cuerdas: 6, Tipo: 'Eléctrica' } },
  ],
  'Teclados musicales': [
    { name: 'Teclado Musical 61 teclas', price: [900, 1400] },
    { name: 'Sintetizador Portátil', price: [1500, 2400] },
  ],
  Audio: [
    { name: 'Micrófono Condenser USB', price: [320, 520] },
    { name: 'Monitores de Estudio (par)', price: [700, 1100] },
  ],
  'Instrumentos de viento': [
    { name: 'Flauta Dulce Escolar', price: [110, 160] },
  ],
  Juegos: [
    { name: 'Juego de Aventura AAA (PC)', price: [250, 380], attrs: { Plataforma: 'PC', Género: 'Aventura' } },
    { name: 'Juego de Deportes (PlayStation)', price: [280, 400], attrs: { Plataforma: 'PlayStation', Género: 'Deportes' } },
  ],
  Consolas: [
    { name: 'Consola PlayStation 5', price: [12850, 15700] },
    { name: 'Consola Nintendo Switch', price: [6450, 8550] },
    { name: 'Consola Portátil Retro', price: [600, 900], attrs: { Almacenamiento: 64 } },
  ],
  'Accesorios gaming': [
    { name: 'Silla Gamer Ergonómica', price: [1800, 2800] },
    { name: 'Base Refrigerante para Notebook', price: [120, 210] },
    { name: 'Auriculares Gaming 7.1', price: [640, 1000] },
    { name: 'Volante de Carreras USB', price: [1050, 1550] },
  ],
  Novelas: [
    { name: 'Novela de Aventuras (Tapa Dura)', price: [95, 150], attrs: { Autor: 'Pablo Quesada', Idioma: 'Español' } },
    { name: 'Novela Romántica Best Seller', price: [85, 135], attrs: { Autor: 'Lucía Marín', Idioma: 'Español' } },
    { name: 'Cuentos Cortos Latinoamericanos', price: [70, 115], attrs: { Autor: 'Jorge Ríos', Idioma: 'Español' } },
  ],
  Educativos: [
    { name: 'Enciclopedia de Historia Universal', price: [220, 340], attrs: { Autor: 'Editorial Andina', Idioma: 'Español' } },
    { name: 'Manual de Matemáticas Avanzadas', price: [160, 250], attrs: { Autor: 'Dra. Ana Sol', Idioma: 'Español' } },
  ],
  'Comics y Mangas': [
    { name: 'Manga de Aventuras (Tomo 1)', price: [60, 100], attrs: { Idioma: 'Español' } },
    { name: 'Cómic de Superhéroes Edición Especial', price: [110, 180], attrs: { Idioma: 'Español' } },
  ],
  Papelería: [
    { name: 'Set de Marcadores 24 colores', price: [45, 80], attrs: { Formato: 'Marcadores' } },
    { name: 'Cuaderno Tapa Dura A4', price: [35, 60], attrs: { Formato: 'Cuaderno' } },
  ],
  Cerámica: [
    { name: 'Juego de Tazas de Cerámica (6 unid.)', price: [180, 290], attrs: { Técnica: 'Esmaltado a mano' } },
    { name: 'Máscara Decorativa de Barro', price: [220, 380], attrs: { Técnica: 'Modelado' } },
  ],
  Tejidos: [
    { name: 'Poncho de Lana de Alpaca', price: [420, 650], attrs: { Material: 'Lana' } },
    { name: 'Bufanda Tejida a Mano', price: [85, 140], attrs: { Material: 'Algodón' } },
  ],
  Madera: [
    { name: 'Tabla de Picar de Roble Artesanal', price: [130, 210] },
    { name: 'Caja de Madera Tallada', price: [240, 390] },
  ],
  'Joyería artesanal': [
    { name: 'Collar de Plata con Turquesa', price: [380, 590], attrs: { Tipo: 'Collar' } },
    { name: 'Pulsera de Cuero y Piedras', price: [120, 190], attrs: { Tipo: 'Pulsera' } },
  ],
  Manuales: [
    { name: 'Set de Destornilladores de Precisión', price: [140, 220], attrs: { Marca: 'ProTool' } },
    { name: 'Martillo de Carpintero', price: [90, 150], attrs: { Marca: 'FerreMax' } },
  ],
  Eléctricas: [
    { name: 'Taladro Percutor 800W', price: [480, 720], attrs: { Tipo: 'Taladro', Marca: 'PowerPlus' } },
    { name: 'Amoladora Angular 900W', price: [390, 580], attrs: { Tipo: 'Amoladora', Marca: 'PowerPlus' } },
  ],
  Jardinería: [
    { name: 'Set de Herramientas de Jardín (5 piezas)', price: [160, 250] },
    { name: 'Manguera Reforzada 20m', price: [120, 190] },
  ],
  Seguridad: [
    { name: 'Candado de Seguridad Reforzado', price: [85, 140] },
    { name: 'Cerradura Inteligente Bluetooth', price: [520, 780] },
  ],
};

// Palabra clave en inglés por categoría, para pedir fotos reales y relevantes a LoremFlickr
// (en vez de fotos aleatorias sin relación con el producto).
export const CATEGORY_KEYWORDS: Record<string, string> = {
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
/**
 * Foto de relleno realista y estable (Picsum Photos, servido por Fastly). Antes se usaba
 * LoremFlickr por palabra clave, pero a este volumen de imágenes bloquea las peticiones con una
 * página de verificación anti-bot en vez de servir la foto ("imágenes rotas" en producción).
 * Picsum no permite buscar por palabra clave, pero es estable y cada "seed" siempre devuelve la
 * misma foto, así que es idempotente entre corridas del script.
 */
export function flickrImage(keyword: string, width = 800, height = width): string {
  flickrSeed += 1;
  return `https://picsum.photos/seed/${encodeURIComponent(keyword)}-${flickrSeed}/${width}/${height}`;
}

/** Foto de relleno realista y estable para la categoría del producto. */
export function categoryImage(categoryName: string, width = 800, height = width): string {
  const keyword = CATEGORY_KEYWORDS[categoryName] ?? 'store';
  return flickrImage(keyword, width, height);
}

export const DESC_INTROS: Record<string, string[]> = {
  NEW: ['Producto nuevo, sellado de fábrica.', 'A estrenar, con caja y accesorios originales.'],
  REFURBISHED: ['Reacondicionado y revisado, funcionando al 100%.', 'Reacondicionado con garantía de la tienda.'],
  USED: ['Usado, en buen estado y funcionando correctamente.', 'De segunda mano, cuidado y con poco uso.'],
};

export const DESC_CLOSERS = [
  'Entrega en el punto de encuentro o envío a domicilio dentro de la ciudad.',
  'Consultanos por WhatsApp para coordinar la entrega.',
  'Aceptamos pago por QR o transferencia bancaria.',
  'Stock limitado, haz tu pedido antes de que se agote.',
  'Ideal para uso diario o como regalo.',
];

// Ciudades del catálogo de geolocalización del foro (ForumCity). Sin estas filas, las
// universidades y los subforos por ciudad no se pueden crear (dependen de una ForumCity).
export const FORUM_CITIES = [
  { name: 'La Paz', department: 'La Paz', latitude: -16.4897, longitude: -68.1193, radiusKm: 40, sortOrder: 1 },
  { name: 'El Alto', department: 'La Paz', latitude: -16.5047, longitude: -68.1633, radiusKm: 35, sortOrder: 2 },
  { name: 'Oruro', department: 'Oruro', latitude: -17.9667, longitude: -67.1167, radiusKm: 30, sortOrder: 1 },
  { name: 'Santa Cruz de la Sierra', department: 'Santa Cruz', latitude: -17.7833, longitude: -63.1821, radiusKm: 55, sortOrder: 1 },
  { name: 'Montero', department: 'Santa Cruz', latitude: -17.3383, longitude: -63.2583, radiusKm: 25, sortOrder: 2 },
  { name: 'Cochabamba', department: 'Cochabamba', latitude: -17.3895, longitude: -66.1568, radiusKm: 40, sortOrder: 1 },
  { name: 'Quillacollo', department: 'Cochabamba', latitude: -17.3916, longitude: -66.2837, radiusKm: 20, sortOrder: 2 },
  { name: 'Potosí', department: 'Potosí', latitude: -19.5729, longitude: -65.755, radiusKm: 25, sortOrder: 1 },
  { name: 'Sucre', department: 'Chuquisaca', latitude: -19.0333, longitude: -65.2627, radiusKm: 20, sortOrder: 1 },
  { name: 'Tarija', department: 'Tarija', latitude: -21.5355, longitude: -64.7296, radiusKm: 20, sortOrder: 1 },
  { name: 'Trinidad', department: 'Beni', latitude: -14.8333, longitude: -64.9, radiusKm: 25, sortOrder: 1 },
  { name: 'Cobija', department: 'Pando', latitude: -11.0267, longitude: -68.7692, radiusKm: 15, sortOrder: 1 },
];

export const REVIEW_COMMENTS = [
  'Llegó rápido y en buen estado, tal como se describía.',
  'Buena atención del vendedor, todo bien con la compra.',
  'El producto es tal cual la foto, muy conforme.',
  'Un poco demorado el envío pero el producto vale la pena.',
  'Excelente relación precio-calidad, lo recomiendo.',
];
