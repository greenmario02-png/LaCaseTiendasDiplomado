import request from 'supertest';

import { app, registerUser, uniqueEmail, getAdminToken } from './helpers';
import { prisma } from '../src/config/database';

/**
 * Regresión del hallazgo crítico de la auditoría de calidad del foro: la moderación de un
 * usuario con la asignación RBAC `MODERADOR_FORO` debe acotarse al departamento del propio
 * `ForumProfile` del moderador — un moderador de La Paz NO puede resolver/rechazar
 * reportes de contenido publicado en Santa Cruz. Ver `assertCanModerateReport` en
 * `backend/src/services/forum.service.ts`.
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

async function grantForumModeratorRole(userId: number) {
  const role = await prisma.rbacRole.findUniqueOrThrow({ where: { code: 'MODERADOR_FORO' } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    update: {},
    create: { userId, roleId: role.id },
  });
}

async function assignForumModerator(_adminToken: string, userId: number, department: string) {
  await grantForumModeratorRole(userId);
  await prisma.forumProfile.upsert({
    where: { userId },
    update: { department, city: department },
    create: { userId, forumUsername: `Usuario_mod_${userId}`, city: department, department },
  });
}

describe('Moderación de foro acotada por departamento', () => {
  let adminToken: string;
  let categoryId: number;

  beforeAll(async () => {
    adminToken = await getAdminToken();
    const cats = await request(app).get('/api/forum/categories');
    categoryId = cats.body.data[0].id;
  });

  /** Crea un post + reporte pendiente en la ciudad dada; devuelve { postId, reportId }. */
  async function createReportedPost(city: string): Promise<{ postId: number; reportId: number }> {
    const author = await createAgedUser('content-author');
    const reporter = await createAgedUser('reporter');

    const postRes = await request(app)
      .post('/api/forum/posts')
      .set('Authorization', `Bearer ${author.token}`)
      .send({
        title: `¿Alguien sabe algo de esto en ${city}?`,
        body: 'Contenido de prueba lo suficientemente largo para pasar la validación del schema.',
        categoryId,
        city,
        type: 'GENERAL',
      });
    expect(postRes.status).toBe(201);
    const postId = postRes.body.data.id as number;

    const reportRes = await request(app)
      .post(`/api/forum/posts/${postId}/report`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({ reason: 'SPAM', detail: 'Reporte de prueba' });
    expect(reportRes.status).toBe(201);
    const reportId = reportRes.body.data.reportId as number;

    return { postId, reportId };
  }

  it('un moderador de La Paz NO puede resolver un reporte de contenido publicado en Santa Cruz de la Sierra', async () => {
    const moderator = await createAgedUser('mod-lapaz');
    await assignForumModerator(adminToken, moderator.userId, 'La Paz');

    const { reportId } = await createReportedPost('Santa Cruz de la Sierra');

    const res = await request(app)
      .put(`/api/forum/reports/${reportId}/resolve`)
      .set('Authorization', `Bearer ${moderator.token}`)
      .send({ resolution: 'Intento cross-departamento' });

    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe('DEPARTMENT_MISMATCH');

    // El reporte sigue PENDING: la acción no debe haber tenido ningún efecto.
    const report = await prisma.forumReport.findUniqueOrThrow({ where: { id: reportId } });
    expect(report.status).toBe('PENDING');
  });

  it('un moderador de La Paz NO puede rechazar un reporte de contenido publicado en Santa Cruz de la Sierra', async () => {
    const moderator = await createAgedUser('mod-lapaz2');
    await assignForumModerator(adminToken, moderator.userId, 'La Paz');

    const { reportId } = await createReportedPost('Santa Cruz de la Sierra');

    const res = await request(app)
      .put(`/api/forum/reports/${reportId}/reject`)
      .set('Authorization', `Bearer ${moderator.token}`)
      .send({});

    expect(res.status).toBe(403);
  });

  it('un moderador de La Paz SÍ puede resolver un reporte de contenido publicado en La Paz', async () => {
    const moderator = await createAgedUser('mod-lapaz3');
    await assignForumModerator(adminToken, moderator.userId, 'La Paz');

    const { reportId } = await createReportedPost('La Paz');

    const res = await request(app)
      .put(`/api/forum/reports/${reportId}/resolve`)
      .set('Authorization', `Bearer ${moderator.token}`)
      .send({ resolution: 'Resuelto dentro de mi departamento' });

    expect(res.status).toBe(200);
    const report = await prisma.forumReport.findUniqueOrThrow({ where: { id: reportId } });
    expect(report.status).toBe('RESOLVED');
  });

  it('ADMIN puede resolver reportes de cualquier departamento, sin restricción', async () => {
    const { reportId } = await createReportedPost('Santa Cruz de la Sierra');

    const res = await request(app)
      .put(`/api/forum/reports/${reportId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resolution: 'Resuelto por admin' });

    expect(res.status).toBe(200);
  });

  it('el listado de reportes de un moderador solo incluye su propio departamento', async () => {
    const moderator = await createAgedUser('mod-listado');
    await assignForumModerator(adminToken, moderator.userId, 'La Paz');

    const { reportId: reportIdLaPaz } = await createReportedPost('La Paz');
    const { reportId: reportIdSantaCruz } = await createReportedPost('Santa Cruz de la Sierra');

    const res = await request(app)
      .get('/api/forum/reports?limit=50')
      .set('Authorization', `Bearer ${moderator.token}`);

    expect(res.status).toBe(200);
    const ids = (res.body.data as Array<{ id: number }>).map((r) => r.id);
    expect(ids).toContain(reportIdLaPaz);
    expect(ids).not.toContain(reportIdSantaCruz);
  });

  it('un moderador sin departamento asignado no ve ni puede resolver ningún reporte (fail-closed)', async () => {
    const moderator = await createAgedUser('mod-sin-depto');
    await grantForumModeratorRole(moderator.userId);
    // Sin ForumProfile.department fijado (queda null por defecto).

    const { reportId } = await createReportedPost('La Paz');

    const listRes = await request(app)
      .get('/api/forum/reports?limit=50')
      .set('Authorization', `Bearer ${moderator.token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toEqual([]);

    const resolveRes = await request(app)
      .put(`/api/forum/reports/${reportId}/resolve`)
      .set('Authorization', `Bearer ${moderator.token}`)
      .send({});
    expect(resolveRes.status).toBe(403);
  });
});
