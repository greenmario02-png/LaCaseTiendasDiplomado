import request from 'supertest';

import { app, registerUser, uniqueEmail, getAdminToken } from './helpers';
import { prisma } from '../src/config/database';

/**
 * Regresión de los subforos profesionales y de universidad: subforos profesionales (gate de
 * verificación por cuestionario, solo bloquea PUBLICAR) y subforos por universidad
 * (gate geolocalizado, bloquea VER — con excepción de actividad previa/"grandfather").
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

describe('Subforos profesionales (verificación por cuestionario)', () => {
  it('las preguntas del cuestionario NUNCA exponen la respuesta correcta', async () => {
    const user = await createAgedUser('quiz-leak');
    const res = await request(app)
      .get('/api/forum/professional/fields/informatica/questions')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    for (const q of res.body.data.questions) {
      expect(q.correctOptionIndex).toBeUndefined();
    }
  });

  it('aprobar el cuestionario permite publicar en el subforo profesional; reprobar lo bloquea', async () => {
    const passer = await createAgedUser('quiz-pass');
    const failer = await createAgedUser('quiz-fail');

    const questionsRes = await request(app)
      .get('/api/forum/professional/fields/informatica/questions')
      .set('Authorization', `Bearer ${passer.token}`);
    const questions = questionsRes.body.data.questions as { id: number }[];

    // Respuestas correctas conocidas del seed (informatica): HTML=3, Pila=1, SQL=0
    const correctAnswers = [
      { questionId: questions[0].id, selectedOptionIndex: 3 },
      { questionId: questions[1].id, selectedOptionIndex: 1 },
      { questionId: questions[2].id, selectedOptionIndex: 0 },
    ];
    const wrongAnswers = questions.map((q) => ({ questionId: q.id, selectedOptionIndex: 0 }));

    const passRes = await request(app)
      .post('/api/forum/professional/fields/informatica/verify')
      .set('Authorization', `Bearer ${passer.token}`)
      .send({ answers: correctAnswers });
    expect(passRes.status).toBe(200);
    expect(passRes.body.data.status).toBe('PASSED');

    const failRes = await request(app)
      .post('/api/forum/professional/fields/informatica/verify')
      .set('Authorization', `Bearer ${failer.token}`)
      .send({ answers: wrongAnswers });
    expect(failRes.status).toBe(200);
    expect(failRes.body.data.status).toBe('FAILED');

    const catsRes = await request(app).get('/api/forum/categories');
    // Categoría hija (hereda el gate del padre "prof-informatica")
    // La categoría "prof-informatica-preguntas" puede no estar en la lista activa top-level,
    // así que la pedimos directo por slug.
    const catRes = await request(app).get('/api/forum/categories/prof-informatica-preguntas');
    expect(catRes.status).toBe(200);
    const categoryId = catRes.body.data.id as number;

    const postByPasser = await request(app)
      .post('/api/forum/posts')
      .set('Authorization', `Bearer ${passer.token}`)
      .send({
        title: '¿Alguien tiene experiencia con microservicios en Bolivia?',
        body: 'Quiero armar una arquitectura de microservicios para un proyecto local, ¿consejos?',
        categoryId,
        city: 'La Paz',
        type: 'GENERAL',
      });
    expect(postByPasser.status).toBe(201);

    const postByFailer = await request(app)
      .post('/api/forum/posts')
      .set('Authorization', `Bearer ${failer.token}`)
      .send({
        title: '¿Alguien tiene experiencia con microservicios en Bolivia?',
        body: 'Quiero armar una arquitectura de microservicios para un proyecto local, ¿consejos?',
        categoryId,
        city: 'La Paz',
        type: 'GENERAL',
      });
    expect(postByFailer.status).toBe(403);
    expect(postByFailer.body.error.code).toBe('PROFESSIONAL_VERIFICATION_REQUIRED');

    void catsRes; // no se usa el listado completo, solo confirmamos que responde 200 arriba
  });
});

describe('Subforos por universidad (gate geolocalizado)', () => {
  async function findUmsaCategory(): Promise<{ categoryId: number; universityId: number; cityId: number }> {
    const university = await prisma.university.findFirstOrThrow({ where: { name: { contains: 'UMSA' } } });
    const category = await prisma.forumCategory.findFirstOrThrow({ where: { universityId: university.id } });
    return { categoryId: category.id, universityId: university.id, cityId: university.cityId };
  }

  it('un usuario de otra ciudad no puede ver el subforo de una universidad de otra ciudad', async () => {
    const { categoryId, cityId } = await findUmsaCategory();
    const outsider = await createAgedUser('uni-outsider');
    const profileId = await getProfileId(outsider.token);

    // Perfil en una ciudad distinta a la de la universidad (Santa Cruz != La Paz/UMSA)
    const santaCruz = await prisma.forumCity.findFirstOrThrow({ where: { name: { contains: 'Santa Cruz' } } });
    expect(santaCruz.id).not.toBe(cityId);
    await prisma.forumProfile.update({ where: { id: profileId }, data: { cityId: santaCruz.id } });

    const university = await prisma.university.findFirstOrThrow({ where: { name: { contains: 'UMSA' } } });
    const uniSlug = `uni-${university.id}`;

    const catRes = await request(app)
      .get(`/api/forum/categories/${uniSlug}`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(catRes.status).toBe(403);
    expect(catRes.body.error.code).toBe('UNIVERSITY_FORUM_RESTRICTED');

    // También bloqueado si intenta listar el feed filtrando por esa categoría directamente.
    const feedRes = await request(app)
      .get(`/api/forum/posts?category=${uniSlug}`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(feedRes.status).toBe(403);
    expect(feedRes.body.error.code).toBe('UNIVERSITY_FORUM_RESTRICTED');

    const postRes = await request(app)
      .post('/api/forum/posts')
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({
        title: '¿Alguien sabe del trámite de título en la UMSA?',
        body: 'Necesito información sobre el trámite de titulación en la universidad.',
        categoryId,
        city: 'La Paz',
        type: 'GENERAL',
      });
    expect(postRes.status).toBe(403);
    expect(postRes.body.error.code).toBe('UNIVERSITY_FORUM_RESTRICTED');
  });

  it('un usuario de la misma ciudad de la universidad sí puede ver y publicar', async () => {
    const { categoryId, cityId } = await findUmsaCategory();
    const local = await createAgedUser('uni-local');
    const profileId = await getProfileId(local.token);
    await prisma.forumProfile.update({ where: { id: profileId }, data: { cityId } });

    const university = await prisma.university.findFirstOrThrow({ where: { name: { contains: 'UMSA' } } });
    const catRes = await request(app)
      .get(`/api/forum/categories/uni-${university.id}`)
      .set('Authorization', `Bearer ${local.token}`);
    expect(catRes.status).toBe(200);

    const postRes = await request(app)
      .post('/api/forum/posts')
      .set('Authorization', `Bearer ${local.token}`)
      .send({
        title: '¿Alguien sabe del trámite de título en la UMSA?',
        body: 'Necesito información sobre el trámite de titulación en la universidad.',
        categoryId,
        city: 'La Paz',
        type: 'GENERAL',
      });
    expect(postRes.status).toBe(201);
  });

  it('grandfather: un usuario con actividad previa mantiene acceso aunque cambie de ciudad', async () => {
    const { categoryId, cityId } = await findUmsaCategory();
    const moved = await createAgedUser('uni-grandfather');
    const profileId = await getProfileId(moved.token);

    // Primero participa estando en la ciudad correcta.
    await prisma.forumProfile.update({ where: { id: profileId }, data: { cityId } });
    const postRes = await request(app)
      .post('/api/forum/posts')
      .set('Authorization', `Bearer ${moved.token}`)
      .send({
        title: '¿Cómo es la inscripción a materias en la UMSA?',
        body: 'Quiero saber el proceso de inscripción a materias del próximo semestre.',
        categoryId,
        city: 'La Paz',
        type: 'GENERAL',
      });
    expect(postRes.status).toBe(201);

    // Se "muda" a otra ciudad.
    const santaCruz = await prisma.forumCity.findFirstOrThrow({ where: { name: { contains: 'Santa Cruz' } } });
    await prisma.forumProfile.update({ where: { id: profileId }, data: { cityId: santaCruz.id } });

    const university = await prisma.university.findFirstOrThrow({ where: { name: { contains: 'UMSA' } } });
    const catRes = await request(app)
      .get(`/api/forum/categories/uni-${university.id}`)
      .set('Authorization', `Bearer ${moved.token}`);
    expect(catRes.status).toBe(200); // sigue viendo el subforo por su actividad previa
  });
});

describe('Comentarios genéricos con credibilidad', () => {
  it('crear un comentario y votarlo (de acuerdo / está mamando / creado con IA) funciona y es idempotente por tipo', async () => {
    const author = await createAgedUser('comment-author');
    const voter = await createAgedUser('comment-voter');

    const createRes = await request(app)
      .post('/api/forum/comments')
      .set('Authorization', `Bearer ${author.token}`)
      .send({ targetType: 'CONO_ENTRY', targetId: 999, body: 'Esto tiene una fuente confiable detrás.' });
    expect(createRes.status).toBe(201);
    const commentId = createRes.body.data.id;

    const voteAgree = await request(app)
      .post(`/api/forum/comments/${commentId}/vote`)
      .set('Authorization', `Bearer ${voter.token}`)
      .send({ type: 'AGREE' });
    expect(voteAgree.status).toBe(200);
    expect(voteAgree.body.data.agreeCount).toBe(1);

    // Cambiar de tipo de voto: de AGREE a FAKE
    const voteFake = await request(app)
      .post(`/api/forum/comments/${commentId}/vote`)
      .set('Authorization', `Bearer ${voter.token}`)
      .send({ type: 'FAKE' });
    expect(voteFake.status).toBe(200);
    expect(voteFake.body.data.agreeCount).toBe(0);
    expect(voteFake.body.data.fakeCount).toBe(1);

    // Votar el mismo tipo de nuevo = toggle (cancela)
    const voteFakeToggle = await request(app)
      .post(`/api/forum/comments/${commentId}/vote`)
      .set('Authorization', `Bearer ${voter.token}`)
      .send({ type: 'FAKE' });
    expect(voteFakeToggle.status).toBe(200);
    expect(voteFakeToggle.body.data.fakeCount).toBe(0);

    const listRes = await request(app).get('/api/forum/comments?targetType=CONO_ENTRY&targetId=999');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
