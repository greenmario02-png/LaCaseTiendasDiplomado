import request from 'supertest';
import { app, registerUser } from './helpers';

describe('API versionada /api/v1 y ruta de salud', () => {
  it('GET /api/salud y /api/v1/salud responden 200 { estado: "ok" }', async () => {
    for (const path of ['/api/salud', '/api/v1/salud']) {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ estado: 'ok' });
    }
  });

  it('401 sin token en una ruta protegida (/api y /api/v1)', async () => {
    expect((await request(app).get('/api/admin/dashboard')).status).toBe(401);
    expect((await request(app).get('/api/v1/admin/dashboard')).status).toBe(401);
  });

  it('403 con rol incorrecto en una ruta de administración', async () => {
    const reg = await registerUser();
    const login = await request(app).post('/api/v1/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    expect(login.status).toBe(200);
    const res = await request(app).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('400/422 con cuerpo inválido', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'no-es-email' });
    expect([400, 422]).toContain(res.status);
  });
});
