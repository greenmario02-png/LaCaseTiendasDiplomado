import request from 'supertest';

import { app, registerUser, uniqueEmail } from './helpers';
import { prisma } from '../src/config/database';
import { evaluateDebateRisk, ensureDebateZoneAlias, DEBATE_SUGGEST_THRESHOLD } from '../src/services/debate-zone.service';

/**
 * Zona de Debate: detector heurístico
 * (sin IA) + alias estable por usuario. "solo sugiere", nunca mueve contenido —
 * ver `flagIfPolemic` en debate-zone.service.ts.
 */

async function createAgedUser(prefix: string): Promise<{ token: string; userId: number }> {
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
  return { token, userId: user.id };
}

describe('Detector de sesgo/incitación (heurístico)', () => {
  it('un texto sobre un tema gatillo (política) obtiene un score por encima del umbral de sugerencia', () => {
    const score = evaluateDebateRisk(
      'El gobierno y el presidente deberían escuchar más a la oposición en política nacional.'
    );
    expect(score).toBeGreaterThanOrEqual(DEBATE_SUGGEST_THRESHOLD);
  });

  it('un texto práctico y neutral (comprar repuestos) obtiene un score bajo', () => {
    const score = evaluateDebateRisk('Necesito un lugar confiable para repuestos de teclado y pantalla de laptop.');
    expect(score).toBeLessThan(DEBATE_SUGGEST_THRESHOLD);
  });

  it('texto vacío no rompe y da score 0', () => {
    expect(evaluateDebateRisk('')).toBe(0);
    expect(evaluateDebateRisk('   ')).toBe(0);
  });
});

describe('Alias estable de Zona de Debate', () => {
  it('genera un alias y lo reutiliza en llamadas posteriores para el mismo usuario', async () => {
    const user = await createAgedUser('debate-alias');
    const first = await ensureDebateZoneAlias(user.userId);
    const second = await ensureDebateZoneAlias(user.userId);
    expect(first).toBe(second);
  });

  it('dos usuarios distintos reciben alias distintos', async () => {
    const userA = await createAgedUser('debate-alias-a');
    const userB = await createAgedUser('debate-alias-b');
    const aliasA = await ensureDebateZoneAlias(userA.userId);
    const aliasB = await ensureDebateZoneAlias(userB.userId);
    expect(aliasA).not.toBe(aliasB);
  });
});

describe('Integración: publicar en la categoría Zona de Debate oculta el forumUsername real', () => {
  let categoryId: number;

  beforeAll(async () => {
    const category = await prisma.forumCategory.create({
      data: {
        slug: `zona-de-debate-test-${Date.now()}`,
        name: 'Zona de Debate (test)',
        isDebateZone: true,
        sortOrder: 5000, // fuera del rango del seed real, evita colisión de orden (bug ya documentado)
      },
    });
    categoryId = category.id;
  });

  it('el post y la respuesta muestran un alias, no el forumUsername real, en getPost', async () => {
    const author = await createAgedUser('debate-post-author');
    const replier = await createAgedUser('debate-post-replier');

    const authorProfile = await request(app).get('/api/forum/profile/me').set('Authorization', `Bearer ${author.token}`);
    const replierProfile = await request(app).get('/api/forum/profile/me').set('Authorization', `Bearer ${replier.token}`);
    const authorUsername = authorProfile.body.data.forumUsername as string;
    const replierUsername = replierProfile.body.data.forumUsername as string;

    const postRes = await request(app)
      .post('/api/forum/posts')
      .set('Authorization', `Bearer ${author.token}`)
      .send({
        title: '¿Qué opinan de la nueva ley?',
        body: 'Quiero discutir sobre la reforma y el gobierno actual, con respeto.',
        categoryId,
        city: 'La Paz',
        type: 'GENERAL',
      });
    expect(postRes.status).toBe(201);
    const postId = postRes.body.data.id as number;

    const replyRes = await request(app)
      .post(`/api/forum/posts/${postId}/replies`)
      .set('Authorization', `Bearer ${replier.token}`)
      .send({ body: 'Yo también tengo una postura sobre el gobierno.' });
    expect(replyRes.status).toBe(201);

    const detail = await request(app).get(`/api/forum/posts/${postId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.author.forumUsername).not.toBe(authorUsername);
    expect(detail.body.data.replies[0].author.forumUsername).not.toBe(replierUsername);
    // El alias sí debe ser estable: pedirlo de nuevo da el mismo valor.
    const detailAgain = await request(app).get(`/api/forum/posts/${postId}`);
    expect(detailAgain.body.data.author.forumUsername).toBe(detail.body.data.author.forumUsername);
  });

  it('un post fuera de Zona de Debate sigue mostrando el forumUsername real', async () => {
    const author = await createAgedUser('normal-post-author');
    const cats = await request(app).get('/api/forum/categories');
    const normalCategoryId = cats.body.data[0].id;

    const authorProfile = await request(app).get('/api/forum/profile/me').set('Authorization', `Bearer ${author.token}`);
    const authorUsername = authorProfile.body.data.forumUsername as string;

    const postRes = await request(app)
      .post('/api/forum/posts')
      .set('Authorization', `Bearer ${author.token}`)
      .send({
        title: 'Pregunta normal sin nada de política',
        body: 'Contenido de prueba lo suficientemente largo para pasar la validación del schema.',
        categoryId: normalCategoryId,
        city: 'La Paz',
        type: 'GENERAL',
      });
    expect(postRes.status).toBe(201);

    const detail = await request(app).get(`/api/forum/posts/${postRes.body.data.id}`);
    expect(detail.body.data.author.forumUsername).toBe(authorUsername);
  });
});
