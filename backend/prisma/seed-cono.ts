/**
 * Seed de demo para memes y torneo. Crea un tema MEME y un tema TOURNAMENT
 * de ejemplo con un par de entradas, usando el primer ForumProfile con alguna verificación
 * profesional aprobada como creador (si no hay ninguno todavía, no crea nada — correr
 * seed-professional.ts primero, o simplemente dejar que un usuario real cree sus propios
 * temas desde la app).
 *
 * Ejecutar: npx tsx prisma/seed-cono.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const verifiedProfile = await prisma.forumProfile.findFirst({
    where: { professionalVerifications: { some: { status: 'PASSED' } } },
  });

  if (!verifiedProfile) {
    console.log('[seed-cono] Ningún perfil tiene una verificación profesional aprobada todavía — nada que sembrar.');
    return;
  }

  console.log(`[seed-cono] Usando el perfil #${verifiedProfile.id} (${verifiedProfile.forumUsername}) como creador de demo.`);

  const memeTheme = await prisma.conoTheme.upsert({
    where: { slug: 'memes-bolivia' },
    update: {},
    create: {
      slug: 'memes-bolivia',
      title: 'Memes de Bolivia',
      description: 'Ranking libre de memes — votá positivo o nica.',
      type: 'MEME',
      createdById: verifiedProfile.id,
    },
  });

  const memeEntryCount = await prisma.conoEntry.count({ where: { themeId: memeTheme.id } });
  if (memeEntryCount === 0) {
    await prisma.conoEntry.createMany({
      data: [
        { themeId: memeTheme.id, submittedById: verifiedProfile.id, label: 'El clásico "ya pues"', imageUrl: 'https://placehold.co/400x300?text=Meme+1' },
        { themeId: memeTheme.id, submittedById: verifiedProfile.id, label: 'El trufi que no para donde le pedís', imageUrl: 'https://placehold.co/400x300?text=Meme+2' },
      ],
    });
  }

  const tournamentTheme = await prisma.conoTheme.upsert({
    where: { slug: 'peor-banco-bolivia' },
    update: {},
    create: {
      slug: 'peor-banco-bolivia',
      title: 'Peor banco de Bolivia',
      description: 'Cuadro de eliminatorias — votación diaria. Aportá info en los comentarios de cada entrada.',
      type: 'TOURNAMENT',
      createdById: verifiedProfile.id,
    },
  });

  const tournamentEntryCount = await prisma.conoEntry.count({ where: { themeId: tournamentTheme.id } });
  if (tournamentEntryCount === 0) {
    await prisma.conoEntry.createMany({
      data: [
        { themeId: tournamentTheme.id, submittedById: verifiedProfile.id, label: 'Banco Demo A', imageUrl: 'https://placehold.co/400x300?text=Banco+A' },
        { themeId: tournamentTheme.id, submittedById: verifiedProfile.id, label: 'Banco Demo B', imageUrl: 'https://placehold.co/400x300?text=Banco+B' },
      ],
    });

    const entries = await prisma.conoEntry.findMany({ where: { themeId: tournamentTheme.id } });
    if (entries.length === 2) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await prisma.conoMatch.create({
        data: {
          themeId: tournamentTheme.id,
          round: 1,
          entryAId: entries[0].id,
          entryBId: entries[1].id,
          votingDate: today,
          status: 'ACTIVE',
        },
      });
    }
  }

  console.log('[seed-cono] Listo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
