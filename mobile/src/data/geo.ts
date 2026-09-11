export interface Division {
  name: string;
}

export interface Country {
  code: string;
  name: string;
  divisionLabel: string;
  phoneCode: string;
  divisions: Division[];
}

export const COUNTRIES: Country[] = [
  {
    code: 'BO',
    name: 'Bolivia',
    divisionLabel: 'Departamento',
    phoneCode: '+591',
    divisions: [
      { name: 'Beni' },
      { name: 'Chuquisaca' },
      { name: 'Cochabamba' },
      { name: 'La Paz' },
      { name: 'Oruro' },
      { name: 'Pando' },
      { name: 'Potosí' },
      { name: 'Santa Cruz' },
      { name: 'Tarija' },
    ],
  },
  {
    code: 'AR',
    name: 'Argentina',
    divisionLabel: 'Provincia',
    phoneCode: '+54',
    divisions: [
      { name: 'Buenos Aires' },
      { name: 'Catamarca' },
      { name: 'Chaco' },
      { name: 'Chubut' },
      { name: 'Córdoba' },
      { name: 'Corrientes' },
      { name: 'Entre Ríos' },
      { name: 'Formosa' },
      { name: 'Jujuy' },
      { name: 'La Pampa' },
      { name: 'La Rioja' },
      { name: 'Mendoza' },
      { name: 'Misiones' },
      { name: 'Neuquén' },
      { name: 'Río Negro' },
      { name: 'Salta' },
      { name: 'San Juan' },
      { name: 'San Luis' },
      { name: 'Santa Cruz' },
      { name: 'Santa Fe' },
      { name: 'Santiago del Estero' },
      { name: 'Tierra del Fuego' },
      { name: 'Tucumán' },
    ],
  },
  {
    code: 'PE',
    name: 'Perú',
    divisionLabel: 'Región',
    phoneCode: '+51',
    divisions: [
      { name: 'Amazonas' },
      { name: 'Áncash' },
      { name: 'Apurímac' },
      { name: 'Arequipa' },
      { name: 'Ayacucho' },
      { name: 'Cajamarca' },
      { name: 'Callao' },
      { name: 'Cusco' },
      { name: 'Huancavelica' },
      { name: 'Huánuco' },
      { name: 'Ica' },
      { name: 'Junín' },
      { name: 'La Libertad' },
      { name: 'Lambayeque' },
      { name: 'Lima' },
      { name: 'Loreto' },
      { name: 'Madre de Dios' },
      { name: 'Moquegua' },
      { name: 'Pasco' },
      { name: 'Piura' },
      { name: 'Puno' },
      { name: 'San Martín' },
      { name: 'Tacna' },
      { name: 'Tumbes' },
      { name: 'Ucayali' },
    ],
  },
];

export const STORE_CATEGORIES = [
  'Hardware',
  'Celulares',
  'Ropa y Moda',
  'Electrodomésticos',
  'Antigüedades',
  'Artesanías',
  'Música',
  'Videojuegos',
  'Juguetes',
  'Deportes',
  'Hogar',
  'Salud y Belleza',
  'Mascotas',
  'Libros',
  'Otros',
];
