import request from 'supertest';
import { app, registerUser, registerSeller, loginUser, uniqueEmail } from './helpers';

describe('Auth API (integración)', () => {
  const email = uniqueEmail('auth');

  it('POST /api/auth/register — crea cliente', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email,
      password: 'password123',
      firstName: 'Ana',
      lastName: 'Gomez',
      phone: '5550000',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe(email);
    expect(res.body.data.role).toBe('CUSTOMER');
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('POST /api/auth/register — rechaza email duplicado (409)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email,
      password: 'password123',
      firstName: 'Ana',
      lastName: 'Gomez',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('POST /api/auth/register — valida Zod (password corta → 400)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: uniqueEmail(),
      password: '123',
      firstName: 'X',
      lastName: 'Y',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('POST /api/auth/register — valida email inválido (400)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'no-es-email',
      password: 'password123',
      firstName: 'X',
      lastName: 'Y',
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login — login exitoso devuelve tokens', async () => {
    const res = await loginUser(email, 'password123');
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.role).toBe('CUSTOMER');
  });

  it('POST /api/auth/login — password incorrecta → 401', async () => {
    const res = await loginUser(email, 'wrong-password');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/auth/login — usuario inexistente → 401', async () => {
    const res = await loginUser('nadie@mail.com', 'password123');
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login — body inválido → 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: email });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/refresh — rota access token', async () => {
    const login = await loginUser(email, 'password123');
    const refreshToken = login.body.data.refreshToken;
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('POST /api/auth/refresh — token inválido → 401', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'invalid-token' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/logout — revoca refresh token (reuso falla)', async () => {
    const login = await loginUser(email, 'password123');
    const refreshToken = login.body.data.refreshToken;
    const logout = await request(app).post('/api/auth/logout').send({ refreshToken });
    expect(logout.status).toBe(200);

    const reuse = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(reuse.status).toBe(401);
  });

  it('GET /api/auth/me — requiere token (401 sin token)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me — devuelve perfil con token', async () => {
    const login = await loginUser(email, 'password123');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(email);
  });

  it('POST /api/auth/sellers/register — crea seller pendiente de aprobación', async () => {
    const res = await registerSeller({ email: uniqueEmail('seller') });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('SELLER');
    expect(res.body.data.isApproved).toBe(false);
    expect(res.body.data.storeName).toBe('Tienda Test');
  });

  it('POST /api/auth/sellers/register — valida campos de tienda', async () => {
    const res = await request(app).post('/api/auth/sellers/register').send({
      email: uniqueEmail(),
      password: 'password123',
      firstName: 'X',
      lastName: 'Y',
      storeName: '',
      storeDescription: 'corta',
      storeCategory: '',
      country: '',
      locationCity: 'C',
      locationState: 'C',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('POST /api/auth/sellers/register — valida celular obligatorio', async () => {
    const res = await request(app).post('/api/auth/sellers/register').send({
      email: uniqueEmail(),
      password: 'password123',
      firstName: 'X',
      lastName: 'Y',
      phone: '',
      storeName: 'Tienda',
      storeDescription: 'Descripción de tienda válida',
      storeCategory: 'Ropa',
      country: 'Bolivia',
      locationCity: 'La Paz',
      locationState: 'La Paz',
    });
    expect(res.status).toBe(400);
    const phoneErr = res.body.error.details.find((d: any) => d.path.includes('phone'));
    expect(phoneErr).toBeDefined();
  });
});
