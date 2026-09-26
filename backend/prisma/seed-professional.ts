/**
 * Seed de subforos profesionales (verificación por cuestionario) y subforos por
 * universidad geolocalizados.
 * Idempotente (upsert por slug/name). Requiere que seed-forum.ts ya haya corrido
 * (usa las categorías/ForumCity que ese seed no toca, pero sí depende de que
 * ForumCity ya tenga filas — las crea prisma/seed.ts).
 *
 * Ejecutar: npx tsx prisma/seed-professional.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FIELDS: {
  slug: string;
  name: string;
  description: string;
  questions: { question: string; options: string[]; correctOptionIndex: number }[];
}[] = [
  {
    slug: 'informatica',
    name: 'Informática',
    description: 'Desarrollo de software, redes, bases de datos y ciencias de la computación.',
    questions: [
      {
        question: '¿Cuál de estas opciones NO es un lenguaje de programación?',
        options: ['Python', 'Ruby', 'PHP', 'HTML'],
        correctOptionIndex: 3, // HTML es un lenguaje de marcado, no de programación
      },
      {
        question: '¿Qué estructura de datos usa el principio "el último en entrar es el primero en salir" (LIFO)?',
        options: ['Cola (queue)', 'Pila (stack)', 'Lista enlazada', 'Árbol binario'],
        correctOptionIndex: 1,
      },
      {
        question: '¿Qué significa "SQL"?',
        options: ['Structured Query Language', 'Simple Query Logic', 'System Question Language', 'Sequential Query List'],
        correctOptionIndex: 0,
      },
    ],
  },
  {
    slug: 'psicologia',
    name: 'Psicología',
    description: 'Psicología clínica, educativa, conductual y organizacional.',
    questions: [
      {
        question: '¿Qué rama de la psicología se enfoca principalmente en procesos de enseñanza-aprendizaje?',
        options: ['Psicología clínica', 'Psicología educativa', 'Psicología forense', 'Neuropsicología'],
        correctOptionIndex: 1,
      },
      {
        question: '¿Quién es considerado el fundador del psicoanálisis?',
        options: ['B.F. Skinner', 'Jean Piaget', 'Sigmund Freud', 'Carl Rogers'],
        correctOptionIndex: 2,
      },
      {
        question: '¿Qué técnica se asocia principalmente al condicionamiento operante?',
        options: ['Refuerzo y castigo', 'Interpretación de sueños', 'Test de Rorschach', 'Terapia de grupo'],
        correctOptionIndex: 0,
      },
    ],
  },
  {
    slug: 'arquitectura',
    name: 'Arquitectura',
    description: 'Diseño arquitectónico, urbanismo y cálculo estructural básico.',
    questions: [
      {
        question: 'Para calcular la carga que soporta una viga, ¿qué tipo de fórmula se aplica principalmente?',
        options: ['Fórmulas de resistencia de materiales', 'Fórmulas de interés compuesto', 'Ecuaciones químicas', 'Fórmulas de óptica'],
        correctOptionIndex: 0,
      },
      {
        question: '¿Qué escala se usa típicamente para planos de planta de una vivienda?',
        options: ['1:1', '1:50 o 1:100', '1:10000', '1:1000000'],
        correctOptionIndex: 1,
      },
    ],
  },
  {
    slug: 'ingenieria-civil',
    name: 'Ingeniería Civil',
    description: 'Construcción, estructuras, hidráulica y suelos.',
    questions: [
      {
        question: '¿Qué ensayo se usa comúnmente para medir la resistencia del hormigón?',
        options: ['Ensayo de compresión en cilindros', 'Prueba de PH', 'Ensayo de tracción de tela', 'Prueba de conductividad eléctrica'],
        correctOptionIndex: 0,
      },
      {
        question: '¿Qué material se usa como refuerzo principal dentro del hormigón armado?',
        options: ['Madera', 'Acero (varillas)', 'Vidrio', 'Plástico reciclado'],
        correctOptionIndex: 1,
      },
    ],
  },
  {
    slug: 'quimica',
    name: 'Química',
    description: 'Química general, orgánica, analítica e industrial.',
    questions: [
      {
        question: '¿Cuál es el símbolo químico del sodio?',
        options: ['So', 'Sd', 'Na', 'S'],
        correctOptionIndex: 2,
      },
      {
        question: '¿Qué instrumento se usa para medir el pH de una solución?',
        options: ['Espectrofotómetro', 'pHmetro', 'Termómetro', 'Balanza analítica'],
        correctOptionIndex: 1,
      },
    ],
  },
  {
    slug: 'economia',
    name: 'Economía',
    description: 'Macroeconomía, microeconomía y finanzas.',
    questions: [
      {
        question: '¿Qué mide principalmente el PIB (Producto Interno Bruto)?',
        options: ['El valor de todos los bienes y servicios producidos en un país', 'La cantidad de dinero en circulación', 'La tasa de desempleo', 'El tipo de cambio'],
        correctOptionIndex: 0,
      },
      {
        question: '¿Qué término describe un aumento generalizado y sostenido de precios?',
        options: ['Deflación', 'Inflación', 'Devaluación', 'Recesión'],
        correctOptionIndex: 1,
      },
    ],
  },
];

async function main() {
  console.log('[seed-professional] Creando áreas profesionales y preguntas...');
  // sortOrder alto a propósito: estas categorías son gateadas (requieren verificación) y
  // NUNCA deben terminar primeras en un listado genérico ordenado por sortOrder — varios
  // tests/flows asumen que "la primera categoría de la lista" es una abierta normal.
  const PROFESSIONAL_SORT_BASE = 1000;
  const UNIVERSITY_SORT_BASE = 2000;

  for (const [fieldIndex, f] of FIELDS.entries()) {
    const field = await prisma.professionalField.upsert({
      where: { slug: f.slug },
      update: { name: f.name, description: f.description },
      create: { slug: f.slug, name: f.name, description: f.description },
    });

    const existingQuestions = await prisma.professionalFieldQuestion.count({ where: { fieldId: field.id } });
    if (existingQuestions === 0) {
      for (let i = 0; i < f.questions.length; i++) {
        const q = f.questions[i];
        await prisma.professionalFieldQuestion.create({
          data: { fieldId: field.id, question: q.question, options: q.options, correctOptionIndex: q.correctOptionIndex, sortOrder: i },
        });
      }
    }

    // Categoría padre del subforo profesional (gate) + 4 hijas temáticas.
    const parentSlug = `prof-${f.slug}`;
    const parent = await prisma.forumCategory.upsert({
      where: { slug: parentSlug },
      update: { requiresFieldId: field.id, name: f.name, description: f.description },
      create: {
        slug: parentSlug,
        name: f.name,
        description: f.description,
        icon: 'Science',
        color: '#1565C0',
        requiresFieldId: field.id,
        sortOrder: PROFESSIONAL_SORT_BASE + fieldIndex * 10,
      },
    });

    const CHILDREN = [
      { suffix: 'ciencia', name: 'Ciencia', icon: 'Science' },
      { suffix: 'debates', name: 'Debates', icon: 'Balance' },
      { suffix: 'noticias', name: 'Noticias', icon: 'Newspaper' },
      { suffix: 'preguntas', name: 'Preguntas', icon: 'QuestionAnswer' },
    ];
    for (const [childIndex, c] of CHILDREN.entries()) {
      const childSlug = `${parentSlug}-${c.suffix}`;
      await prisma.forumCategory.upsert({
        where: { slug: childSlug },
        update: { parentId: parent.id, name: `${f.name} — ${c.name}` },
        create: {
          slug: childSlug,
          name: `${f.name} — ${c.name}`,
          description: `${c.name} sobre ${f.name.toLowerCase()}, con foco en problemáticas de Bolivia.`,
          icon: c.icon,
          color: '#1565C0',
          parentId: parent.id,
          sortOrder: PROFESSIONAL_SORT_BASE + fieldIndex * 10 + childIndex + 1,
        },
      });
    }
  }

  console.log('[seed-professional] Creando universidades públicas y sus subforos...');
  const UNIVERSITIES: { name: string; cityName: string }[] = [
    { name: 'Universidad Mayor de San Andrés (UMSA)', cityName: 'La Paz' },
    { name: 'Universidad Mayor de San Simón (UMSS)', cityName: 'Cochabamba' },
    { name: 'Universidad Autónoma Gabriel René Moreno (UAGRM)', cityName: 'Santa Cruz de la Sierra' },
    { name: 'Universidad San Francisco Xavier de Chuquisaca (USFX)', cityName: 'Sucre' },
    { name: 'Universidad Técnica de Oruro (UTO)', cityName: 'Oruro' },
    { name: 'Universidad Autónoma Tomás Frías (UATF)', cityName: 'Potosí' },
    { name: 'Universidad Autónoma Juan Misael Saracho (UAJMS)', cityName: 'Tarija' },
  ];

  for (const [uniIndex, u] of UNIVERSITIES.entries()) {
    const city = await prisma.forumCity.findFirst({ where: { name: u.cityName } });
    if (!city) {
      console.warn(`[seed-professional] Ciudad "${u.cityName}" no encontrada en ForumCity — se omite ${u.name}`);
      continue;
    }
    const existingUniversity = await prisma.university.findFirst({ where: { name: u.name } });
    const university = existingUniversity
      ? await prisma.university.update({ where: { id: existingUniversity.id }, data: { cityId: city.id } })
      : await prisma.university.create({ data: { name: u.name, cityId: city.id } });

    const uniSlug = `uni-${university.id}`;
    await prisma.forumCategory.upsert({
      where: { slug: uniSlug },
      update: { universityId: university.id },
      create: {
        slug: uniSlug,
        name: u.name,
        description: `Subforo exclusivo de la comunidad universitaria de ${u.cityName} (${u.name}).`,
        icon: 'School',
        color: '#6A1B9A',
        universityId: university.id,
        sortOrder: UNIVERSITY_SORT_BASE + uniIndex,
      },
    });
  }

  console.log('[seed-professional] Listo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
