import request from 'supertest';

import { app, registerUser, uniqueEmail } from './helpers';
import { prisma } from '../src/config/database';
import { closeDailyMatches } from '../src/services/cono.service';

/**
 * Regresión de memes y torneo: gate de creación de temas (requiere
 * verificación profesional), votación positivo/nica con toggle, y torneo (voto A/B +
 * cierre diario de enfrentamientos).
 */

async function createAgedUser(prefix: string): Promise<{ token: string; userId: number }> {
  const reg = await registerUser({ email: uniqueEmail(prefix) });
  const email = reg.body.data.email;
  const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  const token = login.body.data.accessToken as string;
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.user.update({ where: { id: user.id }, data: { createdAt: new Date(Date.now() - 48 * 3600 * 1000) } });
  return { token, userId: user.id };
}

async function verifyInformatica(token: string) {
  const questionsRes = await request(app)
    .get('/api/forum/professional/fields/informatica/questions')
    .set('Authorization', `Bearer ${token}`);
  const questions = questionsRes.body.data.questions as { id: number }[];
  const correctAnswers = [
    { questionId: questions[0].id, selectedOptionIndex: 3 },
    { questionId: questions[1].id, selectedOptionIndex: 1 },
    { questionId: questions[2].id, selectedOptionIndex: 0 },
  ];
  const res = await request(app)
    .post('/api/forum/professional/fields/informatica/verify')
    .set('Authorization', `Bearer ${token}`)
    .send({ answers: correctAnswers });
  expect(res.body.data.status).toBe('PASSED');
}

describe('memes y torneo', () => {
  it('un usuario sin verificación profesional no puede crear un tema', async () => {
    const user = await createAgedUser('cono-unverified');
    const res = await request(app)
      .post('/api/cono/themes')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ slug: `test-theme-${Date.now()}`, title: 'Peor prueba de Bolivia', type: 'MEME' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PROFESSIONAL_VERIFICATION_REQUIRED');
  });

  it('un usuario verificado puede crear un tema MEME, subir entradas, y votar con toggle', async () => {
    const creator = await createAgedUser('cono-creator');
    await verifyInformatica(creator.token);

    const slug = `memes-test-${Date.now()}`;
    const themeRes = await request(app)
      .post('/api/cono/themes')
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ slug, title: 'Memes de prueba', type: 'MEME' });
    expect(themeRes.status).toBe(201);
    const themeId = themeRes.body.data.id;

    const entryRes = await request(app)
      .post(`/api/cono/themes/${themeId}/entries`)
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ label: 'Meme de prueba', imageUrl: 'https://placehold.co/300x200' });
    expect(entryRes.status).toBe(201);
    const entryId = entryRes.body.data.id;

    // El propio creador no puede votar su entrada
    const selfVote = await request(app)
      .post(`/api/cono/entries/${entryId}/vote`)
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ value: 'POSITIVE' });
    expect(selfVote.status).toBe(403);
    expect(selfVote.body.error.code).toBe('SELF_VOTE');

    const voter = await createAgedUser('cono-voter');
    const vote1 = await request(app)
      .post(`/api/cono/entries/${entryId}/vote`)
      .set('Authorization', `Bearer ${voter.token}`)
      .send({ value: 'POSITIVE' });
    expect(vote1.status).toBe(200);
    expect(vote1.body.data.positiveCount).toBe(1);

    // Votar el mismo valor de nuevo = toggle (cancela)
    const vote2 = await request(app)
      .post(`/api/cono/entries/${entryId}/vote`)
      .set('Authorization', `Bearer ${voter.token}`)
      .send({ value: 'POSITIVE' });
    expect(vote2.status).toBe(200);
    expect(vote2.body.data.positiveCount).toBe(0);

    // Votar nica
    const vote3 = await request(app)
      .post(`/api/cono/entries/${entryId}/vote`)
      .set('Authorization', `Bearer ${voter.token}`)
      .send({ value: 'NEGATIVE' });
    expect(vote3.status).toBe(200);
    expect(vote3.body.data.negativeCount).toBe(1);

    const rankingRes = await request(app).get(`/api/cono/themes/${themeId}/entries`);
    expect(rankingRes.status).toBe(200);
    expect(rankingRes.body.data.length).toBe(1);
    expect(rankingRes.body.data[0].negativeCount).toBe(1);
  });

  it('torneo: solo el creador del tema arma enfrentamientos, y el cierre diario fija ganador', async () => {
    const creator = await createAgedUser('cono-tourney-creator');
    await verifyInformatica(creator.token);
    const stranger = await createAgedUser('cono-tourney-stranger');
    await verifyInformatica(stranger.token);

    const slug = `torneo-test-${Date.now()}`;
    const themeRes = await request(app)
      .post('/api/cono/themes')
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ slug, title: 'Peor cosa de prueba', type: 'TOURNAMENT' });
    const themeId = themeRes.body.data.id;

    const entryA = await request(app)
      .post(`/api/cono/themes/${themeId}/entries`)
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ label: 'Competidor A', imageUrl: 'https://placehold.co/300x200' });
    const entryB = await request(app)
      .post(`/api/cono/themes/${themeId}/entries`)
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ label: 'Competidor B', imageUrl: 'https://placehold.co/300x200' });

    const yesterday = new Date(Date.now() - 48 * 3600 * 1000).toISOString().slice(0, 10);

    // Un usuario que no creó el tema no puede armar enfrentamientos
    const forbiddenMatch = await request(app)
      .post('/api/cono/matches')
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ themeId, round: 1, entryAId: entryA.body.data.id, entryBId: entryB.body.data.id, votingDate: yesterday });
    expect(forbiddenMatch.status).toBe(403);
    expect(forbiddenMatch.body.error.code).toBe('NOT_THEME_CREATOR');

    // El creador arma el enfrentamiento con fecha de votación de AYER, para que el cron de
    // cierre lo tome como vencido en este mismo test (sin esperar un día real).
    const matchRes = await request(app)
      .post('/api/cono/matches')
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ themeId, round: 1, entryAId: entryA.body.data.id, entryBId: entryB.body.data.id, votingDate: yesterday });
    expect(matchRes.status).toBe(201);
    const matchId = matchRes.body.data.id;

    const voteA = await request(app)
      .post(`/api/cono/matches/${matchId}/vote`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ choice: 'A' });
    expect(voteA.status).toBe(200);
    expect(voteA.body.data.votesA).toBe(1);

    const closed = await closeDailyMatches();
    expect(closed).toBeGreaterThanOrEqual(1);

    const match = await prisma.conoMatch.findUniqueOrThrow({ where: { id: matchId } });
    expect(match.status).toBe('RESOLVED');
    expect(match.winnerId).toBe(entryA.body.data.id);

    // Ya cerrado: no se puede seguir votando
    const lateVote = await request(app)
      .post(`/api/cono/matches/${matchId}/vote`)
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ choice: 'B' });
    expect(lateVote.status).toBe(409);
    expect(lateVote.body.error.code).toBe('MATCH_NOT_ACTIVE');
  });

  it('torneo: al resolverse todos los matches de una ronda con número par de ganadores, arma sola la ronda siguiente', async () => {
    const creator = await createAgedUser('cono-bracket-creator');
    await verifyInformatica(creator.token);

    const slug = `bracket-test-${Date.now()}`;
    const themeRes = await request(app)
      .post('/api/cono/themes')
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ slug, title: 'Torneo de bracket de prueba', type: 'TOURNAMENT' });
    const themeId = themeRes.body.data.id;

    const labels = ['Uno', 'Dos', 'Tres', 'Cuatro'];
    const entryIds: number[] = [];
    for (const label of labels) {
      const res = await request(app)
        .post(`/api/cono/themes/${themeId}/entries`)
        .set('Authorization', `Bearer ${creator.token}`)
        .send({ label, imageUrl: 'https://placehold.co/300x200' });
      entryIds.push(res.body.data.id);
    }

    const yesterday = new Date(Date.now() - 48 * 3600 * 1000).toISOString().slice(0, 10);
    const match1 = await request(app)
      .post('/api/cono/matches')
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ themeId, round: 1, entryAId: entryIds[0], entryBId: entryIds[1], votingDate: yesterday });
    const match2 = await request(app)
      .post('/api/cono/matches')
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ themeId, round: 1, entryAId: entryIds[2], entryBId: entryIds[3], votingDate: yesterday });

    const voter = await createAgedUser('cono-bracket-voter');
    await request(app).post(`/api/cono/matches/${match1.body.data.id}/vote`).set('Authorization', `Bearer ${voter.token}`).send({ choice: 'A' });
    await request(app).post(`/api/cono/matches/${match2.body.data.id}/vote`).set('Authorization', `Bearer ${voter.token}`).send({ choice: 'B' });

    await closeDailyMatches();

    const round2 = await prisma.conoMatch.findMany({ where: { themeId, round: 2 } });
    expect(round2.length).toBe(1);
    expect([entryIds[0], entryIds[2]].includes(round2[0].entryAId)).toBe(true);
    expect([entryIds[1], entryIds[3]].includes(round2[0].entryBId)).toBe(true);
    expect(round2[0].status).toBe('ACTIVE');

    // Idempotente: correr el cierre de nuevo no duplica la ronda 2
    await closeDailyMatches();
    const round2Again = await prisma.conoMatch.findMany({ where: { themeId, round: 2 } });
    expect(round2Again.length).toBe(1);
  });
});
