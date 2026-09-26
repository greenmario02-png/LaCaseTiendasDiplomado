import request from 'supertest';

import { app, registerUser, uniqueEmail, getAdminToken } from './helpers';
import { prisma } from '../src/config/database';
import { karmaService } from '../src/services/karma.service';
import { processForumTopPost } from '../src/services/forum-daily.service';

/**
 * Regresión de (condiciones de carrera
 * detectadas en la auditoría de calidad): karma con piso en 0, doble-aceptar respuesta,
 * doble-voto concurrente, e idempotencia del job diario de "mejor post".
 */

async function createAgedUser(prefix: string): Promise<{ token: string; userId: number; email: string }> {
  const reg = await registerUser({ email: uniqueEmail(prefix) });
  const email = reg.body.data.email;
  const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  expect(login.status).toBe(200);
  const token = login.body.data.accessToken as string;
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.user.update({
    where: { id: user.id },
    data: { createdAt: new Date(Date.now() - 48 * 3600 * 1000) },
  });
  return { token, userId: user.id, email };
}

async function getProfileId(token: string): Promise<number> {
  const res = await request(app).get('/api/forum/profile/me').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  return res.body.data.id as number;
}

describe('Condiciones de carrera del foro ', () => {
  let categoryId: number;

  beforeAll(async () => {
    const cats = await request(app).get('/api/forum/categories');
    categoryId = cats.body.data[0].id;
  });

  it('dos requests concurrentes de un usuario nuevo al foro no rompen la creación del perfil', async () => {
    // Usuario que nunca entró al foro (sin ForumProfile todavía) dispara dos requests a la
    // vez (ej. dos pestañas) — ambas deben resolver 200 con el MISMO perfil, no un 409.
    const user = await createAgedUser('race-new-profile');

    const [r1, r2] = await Promise.all([
      request(app).get('/api/forum/profile/me').set('Authorization', `Bearer ${user.token}`),
      request(app).get('/api/forum/profile/me').set('Authorization', `Bearer ${user.token}`),
    ]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r1.body.data.id).toBe(r2.body.data.id);

    const profiles = await prisma.forumProfile.findMany({ where: { userId: user.userId } });
    expect(profiles.length).toBe(1);
  });

  it('karma nunca baja de 0 bajo penalizaciones concurrentes', async () => {
    const user = await createAgedUser('karma-floor');
    const profileId = await getProfileId(user.token);

    // Karma inicial bajo (5), dos penalizaciones de -5 concurrentes: una ingenua
    // (leer-calcular-escribir) dejaría el karma en -5; con el fix atómico debe quedar en 0.
    await karmaService.earn(profileId, 5, 'EARN_ADMIN', undefined, undefined, 'setup');

    await Promise.all([
      karmaService.earn(profileId, -5, 'DEDUCT_REPORT', 'POST', 1, 'penalización concurrente A'),
      karmaService.earn(profileId, -5, 'DEDUCT_REPORT', 'POST', 2, 'penalización concurrente B'),
    ]);

    const profile = await prisma.forumProfile.findUniqueOrThrow({ where: { id: profileId } });
    expect(profile.karma).toBe(0);

    // El ledger debe sumar exactamente el karma final (nada de deltas "fantasma" perdidos).
    const txs = await prisma.karmaTransaction.findMany({ where: { profileId } });
    const sum = txs.reduce((acc, t) => acc + t.amount, 0);
    expect(sum).toBe(profile.karma);
  });

  it('solo una de dos respuestas concurrentes puede quedar aceptada en el mismo post', async () => {
    const author = await createAgedUser('race-accept-author');
    const replier1 = await createAgedUser('race-accept-r1');
    const replier2 = await createAgedUser('race-accept-r2');
    const profile1 = await getProfileId(replier1.token);
    const profile2 = await getProfileId(replier2.token);

    const postRes = await request(app)
      .post('/api/forum/posts')
      .set('Authorization', `Bearer ${author.token}`)
      .send({
        title: '¿Dos respuestas simultáneas se pueden aceptar a la vez?',
        body: 'Pregunta de prueba para el test de condición de carrera de aceptar respuesta.',
        categoryId,
        city: 'La Paz',
        type: 'GENERAL',
      });
    expect(postRes.status).toBe(201);
    const postId = postRes.body.data.id;

    const reply1Res = await request(app)
      .post(`/api/forum/posts/${postId}/replies`)
      .set('Authorization', `Bearer ${replier1.token}`)
      .send({ body: 'Primera respuesta candidata a ser aceptada en la carrera.' });
    const reply2Res = await request(app)
      .post(`/api/forum/posts/${postId}/replies`)
      .set('Authorization', `Bearer ${replier2.token}`)
      .send({ body: 'Segunda respuesta candidata a ser aceptada en la carrera.' });
    const reply1Id = reply1Res.body.data.id;
    const reply2Id = reply2Res.body.data.id;

    const [res1, res2] = await Promise.all([
      request(app).post(`/api/forum/replies/${reply1Id}/accept`).set('Authorization', `Bearer ${author.token}`),
      request(app).post(`/api/forum/replies/${reply2Id}/accept`).set('Authorization', `Bearer ${author.token}`),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 409]);

    const post = await prisma.forumPost.findUniqueOrThrow({ where: { id: postId } });
    expect(post.status).toBe('RESOLVED');

    const acceptedReplies = await prisma.forumReply.findMany({ where: { postId, isAccepted: true } });
    expect(acceptedReplies.length).toBe(1);

    // Esperar los setImmediate de recompensa y confirmar que el karma +10 se otorgó una sola vez.
    await new Promise((r) => setTimeout(r, 700));
    const winnerProfileId = acceptedReplies[0].authorId;
    const winnerFinal = await prisma.forumProfile.findUniqueOrThrow({ where: { id: winnerProfileId! } });
    const loserProfileId = winnerProfileId === profile1 ? profile2 : profile1;
    const loserFinal = await prisma.forumProfile.findUniqueOrThrow({ where: { id: loserProfileId } });

    expect(winnerFinal.karma).toBe(10);
    expect(loserFinal.karma).toBe(0);
  });

  it('votos concurrentes del mismo usuario sobre el mismo post no producen 500 ni votos duplicados', async () => {
    const author = await createAgedUser('race-vote-author');
    const voter = await createAgedUser('race-vote-voter');

    const postRes = await request(app)
      .post('/api/forum/posts')
      .set('Authorization', `Bearer ${author.token}`)
      .send({
        title: '¿Aguanta votar dos veces al mismo tiempo sin romperse?',
        body: 'Pregunta de prueba para el test de condición de carrera de votación concurrente.',
        categoryId,
        city: 'Cochabamba',
        type: 'GENERAL',
      });
    const postId = postRes.body.data.id;
    // Crea el ForumProfile del voter de antemano — así el test aísla la carrera del voto en
    // sí, sin mezclarla con la carrera (distinta, ya cubierta por su propio fix) de
    // ensureForumProfile cuando un usuario nuevo dispara dos requests a la vez.
    await getProfileId(voter.token);

    const [v1, v2] = await Promise.all([
      request(app).post(`/api/forum/posts/${postId}/vote`).set('Authorization', `Bearer ${voter.token}`).send({ value: 1 }),
      request(app).post(`/api/forum/posts/${postId}/vote`).set('Authorization', `Bearer ${voter.token}`).send({ value: 1 }),
    ]);

    // Ninguna de las dos debe reventar como 500/409 — ambas deben resolver a un estado
    // consistente. Votar el MISMO valor dos veces es, por diseño de la app, un toggle que
    // cancela el voto (ver "Toggle: mismo usuario vota de nuevo up → cancela" en
    // forum.test.ts) — con dos requests concurrentes del mismo valor, una crea el voto y la
    // otra lo encuentra al reintentar tras el conflicto de constraint único y lo cancela.
    // El resultado determinístico correcto es 0 votos finales, nunca una fila duplicada.
    expect(v1.status).toBe(200);
    expect(v2.status).toBe(200);

    const votes = await prisma.forumVote.findMany({ where: { postId, targetType: 'POST' } });
    expect(votes.length).toBe(0);

    const post = await prisma.forumPost.findUniqueOrThrow({ where: { id: postId } });
    expect(post.upvotes).toBe(0);
    expect(post.downvotes).toBe(0);
  });

  it('processForumTopPost no duplica el karma si corre dos veces para el mismo post', async () => {
    // No asumimos que el post creado acá sea el "top del día" — otros tests de este mismo
    // archivo también crean posts hoy y pueden ganarle en score. En vez de eso, verificamos
    // la garantía real de idempotencia contra el post que efectivamente haya ganado.
    const author = await createAgedUser('race-daily-top');
    const voter = await createAgedUser('race-daily-voter');

    const postRes = await request(app)
      .post('/api/forum/posts')
      .set('Authorization', `Bearer ${author.token}`)
      .send({
        title: '¿Este post va a ser el más votado del día en el test?',
        body: 'Pregunta de prueba para el test de idempotencia del job diario de mejor post.',
        categoryId,
        city: 'Potosí',
        type: 'GENERAL',
      });
    await request(app)
      .post(`/api/forum/posts/${postRes.body.data.id}/vote`)
      .set('Authorization', `Bearer ${voter.token}`)
      .send({ value: 1 });

    // Simula el cron corriendo dos veces seguidas (reintento, réplica del proceso, etc.)
    const [winnerA, winnerB] = await Promise.all([processForumTopPost(), processForumTopPost()]);

    expect(winnerA).not.toBeNull();
    expect(winnerA).toBe(winnerB); // ambas ejecuciones concurrentes resuelven al mismo post ganador

    // Exactamente un award y una transacción de karma para el post ganador, nunca dos.
    const awards = await prisma.forumTopPostAward.findMany({ where: { postId: winnerA! } });
    expect(awards.length).toBe(1);

    const topPostKarmaTxs = await prisma.karmaTransaction.findMany({
      where: { type: 'EARN_TOP_POST', refType: 'POST', refId: winnerA! },
    });
    expect(topPostKarmaTxs.length).toBe(1);
  });
});
